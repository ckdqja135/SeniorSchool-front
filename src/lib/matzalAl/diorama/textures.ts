/**
 * 디오라마 시제품용 절차적 텍스처 (캔버스 → three.js 텍스처).
 *
 * 외부 이미지·3D 자산 없이 브라우저에서 바로 생성한다. 벽돌·회벽·콘크리트 패널·아스팔트·보도블록·
 * 횡단보도·간판(한글)·차양 줄무늬·접지 그림자(AO 블롭)를 만든다.
 * 실사 재질(PBR 스캔 텍스처)이 아니므로 '미니어처 모형' 느낌을 목표로 한다.
 */
import * as THREE from 'three';

export type Rng = () => number;

/** 고정 시드 난수 — 같은 시드면 항상 같은 무늬 */
export function seeded(seed: number): Rng {
  let s = seed % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** hex 색을 밝기 배율로 조정 */
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `rgb(${r},${g},${b})`;
}

function toTexture(c: HTMLCanvasElement, repeat: [number, number] = [1, 1], srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 벽돌: 1 타일 = 2m × 2m 정도로 쓰도록 repeat 을 호출부에서 조정 */
export function brickTexture(base: string, mortar = '#e5d8c9', seed = 3): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, 256, 256);
  const rnd = seeded(seed);
  const bh = 16;
  const bw = 48;
  for (let y = 0; y < 256; y += bh) {
    const offset = ((y / bh) % 2) * (bw / 2);
    for (let x = -bw; x < 256 + bw; x += bw) {
      ctx.fillStyle = shade(base, 0.82 + rnd() * 0.32);
      ctx.fillRect(x + offset + 1, y + 1, bw - 2, bh - 2);
    }
  }
  return toTexture(c);
}

/** 회벽/페인트: 은은한 얼룩 */
export function plasterTexture(base: string, seed = 5): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const rnd = seeded(seed);
  for (let i = 0; i < 1400; i += 1) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${(rnd() * 0.06).toFixed(3)})`;
    const s = 2 + rnd() * 6;
    ctx.fillRect(rnd() * 256, rnd() * 256, s, s);
  }
  return toTexture(c);
}

/** 콘크리트 패널: 줄눈 격자 */
export function concreteTexture(base: string, seed = 7): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const rnd = seeded(seed);
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${(rnd() * 0.05).toFixed(3)})`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 3, 3);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  return toTexture(c);
}

/** 목재 판벽: 세로 널빤지 */
export function woodTexture(base: string, seed = 9): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  const rnd = seeded(seed);
  const pw = 32;
  for (let x = 0; x < 256; x += pw) {
    ctx.fillStyle = shade(base, 0.85 + rnd() * 0.3);
    ctx.fillRect(x, 0, pw, 256);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x, 0, 2, 256);
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = `rgba(0,0,0,${(0.04 + rnd() * 0.06).toFixed(3)})`;
      ctx.fillRect(x + 4 + rnd() * (pw - 8), 0, 1.5, 256);
    }
  }
  return toTexture(c);
}

