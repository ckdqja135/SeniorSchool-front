/**
 * 디오라마 시제품 씬 (three.js).
 *
 * 목표: 참고 시안의 '해 질 무렵 미니어처 동네' 인상 — 비스듬한 부감, 낮은 상업 건물, 건물마다 다른 외벽,
 * 유리창·출입구·한글 간판·옥상 테라스, 따뜻한 실내 조명과 가로등, 그림자, 보행로·횡단보도·가로수·사람·차.
 *
 * 한계(정직하게): 외부 3D 자산(스캔 재질, 사람·차 모델, HDRI) 없이 절차적 기하와 캔버스 텍스처만 쓰므로
 * 사진 같은 실사가 아니라 '스타일라이즈드 모형' 수준이다. 사람·차·나무는 단순 형태(로우폴리)다.
 *
 * 구조
 * - createDioramaScene(container, opts) → 핸들 { setSelected, focus, zoomBy, rotateBy, resetView, resize, dispose }
 * - 창문·전구는 InstancedMesh 로 묶어 드로우콜을 줄인다.
 * - 핀은 DOM 요소(호출부가 등록)를 매 프레임 투영 좌표로 옮기고, 겹치면 라벨을 접거나 숨긴다(선택 핀 최우선).
 * - 선택된 식당: 정문 앞에 줄 선 사람들 + 바닥 링 강조 + 카메라 타깃 이동.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  BLOCK_END,
  BUILDINGS,
  CARS,
  LAMPS,
  LOT_START,
  OUTER_BUILDINGS,
  OUTER_ROAD,
  PEOPLE,
  PROTOTYPE_RESTAURANTS,
  ROAD_HALF,
  SIDEWALK_W,
  TREES,
  type BuildingDef,
  type CarDef,
  type Side,
} from './layout';
import {
  aoBlobTexture,
  asphaltTexture,
  awningTexture,
  brickTexture,
  concreteTexture,
  crosswalkTexture,
  interiorTexture,
  lightPoolTexture,
  pavingTexture,
  plasterTexture,
  seeded,
  signTexture,
  wallTextTexture,
  woodTexture,
  type Rng,
} from './textures';

export interface PinProjection {
  x: number;
  y: number;
  depth: number;
  visible: boolean;
}

export interface DioramaOptions {
  reducedMotion: boolean;
  onSelect: (id: string | null) => void;
  /** 핀 DOM 요소(식당 id → 래퍼). 렌더러가 transform 과 data-mode 를 직접 갱신한다 */
  pinElements: () => Map<string, HTMLDivElement>;
  selectedId: () => string | null;
}

export interface DioramaHandle {
  setSelected(id: string | null): void;
  focus(id: string): void;
  zoomBy(factor: number): void;
  rotateBy(deltaRad: number): void;
  resetView(): void;
  resize(): void;
  dispose(): void;
}

// ---------- 공용 헬퍼 ----------

interface SideFrame {
  center: THREE.Vector3; // 면 중심(바닥 높이)
  outward: THREE.Vector3;
  along: THREE.Vector3;
  len: number;
  rotY: number;
}

function sideFrame(def: BuildingDef, side: Side): SideFrame {
  const { x, z, w, d } = def;
  switch (side) {
    case 'n':
      return { center: new THREE.Vector3(x, 0, z - d / 2), outward: new THREE.Vector3(0, 0, -1), along: new THREE.Vector3(-1, 0, 0), len: w, rotY: Math.PI };
    case 's':
      return { center: new THREE.Vector3(x, 0, z + d / 2), outward: new THREE.Vector3(0, 0, 1), along: new THREE.Vector3(1, 0, 0), len: w, rotY: 0 };
    case 'e':
      return { center: new THREE.Vector3(x + w / 2, 0, z), outward: new THREE.Vector3(1, 0, 0), along: new THREE.Vector3(0, 0, -1), len: d, rotY: Math.PI / 2 };
    default:
      return { center: new THREE.Vector3(x - w / 2, 0, z), outward: new THREE.Vector3(-1, 0, 0), along: new THREE.Vector3(0, 0, 1), len: d, rotY: -Math.PI / 2 };
  }
}

function hashSeed(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 233280;
  return h + 17;
}

/** 인스턴스 수집기 (창문·전구) */
class InstanceCollector {
  readonly matrices: THREE.Matrix4[] = [];
  add(pos: THREE.Vector3, rotY: number, scale = 1) {
    const m = new THREE.Matrix4();
    m.compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), new THREE.Vector3(scale, scale, scale));
    this.matrices.push(m);
  }
  build(geometry: THREE.BufferGeometry, material: THREE.Material, castShadow = false): THREE.InstancedMesh | null {
    if (this.matrices.length === 0) return null;
    const mesh = new THREE.InstancedMesh(geometry, material, this.matrices.length);
    this.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = false;
    return mesh;
  }
}

