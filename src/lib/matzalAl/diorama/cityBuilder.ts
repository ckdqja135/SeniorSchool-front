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
import { makeCrosswalkTester, planCrosswalks, type CrosswalkBand, type CrosswalkCandidate, type SurfaceQuery } from './crosswalks';
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

/**
 * 바닥 레이어 높이표. 겹쳐 깔리는 평면은 **반드시 서로 다른 층**에 두고, 층 간격은 최소 1cm 로 유지한다.
 * 타일 데이터는 park 폴리곤 위에 landcover(grass/sand) · landuse(pitch) 가 그대로 겹쳐 오는데,
 * 같은 높이에 두면 깊이 버퍼 정밀도와 상관없이 매 프레임 앞뒤가 뒤바뀌어 카메라를 움직일 때 반짝인다(z-fighting).
 * 순서: 넓고 일반적인 면(공원)이 아래, 작고 구체적인 면(모래·운동장·물)이 위. 인도는 모든 면 위, 도로는 인도 위.
 */
export const Y = {
  ground: 0,
  /** park 레이어 (공원 전체 외곽) */
  park: 0.01,
  /** landcover grass · wood · garden 등 */
  grass: 0.02,
  /** landcover sand (운동장·광장 바닥) */
  sand: 0.03,
  /** landuse pitch · playground · track */
  pitch: 0.04,
  water: 0.05,
  /** 공원 안 나무 밑동 (모든 면보다 위) */
  areaProp: 0.06,
  /** 인도. 도로 등급마다 +0.003 (0.08 ~ 0.104) */
  sidewalk: 0.08,
  /** 가로수·가로등 등 인도 소품 (인도보다 위, 도로보다 아래) */
  prop: 0.11,
  /** 보행자 */
  person: 0.11,
  /** 차도. 도로 등급마다 +0.008 (0.13 ~ 0.194) */
  road: 0.13,
  junction: 0.2,
  crosswalk: 0.215,
  /** 차량 (가장 높은 아스팔트보다 위) */
  vehicle: 0.21,
  /** 바닥 장식(선택 링·가로등 빛 웅덩이) — 횡단보도 포함 모든 바닥 위 */
  decal: 0.23,
} as const;

/** 소품 밑동에 깔리는 AO 그림자 원판의 밑동 대비 높이. 공원 나무(0.07)는 인도 아래, 가로수(0.12)는 도로 아래로 숨는다 */
export const AO_BLOB_LIFT = 0.01;

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

// ---------- 겹치는 벽 제거 ----------

/**
 * 타일 데이터에는 같은 벽면을 공유하는 건물이 흔하다: 저층부(포디움)와 타워가 같은 외곽선을 쓰거나,
 * 외곽선과 building:part 가 둘 다 base 0 으로 오거나, footprint 가 완전히 같은 중복 피처.
 * 그대로 그리면 같은 평면에 벽이 두 장 겹쳐 카메라를 움직일 때 반짝인다(z-fighting) — 특히 높은 건물 밑부분.
 *
 * 한 변(벽)이 **같은 선 위 · 같은 바깥 방향 · 높이 구간을 완전히 포함하는** 다른 건물의 벽에 덮이는 구간은
 * 그리지 않는다. 덮이는 벽은 어차피 더 큰 벽 안에 숨어 있어서 빼도 보이는 게 달라지지 않는다.
 * (서로 마주 보는 벽 — 이웃 건물끼리 맞댄 벽 — 은 방향이 반대라 대상이 아니다)
 */
interface WallEdge {
  id: string;
  a: Pt;
  b: Pt;
  /** 바깥 법선 */
  nx: number;
  nz: number;
  y0: number;
  y1: number;
}

const WALL_GRID = 32;
/** 같은 선으로 볼 거리 허용치(m). 타일 좌표 양자화 오차보다 크게 */
const WALL_LINE_EPS = 0.08;

export class WallOccluder {
  private readonly grid = new Map<string, WallEdge[]>();

  constructor(features: BuildingFeature[]) {
    for (const f of features) {
      this.addRing(f, f.outer, false);
      for (const h of f.holes) this.addRing(f, h, true);
    }
  }

