/**
 * 셀(256m) 단위 도시 지오메트리 생성.
 *
 * - 건물: 타일 외곽선을 그대로 돌출. 벽은 재질별 누적 지오메트리에 합쳐 셀당 드로우콜을 몇 개로 줄인다.
 *   상업 규모(5.5~32m) 건물은 1층을 '상가 띠'(유리 매장·문·추상 간판) 텍스처로, 위층은 창문 텍스처로 그린다.
 *   50m 이상은 유리 커튼월. 켜진 창은 emissiveMap 으로 빛난다.
 * - 도로: 폴리라인 → 리본(아스팔트, 차선 텍스처) + 인도 리본(보도블록, 살짝 아래) + 끝점 원판(교차부 정리) + 횡단보도.
 * - 면: 공원·잔디·숲·운동장·물.
 * - 소품 위치(가로수·가로등·옥상 설비)는 좌표만 계산해 돌려주고, 인스턴싱은 씬이 담당한다.
 *
 * 모든 좌표는 로컬 m. y 층: 지면 0, 인도 0.02, 공원 0.03, 물 0.035, 도로 0.04, 교차 원판 0.045, 횡단보도 0.055.
 */
import * as THREE from 'three';
import {
  bboxOf,
  CELL_SIZE,
  distToSegment,
  hash01,
  pointInPolygon,
  pointInRing,
  signedArea,
  type Pt,
} from './geo';
import type { Placement } from './props';
import type { AreaFeature, BuildingFeature, FootwayFeature, RoadClass, RoadFeature } from './tiles';
import {
  crosswalkTexture,
  facadeWindowTextures,
  grassTexture,
  pitchTexture,
  roadTexture,
  roofTexture,
  shopfrontTextures,
  pavingTexture,
  type FacadeKind,
} from './textures';

export const Y = {
  ground: 0,
  sidewalk: 0.02,
  area: 0.03,
  water: 0.035,
  road: 0.06,
  junction: 0.045,
  crosswalk: 0.055,
  /** 가로수·가로등 등 지면 소품 (인도보다 위, 도로보다 아래) */
  prop: 0.05,
  /** 차량 (가장 높은 아스팔트보다 위) */
  vehicle: 0.14,
  /** 보행자 */
  person: 0.05,
} as const;

/**
 * 도로 등급 순위. OSM 은 같은 길을 여러 선형(본선·측도·연결로)으로 나눠 주기 때문에
 * 리본이 서로 겹친다. 등급이 높을수록 살짝 위에 깔아 큰 길이 항상 이기게 한다.
 */
const ROAD_RANK: Record<RoadClass, number> = {
  service: 0,
  pedestrian: 1,
  minor: 2,
  busway: 3,
  tertiary: 4,
  secondary: 5,
  primary: 6,
  trunk: 7,
  motorway: 8,
};
const sidewalkY = (cls: RoadClass) => Y.sidewalk + ROAD_RANK[cls] * 0.003;
const asphaltY = (cls: RoadClass) => Y.road + ROAD_RANK[cls] * 0.008;

const SIDEWALK_W = 3.5;
const FLOOR_H = 3.2;
const FACADE_TILE_W = 25.6;
const FACADE_TILE_H = 12.8;
const SHOP_TILE_W = 12.8;

// ---------- 지오메트리 누적기 ----------

export class GeomAccumulator {
  private positions: number[] = [];
  private normals: number[] = [];
  private uvs: number[] = [];
  private indices: number[] = [];
  private count = 0;

  get isEmpty() {
    return this.count === 0;
  }

  private pushVertex(p: THREE.Vector3, n: THREE.Vector3, u: number, v: number) {
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.uvs.push(u, v);
    this.count += 1;
    return this.count - 1;
  }

  /** 사각형 (p0→p1 아래변, p3→p2 윗변). n 은 바깥 방향. 감김은 n 기준으로 자동 보정 */
  pushQuad(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, n: THREE.Vector3, uv: [number, number, number, number]) {
    const a = this.pushVertex(p0, n, uv[0], uv[1]);
    const b = this.pushVertex(p1, n, uv[2], uv[1]);
    const c = this.pushVertex(p2, n, uv[2], uv[3]);
    const d = this.pushVertex(p3, n, uv[0], uv[3]);
    const e1 = new THREE.Vector3().subVectors(p1, p0);
    const e2 = new THREE.Vector3().subVectors(p3, p0);
    const cross = new THREE.Vector3().crossVectors(e1, e2);
    if (cross.dot(n) >= 0) this.indices.push(a, b, c, a, c, d);
    else this.indices.push(a, c, b, a, d, c);
  }

  /** 수평 삼각형 목록 (위를 향함) */
  pushTrianglesUp(tris: [Pt, Pt, Pt][], y: number, uvScale: number) {
    const up = new THREE.Vector3(0, 1, 0);
    for (const [a, b, c] of tris) {
      const ia = this.pushVertex(new THREE.Vector3(a.x, y, a.z), up, a.x / uvScale, a.z / uvScale);
      const ib = this.pushVertex(new THREE.Vector3(b.x, y, b.z), up, b.x / uvScale, b.z / uvScale);
      const ic = this.pushVertex(new THREE.Vector3(c.x, y, c.z), up, c.x / uvScale, c.z / uvScale);
      // 위에서 볼 때 반시계(CCW, y-up 기준)여야 앞면. (b-a)×(c-a) 의 y 성분으로 판정
      const cy = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
      if (cy < 0) this.indices.push(ia, ib, ic);
      else this.indices.push(ia, ic, ib);
    }
  }