class Materials {
  readonly ao: THREE.MeshBasicMaterial;
  readonly lightPool: THREE.MeshBasicMaterial;
  readonly dark = new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.7, metalness: 0.1 });
  readonly frame = new THREE.MeshStandardMaterial({ color: '#3a3734', roughness: 0.6, metalness: 0.2 });
  readonly glassLit = new THREE.MeshStandardMaterial({
    color: '#ffd9a0',
    emissive: new THREE.Color('#ffc978'),
    emissiveIntensity: 1.25,
    roughness: 0.25,
    metalness: 0.1,
  });
  readonly glassDark = new THREE.MeshStandardMaterial({ color: '#6c7a8c', roughness: 0.15, metalness: 0.55 });
  readonly bulb = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color('#ffe2a8'), emissiveIntensity: 2.4 });
  readonly roofDark = new THREE.MeshStandardMaterial({ color: '#8b857e', roughness: 0.95 });
  readonly deck: THREE.MeshStandardMaterial;
  readonly asphalt: THREE.MeshStandardMaterial;
  readonly paving: THREE.MeshStandardMaterial;
  readonly pavingCourt: THREE.MeshStandardMaterial;
  readonly crosswalk: THREE.MeshStandardMaterial;
  readonly laneYellow = new THREE.MeshStandardMaterial({ color: '#e6d27f', roughness: 0.8 });
  readonly laneWhite = new THREE.MeshStandardMaterial({ color: '#efece4', roughness: 0.8 });
  readonly trunk = new THREE.MeshStandardMaterial({ color: '#5b4331', roughness: 0.9 });
  readonly canopies = ['#5f8f4e', '#6e9b57', '#7fae63', '#557f45'].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }),
  );
  readonly pole = new THREE.MeshStandardMaterial({ color: '#33343a', roughness: 0.6, metalness: 0.4 });
  readonly lampHead = new THREE.MeshStandardMaterial({ color: '#fff0cc', emissive: new THREE.Color('#ffdca0'), emissiveIntensity: 2.2 });
  readonly wheel = new THREE.MeshStandardMaterial({ color: '#1d1e21', roughness: 0.9 });
  readonly carGlass = new THREE.MeshStandardMaterial({ color: '#2b3440', roughness: 0.2, metalness: 0.5 });
  readonly headlight = new THREE.MeshStandardMaterial({ color: '#fff7dc', emissive: new THREE.Color('#fff0c0'), emissiveIntensity: 2.5 });
  readonly taillight = new THREE.MeshStandardMaterial({ color: '#ff5a4a', emissive: new THREE.Color('#ff3b2e'), emissiveIntensity: 1.8 });
  readonly skin = new THREE.MeshStandardMaterial({ color: '#e7c3a3', roughness: 0.8 });
  readonly hair = new THREE.MeshStandardMaterial({ color: '#2b2119', roughness: 0.9 });
  readonly pants = new THREE.MeshStandardMaterial({ color: '#2f3340', roughness: 0.9 });
  readonly shirts = ['#d95d5d', '#f0e6d2', '#6d8fbf', '#ecc06a', '#7fa77d', '#5b4a68', '#e9e9ee'].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }),
  );
  readonly planter = new THREE.MeshStandardMaterial({ color: '#6b4c3a', roughness: 0.9 });
  readonly foliage = new THREE.MeshStandardMaterial({ color: '#4f8544', roughness: 0.9, flatShading: true });
  readonly tableTop = new THREE.MeshStandardMaterial({ color: '#c9a173', roughness: 0.7 });
  readonly railing = new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.5, metalness: 0.5 });
  readonly ring = new THREE.MeshBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.8, depthWrite: false });
  readonly facadeCache = new Map<string, THREE.MeshStandardMaterial>();
  readonly textures: THREE.Texture[] = [];

  constructor() {
    const ao = aoBlobTexture();
    const pool = lightPoolTexture();
    this.textures.push(ao, pool);
    this.ao = new THREE.MeshBasicMaterial({ map: ao, transparent: true, depthWrite: false });
    this.lightPool = new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const asphalt = asphaltTexture();
    const paving = pavingTexture();
    const court = pavingTexture(29);
    const cross = crosswalkTexture();
    const deck = woodTexture('#a9895f', 21);
    deck.repeat.set(4, 4);
    this.textures.push(asphalt, paving, court, cross, deck);
    this.asphalt = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 });
    this.paving = new THREE.MeshStandardMaterial({ map: paving, roughness: 0.9 });
    this.pavingCourt = new THREE.MeshStandardMaterial({ map: court, color: '#d9d2c6', roughness: 0.9 });
    this.crosswalk = new THREE.MeshStandardMaterial({ map: cross, transparent: true, roughness: 0.9, depthWrite: false });
    this.deck = new THREE.MeshStandardMaterial({ map: deck, roughness: 0.8 });
  }

  facade(def: BuildingDef): THREE.MeshStandardMaterial {
    const key = `${def.facade}:${def.color}:${Math.round(def.w)}x${Math.round(def.d)}x${def.floors}`;
    const cached = this.facadeCache.get(key);
    if (cached) return cached;
    const seed = hashSeed(def.id);
    let tex: THREE.CanvasTexture;
    switch (def.facade) {
      case 'brick':
        tex = brickTexture(def.color, '#e3d6c6', seed);
        break;
      case 'plaster':
        tex = plasterTexture(def.color, seed);
        break;
      case 'concrete':
        tex = concreteTexture(def.color, seed);
        break;
      case 'wood':
        tex = woodTexture(def.color, seed);
        break;
      default:
        tex = concreteTexture(def.color, seed);
    }
    // 텍스처 1타일 ≈ 3m
    tex.repeat.set(Math.max(1, def.w / 3), Math.max(1, (def.floors * def.floorH) / 3));
    this.textures.push(tex);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: def.facade === 'charcoal' ? 0.55 : 0.9,
      metalness: def.facade === 'charcoal' ? 0.25 : 0,
    });
    this.facadeCache.set(key, mat);
    return mat;
  }

  dispose() {
    this.textures.forEach((t) => t.dispose());
    this.facadeCache.forEach((m) => m.dispose());
    [
      this.ao, this.lightPool, this.dark, this.frame, this.glassLit, this.glassDark, this.bulb, this.roofDark, this.deck,
      this.asphalt, this.paving, this.pavingCourt, this.crosswalk, this.laneYellow, this.laneWhite, this.trunk, this.pole,
      this.lampHead, this.wheel, this.carGlass, this.headlight, this.taillight, this.skin, this.hair, this.pants, this.planter,
      this.foliage, this.tableTop, this.railing, this.ring, ...this.canopies, ...this.shirts,
    ].forEach((m) => m.dispose());
  }
}

/** 인도·안마당 높이(연석) */
const SIDEWALK_H = 0.16;

// ---------- 지오메트리 (공유) ----------
const G = {
  windowFrame: new THREE.BoxGeometry(1.75, 1.95, 0.1),
  windowGlass: new THREE.BoxGeometry(1.5, 1.7, 0.06),
  bulb: new THREE.SphereGeometry(0.09, 6, 5),
  unitBox: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  trunk: new THREE.CylinderGeometry(0.14, 0.24, 2.4, 7),
  canopy: new THREE.IcosahedronGeometry(1, 1),
  pole: new THREE.CylinderGeometry(0.07, 0.11, 4.6, 8),
  wheel: new THREE.CylinderGeometry(0.34, 0.34, 0.26, 12),
  legs: new THREE.CylinderGeometry(0.16, 0.19, 0.85, 8),
  torso: new THREE.CylinderGeometry(0.21, 0.17, 0.78, 8),
  head: new THREE.SphereGeometry(0.165, 10, 8),
  tableTop: new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12),
  tablePost: new THREE.CylinderGeometry(0.05, 0.07, 0.75, 6),
  ring: new THREE.RingGeometry(3.2, 3.9, 40),
};