/** 아스팔트 */
export function asphaltTexture(seed = 11): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#4b4e55';
  ctx.fillRect(0, 0, 256, 256);
  const rnd = seeded(seed);
  for (let i = 0; i < 3000; i += 1) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${(rnd() * 0.08).toFixed(3)})`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 2, 2);
  }
  return toTexture(c, [8, 8]);
}

/** 보도블록 */
export function pavingTexture(seed = 13): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cfc7bb';
  ctx.fillRect(0, 0, 256, 256);
  const rnd = seeded(seed);
  const s = 32;
  for (let y = 0; y < 256; y += s) {
    for (let x = 0; x < 256; x += s) {
      ctx.fillStyle = shade('#d6cec2', 0.9 + rnd() * 0.16);
      ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
  }
  return toTexture(c, [12, 12]);
}

/** 횡단보도 줄무늬 (가로 방향 줄) — 평면에 그대로 매핑 */
export function crosswalkTexture(): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(245,242,235,0.92)';
  const stripes = 7;
  const h = 256 / stripes;
  for (let i = 0; i < stripes; i += 1) ctx.fillRect(0, i * h + h * 0.25, 256, h * 0.5);
  const t = toTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** 차양 줄무늬 */
export function awningTexture(a: string, b: string): THREE.CanvasTexture {
  const c = makeCanvas(256, 64);
  const ctx = c.getContext('2d')!;
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = (x / 32) % 2 === 0 ? a : b;
    ctx.fillRect(x, 0, 32, 64);
  }
  return toTexture(c, [3, 1]);
}

export interface SignOptions {
  vertical?: boolean;
  bg: string;
  fg: string;
  /** 글자 주변 은은한 발광 */
  glow?: string;
  font?: string;
}

/** 한글 간판 텍스처. 가로(512×128) 또는 세로(128×512) */
export function signTexture(text: string, opt: SignOptions): THREE.CanvasTexture {
  const vertical = !!opt.vertical;
  const w = vertical ? 128 : 512;
  const h = vertical ? 512 : 128;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = opt.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = opt.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opt.glow) {
    ctx.shadowColor = opt.glow;
    ctx.shadowBlur = 18;
  }
  const font = opt.font ?? '"Pretendard", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  if (vertical) {
    const chars = Array.from(text.replace(/\s+/g, ''));
    const size = Math.min(88, Math.floor((h - 40) / chars.length) - 6);
    ctx.font = `700 ${size}px ${font}`;
    const total = chars.length * (size + 8);
    let y = (h - total) / 2 + size / 2;
    for (const ch of chars) {
      ctx.fillText(ch, w / 2, y);
      y += size + 8;
    }
  } else {
    let size = 84;
    ctx.font = `700 ${size}px ${font}`;
    while (ctx.measureText(text).width > w - 60 && size > 30) {
      size -= 4;
      ctx.font = `700 ${size}px ${font}`;
    }
    ctx.fillText(text, w / 2, h / 2 + 4);
  }
  const t = toTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** 벽면 문구(벽화 글씨) — 여러 줄 */
export function wallTextTexture(lines: string[], fg = 'rgba(60,50,45,0.55)'): THREE.CanvasTexture {
  const c = makeCanvas(512, 512);
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);
  ctx.fillStyle = fg;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '600 64px "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 40, 60 + i * 96));
  const t = toTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * 매장 유리창 너머 실내 장면: 따뜻한 조명 그라데이션 + 펜던트 조명 점 + 테이블·사람 실루엣.
 * 실제 실내 기하 없이 '불 켜진 가게 안' 인상을 주기 위한 텍스처.
 */
export function interiorTexture(warm: string, seed = 3): THREE.CanvasTexture {
  const c = makeCanvas(512, 192);
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 192);
  g.addColorStop(0, shade(warm, 1.0));
  g.addColorStop(0.55, shade(warm, 0.78));
  g.addColorStop(1, shade(warm, 0.5));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 192);
  const rnd = seeded(seed);
  // 뒷벽 선반·그림 (어두운 사각)
  ctx.fillStyle = 'rgba(70,45,30,0.35)';
  for (let i = 0; i < 4; i += 1) ctx.fillRect(40 + i * 120 + rnd() * 20, 30 + rnd() * 20, 60, 40);
  // 테이블 + 사람 실루엣
  ctx.fillStyle = 'rgba(40,25,18,0.55)';
  for (let i = 0; i < 5; i += 1) {
    const x = 30 + i * 95 + rnd() * 20;
    ctx.fillRect(x, 120, 56, 10);
    ctx.fillRect(x + 24, 130, 8, 40);
    ctx.beginPath();
    ctx.arc(x - 10, 112, 11, 0, Math.PI * 2);
    ctx.arc(x + 66, 116, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 20, 122, 20, 45);
    ctx.fillRect(x + 56, 126, 20, 45);
  }
  // 펜던트 조명
  for (let i = 0; i < 6; i += 1) {
    const x = 50 + i * 82;
    ctx.fillStyle = 'rgba(60,40,30,0.5)';
    ctx.fillRect(x - 1, 0, 2, 26);
    const r = ctx.createRadialGradient(x, 34, 2, x, 34, 22);
    r.addColorStop(0, 'rgba(255,250,225,1)');
    r.addColorStop(0.35, 'rgba(255,225,160,0.85)');
    r.addColorStop(1, 'rgba(255,210,140,0)');
    ctx.fillStyle = r;
    ctx.fillRect(x - 24, 10, 48, 48);
  }
  // 유리 반사 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(140, 0);
  ctx.lineTo(60, 192);
  ctx.lineTo(0, 192);
  ctx.closePath();
  ctx.fill();
  const t = toTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** 접지 그림자 블롭 (방사형 그라데이션) — 물체 밑에 깔아 미니어처의 접지감을 낸다 */
export function aoBlobTexture(): THREE.CanvasTexture {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(20,16,14,0.55)');
  g.addColorStop(0.55, 'rgba(20,16,14,0.22)');
  g.addColorStop(1, 'rgba(20,16,14,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = toTexture(c, [1, 1], false);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** 부드러운 원형 빛(가로등 바닥 광원용) */
export function lightPoolTexture(): THREE.CanvasTexture {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,214,150,0.55)');
  g.addColorStop(0.5, 'rgba(255,200,130,0.18)');
  g.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = toTexture(c, [1, 1]);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// ======================= 실제 동네(city) 용 텍스처 =======================

export type FacadeKind = 'brick' | 'plaster' | 'concrete' | 'charcoal' | 'tile' | 'glass';

export interface FacadeMaps {
  map: THREE.CanvasTexture;
  emissive: THREE.CanvasTexture;
}

/** 외벽 바탕만 그린다 (창문 없음). 512×256 캔버스 */
function drawFacadeBase(ctx: CanvasRenderingContext2D, kind: FacadeKind, rnd: Rng, w: number, h: number) {
  switch (kind) {
    case 'brick': {
      ctx.fillStyle = '#e0d2c2';
      ctx.fillRect(0, 0, w, h);
      const bh = 8;
      const bw = 24;
      for (let y = 0; y < h; y += bh) {
        const offset = ((y / bh) % 2) * (bw / 2);
        for (let x = -bw; x < w + bw; x += bw) {
          ctx.fillStyle = shade('#b8735e', 0.82 + rnd() * 0.32);
          ctx.fillRect(x + offset + 1, y + 1, bw - 2, bh - 2);
        }
      }
      break;
    }
    case 'plaster': {
      ctx.fillStyle = shade('#ece4d6', 0.94 + rnd() * 0.1);
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1600; i += 1) {
        ctx.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${(rnd() * 0.05).toFixed(3)})`;
        const s = 2 + rnd() * 5;
        ctx.fillRect(rnd() * w, rnd() * h, s, s);
      }
      break;
    }
    case 'concrete': {
      ctx.fillStyle = '#d3cec6';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 1200; i += 1) {
        ctx.fillStyle = `rgba(0,0,0,${(rnd() * 0.05).toFixed(3)})`;
        ctx.fillRect(rnd() * w, rnd() * h, 3, 3);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.16)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      break;
    }
    case 'charcoal': {
      ctx.fillStyle = '#3b3c41';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i += 1) {
        ctx.fillStyle = `rgba(255,255,255,${(rnd() * 0.05).toFixed(3)})`;
        ctx.fillRect(rnd() * w, rnd() * h, 3, 3);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      break;
    }
    case 'tile': {
      ctx.fillStyle = '#c9d0d3';
      ctx.fillRect(0, 0, w, h);
      const s = 16;
      for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
          ctx.fillStyle = shade('#c3cbd0', 0.9 + rnd() * 0.18);
          ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
        }
      }
      break;
    }
    default: {
      // glass: 어두운 유리 커튼월 바탕
      ctx.fillStyle = '#2e3a4c';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(180,200,220,0.35)';
      ctx.lineWidth = 2;
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
  }
  // 층 구분선 (4층 = 캔버스 높이)
  const rows = 4;
  for (let r = 1; r < rows; r += 1) {
    ctx.fillStyle = kind === 'charcoal' || kind === 'glass' ? 'rgba(0,0,0,0.35)' : 'rgba(60,50,40,0.18)';
    ctx.fillRect(0, (r * h) / rows - 2, w, 3);
  }
}