  /** 수평 사각형(리본 조각). uv 는 (u0,v0,u1,v1) — 왼쪽/오른쪽 v, 시작/끝 u */
  pushFlatQuad(l0: Pt, r0: Pt, r1: Pt, l1: Pt, y: number, u0: number, u1: number, v0: number, v1: number) {
    const up = new THREE.Vector3(0, 1, 0);
    const a = this.pushVertex(new THREE.Vector3(l0.x, y, l0.z), up, u0, v0);
    const b = this.pushVertex(new THREE.Vector3(r0.x, y, r0.z), up, u0, v1);
    const c = this.pushVertex(new THREE.Vector3(r1.x, y, r1.z), up, u1, v1);
    const d = this.pushVertex(new THREE.Vector3(l1.x, y, l1.z), up, u1, v0);
    const cy = (r0.x - l0.x) * (r1.z - l0.z) - (r0.z - l0.z) * (r1.x - l0.x);
    if (cy < 0) this.indices.push(a, b, c, a, c, d);
    else this.indices.push(a, c, b, a, d, c);
  }

  build(): THREE.BufferGeometry | null {
    if (this.count === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}

// ---------- 재질 ----------

export class CityMaterials {
  readonly facades: Record<FacadeKind, THREE.MeshStandardMaterial>;
  readonly shopfront: THREE.MeshStandardMaterial;
  readonly roof: THREE.MeshStandardMaterial;
  readonly asphaltLane: THREE.MeshStandardMaterial;
  readonly asphaltPlain: THREE.MeshStandardMaterial;
  readonly asphaltAlley: THREE.MeshStandardMaterial;
  readonly sidewalk: THREE.MeshStandardMaterial;
  readonly crosswalk: THREE.MeshStandardMaterial;
  readonly grass: THREE.MeshStandardMaterial;
  readonly pitch: THREE.MeshStandardMaterial;
  readonly sand: THREE.MeshStandardMaterial;
  readonly water: THREE.MeshStandardMaterial;
  readonly ground: THREE.MeshStandardMaterial;
  private readonly textures: THREE.Texture[] = [];

  constructor() {
    const kinds: FacadeKind[] = ['brick', 'plaster', 'concrete', 'charcoal', 'tile', 'glass'];
    const facades = {} as Record<FacadeKind, THREE.MeshStandardMaterial>;
    kinds.forEach((k, i) => {
      const { map, emissive } = facadeWindowTextures(k, 11 + i * 7);
      this.textures.push(map, emissive);
      facades[k] = new THREE.MeshStandardMaterial({
        map,
        emissiveMap: emissive,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: k === 'glass' ? 0.5 : 0.62,
        roughness: k === 'glass' ? 0.3 : k === 'charcoal' ? 0.6 : 0.92,
        metalness: k === 'glass' ? 0.5 : k === 'charcoal' ? 0.2 : 0,
      });
    });
    this.facades = facades;
    const shop = shopfrontTextures(5);
    this.textures.push(shop.map, shop.emissive);
    this.shopfront = new THREE.MeshStandardMaterial({ map: shop.map, emissiveMap: shop.emissive, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.95, roughness: 0.45, metalness: 0.1 });
    const roofT = roofTexture();
    this.textures.push(roofT);
    this.roof = new THREE.MeshStandardMaterial({ map: roofT, roughness: 0.95 });
    const lane = roadTexture('lane');
    const plain = roadTexture('plain', 21);
    const alley = roadTexture('alley', 23);
    this.textures.push(lane, plain, alley);
    this.asphaltLane = new THREE.MeshStandardMaterial({ map: lane, roughness: 0.95 });
    this.asphaltPlain = new THREE.MeshStandardMaterial({ map: plain, roughness: 0.95 });
    this.asphaltAlley = new THREE.MeshStandardMaterial({ map: alley, roughness: 0.95 });
    const paving = pavingTexture(13);
    paving.repeat.set(1, 1);
    this.textures.push(paving);
    this.sidewalk = new THREE.MeshStandardMaterial({ map: paving, roughness: 0.9 });
    const cross = crosswalkTexture();
    cross.wrapS = THREE.RepeatWrapping;
    cross.wrapT = THREE.RepeatWrapping;
    this.textures.push(cross);
    // 횡단보도는 아스팔트 바로 위라 폴리곤 오프셋으로 깜빡임을 막는다
    this.crosswalk = new THREE.MeshStandardMaterial({
      map: cross,
      transparent: true,
      roughness: 0.9,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const grass = grassTexture();
    this.textures.push(grass);
    this.grass = new THREE.MeshStandardMaterial({ map: grass, roughness: 1 });
    const pitch = pitchTexture();
    this.textures.push(pitch);
    this.pitch = new THREE.MeshStandardMaterial({ map: pitch, roughness: 1 });
    this.sand = new THREE.MeshStandardMaterial({ color: '#d9c9a6', roughness: 1 });
    this.water = new THREE.MeshStandardMaterial({ color: '#6d93c4', roughness: 0.15, metalness: 0.35 });
    const groundT = pavingTexture(31);
    this.textures.push(groundT);
    this.ground = new THREE.MeshStandardMaterial({ map: groundT, color: '#d5cec3', roughness: 0.95 });
  }

  dispose() {
    this.textures.forEach((t) => t.dispose());
    [
      ...Object.values(this.facades), this.shopfront, this.roof, this.asphaltLane, this.asphaltPlain, this.asphaltAlley, this.sidewalk,
      this.crosswalk, this.grass, this.pitch, this.sand, this.water, this.ground,
    ].forEach((m) => m.dispose());
  }
}

// ---------- 건물 ----------

export interface BuildingInfo {
  feature: BuildingFeature;
  floors: number;
  floorH: number;
  commercial: boolean;
  kind: FacadeKind;
}

export function facadeKindOf(f: BuildingFeature): FacadeKind {
  if (f.height >= 50) return 'glass';
  const r = hash01(f.id, 1);
  if (f.height >= 28) return r < 0.45 ? 'concrete' : r < 0.75 ? 'tile' : 'glass';
  if (r < 0.28) return 'brick';
  if (r < 0.58) return 'plaster';
  if (r < 0.78) return 'concrete';
  if (r < 0.9) return 'tile';
  return 'charcoal';
}

export function buildingInfo(f: BuildingFeature): BuildingInfo {
  const floors = Math.max(1, Math.round(f.height / FLOOR_H));
  const floorH = f.height / floors;
  const commercial = f.base === 0 && f.height >= 5.5 && f.height <= 32 && f.area >= 40;
  return { feature: f, floors, floorH, commercial, kind: facadeKindOf(f) };
}

/** 링 각 변의 바깥 법선 (건물 안쪽을 향하지 않는 쪽) */
export function edgeOutward(a: Pt, b: Pt, outer: Pt[], holes: Pt[][]): { nx: number; nz: number } {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz) || 1;
  let nx = dz / len;
  let nz = -dx / len;
  const mid = { x: (a.x + b.x) / 2 + nx * 0.3, z: (a.z + b.z) / 2 + nz * 0.3 };
  if (pointInPolygon(mid, outer, holes)) {
    nx = -nx;
    nz = -nz;
  }
  return { nx, nz };
}

function triangulate(outer: Pt[], holes: Pt[][]): [Pt, Pt, Pt][] {
  const contour = outer.map((p) => new THREE.Vector2(p.x, p.z));
  const holeVecs = holes.map((h) => h.map((p) => new THREE.Vector2(p.x, p.z)));
  const all = [...outer, ...holes.flat()];
  let tris: number[][];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, holeVecs);
  } catch {
    return [];
  }
  return tris.map(([a, b, c]) => [all[a], all[b], all[c]]);
}

interface CellAccumulators {
  facades: Record<FacadeKind, GeomAccumulator>;
  shopfront: GeomAccumulator;
  roof: GeomAccumulator;
  asphaltLane: GeomAccumulator;
  asphaltPlain: GeomAccumulator;
  asphaltAlley: GeomAccumulator;
  sidewalk: GeomAccumulator;
  crosswalk: GeomAccumulator;
  grass: GeomAccumulator;
  pitch: GeomAccumulator;
  sand: GeomAccumulator;
  water: GeomAccumulator;
}

function newAccumulators(): CellAccumulators {
  return {
    facades: { brick: new GeomAccumulator(), plaster: new GeomAccumulator(), concrete: new GeomAccumulator(), charcoal: new GeomAccumulator(), tile: new GeomAccumulator(), glass: new GeomAccumulator() },
    shopfront: new GeomAccumulator(),
    roof: new GeomAccumulator(),
    asphaltLane: new GeomAccumulator(),
    asphaltPlain: new GeomAccumulator(),
    asphaltAlley: new GeomAccumulator(),
    sidewalk: new GeomAccumulator(),
    crosswalk: new GeomAccumulator(),
    grass: new GeomAccumulator(),
    pitch: new GeomAccumulator(),
    sand: new GeomAccumulator(),
    water: new GeomAccumulator(),
  };
}

function wallRing(acc: CellAccumulators, info: BuildingInfo, ring: Pt[], isHole: boolean) {
  const f = info.feature;
  const y0 = f.base;
  const y1 = f.base + f.height;
  const uOff = hash01(f.id, 2) * 8;
  const vOff = Math.floor(hash01(f.id, 3) * 4) / 4;
  const bandH = info.commercial ? (info.floors >= 2 ? info.floorH : f.height) : 0;
  let cum = 0;
  const n = ring.length;
  const outerRing = isHole ? f.outer : ring;
  for (let i = 0; i < n; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.2) continue;
    const { nx, nz } = edgeOutward(a, b, outerRing, isHole ? [] : f.holes);
    const normal = new THREE.Vector3(nx, 0, nz);
    if (isHole) normal.negate(); // 구멍 안쪽 벽은 건물 바깥이 구멍 쪽
    const u0 = cum;
    const u1 = cum + len;
    cum += len;
    if (bandH > 0) {
      acc.shopfront.pushQuad(
        new THREE.Vector3(a.x, y0, a.z),
        new THREE.Vector3(b.x, y0, b.z),
        new THREE.Vector3(b.x, y0 + bandH, b.z),
        new THREE.Vector3(a.x, y0 + bandH, a.z),
        normal,
        [u0 / SHOP_TILE_W + uOff, 0, u1 / SHOP_TILE_W + uOff, 1],
      );
      if (y1 - (y0 + bandH) > 0.3) {
        acc.facades[info.kind].pushQuad(
          new THREE.Vector3(a.x, y0 + bandH, a.z),
          new THREE.Vector3(b.x, y0 + bandH, b.z),
          new THREE.Vector3(b.x, y1, b.z),
          new THREE.Vector3(a.x, y1, a.z),
          normal,
          [u0 / FACADE_TILE_W + uOff, vOff, u1 / FACADE_TILE_W + uOff, vOff + (y1 - y0 - bandH) / FACADE_TILE_H],
        );
      }
    } else {
      acc.facades[info.kind].pushQuad(
        new THREE.Vector3(a.x, y0, a.z),
        new THREE.Vector3(b.x, y0, b.z),
        new THREE.Vector3(b.x, y1, b.z),
        new THREE.Vector3(a.x, y1, a.z),
        normal,
        [u0 / FACADE_TILE_W + uOff, vOff, u1 / FACADE_TILE_W + uOff, vOff + (y1 - y0) / FACADE_TILE_H],
      );
    }
  }
}