  private addRing(f: BuildingFeature, ring: Pt[], isHole: boolean) {
    const n = ring.length;
    for (let i = 0; i < n; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      if (Math.hypot(b.x - a.x, b.z - a.z) < 0.2) continue;
      const o = edgeOutward(a, b, isHole ? f.outer : ring, isHole ? [] : f.holes);
      const e: WallEdge = { id: f.id, a, b, nx: isHole ? -o.nx : o.nx, nz: isHole ? -o.nz : o.nz, y0: f.base, y1: f.base + f.height };
      const gx0 = Math.floor(Math.min(a.x, b.x) / WALL_GRID);
      const gx1 = Math.floor(Math.max(a.x, b.x) / WALL_GRID);
      const gz0 = Math.floor(Math.min(a.z, b.z) / WALL_GRID);
      const gz1 = Math.floor(Math.max(a.z, b.z) / WALL_GRID);
      for (let gx = gx0; gx <= gx1; gx += 1) {
        for (let gz = gz0; gz <= gz1; gz += 1) {
          const key = `${gx},${gz}`;
          const list = this.grid.get(key);
          if (list) list.push(e);
          else this.grid.set(key, [e]);
        }
      }
    }
  }

  /**
   * 변 a→b(바깥 법선 nx,nz · 높이 y0~y1)에서 **보이는 구간**을 [t0,t1] (a 로부터의 거리, m) 목록으로 돌려준다.
   * 덮는 벽이 없으면 [[0, len]].
   */
  visibleSpans(id: string, a: Pt, b: Pt, nx: number, nz: number, y0: number, y1: number): [number, number][] {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) return [];
    const ux = dx / len;
    const uz = dz / len;
    const covered: [number, number][] = [];
    const seen = new Set<WallEdge>();
    const gx0 = Math.floor(Math.min(a.x, b.x) / WALL_GRID);
    const gx1 = Math.floor(Math.max(a.x, b.x) / WALL_GRID);
    const gz0 = Math.floor(Math.min(a.z, b.z) / WALL_GRID);
    const gz1 = Math.floor(Math.max(a.z, b.z) / WALL_GRID);
    for (let gx = gx0; gx <= gx1; gx += 1) {
      for (let gz = gz0; gz <= gz1; gz += 1) {
        const list = this.grid.get(`${gx},${gz}`);
        if (!list) continue;
        for (const e of list) {
          if (e.id === id || seen.has(e)) continue;
          seen.add(e);
          // 높이 구간이 이 벽을 완전히 포함해야 가려진다. 같은 구간이면 id 순서로 한쪽만 남긴다
          if (e.y0 > y0 + 1e-6 || e.y1 < y1 - 1e-6) continue;
          if (e.y0 === y0 && e.y1 === y1 && e.id > id) continue;
          // 같은 바깥 방향
          if (e.nx * nx + e.nz * nz < 0.995) continue;
          // 같은 선 위 (양 끝점이 이 변의 직선에서 EPS 이내)
          const da = (e.a.x - a.x) * -uz + (e.a.z - a.z) * ux;
          const db = (e.b.x - a.x) * -uz + (e.b.z - a.z) * ux;
          if (Math.abs(da) > WALL_LINE_EPS || Math.abs(db) > WALL_LINE_EPS) continue;
          const ta = (e.a.x - a.x) * ux + (e.a.z - a.z) * uz;
          const tb = (e.b.x - a.x) * ux + (e.b.z - a.z) * uz;
          const t0 = Math.max(0, Math.min(ta, tb));
          const t1 = Math.min(len, Math.max(ta, tb));
          if (t1 - t0 > 0.05) covered.push([t0, t1]);
        }
      }
    }
    if (covered.length === 0) return [[0, len]];
    covered.sort((p, q) => p[0] - q[0]);
    const spans: [number, number][] = [];
    let cursor = 0;
    for (const [c0, c1] of covered) {
      if (c0 > cursor + 0.05) spans.push([cursor, c0]);
      cursor = Math.max(cursor, c1);
    }
    if (len > cursor + 0.05) spans.push([cursor, len]);
    return spans;
  }
}