/**
 * 창문 있는 외벽 텍스처: 1 타일 = 가로 8칸(25.6m) × 4층(12.8m). 켜진 창은 emissive 맵에도 그린다.
 * 같은 kind 라도 seed 가 다르면 점등 패턴이 다르다.
 */
export function facadeWindowTextures(kind: FacadeKind, seed = 1): FacadeMaps {
  const w = 512;
  const h = 256;
  const c = makeCanvas(w, h);
  const e = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const ectx = e.getContext('2d')!;
  const rnd = seeded(seed);
  drawFacadeBase(ctx, kind, rnd, w, h);
  ectx.fillStyle = '#000';
  ectx.fillRect(0, 0, w, h);

  const cols = 8;
  const rows = 4;
  const cw = w / cols;
  const rh = h / rows;
  const tall = kind === 'glass' || kind === 'concrete' || kind === 'tile';
  const litRatio = kind === 'glass' ? 0.42 : tall ? 0.4 : 0.55;
  const frameColor = kind === 'charcoal' ? '#15161a' : kind === 'glass' ? '#1f2733' : '#3a3734';
  for (let r = 0; r < rows; r += 1) {
    // 커튼월은 층 단위로 켜지고(사무실), 칸마다 조금씩만 다르다
    const rowLit = rnd() < litRatio;
    for (let col = 0; col < cols; col += 1) {
      if (kind === 'glass') {
        const floorLit = rnd() < 0.12 ? !rowLit : rowLit;
        ctx.fillStyle = floorLit ? 'rgba(255,205,140,0.5)' : 'rgba(110,140,170,0.3)';
        ctx.fillRect(col * cw + 1, r * rh + 3, cw - 2, rh - 6);
        ctx.fillStyle = frameColor;
        ctx.fillRect(col * cw + cw / 2 - 1, r * rh, 2, rh);
        ctx.fillRect(col * cw, r * rh + rh * 0.78, cw, 3);
        if (floorLit) {
          ectx.fillStyle = 'rgba(255,200,135,0.55)';
          ectx.fillRect(col * cw + 1, r * rh + 3, cw - 2, rh - 6);
        }
        continue;
      }
      // 한 칸(3.2m)에 창 2개: 각 1.1m 폭, 1.6m 높이
      for (let k = 0; k < 2; k += 1) {
        const x = col * cw + cw * (0.12 + k * 0.5);
        const y = r * rh + rh * 0.22;
        const ww = cw * 0.3;
        const wh = rh * 0.5;
        const lit = rnd() < litRatio;
        ctx.fillStyle = frameColor;
        ctx.fillRect(x - 2, y - 2, ww + 4, wh + 4);
        ctx.fillStyle = lit ? (rnd() < 0.5 ? '#f3c27a' : '#f7d49c') : '#55606f';
        ctx.fillRect(x, y, ww, wh);
        ctx.fillStyle = lit ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)';
        ctx.fillRect(x + 1, y + 1, ww - 2, Math.max(2, wh / 3));
        ctx.fillStyle = frameColor;
        ctx.fillRect(x, y + wh / 2 - 1, ww, 2);
        // 창턱
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(x - 3, y + wh + 2, ww + 6, 2);
        if (lit) {
          ectx.fillStyle = rnd() < 0.5 ? '#e9b76f' : '#f0cc90';
          ectx.fillRect(x, y, ww, wh);
        }
      }
    }
  }
  const map = toTexture(c);
  const emissive = toTexture(e);
  return { map, emissive };
}