function buildBuilding(acc: CellAccumulators, info: BuildingInfo, hvac: Placement[]) {
  const f = info.feature;
  wallRing(acc, info, f.outer, false);
  for (const h of f.holes) wallRing(acc, info, h, true);
  const tris = triangulate(f.outer, f.holes);
  acc.roof.pushTrianglesUp(tris, f.base + f.height + 0.02, 8);
  // 옥상 설비: 넓고 어느 정도 높은 건물에 1~2개
  if (f.area > 260 && f.height > 9 && f.height < 80) {
    const n = f.area > 900 ? 2 : 1;
    for (let i = 0; i < n; i += 1) {
      const px = f.centroid.x + (hash01(f.id, 10 + i) - 0.5) * Math.sqrt(f.area) * 0.35;
      const pz = f.centroid.z + (hash01(f.id, 20 + i) - 0.5) * Math.sqrt(f.area) * 0.35;
      if (!pointInPolygon({ x: px, z: pz }, f.outer, f.holes)) continue;
      hvac.push({ x: px, y: f.base + f.height + 0.02, z: pz, rotY: hash01(f.id, 30 + i) * Math.PI, scale: 1.4 + hash01(f.id, 40 + i) * 1.6 });
    }
  }
}

// ---------- 도로 ----------

interface Station {
  p: Pt;
  nx: number;
  nz: number;
  miter: number;
  cum: number;
}