function wallRing(acc: CellAccumulators, info: BuildingInfo, ring: Pt[], isHole: boolean, occluder: WallOccluder | null) {
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
    const edgeU0 = cum;
    cum += len;
    // 다른 건물 벽에 완전히 덮이는 구간은 건너뛴다 (WallOccluder 참고). UV 는 변 전체 기준으로 이어 붙인다
    const spans = occluder ? occluder.visibleSpans(f.id, a, b, normal.x, normal.z, y0, y1) : [[0, len] as [number, number]];
    for (const [t0, t1] of spans) {
      const pa = { x: a.x + ((b.x - a.x) * t0) / len, z: a.z + ((b.z - a.z) * t0) / len };
      const pb = { x: a.x + ((b.x - a.x) * t1) / len, z: a.z + ((b.z - a.z) * t1) / len };
      const u0 = edgeU0 + t0;
      const u1 = edgeU0 + t1;
      if (bandH > 0) {
        acc.shopfront.pushQuad(
          new THREE.Vector3(pa.x, y0, pa.z),
          new THREE.Vector3(pb.x, y0, pb.z),
          new THREE.Vector3(pb.x, y0 + bandH, pb.z),
          new THREE.Vector3(pa.x, y0 + bandH, pa.z),
          normal,
          [u0 / SHOP_TILE_W + uOff, 0, u1 / SHOP_TILE_W + uOff, 1],
        );
        if (y1 - (y0 + bandH) > 0.3) {
          acc.facades[info.kind].pushQuad(
            new THREE.Vector3(pa.x, y0 + bandH, pa.z),
            new THREE.Vector3(pb.x, y0 + bandH, pb.z),
            new THREE.Vector3(pb.x, y1, pb.z),
            new THREE.Vector3(pa.x, y1, pa.z),
            normal,
            [u0 / FACADE_TILE_W + uOff, vOff, u1 / FACADE_TILE_W + uOff, vOff + (y1 - y0 - bandH) / FACADE_TILE_H],
          );
        }
      } else {
        acc.facades[info.kind].pushQuad(
          new THREE.Vector3(pa.x, y0, pa.z),
          new THREE.Vector3(pb.x, y0, pb.z),
          new THREE.Vector3(pb.x, y1, pb.z),
          new THREE.Vector3(pa.x, y1, pa.z),
          normal,
          [u0 / FACADE_TILE_W + uOff, vOff, u1 / FACADE_TILE_W + uOff, vOff + (y1 - y0) / FACADE_TILE_H],
        );
      }
    }
  }
}

