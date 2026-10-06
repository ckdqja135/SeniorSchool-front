/**
 * 횡단보도 계획 — 도로 경계 기반.
 *
 * 근거의 구분
 * - `tagged`  : 데이터에 횡단보도로 명시된 것. OpenFreeMap z14 타일의 transportation 레이어에는
 *               `footway=crossing` 태그가 실리지 않아(필드: class/subclass/brunnel/… 만) 현재는 생성되지 않는다.
 *               태그가 있는 소스로 바꾸면 `FootwayFeature.crossing` 을 true 로 주기만 하면 된다.
 * - `inferred`: 일반 보행로가 차도를 가로지르는 구간. 추정이므로 아래 검증을 모두 통과해야 그린다.
 *
 * 방법
 * 1. 보행로 폴리라인을 0.2m 간격으로 따라가며 **렌더된 차도 노면**(도로 리본 + 교차로 패드와 같은 기하) 위인지 본다.
 *    노면 위 연속 구간 하나가 후보 하나다. 구간의 양 끝이 곧 차도 경계와의 교점이다.
 * 2. 양 끝 바깥(0.6m)이 노면도 건물도 아니어야 한다 — 인도 또는 보행섬으로 이어진다는 뜻이다.
 *    보행로가 차도 한가운데서 끝나면(연결 실패) 버린다.
 * 3. 횡단 방향(보행로 방향)이 그 자리 차도 방향과 45° 이상이어야 한다. 나란하면 인도다.
 * 4. 띠 폭은 차도 폭에 비례(3.4~5.6m). 띠의 양 가장자리도 노면 위여야 한다(인도 침범 금지). 아니면 폭을 줄이고, 그래도 안 되면 버린다.
 * 5. 중복은 **면적**으로 본다. 이미 받아들인 띠와 겹치는 넓이가 작은 쪽 넓이의 30% 를 넘으면 같은 횡단 구간으로 보고 버린다.
 *
 * 그리기 규칙(호출부): 한국 지브라 표준 — 흰 막대는 차량 진행 방향과 나란하게 띠 폭을 가로지르고,
 * 사람이 건너는 방향으로 0.5m 막대 / 0.5m 간격으로 반복된다.
 */
import type { Pt } from './geo';
import type { FootwayFeature, RoadFeature } from './tiles';

export type CrosswalkSource = 'tagged' | 'inferred';

export interface CrosswalkBand {
  source: CrosswalkSource;
  /** 횡단 방향 단위 벡터 (보행로 방향) */
  dir: Pt;
  /** 차도 경계와 만나는 두 끝점 (횡단 방향 순서) */
  e0: Pt;
  e1: Pt;
  /** 띠 절반 폭 */
  half: number;
  /** 띠 네 꼭짓점 (e0 쪽 좌·우 → e1 쪽 우·좌) */
  quad: [Pt, Pt, Pt, Pt];
  /** 대표 도로 (높이·폭 기준) */
  road: RoadFeature;
  center: Pt;
}

export type RejectReason = 'short' | 'long' | 'dangling' | 'parallel' | 'sidewalk' | 'overlap' | 'blocked';

export interface CrosswalkCandidate {
  footwayId: string;
  e0: Pt;
  e1: Pt;
  accepted: boolean;
  reason?: RejectReason;
}

export interface SurfaceQuery {
  /** 렌더된 차도 노면 위인가 (도로 리본 + 교차로 패드) */
  onSurface: (p: Pt) => boolean;
  /** 점에 가장 가까운 차도와 그 자리의 진행 방향 */
  nearestRoad: (p: Pt) => { road: RoadFeature; tx: number; tz: number } | null;
  /** 건물 안인가 */
  blocked: (p: Pt) => boolean;
}

const STEP = 0.2;
const MIN_LEN = 2.5;
const MAX_LEN = 45;
const COS45 = Math.cos((45 * Math.PI) / 180);

function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, z: a.z - b.z };
}
function cross(a: Pt, b: Pt): number {
  return a.x * b.z - a.z * b.x;
}

/** 볼록 다각형 넓이 (절대값) */
export function polygonArea(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p.x * q.z - q.x * p.z;
  }
  return Math.abs(s) / 2;
}