function box(w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(G.unitBox, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}

function aoBlob(mats: Materials, w: number, d: number, x = 0, z = 0, y = 0.015): THREE.Mesh {
  const m = new THREE.Mesh(G.plane, mats.ao);
  m.rotation.x = -Math.PI / 2;
  m.scale.set(w, d, 1);
  m.position.set(x, y, z);
  m.renderOrder = 1;
  return m;
}

// ---------- 건물 ----------

export interface BuiltBuilding {
  group: THREE.Group;
  def: BuildingDef;
  anchor: THREE.Vector3;
  door: { pos: THREE.Vector3; outward: THREE.Vector3; along: THREE.Vector3 };
  hit: THREE.Object3D[];
}

interface BuildContext {
  mats: Materials;
  windows: { lit: InstanceCollector; dark: InstanceCollector; frame: InstanceCollector };
  bulbs: InstanceCollector;
  detailed: boolean;
}

function addWindows(ctx: BuildContext, def: BuildingDef, side: Side, rnd: Rng, floorsFrom: number) {
  const f = sideFrame(def, side);
  const cell = 3.1;
  const count = Math.max(1, Math.floor((f.len - 2.2) / cell));
  const start = -((count - 1) * cell) / 2;
  for (let floor = floorsFrom; floor < def.floors; floor += 1) {
    const y = floor * def.floorH + def.floorH * 0.56;
    for (let i = 0; i < count; i += 1) {
      const a = start + i * cell;
      const base = f.center.clone().addScaledVector(f.along, a).setY(y);
      ctx.windows.frame.add(base.clone().addScaledVector(f.outward, 0.03), f.rotY);
      const lit = rnd() < def.litRatio;
      (lit ? ctx.windows.lit : ctx.windows.dark).add(base.clone().addScaledVector(f.outward, 0.07), f.rotY);
    }
  }
}

function addFloorBands(def: BuildingDef, mats: Materials, group: THREE.Group) {
  if (def.facade !== 'plaster' && def.facade !== 'concrete') return;
  const mat = new THREE.MeshStandardMaterial({ color: def.trimColor ?? '#cdc4b6', roughness: 0.9 });
  for (let floor = 1; floor < def.floors; floor += 1) {
    group.add(box(def.w + 0.24, 0.16, def.d + 0.24, mat, def.x, floor * def.floorH, def.z));
  }
}

function addRoof(ctx: BuildContext, def: BuildingDef, group: THREE.Group, rnd: Rng) {
  const { mats } = ctx;
  const H = def.floors * def.floorH;
  const roofMat = def.roof === 'terrace' ? mats.deck : mats.roofDark;
  const roof = new THREE.Mesh(G.plane, roofMat);
  roof.rotation.x = -Math.PI / 2;
  roof.scale.set(def.w - 0.05, def.d - 0.05, 1);
  roof.position.set(def.x, H + 0.02, def.z);
  roof.receiveShadow = true;
  group.add(roof);

  const parapetH = def.roof === 'terrace' ? 0.3 : def.roof === 'flat' ? 0.2 : 0.7;
  const parapetMat = new THREE.MeshStandardMaterial({ color: def.trimColor ?? (def.facade === 'charcoal' ? '#4a4a4f' : '#d2c9bb'), roughness: 0.9 });
  const t = 0.3;
  group.add(box(def.w + 0.1, parapetH, t, parapetMat, def.x, H + parapetH / 2, def.z - def.d / 2 + t / 2));
  group.add(box(def.w + 0.1, parapetH, t, parapetMat, def.x, H + parapetH / 2, def.z + def.d / 2 - t / 2));
  group.add(box(t, parapetH, def.d + 0.1, parapetMat, def.x - def.w / 2 + t / 2, H + parapetH / 2, def.z));
  group.add(box(t, parapetH, def.d + 0.1, parapetMat, def.x + def.w / 2 - t / 2, H + parapetH / 2, def.z));

  if (!ctx.detailed) return;

  if (def.roof === 'hvac') {
    const grey = new THREE.MeshStandardMaterial({ color: '#b8b6b2', roughness: 0.7, metalness: 0.3 });
    const n = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i += 1) {
      const bw = 1.6 + rnd() * 1.2;
      group.add(box(bw, 1.0 + rnd() * 0.6, bw, grey, def.x - def.w / 4 + rnd() * (def.w / 2), H + 0.5, def.z - def.d / 4 + rnd() * (def.d / 2)));
    }
    // 옥탑 계단실
    group.add(box(3.2, 2.6, 2.6, mats.facade(def), def.x + def.w / 2 - 2.6, H + 1.3, def.z + def.d / 2 - 2.4));
  }

  if (def.roof === 'terrace') {
    // 난간
    const inset = 0.55;
    const railH = 1.05;
    const edges: [number, number, number, number][] = [
      [def.x, def.z - def.d / 2 + inset, def.w - inset * 2, 0],
      [def.x, def.z + def.d / 2 - inset, def.w - inset * 2, 0],
      [def.x - def.w / 2 + inset, def.z, def.d - inset * 2, 1],
      [def.x + def.w / 2 - inset, def.z, def.d - inset * 2, 1],
    ];
    for (const [ex, ez, len, vertical] of edges) {
      group.add(vertical ? box(0.05, 0.05, len, mats.railing, ex, H + railH, ez, false) : box(len, 0.05, 0.05, mats.railing, ex, H + railH, ez, false));
      const posts = Math.max(2, Math.floor(len / 2));
      for (let i = 0; i <= posts; i += 1) {
        const a = -len / 2 + (i * len) / posts;
        group.add(box(0.06, railH, 0.06, mats.railing, vertical ? ex : ex + a, H + railH / 2, vertical ? ez + a : ez, false));
      }
    }
    // 퍼걸러 (한쪽 모서리)
    const px = def.x + def.w / 2 - 4.2;
    const pz = def.z - def.d / 2 + 3.6;
    const pw = 6;
    const pd = 4.6;
    const ph = 2.7;
    const wood = new THREE.MeshStandardMaterial({ color: '#7d5f42', roughness: 0.85 });
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      group.add(box(0.18, ph, 0.18, wood, px + (sx * pw) / 2, H + ph / 2, pz + (sz * pd) / 2));
    }
    for (let i = 0; i < 6; i += 1) {
      group.add(box(0.12, 0.16, pd + 0.4, wood, px - pw / 2 + (i * pw) / 5, H + ph + 0.08, pz));
    }
    group.add(box(pw + 0.4, 0.14, 0.12, wood, px, H + ph, pz - pd / 2));
    group.add(box(pw + 0.4, 0.14, 0.12, wood, px, H + ph, pz + pd / 2));
    // 전구 줄 (퍼걸러 → 반대편 난간)
    const bulbSpan = (from: THREE.Vector3, to: THREE.Vector3) => {
      const n = 11;
      for (let i = 0; i <= n; i += 1) {
        const tt = i / n;
        const p = from.clone().lerp(to, tt);
        p.y -= Math.sin(tt * Math.PI) * 0.45;
        ctx.bulbs.add(p, 0, 1);
      }
    };
    const farX = def.x - def.w / 2 + inset;
    const farZ = def.z + def.d / 2 - inset;
    bulbSpan(new THREE.Vector3(px - pw / 2, H + ph, pz + pd / 2), new THREE.Vector3(farX, H + 2.3, pz + pd / 2 + 1));
    bulbSpan(new THREE.Vector3(px + pw / 2, H + ph, pz + pd / 2), new THREE.Vector3(px + pw / 2 - 1, H + 2.3, farZ));
    bulbSpan(new THREE.Vector3(px - pw / 2, H + ph, pz - pd / 2), new THREE.Vector3(farX, H + 2.3, pz - pd / 2 + 0.5));
    // 테이블·의자
    for (let i = 0; i < 3; i += 1) {
      const tx = def.x - def.w / 2 + 3 + i * 4.2;
      const tz = def.z + def.d / 2 - 3.2;
      if (tx > def.x + def.w / 2 - 2) break;
      const top = new THREE.Mesh(G.tableTop, mats.tableTop);
      top.position.set(tx, H + 0.78, tz);
      top.castShadow = true;
      group.add(top);
      const post = new THREE.Mesh(G.tablePost, mats.railing);
      post.position.set(tx, H + 0.38, tz);
      group.add(post);
      group.add(box(0.42, 0.42, 0.42, mats.railing, tx - 0.95, H + 0.24, tz, false));
      group.add(box(0.42, 0.42, 0.42, mats.railing, tx + 0.95, H + 0.24, tz, false));
    }
    // 화분
    for (let i = 0; i < 4; i += 1) {
      const fx = def.x - def.w / 2 + 1.4 + (i * (def.w - 2.8)) / 3;
      const fz = def.z - def.d / 2 + 1.2;
      group.add(box(1.2, 0.55, 0.55, mats.planter, fx, H + 0.28, fz));
      const fol = new THREE.Mesh(G.canopy, mats.foliage);
      fol.scale.set(0.7, 0.45, 0.4);
      fol.position.set(fx, H + 0.85, fz);
      fol.castShadow = true;
      group.add(fol);
    }
  }
}