function buildBuilding(acc: CellAccumulators, info: BuildingInfo, hvac: Placement[], occluder: WallOccluder | null) {
  const f = info.feature;
  wallRing(acc, info, f.outer, false, occluder);
  for (const h of f.holes) wallRing(acc, info, h, true, occluder);
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

/**
 * 횡단보도 계획에 쓰는 노면 질의. 도로 리본(중심선 ± 폭/2)과 교차로 패드(원판) — 화면에 그리는 것과 같은 기하.
 * 리본 꺾임의 마이터 모서리만 근사(세그먼트 거리)한다.
 */
function makeSurfaceQuery(roads: RoadFeature[], junctions: Junction[], blocked: (p: Pt) => boolean): SurfaceQuery {
  const CS = 32;
  const grid = new Map<string, RoadFeature[]>();
  for (const r of roads) {
    if (r.width < 7) continue; // 골목(service)은 횡단보도 대상이 아니다
    const [minx, minz, maxx, maxz] = r.bbox;
    const m = r.width / 2 + 1;
    for (let gx = Math.floor((minx - m) / CS); gx <= Math.floor((maxx + m) / CS); gx += 1) {
      for (let gz = Math.floor((minz - m) / CS); gz <= Math.floor((maxz + m) / CS); gz += 1) {
        const k = `${gx},${gz}`;
        const list = grid.get(k);
        if (list) list.push(r);
        else grid.set(k, [r]);
      }
    }
  }
  const pads = junctions.filter((j) => j.maxWidth >= 7);
  const nearestRoad = (p: Pt) => {
    const list = grid.get(`${Math.floor(p.x / CS)},${Math.floor(p.z / CS)}`);
    if (!list) return null;
    let best: { road: RoadFeature; tx: number; tz: number; d: number } | null = null;
    for (const r of list) {
      for (let i = 0; i + 1 < r.pts.length; i += 1) {
        const d = distToSegment(p, r.pts[i], r.pts[i + 1]);
        if (!best || d < best.d) {
          const a = r.pts[i];
          const b = r.pts[i + 1];
          const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
          best = { road: r, tx: (b.x - a.x) / l, tz: (b.z - a.z) / l, d };
        }
      }
    }
    return best;
  };
  return {
    onSurface: (p) => {
      const list = grid.get(`${Math.floor(p.x / CS)},${Math.floor(p.z / CS)}`);
      if (list) {
        for (const r of list) {
          const half = r.width / 2;
          for (let i = 0; i + 1 < r.pts.length; i += 1) if (distToSegment(p, r.pts[i], r.pts[i + 1]) <= half) return true;
        }
      }
      for (const j of pads) if (Math.hypot(j.x - p.x, j.z - p.z) <= j.radius) return true;
      return false;
    },
    nearestRoad: (p) => {
      const b = nearestRoad(p);
      return b ? { road: b.road, tx: b.tx, tz: b.tz } : null;
    },
    blocked,
  };
}

/**
 * 횡단보도 띠 그리기.
 * 흰 줄의 긴 변 = 횡단 방향(e0→e1), 줄무늬는 폭 방향으로 반복.
 * 텍스처는 v 방향으로 줄이 쌓여 있으므로(1타일 = 줄 7개) 사각형의 첫 변(l0→r0)을 **폭 방향**에 두고
 * v 반복 수를 폭/0.9m 로 잡는다. u(횡단 방향)는 0..1 로 한 줄이 끝까지 이어진다.
 */
function drawCrosswalk(acc: CellAccumulators, b: CrosswalkBand) {
  const [l0, r0, r1, l1] = b.quad; // e0 좌, e0 우, e1 우, e1 좌
  const width = b.half * 2;
  acc.crosswalk.pushFlatQuad(l0, r0, r1, l1, asphaltY(b.road.cls) + 0.012, 0, 1, 0, Math.max(1, width / 0.9 / 7));
}

/** 디버그 오버레이용 선분 (색은 0xRRGGBB) */
export interface DebugSeg {
  a: Pt;
  b: Pt;
  y: number;
  color: number;
}
let crosswalkDebug = false;
/** 개발용: 도로 중심선·차도 경계·보행로·횡단보도 후보를 선으로 그린다 (다음 셀 빌드부터 적용) */
export function setCrosswalkDebug(on: boolean) {
  crosswalkDebug = on;
}
export function isCrosswalkDebug() {
  return crosswalkDebug;
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
  inCrosswalk: (p: Pt) => boolean,
  debug: DebugSeg[] | null,
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

    // 2) 횡단보도는 planCrosswalks 가 보행로·차도 경계로 따로 계획한다 (buildCell 참고)
    if (debug) {
      const yC = roadY + 0.3;
      for (let i = 0; i + 1 < st.length; i += 1) {
        debug.push({ a: st[i].p, b: st[i + 1].p, y: yC, color: 0xffd24a }); // 중심선: 노랑
        const la = { x: st[i].p.x + st[i].nx * halfW * st[i].miter, z: st[i].p.z + st[i].nz * halfW * st[i].miter };
        const lb = { x: st[i + 1].p.x + st[i + 1].nx * halfW * st[i + 1].miter, z: st[i + 1].p.z + st[i + 1].nz * halfW * st[i + 1].miter };
        const ra = { x: st[i].p.x - st[i].nx * halfW * st[i].miter, z: st[i].p.z - st[i].nz * halfW * st[i].miter };
        const rb = { x: st[i + 1].p.x - st[i + 1].nx * halfW * st[i + 1].miter, z: st[i + 1].p.z - st[i + 1].nz * halfW * st[i + 1].miter };
        debug.push({ a: la, b: lb, y: yC, color: 0x33e0ff }, { a: ra, b: rb, y: yC, color: 0x33e0ff }); // 차도 경계: 시안
      }
    }

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
          if (isBlocked(p) || onRoad(p, 0.8) || inCrosswalk(p)) continue;
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
        if (!isBlocked(p) && !onRoad(p, 0.5) && !inCrosswalk(p)) {
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
    // 종류별로 다른 층에 깐다 (Y 표 참고). 같은 층에 두 면이 겹치면 z-fighting
    switch (a.kind) {
      case 'water':
        acc.water.pushTrianglesUp(tris, Y.water, 10);
        break;
      case 'pitch':
        acc.pitch.pushTrianglesUp(tris, Y.pitch, 6);
        break;
      case 'sand':
        acc.sand.pushTrianglesUp(tris, Y.sand, 6);
        break;
      case 'park':
        acc.grass.pushTrianglesUp(tris, Y.park, 10);
        break;
      default:
        acc.grass.pushTrianglesUp(tris, Y.grass, 10);
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
          trees.push({ x: p.x, y: Y.areaProp, z: p.z, rotY: k * Math.PI * 2, scale: 0.9 + k * 0.6 });
          count += 1;
        }
      }
    }
  }
}