/** 볼록 다각형 교집합 (Sutherland–Hodgman). subject 를 clip 의 각 변으로 잘라 나간다 */
export function clipConvex(subject: Pt[], clip: Pt[]): Pt[] {
  let output = subject.slice();
  const n = clip.length;
  // clip 의 방향(시계/반시계)에 맞춰 안쪽 판정 부호를 정한다
  const orient = Math.sign(polygonSigned(clip)) || 1;
  for (let i = 0; i < n && output.length > 0; i += 1) {
    const A = clip[i];
    const B = clip[(i + 1) % n];
    const input = output;
    output = [];
    const inside = (p: Pt) => cross(sub(B, A), sub(p, A)) * orient >= -1e-9;
    for (let j = 0; j < input.length; j += 1) {
      const P = input[j];
      const Q = input[(j + 1) % input.length];
      const pIn = inside(P);
      const qIn = inside(Q);
      if (pIn) output.push(P);
      if (pIn !== qIn) {
        const d1 = cross(sub(B, A), sub(P, A));
        const d2 = cross(sub(B, A), sub(Q, A));
        const t = d1 / (d1 - d2);
        output.push({ x: P.x + (Q.x - P.x) * t, z: P.z + (Q.z - P.z) * t });
      }
    }
  }
  return output;
}
function polygonSigned(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p.x * q.z - q.x * p.z;
  }
  return s / 2;
}

/** 두 볼록 사각형이 겹치는 넓이 */
export function overlapArea(a: Pt[], b: Pt[]): number {
  const inter = clipConvex(a, b);
  return inter.length >= 3 ? polygonArea(inter) : 0;
}

function bandQuad(e0: Pt, e1: Pt, dir: Pt, half: number, extend: number): [Pt, Pt, Pt, Pt] {
  const nx = -dir.z;
  const nz = dir.x;
  const s0 = { x: e0.x - dir.x * extend, z: e0.z - dir.z * extend };
  const s1 = { x: e1.x + dir.x * extend, z: e1.z + dir.z * extend };
  return [
    { x: s0.x - nx * half, z: s0.z - nz * half },
    { x: s0.x + nx * half, z: s0.z + nz * half },
    { x: s1.x + nx * half, z: s1.z + nz * half },
    { x: s1.x - nx * half, z: s1.z - nz * half },
  ];
}

/** 띠 안쪽(양 끝 0.4m 제외)의 가장자리·중심선이 모두 노면 위인지 */
function bandOnSurface(e0: Pt, e1: Pt, dir: Pt, half: number, q: SurfaceQuery): boolean {
  const len = Math.hypot(e1.x - e0.x, e1.z - e0.z);
  const nx = -dir.z;
  const nz = dir.x;
  for (let t = 0.4; t <= len - 0.4; t += 0.5) {
    for (const side of [-half, 0, half]) {
      const p = { x: e0.x + dir.x * t + nx * side, z: e0.z + dir.z * t + nz * side };
      if (!q.onSurface(p)) return false;
    }
  }
  return true;
}

export interface PlanResult {
  bands: CrosswalkBand[];
  candidates: CrosswalkCandidate[];
}

/**
 * 보행로 목록에서 횡단보도 띠를 계획한다.
 * `existing` 은 이웃 셀이 이미 확정한 띠(중복 판정용).
 */