function addStorefront(ctx: BuildContext, def: BuildingDef, group: THREE.Group): { anchor: THREE.Vector3; door: BuiltBuilding['door'] } {
  const { mats } = ctx;
  const sf = def.storefront!;
  const f = sideFrame(def, def.front);
  const front = new THREE.Group();
  front.position.copy(f.center);
  front.rotation.y = f.rotY;
  group.add(front);

  const H0 = def.floorH;
  const width = f.len * 0.86;
  // 프레임(어두운 금속) + 유리(실내 조명)
  front.add(box(width, H0 - 0.35, 0.36, mats.dark, 0, (H0 - 0.35) / 2 + 0.18, 0.16));
  const interiorTex = interiorTexture(sf.interior, hashSeed(sf.restaurantId));
  mats.textures.push(interiorTex);
  const interior = new THREE.MeshStandardMaterial({
    map: interiorTex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: interiorTex,
    emissiveIntensity: 0.95,
    roughness: 0.2,
    metalness: 0.05,
  });
  const glassW = width - 0.5;
  const glassH = H0 - 1.05;
  const glass = new THREE.Mesh(G.plane, interior);
  glass.scale.set(glassW, glassH, 1);
  glass.position.set(0, glassH / 2 + 0.55, 0.345);
  front.add(glass);
  // 멀리언
  const mull = 4;
  for (let i = 1; i < mull; i += 1) {
    front.add(box(0.07, glassH, 0.05, mats.dark, -glassW / 2 + (i * glassW) / mull, glassH / 2 + 0.55, 0.36, false));
  }
  front.add(box(glassW, 0.07, 0.05, mats.dark, 0, glassH * 0.62 + 0.55, 0.36, false));
  // 출입구 (오른쪽)
  const doorX = width * 0.32;
  const doorMat = new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.6 });
  front.add(box(1.4, 2.5, 0.08, doorMat, doorX, 1.25 + 0.08, 0.37, false));
  front.add(box(0.05, 0.4, 0.05, mats.lampHead, doorX - 0.5, 1.4, 0.42, false));
  front.add(box(2.4, 0.14, 1.0, mats.paving, doorX, SIDEWALK_H + 0.07, 0.9));
  // 실내 인영: 테이블 실루엣(유리 뒤가 아닌 앞쪽 살짝 안쪽처럼 보이는 어두운 박스)
  // (유리 뒤 공간이 없으므로 생략 — 프레임 안쪽 어둡게 보이는 것으로 대체)

  // 차양
  if (sf.awning) {
    const tex = awningTexture(sf.awning.a, sf.awning.b);
    mats.textures.push(tex);
    const aw = new THREE.Mesh(G.unitBox, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
    aw.scale.set(width * 0.7, 0.06, 1.8);
    aw.position.set(-width * 0.08, H0 - 0.55, 1.15);
    aw.rotation.x = 0.32;
    aw.castShadow = true;
    front.add(aw);
    for (const sx of [-1, 1]) {
      const bar = box(0.05, 0.05, 1.7, mats.railing, -width * 0.08 + (sx * width * 0.7) / 2, H0 - 0.22, 0.95, false);
      bar.rotation.x = -0.35;
      front.add(bar);
    }
  }

  // 가로 간판
  const signTex = signTexture(sf.name, { bg: sf.signBg, fg: sf.signFg, glow: sf.signStyle === 'neon' ? '#ff8f7a' : undefined });
  mats.textures.push(signTex);
  const emissiveStrength = sf.signStyle === 'wood' ? 0.22 : sf.signStyle === 'neon' ? 1.3 : 0.9;
  const signMat = new THREE.MeshStandardMaterial({ map: signTex, emissive: new THREE.Color('#ffffff'), emissiveMap: signTex, emissiveIntensity: emissiveStrength, roughness: 0.5 });
  const sideMat = new THREE.MeshStandardMaterial({ color: sf.signBg, roughness: 0.6, metalness: 0.2 });
  const signW = f.len * 0.72;
  const signH = 1.05;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(signW, signH, 0.18), [sideMat, sideMat, sideMat, sideMat, signMat, sideMat]);
  sign.position.set(0, H0 + 0.62, 0.28);
  sign.castShadow = true;
  front.add(sign);
  // 간판 조명(작은 스포트 형태의 갓)
  for (let i = -1; i <= 1; i += 1) {
    front.add(box(0.28, 0.08, 0.5, mats.railing, (i * signW) / 3, H0 + 1.28, 0.45, false));
  }

  // 세로 간판 (벽에 직각으로 튀어나온 돌출 간판)
  if (sf.verticalSignCorner) {
    const vTex = signTexture(sf.name, { bg: sf.signBg, fg: sf.signFg, vertical: true, glow: sf.signStyle === 'neon' ? '#ff8f7a' : undefined });
    mats.textures.push(vTex);
    const vMat = new THREE.MeshStandardMaterial({ map: vTex, emissive: new THREE.Color('#ffffff'), emissiveMap: vTex, emissiveIntensity: emissiveStrength, roughness: 0.5 });
    // BoxGeometry 의 +x/−x 면은 각각 바깥에서 볼 때 읽히는 방향으로 UV 가 잡혀 있어 같은 텍스처를 쓰면 된다
    const vH = Math.min(def.floors * def.floorH - 1.2, 4.6);
    const vs = new THREE.Mesh(new THREE.BoxGeometry(0.2, vH, 1.1), [vMat, vMat, sideMat, sideMat, sideMat, sideMat]);
    const cx = (sf.verticalSignCorner === 'right' ? 1 : -1) * (f.len / 2 - 0.35);
    vs.position.set(cx, def.floors * def.floorH - vH / 2 - 0.35, 0.62);
    vs.castShadow = true;
    front.add(vs);
    front.add(box(0.08, 0.08, 0.7, mats.railing, cx, def.floors * def.floorH - 0.6, 0.3, false));
  }

  // 핀 앵커: 간판 위
  const anchorLocal = new THREE.Vector3(0, H0 + 1.7, 0.4);
  const anchor = anchorLocal.applyMatrix4(new THREE.Matrix4().makeRotationY(f.rotY)).add(f.center);
  const doorLocal = new THREE.Vector3(doorX, 0, 1.4);
  const doorPos = doorLocal.applyMatrix4(new THREE.Matrix4().makeRotationY(f.rotY)).add(f.center);
  return { anchor, door: { pos: doorPos, outward: f.outward.clone(), along: f.along.clone() } };
}