function stations(pts: Pt[]): Station[] {
  const out: Station[] = [];
  let cum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const prev = pts[i - 1];
    const cur = pts[i];
    const next = pts[i + 1];
    let dx = 0;
    let dz = 0;
    if (prev) {
      dx += cur.x - prev.x;
      dz += cur.z - prev.z;
      cum += Math.hypot(cur.x - prev.x, cur.z - prev.z);
    }
    if (next) {
      dx += next.x - cur.x;
      dz += next.z - cur.z;
    }
    const len = Math.hypot(dx, dz) || 1;
    const tx = dx / len;
    const tz = dz / len;
    // 법선 = 접선을 90° 회전. 마이터 배율은 인접 변의 각도로 계산(최대 2배)
    let miter = 1;
    if (prev && next) {
      const ax = cur.x - prev.x;
      const az = cur.z - prev.z;
      const al = Math.hypot(ax, az) || 1;
      const cos = (ax / al) * tx + (az / al) * tz;
      miter = Math.min(2, 1 / Math.max(0.5, cos));
    }
    out.push({ p: cur, nx: -tz, nz: tx, miter, cum });
  }
  return out;
}

function ribbon(acc: GeomAccumulator, st: Station[], halfW: number, y: number, uScale: number, v0 = 0, v1 = 1) {
  for (let i = 0; i + 1 < st.length; i += 1) {
    const a = st[i];
    const b = st[i + 1];
    const la = { x: a.p.x + a.nx * halfW * a.miter, z: a.p.z + a.nz * halfW * a.miter };
    const ra = { x: a.p.x - a.nx * halfW * a.miter, z: a.p.z - a.nz * halfW * a.miter };
    const lb = { x: b.p.x + b.nx * halfW * b.miter, z: b.p.z + b.nz * halfW * b.miter };
    const rb = { x: b.p.x - b.nx * halfW * b.miter, z: b.p.z - b.nz * halfW * b.miter };
    acc.pushFlatQuad(la, ra, rb, lb, y, a.cum / uScale, b.cum / uScale, v0, v1);
  }
}

function disc(acc: GeomAccumulator, c: Pt, r: number, y: number, uScale: number) {
  const seg = 14;
  const tris: [Pt, Pt, Pt][] = [];
  for (let i = 0; i < seg; i += 1) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    tris.push([c, { x: c.x + Math.cos(a0) * r, z: c.z + Math.sin(a0) * r }, { x: c.x + Math.cos(a1) * r, z: c.z + Math.sin(a1) * r }]);
  }
  acc.pushTrianglesUp(tris, y, uScale);
}