/**
 * 1층 상가 띠: 1 타일 = 가로 4칸(12.8m) × 층 높이. 유리 매장 + 문 + 위쪽 간판 띠(추상 글자 막대).
 * 실제 상호는 그리지 않는다 (DB 식당만 실제 이름 간판을 단다).
 */
export function shopfrontTextures(seed = 5): FacadeMaps {
  const w = 512;
  const h = 160;
  const c = makeCanvas(w, h);
  const e = makeCanvas(w, h);
  const ctx = c.getContext('2d')!;
  const ectx = e.getContext('2d')!;
  const rnd = seeded(seed);
  ctx.fillStyle = '#2a2724';
  ctx.fillRect(0, 0, w, h);
  ectx.fillStyle = '#000';
  ectx.fillRect(0, 0, w, h);
  const units = 4;
  const uw = w / units;
  const signH = 34;
  const palette = ['#c8413f', '#2f5d8a', '#e8b84a', '#3f7d5a', '#1d1a1a', '#f3ede3', '#8b2f2f'];
  for (let i = 0; i < units; i += 1) {
    const x0 = i * uw;
    const lit = rnd() < 0.8;
    // 간판 띠
    const bg = palette[Math.floor(rnd() * palette.length)];
    ctx.fillStyle = bg;
    ctx.fillRect(x0 + 3, 4, uw - 6, signH - 6);
    const dark = bg === '#1d1a1a' || bg === '#2f5d8a' || bg === '#8b2f2f' || bg === '#3f7d5a';
    const fg = dark ? '#fff2d8' : '#2b2420';
    ctx.fillStyle = fg;
    const nBars = 2 + Math.floor(rnd() * 3);
    let bx = x0 + 18;
    for (let b = 0; b < nBars; b += 1) {
      const bw = 18 + rnd() * 26;
      ctx.fillRect(bx, 12, bw, 14);
      bx += bw + 8;
      if (bx > x0 + uw - 20) break;
    }
    if (lit) {
      ectx.fillStyle = dark ? 'rgba(255,240,215,0.45)' : 'rgba(255,225,180,0.35)';
      ectx.fillRect(x0 + 3, 4, uw - 6, signH - 6);
    }
    // 유리 매장
    const gy = signH + 6;
    const gh = h - gy - 6;
    const g = ctx.createLinearGradient(0, gy, 0, gy + gh);
    if (lit) {
      g.addColorStop(0, '#ffdca8');
      g.addColorStop(0.6, '#e2ad74');
      g.addColorStop(1, '#8a6642');
    } else {
      g.addColorStop(0, '#5e6b7c');
      g.addColorStop(1, '#2f3640');
    }
    ctx.fillStyle = g;
    ctx.fillRect(x0 + 4, gy, uw - 8, gh);
    // 실내 실루엣
    ctx.fillStyle = lit ? 'rgba(40,25,18,0.45)' : 'rgba(0,0,0,0.3)';
    for (let t = 0; t < 2; t += 1) {
      const tx = x0 + 20 + t * 52 + rnd() * 10;
      ctx.fillRect(tx, gy + gh * 0.55, 30, 5);
      ctx.fillRect(tx + 12, gy + gh * 0.58, 5, gh * 0.35);
    }
    // 문 (오른쪽)
    ctx.fillStyle = '#4a3324';
    ctx.fillRect(x0 + uw - 36, gy + gh * 0.25, 26, gh * 0.75);
    ctx.fillStyle = lit ? '#ffe7bf' : '#6a7583';
    ctx.fillRect(x0 + uw - 32, gy + gh * 0.3, 18, gh * 0.4);
    // 멀리언
    ctx.fillStyle = '#2a2724';
    ctx.fillRect(x0 + uw / 2 - 2, gy, 4, gh);
    ctx.fillRect(x0 + 4, gy + gh * 0.62, uw - 8, 3);
    if (lit) {
      const eg = ectx.createLinearGradient(0, gy, 0, gy + gh);
      eg.addColorStop(0, 'rgba(255,215,160,0.85)');
      eg.addColorStop(1, 'rgba(120,80,50,0.3)');
      ectx.fillStyle = eg;
      ectx.fillRect(x0 + 4, gy, uw - 8, gh);
      ectx.fillStyle = 'rgba(0,0,0,0.5)';
      ectx.fillRect(x0 + uw - 36, gy + gh * 0.25, 26, gh * 0.75);
    }
  }
  return { map: toTexture(c), emissive: toTexture(e) };
}