function buildBuilding(ctx: BuildContext, def: BuildingDef): BuiltBuilding {
  const { mats } = ctx;
  const group = new THREE.Group();
  const rnd = seeded(hashSeed(def.id));
  const H = def.floors * def.floorH;

  const body = box(def.w, H, def.d, mats.facade(def), def.x, H / 2, def.z);
  body.userData.restaurantId = def.storefront?.restaurantId ?? null;
  group.add(body);
  group.add(aoBlob(mats, def.w + 3.5, def.d + 3.5, def.x, def.z, ctx.detailed ? SIDEWALK_H + 0.015 : 0.015));

  // 창문: 정면은 1층부터, 나머지 면은 지상층부터 (정면 지상층은 매장)
  const sides: Side[] = ['n', 's', 'e', 'w'];
  for (const side of sides) {
    if (!ctx.detailed && side !== def.front && side !== opposite(def.front)) continue;
    const isFront = side === def.front && !!def.storefront;
    const isGlass = def.glassSides?.includes(side);
    addWindows(ctx, def, side, rnd, isFront || isGlass ? 1 : 0);
    if (isGlass && ctx.detailed) {
      const f = sideFrame(def, side);
      const g = new THREE.Group();
      g.position.copy(f.center);
      g.rotation.y = f.rotY;
      const glassW = f.len * 0.8;
      const glassH = def.floorH - 1.0;
      g.add(box(glassW + 0.3, glassH + 0.3, 0.2, mats.dark, 0, glassH / 2 + 0.5, 0.08));
      const pane = new THREE.Mesh(
        G.plane,
        new THREE.MeshStandardMaterial({
          color: def.storefront?.interior ?? '#ffd9a3',
          emissive: new THREE.Color(def.storefront?.interior ?? '#ffd9a3'),
          emissiveIntensity: 0.75,
          roughness: 0.2,
        }),
      );
      pane.scale.set(glassW, glassH, 1);
      pane.position.set(0, glassH / 2 + 0.5, 0.19);
      g.add(pane);
      for (let i = 1; i < 5; i += 1) g.add(box(0.06, glassH, 0.04, mats.dark, -glassW / 2 + (i * glassW) / 5, glassH / 2 + 0.5, 0.21, false));
      group.add(g);
    }
  }
  addFloorBands(def, mats, group);
  addRoof(ctx, def, group, rnd);

  if (def.wallText && ctx.detailed) {
    const f = sideFrame(def, def.wallText.side);
    const tex = wallTextTexture(def.wallText.lines);
    mats.textures.push(tex);
    const m = new THREE.Mesh(G.plane, new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1 }));
    const size = Math.min(f.len * 0.6, H * 0.8);
    m.scale.set(size, size, 1);
    m.position.copy(f.center).addScaledVector(f.outward, 0.04).setY(H * 0.55);
    m.rotation.y = f.rotY;
    group.add(m);
  }

  let anchor = new THREE.Vector3(def.x, H + 1.5, def.z);
  let door: BuiltBuilding['door'] = { pos: new THREE.Vector3(def.x, 0, def.z), outward: new THREE.Vector3(0, 0, 1), along: new THREE.Vector3(1, 0, 0) };
  if (def.storefront && ctx.detailed) {
    const s = addStorefront(ctx, def, group);
    anchor = s.anchor;
    door = s.door;
  }
  return { group, def, anchor, door, hit: [body] };
}

function opposite(s: Side): Side {
  return s === 'n' ? 's' : s === 's' ? 'n' : s === 'e' ? 'w' : 'e';
}

// ---------- 거리 요소 ----------

function buildTree(mats: Materials, x: number, z: number, rnd: Rng, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const s = scale * (0.85 + rnd() * 0.3);
  const trunk = new THREE.Mesh(G.trunk, mats.trunk);
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  g.add(trunk);
  const blobs: [number, number, number, number][] = [
    [0, 3.1, 0, 1.55],
    [0.9, 2.7, 0.3, 1.15],
    [-0.8, 2.8, -0.4, 1.1],
    [0.2, 3.8, -0.6, 1.0],
  ];
  blobs.forEach(([bx, by, bz, r], i) => {
    const m = new THREE.Mesh(G.canopy, mats.canopies[(i + Math.floor(rnd() * 4)) % mats.canopies.length]);
    m.position.set(bx, by, bz);
    m.scale.setScalar(r);
    m.castShadow = true;
    g.add(m);
  });
  g.add(aoBlob(mats, 3.4, 3.4));
  g.scale.setScalar(s);
  g.rotation.y = rnd() * Math.PI * 2;
  g.position.set(x, 0, z);
  return g;
}