export function planCrosswalks(footways: FootwayFeature[], q: SurfaceQuery, existing: CrosswalkBand[] = []): PlanResult {
  const bands: CrosswalkBand[] = [];
  const candidates: CrosswalkCandidate[] = [];
  const accepted: CrosswalkBand[] = [...existing];

  const reject = (footwayId: string, e0: Pt, e1: Pt, reason: RejectReason) => {
    candidates.push({ footwayId, e0, e1, accepted: false, reason });
  };

  for (const f of footways) {
    // 폴리라인 전체를 한 번에 따라간다 (교차 구간이 세그먼트 경계에 걸쳐도 끊기지 않게)
    const pts = f.pts;
    if (pts.length < 2) continue;
    const cum: number[] = [0];
    for (let i = 1; i < pts.length; i += 1) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    const total = cum[cum.length - 1];
    if (total < 1) continue;
    const at = (d: number): { p: Pt; dir: Pt } => {
      let i = 0;
      while (i + 1 < cum.length - 1 && cum[i + 1] < d) i += 1;
      const a = pts[i];
      const b = pts[i + 1];
      const segLen = cum[i + 1] - cum[i] || 1;
      const t = Math.max(0, Math.min(1, (d - cum[i]) / segLen));
      return { p: { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }, dir: { x: (b.x - a.x) / segLen, z: (b.z - a.z) / segLen } };
    };

    // 노면 위 연속 구간
    const runs: { d0: number; d1: number; hitsEnd: boolean; hitsStart: boolean }[] = [];
    let start = -1;
    for (let k = 0; ; k += 1) {
      const d = Math.min(total, k * STEP);
      const on = q.onSurface(at(d).p);
      if (on && start < 0) start = d;
      if ((!on || d >= total) && start >= 0) {
        runs.push({ d0: start, d1: on ? d : d - STEP, hitsStart: start <= 0, hitsEnd: on && d >= total });
        start = -1;
      }
      if (d >= total) break;
    }

    for (const run of runs) {
      const A = at(run.d0);
      const B = at(run.d1);
      const e0 = A.p;
      const e1 = B.p;
      const len = Math.hypot(e1.x - e0.x, e1.z - e0.z);
      const id = f.id;
      if (len < MIN_LEN) {
        reject(id, e0, e1, 'short');
        continue;
      }
      if (len > MAX_LEN) {
        reject(id, e0, e1, 'long');
        continue;
      }
      // 연결: 보행로가 차도 안에서 시작/끝나면 안 된다. 양 끝 바깥 0.6m 는 노면·건물이 아니어야 한다
      if (run.hitsStart || run.hitsEnd) {
        reject(id, e0, e1, 'dangling');
        continue;
      }
      const dir = { x: (e1.x - e0.x) / len, z: (e1.z - e0.z) / len };
      const out0 = { x: e0.x - dir.x * 0.6, z: e0.z - dir.z * 0.6 };
      const out1 = { x: e1.x + dir.x * 0.6, z: e1.z + dir.z * 0.6 };
      if (q.onSurface(out0) || q.onSurface(out1)) {
        reject(id, e0, e1, 'dangling');
        continue;
      }
      if (q.blocked(out0) || q.blocked(out1)) {
        reject(id, e0, e1, 'blocked');
        continue;
      }
      // 방향: 가운데 지점의 차도와 45° 이상
      const mid = { x: (e0.x + e1.x) / 2, z: (e0.z + e1.z) / 2 };
      const near = q.nearestRoad(mid);
      if (!near) {
        reject(id, e0, e1, 'dangling');
        continue;
      }
      if (Math.abs(dir.x * near.tx + dir.z * near.tz) > COS45) {
        reject(id, e0, e1, 'parallel');
        continue;
      }
      // 폭: 차도 폭 비례, 가장자리가 노면을 벗어나면 줄인다
      let half = Math.min(2.8, Math.max(1.7, near.road.width * 0.2));
      let ok = bandOnSurface(e0, e1, dir, half, q);
      if (!ok) {
        half *= 0.7;
        ok = bandOnSurface(e0, e1, dir, half, q);
      }
      if (!ok) {
        reject(id, e0, e1, 'sidewalk');
        continue;
      }
      const quad = bandQuad(e0, e1, dir, half, 0.15);
      const area = polygonArea(quad);
      let dup = false;
      for (const b of accepted) {
        const ov = overlapArea(quad, b.quad);
        if (ov > 0.3 * Math.min(area, polygonArea(b.quad))) {
          dup = true;
          break;
        }
      }
      if (dup) {
        reject(id, e0, e1, 'overlap');
        continue;
      }
      const band: CrosswalkBand = { source: f.crossing ? 'tagged' : 'inferred', dir, e0, e1, half, quad, road: near.road, center: mid };
      accepted.push(band);
      bands.push(band);
      candidates.push({ footwayId: id, e0, e1, accepted: true });
    }
  }
  return { bands, candidates };
}

/** 점이 어떤 띠(여유 margin 포함) 안에 있는가 — 가로수·가로등 배치 제외용 */
export function makeCrosswalkTester(bands: CrosswalkBand[], margin = 1.2): (p: Pt) => boolean {
  return (p: Pt) => {
    for (const b of bands) {
      const dx = p.x - b.center.x;
      const dz = p.z - b.center.z;
      const along = dx * b.dir.x + dz * b.dir.z;
      const across = -dx * b.dir.z + dz * b.dir.x;
      const halfLen = Math.hypot(b.e1.x - b.e0.x, b.e1.z - b.e0.z) / 2 + margin;
      if (Math.abs(along) <= halfLen && Math.abs(across) <= b.half + margin) return true;
    }
    return false;
  };
}