/** 옥상: 회색 방수 콘크리트 + 격자, 1 타일 = 8m */
export function roofTexture(seed = 17): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8f8a83';
  ctx.fillRect(0, 0, 256, 256);
  const rnd = seeded(seed);
  for (let i = 0; i < 1600; i += 1) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${(rnd() * 0.07).toFixed(3)})`;
    ctx.fillRect(rnd() * 256, rnd() * 256, 3, 3);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  return toTexture(c);
}

/**
 * 도로: u = 진행 방향(1 타일 = 6m, 점선 주기), v = 폭 방향(0..1).
 * - lane  : 가운데 노란 점선 + 가장자리 흰 실선 (간선)
 * - plain : 가장자리 흰 실선만 (중간 도로)
 * - alley : 표시 없음 (골목·교차부 채움). 표시가 있으면 겹친 도로 위로 선이 지나가 어색하다
 */
export function roadTexture(kind: 'lane' | 'plain' | 'alley' = 'plain', seed = 19): THREE.CanvasTexture {
  const c = makeCanvas(128, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#4a4d54';
  ctx.fillRect(0, 0, 128, 256);
  const rnd = seeded(seed);
  for (let i = 0; i < 1500; i += 1) {
    ctx.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${(rnd() * 0.07).toFixed(3)})`;
    ctx.fillRect(rnd() * 128, rnd() * 256, 2, 2);
  }
  // 연석 그림자 (양 끝 v). 리본이 겹치는 곳에서 검은 줄로 도드라지지 않게 옅게
  const g1 = ctx.createLinearGradient(0, 0, 0, 9);
  g1.addColorStop(0, 'rgba(0,0,0,0.22)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, 128, 9);
  const g2 = ctx.createLinearGradient(0, 256, 0, 247);
  g2.addColorStop(0, 'rgba(0,0,0,0.22)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 247, 128, 9);
  if (kind !== 'alley') {
    // 가장자리 흰 실선
    ctx.fillStyle = 'rgba(236,233,225,0.85)';
    ctx.fillRect(0, 9, 128, 3);
    ctx.fillRect(0, 244, 128, 3);
  }
  if (kind === 'lane') {
    ctx.fillStyle = '#e2cf7a';
    ctx.fillRect(0, 126, 64, 4);
  }
  return toTexture(c);
}

/** 잔디·공원 바닥, 1 타일 = 10m */
export function grassTexture(seed = 23): THREE.CanvasTexture {
  const c = makeCanvas(256, 256);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#7fa86a';
  ctx.fillRect(0, 0, 256, 256);
  const rnd = seeded(seed);
  for (let i = 0; i < 2600; i += 1) {
    ctx.fillStyle = shade(rnd() < 0.5 ? '#6f9b5c' : '#8fb677', 0.9 + rnd() * 0.2);
    const s = 3 + rnd() * 7;
    ctx.fillRect(rnd() * 256, rnd() * 256, s, s * 0.6);
  }
  return toTexture(c);
}

/** 운동장·마당 (붉은 트랙톤) */
export function pitchTexture(seed = 27): THREE.CanvasTexture {
  const c = makeCanvas(128, 128);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#b98868';
  ctx.fillRect(0, 0, 128, 128);
  const rnd = seeded(seed);
  for (let i = 0; i < 600; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${(rnd() * 0.06).toFixed(3)})`;
    ctx.fillRect(rnd() * 128, rnd() * 128, 3, 3);
  }
  return toTexture(c);
}