function buildLamp(mats: Materials, x: number, z: number, towardRoad: THREE.Vector3, withLight: boolean): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(G.pole, mats.pole);
  pole.position.y = 2.3;
  pole.castShadow = true;
  g.add(pole);
  const arm = box(0.1, 0.1, 1.1, mats.pole, 0, 4.55, 0.5, false);
  g.add(arm);
  g.add(box(0.55, 0.2, 0.32, mats.lampHead, 0, 4.45, 1.0, false));
  const pool = new THREE.Mesh(G.plane, mats.lightPool);
  pool.rotation.x = -Math.PI / 2;
  pool.scale.set(9, 9, 1);
  pool.position.set(0, 0.03, 1.2);
  pool.renderOrder = 2;
  g.add(pool);
  if (withLight) {
    const light = new THREE.PointLight('#ffd6a0', 60, 18, 2);
    light.position.set(0, 4.3, 1.0);
    g.add(light);
  }
  g.position.set(x, 0, z);
  g.rotation.y = Math.atan2(towardRoad.x, towardRoad.z);
  return g;
}

interface CarObject {
  group: THREE.Group;
  def: CarDef;
}

function buildCar(mats: Materials, def: CarDef): CarObject {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.35, metalness: 0.4 });
  g.add(box(1.9, 0.62, 4.3, bodyMat, 0, 0.62, 0));
  g.add(box(1.7, 0.6, 2.3, mats.carGlass, 0, 1.2, -0.2));
  g.add(box(1.6, 0.12, 2.1, bodyMat, 0, 1.52, -0.2, false));
  for (const [sx, sz] of [
    [-0.95, 1.35],
    [0.95, 1.35],
    [-0.95, -1.35],
    [0.95, -1.35],
  ]) {
    const w = new THREE.Mesh(G.wheel, mats.wheel);
    w.rotation.z = Math.PI / 2;
    w.position.set(sx, 0.34, sz);
    g.add(w);
  }
  g.add(box(0.36, 0.16, 0.06, mats.headlight, -0.62, 0.72, 2.16, false));
  g.add(box(0.36, 0.16, 0.06, mats.headlight, 0.62, 0.72, 2.16, false));
  g.add(box(0.36, 0.14, 0.06, mats.taillight, -0.62, 0.72, -2.16, false));
  g.add(box(0.36, 0.14, 0.06, mats.taillight, 0.62, 0.72, -2.16, false));
  g.add(aoBlob(mats, 3.0, 5.4));
  g.position.set(def.x, 0, def.z);
  g.rotation.y = def.axis === 'x' ? (def.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : def.dir > 0 ? 0 : Math.PI;
  return { group: g, def };
}

function buildPerson(mats: Materials, x: number, z: number, facing: number, rnd: Rng): THREE.Group {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(G.legs, mats.pants);
  legs.position.y = 0.43;
  legs.castShadow = true;
  g.add(legs);
  const torso = new THREE.Mesh(G.torso, mats.shirts[Math.floor(rnd() * mats.shirts.length)]);
  torso.position.y = 1.22;
  torso.castShadow = true;
  g.add(torso);
  const head = new THREE.Mesh(G.head, mats.skin);
  head.position.y = 1.78;
  g.add(head);
  const hair = new THREE.Mesh(G.head, mats.hair);
  hair.scale.set(1.02, 0.62, 1.02);
  hair.position.y = 1.86;
  g.add(hair);
  g.add(aoBlob(mats, 1.1, 1.1));
  g.scale.setScalar(0.92 + rnd() * 0.14);
  g.position.set(x, 0, z);
  g.rotation.y = facing;
  return g;
}

function buildGround(mats: Materials, scene: THREE.Scene) {
  const ground = new THREE.Mesh(G.plane, mats.paving);
  ground.rotation.x = -Math.PI / 2;
  ground.scale.set(420, 420, 1);
  ground.receiveShadow = true;
  scene.add(ground);

  const road = (w: number, len: number, x: number, z: number, rotY: number) => {
    const m = new THREE.Mesh(G.plane, mats.asphalt);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.scale.set(w, len, 1);
    m.position.set(x, 0.01, z);
    m.receiveShadow = true;
    scene.add(m);
  };
  road(ROAD_HALF * 2, 420, 0, 0, 0); // 남북
  road(ROAD_HALF * 2, 420, 0, 0, Math.PI / 2); // 동서
  const ring = (OUTER_ROAD.from + OUTER_ROAD.to) / 2;
  const ringLen = OUTER_ROAD.to * 2;
  road(12, ringLen, ring, 0, 0);
  road(12, ringLen, -ring, 0, 0);
  road(12, ringLen, 0, ring, Math.PI / 2);
  road(12, ringLen, 0, -ring, Math.PI / 2);

  // 인도 (4개 블록 둘레) + 블록 안마당
  const sw = (x: number, z: number, w: number, d: number, mat: THREE.Material) => {
    const m = box(w, SIDEWALK_H, d, mat, x, SIDEWALK_H / 2, z, true);
    m.castShadow = false;
    scene.add(m);
  };
  const a = ROAD_HALF;
  const b = OUTER_ROAD.from;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const cx = (sx * (a + b)) / 2;
      const cz = (sz * (a + b)) / 2;
      const span = b - a;
      sw(cx, sz * (a + SIDEWALK_W / 2), span, SIDEWALK_W, mats.paving);
      sw(cx, sz * (b - SIDEWALK_W / 2), span, SIDEWALK_W, mats.paving);
      sw(sx * (a + SIDEWALK_W / 2), cz, SIDEWALK_W, span, mats.paving);
      sw(sx * (b - SIDEWALK_W / 2), cz, SIDEWALK_W, span, mats.paving);
      const inner = BLOCK_END - LOT_START;
      sw((sx * (LOT_START + BLOCK_END)) / 2, (sz * (LOT_START + BLOCK_END)) / 2, inner, inner, mats.pavingCourt);
    }
  }

  // 횡단보도 (4방향)
  const cross = (x: number, z: number, rotY: number) => {
    const m = new THREE.Mesh(G.plane, mats.crosswalk);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.scale.set(10.4, 3.2, 1);
    m.position.set(x, 0.025, z);
    m.renderOrder = 3;
    scene.add(m);
  };
  const cd = ROAD_HALF + 2.2;
  cross(0, -cd, Math.PI / 2);
  cross(0, cd, Math.PI / 2);
  cross(-cd, 0, 0);
  cross(cd, 0, 0);

  // 차선: 중앙 점선 + 가장자리 실선 + 정지선
  const dash = (x: number, z: number, rotY: number) => {
    const m = new THREE.Mesh(G.plane, mats.laneYellow);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.scale.set(0.16, 2.2, 1);
    m.position.set(x, 0.02, z);
    scene.add(m);
  };
  for (let p = 14; p < 200; p += 4.5) {
    dash(0, p, 0);
    dash(0, -p, 0);
    dash(p, 0, Math.PI / 2);
    dash(-p, 0, Math.PI / 2);
  }
  const edge = (x: number, z: number, rotY: number, len: number) => {
    const m = new THREE.Mesh(G.plane, mats.laneWhite);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.scale.set(0.12, len, 1);
    m.position.set(x, 0.02, z);
    scene.add(m);
  };
  const e = ROAD_HALF - 0.5;
  for (const s of [-1, 1]) {
    edge(s * e, 110, 0, 190);
    edge(s * e, -110, 0, 190);
    edge(110, s * e, Math.PI / 2, 190);
    edge(-110, s * e, Math.PI / 2, 190);
  }
  const stop = (x: number, z: number, rotY: number) => {
    const m = new THREE.Mesh(G.plane, mats.laneWhite);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rotY;
    m.scale.set(5.2, 0.4, 1);
    m.position.set(x, 0.02, z);
    scene.add(m);
  };
  const sd = ROAD_HALF + 4.3;
  stop(2.7, sd, 0);
  stop(-2.7, -sd, 0);
  stop(sd, -2.7, Math.PI / 2);
  stop(-sd, 2.7, Math.PI / 2);
}