// ---------- 셀 ----------

export interface CellInput {
  buildings: BuildingFeature[];
  /** 겹치는 벽 판정용, 이웃 셀 포함 (없으면 이 셀 건물만으로 판정) */
  buildingsAround?: BuildingFeature[];
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
  /** 이 셀이 그린 횡단보도 (이웃 셀 중복 판정·검증용) */
  crosswalks: CrosswalkBand[];
  /** 검증용: 후보 전체(채택/기각 사유) */
  crosswalkCandidates: CrosswalkCandidate[];
  debugSegments: DebugSeg[] | null;
  dispose: () => void;
}

export function buildCell(input: CellInput, mats: CityMaterials): CellBuild {
  const acc = newAccumulators();
  const trees: Placement[] = [];
  const lamps: Placement[] = [];
  const hvac: Placement[] = [];
  const infos: BuildingInfo[] = [];

  const occluder = new WallOccluder(input.buildingsAround ?? input.buildings);
  for (const f of input.buildings) {
    const info = buildingInfo(f);
    infos.push(info);
    buildBuilding(acc, info, hvac, occluder);
  }
  const junctions = buildJunctions(input.roadsAround);
  const onRoad = makeRoadTester(input.roadsAround);
  const debug: DebugSeg[] | null = crosswalkDebug ? [] : null;

  // 횡단보도: 이웃 셀까지 포함해 계획하고(중복·소품 회피용), 중심이 이 셀 안인 것만 그린다
  const surface = makeSurfaceQuery(input.roadsAround, junctions, input.isBlocked);
  const plan = planCrosswalks(input.footwaysAround, surface);
  const inCell = (p: Pt) => p.x >= input.cellMin.x && p.x < input.cellMin.x + CELL_SIZE && p.z >= input.cellMin.z && p.z < input.cellMin.z + CELL_SIZE;
  const ownBands = plan.bands.filter((b) => inCell(b.center));
  const inCrosswalk = makeCrosswalkTester(plan.bands);

  buildRoads(acc, input.roads, input.roadsAround, junctions, input.cellMin, trees, lamps, input.isBlocked, onRoad, inCrosswalk, debug);
  for (const b of ownBands) drawCrosswalk(acc, b);
  buildAreas(acc, input.areas, trees, input.isBlocked, onRoad);

  if (debug) {
    for (const f of input.footwaysAround) {
      for (let i = 0; i + 1 < f.pts.length; i += 1) debug.push({ a: f.pts[i], b: f.pts[i + 1], y: 0.35, color: 0xff4fd8 }); // 보행로: 마젠타
    }
    for (const cand of plan.candidates) {
      if (!inCell({ x: (cand.e0.x + cand.e1.x) / 2, z: (cand.e0.z + cand.e1.z) / 2 })) continue;
      const color = cand.accepted ? 0x3dff7a : 0xff3b3b; // 채택: 초록, 기각: 빨강
      debug.push({ a: cand.e0, b: cand.e1, y: 0.5, color });
      // 끝점 표식(작은 십자)
      for (const e of [cand.e0, cand.e1]) {
        debug.push({ a: { x: e.x - 0.6, z: e.z }, b: { x: e.x + 0.6, z: e.z }, y: 0.55, color }, { a: { x: e.x, z: e.z - 0.6 }, b: { x: e.x, z: e.z + 0.6 }, y: 0.55, color });
      }
    }
    for (const b of ownBands) {
      const q = b.quad;
      for (let i = 0; i < 4; i += 1) debug.push({ a: q[i], b: q[(i + 1) % 4], y: 0.45, color: 0xffffff }); // 띠 외곽: 흰색
    }
  }

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
    crosswalks: ownBands,
    crosswalkCandidates: plan.candidates,
    debugSegments: debug,
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