/** 여러 도로가 만나는 지점 (교차로). 리본 끝의 톱니와 틈을 덮는 원형 패드를 여기에 깐다 */
interface Junction {
  x: number;
  z: number;
  /** 모인 끝점 수 */
  n: number;
  /** 가장 넓은 도로의 폭 — 패드 높이(등급)와 횡단보도 기준 */
  maxWidth: number;
  cls: RoadClass;
  /** 패드 반지름. 큰 교차로는 끝점이 넓게 퍼지므로 퍼진 정도까지 덮어야 한다 */
  radius: number;
}

/**
 * 도로 끝점을 union-find 로 묶어 교차로를 만든다.
 * 묶는 거리는 도로 폭에 비례한다 — 왕복 8차선 교차로는 끝점이 20m 넘게 떨어져 있어서
 * 고정 반경으로 묶으면 한 교차로가 여러 덩어리로 쪼개지고, 패드가 안쪽을 못 덮어
 * 횡단보도가 교차로 한가운데에 겹쳐 깔린다.
 */
function buildJunctions(roads: RoadFeature[]): Junction[] {
  const ends: { p: Pt; width: number; cls: RoadClass }[] = [];
  for (const r of roads) {
    if (r.width < 5 || r.pts.length < 2) continue;
    ends.push({ p: r.pts[0], width: r.width, cls: r.cls }, { p: r.pts[r.pts.length - 1], width: r.width, cls: r.cls });
  }
  const n = ends.length;
  if (n === 0) return [];

  const parent = new Int32Array(n);
  for (let i = 0; i < n; i += 1) parent[i] = i;
  const find = (i: number): number => {
    let root = i;
    while (parent[root] !== root) root = parent[root];
    let cur = i;
    while (parent[cur] !== root) {
      const next = parent[cur];
      parent[cur] = root;
      cur = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  // 공간 격자로 이웃만 비교
  const GS = 24;
  const grid = new Map<string, number[]>();
  ends.forEach((e, i) => {
    const k = `${Math.floor(e.p.x / GS)},${Math.floor(e.p.z / GS)}`;
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  });
  for (let i = 0; i < n; i += 1) {
    const gx = Math.floor(ends[i].p.x / GS);
    const gz = Math.floor(ends[i].p.z / GS);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const list = grid.get(`${gx + dx},${gz + dz}`);
        if (!list) continue;
        for (const j of list) {
          if (j <= i) continue;
          const d = Math.hypot(ends[i].p.x - ends[j].p.x, ends[i].p.z - ends[j].p.z);
          if (d <= Math.max(12, (ends[i].width + ends[j].width) * 0.6)) union(i, j);
        }
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i += 1) {
    const r = find(i);
    const list = groups.get(r);
    if (list) list.push(i);
    else groups.set(r, [i]);
  }

  const out: Junction[] = [];
  groups.forEach((idx) => {
    if (idx.length < 2) return;
    let cx = 0;
    let cz = 0;
    let maxWidth = 0;
    let cls: RoadClass = ends[idx[0]].cls;
    for (const i of idx) {
      cx += ends[i].p.x;
      cz += ends[i].p.z;
      if (ends[i].width > maxWidth) {
        maxWidth = ends[i].width;
        cls = ends[i].cls;
      }
    }
    cx /= idx.length;
    cz /= idx.length;
    let spread = 0;
    for (const i of idx) spread = Math.max(spread, Math.hypot(ends[i].p.x - cx, ends[i].p.z - cz));
    const radius = Math.min(45, Math.max(maxWidth * 0.58, spread * 0.85 + maxWidth * 0.5 + 1));
    out.push({ x: cx, z: cz, n: idx.length, maxWidth, cls, radius });
  });
  return out;
}

/** 점이 어느 도로 노면 위인지 (가로수·가로등이 차도 한가운데 서지 않게) */
function makeRoadTester(roads: RoadFeature[]): (p: Pt, margin?: number) => boolean {
  const CS = 32;
  const grid = new Map<string, RoadFeature[]>();
  for (const r of roads) {
    const [minx, minz, maxx, maxz] = r.bbox;
    const m = r.width / 2 + 2;
    for (let gx = Math.floor((minx - m) / CS); gx <= Math.floor((maxx + m) / CS); gx += 1) {
      for (let gz = Math.floor((minz - m) / CS); gz <= Math.floor((maxz + m) / CS); gz += 1) {
        const k = `${gx},${gz}`;
        const list = grid.get(k);
        if (list) list.push(r);
        else grid.set(k, [r]);
      }
    }
  }
  return (p: Pt, margin = 0.4) => {
    const list = grid.get(`${Math.floor(p.x / CS)},${Math.floor(p.z / CS)}`);
    if (!list) return false;
    for (const r of list) {
      const half = r.width / 2 + margin;
      const [minx, minz, maxx, maxz] = r.bbox;
      if (p.x < minx - half || p.x > maxx + half || p.z < minz - half || p.z > maxz + half) continue;
      for (let i = 0; i + 1 < r.pts.length; i += 1) {
        if (distToSegment(p, r.pts[i], r.pts[i + 1]) < half) return true;
      }
    }
    return false;
  };
}

/** 점에서 가장 가까운 차도 세그먼트 (노면 안이거나 extra 만큼 여유 안) */
interface RoadHit {
  road: RoadFeature;
  seg: number;
  dist: number;
}
function makeRoadLocator(roads: RoadFeature[]): (p: Pt, extra: number) => RoadHit | null {
  const CS = 32;
  const grid = new Map<string, RoadFeature[]>();
  for (const r of roads) {
    if (r.width < 7) continue;
    const [minx, minz, maxx, maxz] = r.bbox;
    const m = r.width / 2 + 3;
    for (let gx = Math.floor((minx - m) / CS); gx <= Math.floor((maxx + m) / CS); gx += 1) {
      for (let gz = Math.floor((minz - m) / CS); gz <= Math.floor((maxz + m) / CS); gz += 1) {
        const k = `${gx},${gz}`;
        const list = grid.get(k);
        if (list) list.push(r);
        else grid.set(k, [r]);
      }
    }
  }
  return (p: Pt, extra: number) => {
    const list = grid.get(`${Math.floor(p.x / CS)},${Math.floor(p.z / CS)}`);
    if (!list) return null;
    let best: RoadHit | null = null;
    for (const r of list) {
      const lim = r.width / 2 + extra;
      for (let i = 0; i + 1 < r.pts.length; i += 1) {
        const d = distToSegment(p, r.pts[i], r.pts[i + 1]);
        if (d <= lim && (!best || d < best.dist)) best = { road: r, seg: i, dist: d };
      }
    }
    return best;
  };
}

/**
 * 지도 데이터 기반 횡단보도.
 * 보행로 선분(3~45m) 가운데가 차도(7m 이상) 노면 위에 있고, 차도와 50° 이상으로 만나면 횡단보도로 본다.
 * 그 자리에 차도를 가로지르는 줄무늬 띠를 깐다 (차도 방향 3.4m, 폭은 차도 폭).
 */
function buildCrosswalks(acc: CellAccumulators, footways: FootwayFeature[], locate: (p: Pt, extra: number) => RoadHit | null, cellMin: Pt) {
  const placed: Pt[] = [];
  for (const f of footways) {
    for (let i = 0; i + 1 < f.pts.length; i += 1) {
      const a = f.pts[i];
      const b = f.pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 3 || len > 45) continue;
      const mid = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
      // 중복 방지: 이 셀이 소유한 위치만
      if (mid.x < cellMin.x || mid.x >= cellMin.x + CELL_SIZE || mid.z < cellMin.z || mid.z >= cellMin.z + CELL_SIZE) continue;
      const hit = locate(mid, 1.5);
      if (!hit) continue;
      const r = hit.road;
      const ra = r.pts[hit.seg];
      const rb = r.pts[hit.seg + 1];
      const rl = Math.hypot(rb.x - ra.x, rb.z - ra.z) || 1;
      const tx = (rb.x - ra.x) / rl;
      const tz = (rb.z - ra.z) / rl;
      const fx = (b.x - a.x) / len;
      const fz = (b.z - a.z) / len;
      const cos = Math.abs(fx * tx + fz * tz);
      if (cos > Math.cos((50 * Math.PI) / 180)) continue; // 차도와 나란한 보행로(인도)는 제외
      // 차도 중심선 위 교차점
      const tt = Math.max(0, Math.min(1, ((mid.x - ra.x) * tx + (mid.z - ra.z) * tz)));
      const cx = ra.x + tx * tt;
      const cz = ra.z + tz * tt;
      if (placed.some((p) => Math.hypot(p.x - cx, p.z - cz) < 4)) continue;
      placed.push({ x: cx, z: cz });
      const nx = -tz;
      const nz = tx;
      const halfW = (r.width / 2) * 0.96;
      const halfL = 1.7;
      acc.crosswalk.pushFlatQuad(
        { x: cx - tx * halfL + nx * halfW, z: cz - tz * halfL + nz * halfW },
        { x: cx - tx * halfL - nx * halfW, z: cz - tz * halfL - nz * halfW },
        { x: cx + tx * halfL - nx * halfW, z: cz + tz * halfL - nz * halfW },
        { x: cx + tx * halfL + nx * halfW, z: cz + tz * halfL + nz * halfW },
        asphaltY(r.cls) + 0.012,
        0,
        1,
        0,
        Math.max(1, r.width / 6.3),
      );
    }
  }
}

function buildRoads(
  acc: CellAccumulators,
  roads: RoadFeature[],
  allRoads: RoadFeature[],
  junctions: Junction[],
  cellMin: Pt,
  trees: Placement[],
  lamps: Placement[],
  isBlocked: (p: Pt) => boolean,
  onRoad: (p: Pt, margin?: number) => boolean,
) {
  // 1) 교차로 패드: 리본 끝이 만드는 틈·톱니를 원판으로 덮는다.
  //    같은 패드를 이웃 셀이 또 그리면 겹쳐서 깜빡이므로 중심이 이 셀 안인 것만 그린다.
  for (const j of junctions) {
    if (j.x < cellMin.x || j.x >= cellMin.x + CELL_SIZE || j.z < cellMin.z || j.z >= cellMin.z + CELL_SIZE) continue;
    if (j.maxWidth < 6) continue;
    disc(acc.asphaltAlley, { x: j.x, z: j.z }, j.radius, asphaltY(j.cls) + 0.002, 6);
  }

  for (const r of roads) {
    const st = stations(r.pts);
    if (st.length < 2) continue;
    const halfW = r.width / 2;
    const roadY = asphaltY(r.cls);
    const laneAcc = r.width >= 11 ? acc.asphaltLane : r.width >= 7 ? acc.asphaltPlain : acc.asphaltAlley;
    if (r.sidewalk) ribbon(acc.sidewalk, st, halfW + SIDEWALK_W, sidewalkY(r.cls), 4, 0, (r.width + SIDEWALK_W * 2) / 4);
    ribbon(laneAcc, st, halfW, roadY, 6);

    // 2) 횡단보도는 여기서 만들지 않는다 — 지도 보행로 데이터로 buildCrosswalks 가 실제 위치에 깐다

    // 3) 가로수·가로등: 인도 있는 길만. 건물 안이거나 다른 도로 노면 위면 건너뛴다
    if (r.sidewalk && r.width >= 9) {
      const total = st[st.length - 1].cum;
      const treeGap = 12;
      const lampGap = 30;
      const seed = hash01(r.id, 5);
      for (let d = 6 + seed * 6; d < total - 4; d += treeGap) {
        const pos = along(st, d);
        if (!pos) continue;
        for (const side of [1, -1]) {
          const off = halfW + 1.7;
          const p = { x: pos.p.x + pos.nx * off * side, z: pos.p.z + pos.nz * off * side };
          if (isBlocked(p) || onRoad(p, 0.8)) continue;
          const k = hash01(r.id, Math.round(d) * 2 + side);
          if (k < 0.15) continue; // 빈자리
          trees.push({ x: p.x, y: Y.prop, z: p.z, rotY: k * Math.PI * 2, scale: 0.85 + k * 0.4 });
        }
      }
      let side = seed < 0.5 ? 1 : -1;
      for (let d = 15 + seed * 10; d < total - 4; d += lampGap) {
        const pos = along(st, d);
        if (!pos) continue;
        const off = halfW + 0.8;
        const p = { x: pos.p.x + pos.nx * off * side, z: pos.p.z + pos.nz * off * side };
        if (!isBlocked(p) && !onRoad(p, 0.5)) {
          // 등 머리가 도로 쪽을 향하도록: 법선 반대 방향
          const rotY = Math.atan2(-pos.nx * side, -pos.nz * side);
          lamps.push({ x: p.x, y: Y.prop, z: p.z, rotY });
        }
        side = -side;
      }
    }
  }
}

/** 폴리라인 위 거리 d 지점의 위치·법선 */
export function along(st: Station[], d: number): { p: Pt; nx: number; nz: number } | null {
  for (let i = 0; i + 1 < st.length; i += 1) {
    const a = st[i];
    const b = st[i + 1];
    if (d >= a.cum && d <= b.cum) {
      const t = b.cum === a.cum ? 0 : (d - a.cum) / (b.cum - a.cum);
      const nx = a.nx + (b.nx - a.nx) * t;
      const nz = a.nz + (b.nz - a.nz) * t;
      const nl = Math.hypot(nx, nz) || 1;
      return { p: { x: a.p.x + (b.p.x - a.p.x) * t, z: a.p.z + (b.p.z - a.p.z) * t }, nx: nx / nl, nz: nz / nl };
    }
  }
  return null;
}

export { stations };
export type { Station };

// ---------- 면 ----------

function buildAreas(
  acc: CellAccumulators,
  areas: AreaFeature[],
  trees: Placement[],
  isBlocked: (p: Pt) => boolean,
  onRoad: (p: Pt, margin?: number) => boolean,
) {
  for (const a of areas) {
    const tris = triangulate(a.outer, a.holes);
    switch (a.kind) {
      case 'water':
        acc.water.pushTrianglesUp(tris, Y.water, 10);
        break;
      case 'pitch':
        acc.pitch.pushTrianglesUp(tris, Y.area, 6);
        break;
      case 'sand':
        acc.sand.pushTrianglesUp(tris, Y.area, 6);
        break;
      default:
        acc.grass.pushTrianglesUp(tris, Y.area, 10);
    }
    if (a.kind === 'park' || a.kind === 'wood' || a.kind === 'grass') {
      const [minx, minz, maxx, maxz] = a.bbox;
      const spacing = a.kind === 'wood' ? 9 : 14;
      let count = 0;
      for (let x = minx + spacing / 2; x < maxx && count < 160; x += spacing) {
        for (let z = minz + spacing / 2; z < maxz && count < 160; z += spacing) {
          const jx = (hash01(a.id, Math.round(x * 3 + z)) - 0.5) * spacing * 0.8;
          const jz = (hash01(a.id, Math.round(z * 5 + x)) - 0.5) * spacing * 0.8;
          const p = { x: x + jx, z: z + jz };
          if (!pointInPolygon(p, a.outer, a.holes)) continue;
          if (isBlocked(p) || onRoad(p, 1)) continue;
          const k = hash01(a.id, Math.round(p.x + p.z * 7));
          if (a.kind === 'grass' && k < 0.6) continue;
          trees.push({ x: p.x, y: Y.area, z: p.z, rotY: k * Math.PI * 2, scale: 0.9 + k * 0.6 });
          count += 1;
        }
      }
    }
  }
}

// ---------- 셀 ----------

export interface CellInput {
  buildings: BuildingFeature[];
  roads: RoadFeature[];
  /** 교차로·노면 판정용, 이웃 셀 포함 */
  roadsAround: RoadFeature[];
  areas: AreaFeature[];
  /** 건물 안인지 (가로수·가로등 배치 제외용), 이웃 셀 포함 */
  isBlocked: (p: Pt) => boolean;
  /** 셀의 최소 좌표 (교차로 패드·횡단보도 중복 방지) */
  cellMin: Pt;
  /** 보행로 (횡단보도 검출용), 이웃 셀 포함 */
  footwaysAround: FootwayFeature[];
}

export interface CellBuild {
  group: THREE.Group;
  trees: Placement[];
  lamps: Placement[];
  hvac: Placement[];
  buildings: BuildingInfo[];
  dispose: () => void;
}

export function buildCell(input: CellInput, mats: CityMaterials): CellBuild {
  const acc = newAccumulators();
  const trees: Placement[] = [];
  const lamps: Placement[] = [];
  const hvac: Placement[] = [];
  const infos: BuildingInfo[] = [];

  for (const f of input.buildings) {
    const info = buildingInfo(f);
    infos.push(info);
    buildBuilding(acc, info, hvac);
  }
  const junctions = buildJunctions(input.roadsAround);
  const onRoad = makeRoadTester(input.roadsAround);
  buildRoads(acc, input.roads, input.roadsAround, junctions, input.cellMin, trees, lamps, input.isBlocked, onRoad);
  buildCrosswalks(acc, input.footwaysAround, makeRoadLocator(input.roadsAround), input.cellMin);
  buildAreas(acc, input.areas, trees, input.isBlocked, onRoad);

  const group = new THREE.Group();
  const geoms: THREE.BufferGeometry[] = [];
  const add = (a: GeomAccumulator, m: THREE.Material, shadow: { cast: boolean; receive: boolean }) => {
    const g = a.build();
    if (!g) return;
    geoms.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = shadow.cast;
    mesh.receiveShadow = shadow.receive;
    group.add(mesh);
  };
  (Object.keys(acc.facades) as FacadeKind[]).forEach((k) => add(acc.facades[k], mats.facades[k], { cast: true, receive: true }));
  add(acc.shopfront, mats.shopfront, { cast: true, receive: true });
  add(acc.roof, mats.roof, { cast: true, receive: true });
  add(acc.sidewalk, mats.sidewalk, { cast: false, receive: true });
  add(acc.asphaltLane, mats.asphaltLane, { cast: false, receive: true });
  add(acc.asphaltPlain, mats.asphaltPlain, { cast: false, receive: true });
  add(acc.asphaltAlley, mats.asphaltAlley, { cast: false, receive: true });
  add(acc.crosswalk, mats.crosswalk, { cast: false, receive: true });
  add(acc.grass, mats.grass, { cast: false, receive: true });
  add(acc.pitch, mats.pitch, { cast: false, receive: true });
  add(acc.sand, mats.sand, { cast: false, receive: true });
  add(acc.water, mats.water, { cast: false, receive: true });

  return {
    group,
    trees,
    lamps,
    hvac,
    buildings: infos,
    dispose: () => {
      geoms.forEach((g) => g.dispose());
      group.clear();
    },
  };
}

/** 건물 bbox 기반 차단 판정기 (여유 margin m) */
export function makeBlockedTester(buildings: BuildingFeature[], margin = 0.8): (p: Pt) => boolean {
  const grid = new Map<string, BuildingFeature[]>();
  const CS = 32;
  for (const b of buildings) {
    const [minx, minz, maxx, maxz] = b.bbox;
    for (let cx = Math.floor((minx - margin) / CS); cx <= Math.floor((maxx + margin) / CS); cx += 1) {
      for (let cz = Math.floor((minz - margin) / CS); cz <= Math.floor((maxz + margin) / CS); cz += 1) {
        const k = `${cx},${cz}`;
        const list = grid.get(k);
        if (list) list.push(b);
        else grid.set(k, [b]);
      }
    }
  }
  return (p: Pt) => {
    const list = grid.get(`${Math.floor(p.x / CS)},${Math.floor(p.z / CS)}`);
    if (!list) return false;
    for (const b of list) {
      const [minx, minz, maxx, maxz] = b.bbox;
      if (p.x < minx - margin || p.x > maxx + margin || p.z < minz - margin || p.z > maxz + margin) continue;
      if (pointInRing(p, b.outer)) return true;
      // 외곽선 가까이(margin 안)도 차단
      for (let i = 0; i < b.outer.length; i += 1) {
        if (distToSegment(p, b.outer[i], b.outer[(i + 1) % b.outer.length]) < margin) return true;
      }
    }
    return false;
  };
}

export { bboxOf, signedArea };