// ---------- 씬 ----------

/** 북동쪽 상공에서 남서쪽을 내려다본다 (도담갈비·산호식당·라비앙·멘야코지 정면이 카메라를 향함) */
const CAMERA = { distance: 66, polar: 0.9, azimuth: 2.45, fov: 38 };
const HOME_TARGET = new THREE.Vector3(-10, 0, 10);

export function createDioramaScene(container: HTMLElement, opts: DioramaOptions): DioramaHandle {
  const mats = new Materials();
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const fogColor = new THREE.Color('#cbb9ab');
  scene.background = fogColor;
  scene.fog = new THREE.Fog(fogColor, 75, 200);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, container.clientWidth / Math.max(1, container.clientHeight), 1, 700);

  // 후처리: 창문·간판·가로등의 은은한 번짐(블룸). 임계값을 높게 두어 밝은 발광체만 번진다
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.3, 0.6, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !opts.reducedMotion;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = false;
  controls.minDistance = 24;
  controls.maxDistance = 150;
  controls.minPolarAngle = 0.42;
  controls.maxPolarAngle = 1.22;
  controls.zoomToCursor = true;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.panSpeed = 1.1;

  const placeCamera = (target: THREE.Vector3, distance: number, polar: number, azimuth: number) => {
    controls.target.copy(target);
    camera.position.set(
      target.x + distance * Math.sin(polar) * Math.sin(azimuth),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.cos(azimuth),
    );
    controls.update();
  };
  placeCamera(HOME_TARGET, CAMERA.distance, CAMERA.polar, CAMERA.azimuth);

  // ---- 조명 ----
  scene.add(new THREE.HemisphereLight('#8fa3c7', '#d9b48f', 0.8));
  scene.add(new THREE.AmbientLight('#6f7d9c', 0.35));
  const sun = new THREE.DirectionalLight('#ffb27a', 2.3);
  sun.position.set(-70, 48, 42);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 300;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);

  // ---- 지면·도로 ----
  buildGround(mats, scene);

  // ---- 건물 ----
  const windows = { lit: new InstanceCollector(), dark: new InstanceCollector(), frame: new InstanceCollector() };
  const bulbs = new InstanceCollector();
  const built = new Map<string, BuiltBuilding>();
  const hitObjects: THREE.Object3D[] = [];
  const ctxDetailed: BuildContext = { mats, windows, bulbs, detailed: true };
  const ctxOuter: BuildContext = { mats, windows, bulbs, detailed: false };
  for (const def of BUILDINGS) {
    const b = buildBuilding(ctxDetailed, def);
    scene.add(b.group);
    built.set(def.id, b);
    hitObjects.push(...b.hit);
  }
  for (const def of OUTER_BUILDINGS) {
    const b = buildBuilding(ctxOuter, def);
    scene.add(b.group);
  }
  const frameMesh = windows.frame.build(G.windowFrame, mats.frame);
  const litMesh = windows.lit.build(G.windowGlass, mats.glassLit);
  const darkMesh = windows.dark.build(G.windowGlass, mats.glassDark);
  const bulbMesh = bulbs.build(G.bulb, mats.bulb);
  [frameMesh, litMesh, darkMesh, bulbMesh].forEach((m) => m && scene.add(m));

  // ---- 거리 ----
  const rnd = seeded(101);
  for (const t of TREES) {
    const tree = buildTree(mats, t.x, t.z, rnd, t.scale);
    tree.position.y = SIDEWALK_H;
    scene.add(tree);
  }
  for (const l of LAMPS) {
    // 교차로 모서리(|x|≈|z|)면 교차로 중심을, 아니면 가까운 도로 쪽을 향한다
    const corner = Math.abs(Math.abs(l.x) - Math.abs(l.z)) < 0.5;
    const toward = corner
      ? new THREE.Vector3(-Math.sign(l.x), 0, -Math.sign(l.z)).normalize()
      : Math.abs(l.z) < Math.abs(l.x)
        ? new THREE.Vector3(0, 0, -Math.sign(l.z))
        : new THREE.Vector3(-Math.sign(l.x), 0, 0);
    const lamp = buildLamp(mats, l.x, l.z, toward, l.light);
    lamp.position.y = SIDEWALK_H;
    scene.add(lamp);
  }
  const cars: CarObject[] = CARS.map((c) => {
    const car = buildCar(mats, c);
    scene.add(car.group);
    return car;
  });
  for (const p of PEOPLE) {
    const person = buildPerson(mats, p.x, p.z, p.facing, rnd);
    person.position.y = SIDEWALK_H;
    scene.add(person);
  }

  // ---- 선택 강조: 줄 선 사람들 + 바닥 링 ----
  const queueGroup = new THREE.Group();
  scene.add(queueGroup);
  const ring = new THREE.Mesh(G.ring, mats.ring);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.2;
  ring.visible = false;
  ring.renderOrder = 4;
  scene.add(ring);

  const restaurantByBuilding = new Map(PROTOTYPE_RESTAURANTS.map((r) => [r.buildingId, r.id]));
  const buildingByRestaurant = new Map(PROTOTYPE_RESTAURANTS.map((r) => [r.id, r.buildingId]));

  let selectedId: string | null = null;
  let focusTarget: THREE.Vector3 | null = null;

  const applySelection = (id: string | null) => {
    selectedId = id;
    queueGroup.clear();
    const bId = id ? buildingByRestaurant.get(id) : undefined;
    const b = bId ? built.get(bId) : undefined;
    if (!b) {
      ring.visible = false;
      return;
    }
    const { pos, outward, along } = b.door;
    const qr = seeded(hashSeed(id!));
    const n = 9;
    for (let i = 0; i < n; i += 1) {
      const p = pos.clone().addScaledVector(outward, 0.9 + (i % 2) * 0.35).addScaledVector(along, -1.1 - i * 0.78);
      const face = along.clone(); // 문 쪽을 바라봄
      const facing = Math.atan2(face.x, face.z);
      const person = buildPerson(mats, p.x, p.z, facing + (qr() - 0.5) * 0.5, qr);
      person.position.y = SIDEWALK_H;
      queueGroup.add(person);
    }
    const ringPos = pos.clone().addScaledVector(outward, 1.6);
    ring.position.set(ringPos.x, SIDEWALK_H + 0.04, ringPos.z);
    ring.visible = true;
  };

  // ---- 입력: 클릭 선택 (드래그와 구분) ----
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt: { x: number; y: number; t: number } | null = null;
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    focusTarget = null;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!downAt || e.button !== 0) return;
    const moved = Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y);
    const dt = performance.now() - downAt.t;
    downAt = null;
    if (moved > 6 || dt > 600) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitObjects, false);
    const hit = hits.find((h) => h.object.userData.restaurantId);
    opts.onSelect(hit ? (hit.object.userData.restaurantId as string) : null);
  };
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  controls.addEventListener('start', () => {
    focusTarget = null;
  });

  // ---- 핀 투영 + 겹침 회피 ----
  const tmp = new THREE.Vector3();
  const anchors = PROTOTYPE_RESTAURANTS.map((r) => ({ id: r.id, anchor: built.get(r.buildingId)?.anchor ?? new THREE.Vector3() }));
  const ICON_W = 48;
  const ICON_H = 58;
  // 라벨 너비 캐시 (cityScene 과 동일): 숨긴 라벨은 offsetWidth 가 0 이라 매 프레임 full/compact 가 번갈아 깜빡이는 것을 막는다
  const labelWidths = new Map<string, number>();
  const updatePins = () => {
    const els = opts.pinElements();
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    const items = anchors.map(({ id, anchor }) => {
      tmp.copy(anchor).project(camera);
      const depth = camera.position.distanceTo(anchor);
      return { id, x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h, depth, inFront: tmp.z < 1 };
    });
    items.sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : a.depth - b.depth));
    const placed: { l: number; t: number; r: number; b: number }[] = [];
    const overlaps = (r: { l: number; t: number; r: number; b: number }) => placed.some((p) => r.l < p.r && r.r > p.l && r.t < p.b && r.b > p.t);
    for (const it of items) {
      const el = els.get(it.id);
      if (!el) continue;
      if (!it.inFront || it.x < -80 || it.x > w + 80 || it.y < -80 || it.y > h + 80) {
        el.dataset.mode = 'hidden';
        continue;
      }
      const label = el.querySelector<HTMLElement>('[data-pin-label]');
      const measured = label ? label.offsetWidth : 0;
      if (measured > 0) labelWidths.set(it.id, measured);
      const labelW = label ? (labelWidths.get(it.id) ?? measured) + 8 : 0;
      const full = { l: it.x - ICON_W / 2, t: it.y - ICON_H, r: it.x + ICON_W / 2 + labelW, b: it.y };
      let mode: 'full' | 'compact' | 'hidden' = 'full';
      let rect = full;
      if (it.id !== selectedId && overlaps(full)) {
        rect = { l: it.x - ICON_W / 2, t: it.y - ICON_H, r: it.x + ICON_W / 2, b: it.y };
        mode = overlaps(rect) ? 'hidden' : 'compact';
      }
      if (mode !== 'hidden') placed.push(rect);
      el.dataset.mode = mode;
      el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0)`;
      el.style.zIndex = it.id === selectedId ? '40' : String(30 - Math.min(20, Math.floor(it.depth / 10)));
    }
  };

  // ---- 루프 ----
  let raf = 0;
  let last = performance.now();
  let disposed = false;
  const clampTarget = () => {
    const t = controls.target;
    t.x = Math.max(-80, Math.min(80, t.x));
    t.z = Math.max(-80, Math.min(80, t.z));
    t.y = 0;
  };
  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (!opts.reducedMotion) {
      for (const car of cars) {
        if (car.def.speed === 0) continue;
        const p = car.group.position;
        if (car.def.axis === 'x') {
          p.x += car.def.dir * car.def.speed * dt;
          if (p.x > 95) p.x = -95;
          if (p.x < -95) p.x = 95;
        } else {
          p.z += car.def.dir * car.def.speed * dt;
          if (p.z > 95) p.z = -95;
          if (p.z < -95) p.z = 95;
        }
      }
      if (ring.visible) {
        const s = 1 + Math.sin(now / 420) * 0.06;
        ring.scale.set(s, s, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(now / 420) * 0.2;
      }
    }
    if (focusTarget) {
      const cur = controls.target;
      const delta = focusTarget.clone().sub(cur);
      if (delta.length() < 0.15) {
        focusTarget = null;
      } else {
        const step = opts.reducedMotion ? delta : delta.multiplyScalar(0.08);
        cur.add(step);
        camera.position.add(step);
      }
    }
    controls.update();
    clampTarget();
    composer.render();
    updatePins();
  };
  raf = requestAnimationFrame(tick);

  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  applySelection(opts.selectedId());

  return {
    setSelected(id) {
      applySelection(id);
    },
    focus(id) {
      const bId = buildingByRestaurant.get(id);
      const b = bId ? built.get(bId) : undefined;
      if (!b) return;
      focusTarget = b.door.pos.clone().addScaledVector(b.door.outward, 5).setY(0);
      if (camera.position.distanceTo(controls.target) > 70) {
        // 너무 멀면 조금 당겨 온다
        const dir = camera.position.clone().sub(controls.target).normalize();
        camera.position.copy(controls.target).addScaledVector(dir, 58);
      }
    },
    zoomBy(factor) {
      const dir = camera.position.clone().sub(controls.target);
      const len = Math.max(controls.minDistance, Math.min(controls.maxDistance, dir.length() / factor));
      camera.position.copy(controls.target).addScaledVector(dir.normalize(), len);
      controls.update();
    },
    rotateBy(delta) {
      const off = camera.position.clone().sub(controls.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      sph.theta += delta;
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
      controls.update();
    },
    resetView() {
      focusTarget = null;
      placeCamera(HOME_TARGET, CAMERA.distance, CAMERA.polar, CAMERA.azimuth);
    },
    resize,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      composer.dispose();
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const shared = Object.values(G) as THREE.BufferGeometry[];
        if (mesh.geometry && !shared.includes(mesh.geometry)) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat && !(mat instanceof THREE.MeshBasicMaterial && (mat === mats.ao || mat === mats.lightPool))) mat.dispose();
      });
      mats.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
  };
}
