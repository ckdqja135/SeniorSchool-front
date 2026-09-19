/**
 * DB 식당 → 실제 건물 정면의 매장·간판.
 *
 * 1) 식당 좌표를 품는 건물(없으면 30m 안 가장 가까운 건물)을 찾는다.
 * 2) 건물 외곽 변 중 도로에 가장 가까운 변을 정면으로 고른다 (긴 변 우선).
 * 3) 한 건물에 식당이 여럿이면 한국 상가처럼 층별·칸별로 나눠 배치한다 (1층 → 2층 → … , 정면이 길면 칸을 나눔).
 * 4) 1층: 유리 매장·문·계단·차양·가로 간판. 위층: 그 층 벽에 간판 + 켜진 창 띠. 첫 식당은 세로 간판도 단다.
 * 5) 건물이 낮고(≤4층) 옥상이 적당히 넓으면 옥상 테라스(난간·전구줄·테이블·화분)를 올린다.
 *
 * 건물을 못 찾은 식당은 좌표 위에 작은 단독 매장을 세운다 (핀이 허공에 뜨지 않게).
 * 간판 텍스처는 식당별로 만들어 캐시하고, 나머지 매장 부품은 재질별 한 메시로 합친다.
 */
import * as THREE from 'three';
import type { ExploreCuisine, ExploreRestaurant } from '@/types/MatzalAl/explore';
import { buildingInfo, edgeOutward, GeomAccumulator, Y, type BuildingInfo } from './cityBuilder';
import { distToPolyline, distToSegment, hash01, pointInPolygon, type Pt } from './geo';
import type { Placement } from './props';
import type { BuildingFeature, RoadFeature } from './tiles';
import { awningTexture, interiorTexture, signTexture } from './textures';

export interface Frame {
  nx: number;
  nz: number;
  tx: number;
  tz: number;
}

export interface StorefrontPlan {
  restaurantId: string;
  name: string;
  cuisine: ExploreCuisine;
  building: BuildingInfo | null;
  /** 매장 칸 중심(벽 위) */
  center: Pt;
  frame: Frame;
  slotW: number;
  floor: number;
  y0: number;
  floorH: number;
  anchor: THREE.Vector3;
  door: { pos: Pt; frame: Frame } | null;
  style: StorefrontStyle;
  /** 건물의 첫 식당(세로 간판·테라스 담당) */
  primary: boolean;
}

export interface StorefrontStyle {
  signBg: string;
  signFg: string;
  neon: boolean;
  awning: { a: string; b: string } | null;
  vertical: boolean;
  interior: string;
}

const SIGN_PALETTE: { bg: string; fg: string }[] = [
  { bg: '#1f1b19', fg: '#ffe8c2' },
  { bg: '#17181c', fg: '#f6e7cf' },
  { bg: '#f3ede3', fg: '#3b2f2a' },
  { bg: '#8b2f2f', fg: '#fff0d8' },
  { bg: '#2f5d8a', fg: '#fff4e0' },
  { bg: '#3f7d5a', fg: '#fff4e0' },
  { bg: '#141416', fg: '#ffe9c6' },
  { bg: '#e8b84a', fg: '#2b2420' },
];
const AWNINGS: { a: string; b: string }[] = [
  { a: '#c8413f', b: '#f6efe4' },
  { a: '#2f5d8a', b: '#f6efe4' },
  { a: '#3f7d5a', b: '#f6efe4' },
];
const INTERIORS = ['#ffd9a3', '#ffcf8a', '#ffe3b8', '#f7c98c'];

function styleFor(id: string, floor: number, primary: boolean, floors: number): StorefrontStyle {
  const p = SIGN_PALETTE[Math.floor(hash01(id, 1) * SIGN_PALETTE.length)];
  const awningIdx = Math.floor(hash01(id, 2) * AWNINGS.length);
  return {
    signBg: p.bg,
    signFg: p.fg,
    neon: hash01(id, 3) < 0.3,
    awning: floor === 0 && hash01(id, 4) < 0.5 ? AWNINGS[awningIdx] : null,
    vertical: primary && floors >= 2 && hash01(id, 5) < 0.7,
    interior: INTERIORS[Math.floor(hash01(id, 6) * INTERIORS.length)],
  };
}

export interface PlanningContext {
  /** 점 주변(이웃 셀 포함) 건물 */
  buildingsNear: (p: Pt) => BuildingFeature[];
  /** 점 주변 도로 */
  roadsNear: (p: Pt) => RoadFeature[];
}

interface EdgeChoice {
  a: Pt;
  b: Pt;
  len: number;
  frame: Frame;
  gap: number;
}

function frontEdges(f: BuildingFeature, roads: RoadFeature[]): EdgeChoice[] {
  const edges: EdgeChoice[] = [];
  const n = f.outer.length;
  for (let i = 0; i < n; i += 1) {
    const a = f.outer[i];
    const b = f.outer[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 4.5) continue;
    const { nx, nz } = edgeOutward(a, b, f.outer, f.holes);
    const tx = (b.x - a.x) / len;
    const tz = (b.z - a.z) / len;
    const mid = { x: (a.x + b.x) / 2 + nx * 2, z: (a.z + b.z) / 2 + nz * 2 };
    let gap = Infinity;
    for (const r of roads) {
      const d = distToPolyline(mid, r.pts) - r.width / 2;
      if (d < gap) gap = d;
    }
    edges.push({ a, b, len, frame: { nx, nz, tx, tz }, gap });
  }
  // 도로에 가까운 순, 비슷하면 긴 변 우선
  edges.sort((p, q) => (Math.abs(p.gap - q.gap) < 4 ? q.len - p.len : p.gap - q.gap));
  return edges;
}

function findBuilding(p: Pt, candidates: BuildingFeature[]): BuildingFeature | null {
  let inside: BuildingFeature | null = null;
  for (const b of candidates) {
    if (b.base > 0) continue; // 상부 구조물 제외
    const [minx, minz, maxx, maxz] = b.bbox;
    if (p.x < minx || p.x > maxx || p.z < minz || p.z > maxz) continue;
    if (pointInPolygon(p, b.outer, b.holes)) {
      // 여러 건물이 겹치면 작은(구체적인) 것
      if (!inside || b.area < inside.area) inside = b;
    }
  }
  if (inside) return inside;
  let best: BuildingFeature | null = null;
  let bestD = 30;
  for (const b of candidates) {
    if (b.base > 0) continue;
    const [minx, minz, maxx, maxz] = b.bbox;
    if (p.x < minx - bestD || p.x > maxx + bestD || p.z < minz - bestD || p.z > maxz + bestD) continue;
    for (let i = 0; i < b.outer.length; i += 1) {
      const d = distToSegment(p, b.outer[i], b.outer[(i + 1) % b.outer.length]);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
  }
  return best;
}

export interface RestaurantInput {
  restaurant: ExploreRestaurant;
  local: Pt;
}

/** 식당 목록 → 매장 배치 계획. 건물별로 묶어 층·칸을 배분한다 */
export function planStorefronts(items: RestaurantInput[], ctx: PlanningContext): Map<string, StorefrontPlan> {
  const plans = new Map<string, StorefrontPlan>();
  const byBuilding = new Map<string, { building: BuildingFeature; items: RestaurantInput[] }>();
  const orphans: RestaurantInput[] = [];

  for (const it of items) {
    const b = findBuilding(it.local, ctx.buildingsNear(it.local));
    if (!b) {
      orphans.push(it);
      continue;
    }
    const entry = byBuilding.get(b.id);
    if (entry) entry.items.push(it);
    else byBuilding.set(b.id, { building: b, items: [it] });
  }

  byBuilding.forEach(({ building, items: list }) => {
    const info = buildingInfo(building);
    const edges = frontEdges(building, ctx.roadsNear(building.centroid));
    if (edges.length === 0) {
      orphans.push(...list);
      return;
    }
    list.sort((p, q) => (p.restaurant.id < q.restaurant.id ? -1 : 1));
    const maxFloors = Math.min(info.floors, 5);
    const useEdges = edges.slice(0, 2);
    const slotsOf = (e: EdgeChoice) => Math.max(1, Math.floor(e.len / 11));
    const capacity = useEdges.reduce((s, e) => s + slotsOf(e) * maxFloors, 0);

    list.forEach((it, k) => {
      const kk = k % Math.max(1, capacity);
      let rem = kk;
      let edge = useEdges[0];
      let slotIdx = 0;
      let floor = 0;
      for (const e of useEdges) {
        const cap = slotsOf(e) * maxFloors;
        if (rem < cap) {
          edge = e;
          const nSlots = slotsOf(e);
          slotIdx = rem % nSlots;
          floor = Math.floor(rem / nSlots);
          break;
        }
        rem -= cap;
      }
      const nSlots = slotsOf(edge);
      const segLen = edge.len / nSlots;
      const slotW = Math.min(12, segLen) * 0.92;
      const t = (slotIdx + 0.5) * segLen;
      const center = { x: edge.a.x + edge.frame.tx * t, z: edge.a.z + edge.frame.tz * t };
      const y0 = floor * info.floorH;
      const primary = k === 0;
      const style = styleFor(it.restaurant.id, floor, primary, info.floors);
      const signY = floor === 0 ? info.floorH + 0.62 : y0 + info.floorH * 0.8;
      const anchor = new THREE.Vector3(center.x + edge.frame.nx * 0.5, signY + 0.55 + 0.9, center.z + edge.frame.nz * 0.5);
      const doorT = t + slotW * 0.3;
      const door = {
        pos: { x: edge.a.x + edge.frame.tx * doorT + edge.frame.nx * 1.3, z: edge.a.z + edge.frame.tz * doorT + edge.frame.nz * 1.3 },
        frame: edge.frame,
      };
      plans.set(it.restaurant.id, {
        restaurantId: it.restaurant.id,
        name: it.restaurant.name,
        cuisine: it.restaurant.cuisine,
        building: info,
        center,
        frame: edge.frame,
        slotW,
        floor,
        y0,
        floorH: info.floorH,
        anchor,
        door,
        style,
        primary,
      });
    });
  });

  // 건물 없음: 단독 매장 (도로 쪽을 향하게)
  for (const it of orphans) {
    const roads = ctx.roadsNear(it.local);
    let frame: Frame = { nx: 0, nz: -1, tx: 1, tz: 0 };
    let best = Infinity;
    for (const r of roads) {
      for (let i = 0; i + 1 < r.pts.length; i += 1) {
        const d = distToSegment(it.local, r.pts[i], r.pts[i + 1]);
        if (d < best) {
          best = d;
          const a = r.pts[i];
          const b = r.pts[i + 1];
          const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
          const tx = (b.x - a.x) / len;
          const tz = (b.z - a.z) / len;
          // 도로 쪽 방향 = 도로 위 최근접점 - 식당
          const l2 = len * len;
          const tt = Math.max(0, Math.min(1, ((it.local.x - a.x) * tx * len + (it.local.z - a.z) * tz * len) / l2));
          const qx = a.x + tx * len * tt;
          const qz = a.z + tz * len * tt;
          const dx = qx - it.local.x;
          const dz = qz - it.local.z;
          const dl = Math.hypot(dx, dz) || 1;
          frame = { nx: dx / dl, nz: dz / dl, tx: -dz / dl, tz: dx / dl };
        }
      }
    }
    const style = styleFor(it.restaurant.id, 0, true, 2);
    const center = { x: it.local.x + frame.nx * 3, z: it.local.z + frame.nz * 3 };
    plans.set(it.restaurant.id, {
      restaurantId: it.restaurant.id,
      name: it.restaurant.name,
      cuisine: it.restaurant.cuisine,
      building: null,
      center,
      frame,
      slotW: 7,
      floor: 0,
      y0: 0,
      floorH: 3.6,
      anchor: new THREE.Vector3(center.x + frame.nx * 0.5, 3.6 + 0.62 + 1.45, center.z + frame.nz * 0.5),
      door: { pos: { x: center.x + frame.nx * 1.3 + frame.tx * 2, z: center.z + frame.nz * 1.3 + frame.tz * 2 }, frame },
      style,
      primary: true,
    });
  }

  return plans;
}

// ---------- 배치(batch) 빌드 ----------

export class StorefrontMaterials {
  readonly frame = new THREE.MeshStandardMaterial({ color: '#2a2724', roughness: 0.7, metalness: 0.1 });
  readonly door = new THREE.MeshStandardMaterial({ color: '#4a3324', roughness: 0.6 });
  readonly step = new THREE.MeshStandardMaterial({ color: '#cfc7bb', roughness: 0.9 });
  readonly glass: THREE.MeshStandardMaterial;
  readonly awnings: THREE.MeshStandardMaterial[];
  readonly railing = new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.5, metalness: 0.5 });
  readonly wood = new THREE.MeshStandardMaterial({ color: '#7d5f42', roughness: 0.85 });
  readonly deck = new THREE.MeshStandardMaterial({ color: '#a9895f', roughness: 0.8 });
  readonly planter = new THREE.MeshStandardMaterial({ color: '#6b4c3a', roughness: 0.9 });
  readonly foliage = new THREE.MeshStandardMaterial({ color: '#4f8544', roughness: 0.9, flatShading: true });
  readonly tableTop = new THREE.MeshStandardMaterial({ color: '#c9a173', roughness: 0.7 });
  readonly lampHead = new THREE.MeshStandardMaterial({ color: '#fff0cc', emissive: new THREE.Color('#ffdca0'), emissiveIntensity: 2.2 });
  readonly standalone = new THREE.MeshStandardMaterial({ color: '#e6ddcf', roughness: 0.9 });
  readonly hit = new THREE.MeshBasicMaterial({ visible: false });
  private readonly textures: THREE.Texture[] = [];

  constructor() {
    const interior = interiorTexture('#ffd9a3', 3);
    this.textures.push(interior);
    this.glass = new THREE.MeshStandardMaterial({ map: interior, emissiveMap: interior, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.95, roughness: 0.2, metalness: 0.05 });
    this.awnings = AWNINGS.map((c) => {
      const t = awningTexture(c.a, c.b);
      this.textures.push(t);
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide });
    });
  }

  dispose() {
    this.textures.forEach((t) => t.dispose());
    [this.frame, this.door, this.step, this.glass, this.railing, this.wood, this.deck, this.planter, this.foliage, this.tableTop, this.lampHead, this.standalone, this.hit, ...this.awnings].forEach((m) => m.dispose());
  }
}

/** 정면 프레임 기준 로컬 (s: 변 방향, y, o: 바깥 방향) → 월드 */
function fromFrame(center: Pt, f: Frame, s: number, y: number, o: number): THREE.Vector3 {
  return new THREE.Vector3(center.x + f.tx * s + f.nx * o, y, center.z + f.tz * s + f.nz * o);
}

/** 프레임 기준 박스를 누적기에 넣는다 (6면) */
function pushBox(acc: GeomAccumulator, center: Pt, f: Frame, s0: number, s1: number, y0: number, y1: number, o0: number, o1: number) {
  const P = (s: number, y: number, o: number) => fromFrame(center, f, s, y, o);
  const n = new THREE.Vector3(f.nx, 0, f.nz);
  const t = new THREE.Vector3(f.tx, 0, f.tz);
  const up = new THREE.Vector3(0, 1, 0);
  const uv: [number, number, number, number] = [0, 0, 1, 1];
  acc.pushQuad(P(s0, y0, o1), P(s1, y0, o1), P(s1, y1, o1), P(s0, y1, o1), n, uv); // 앞
  acc.pushQuad(P(s1, y0, o0), P(s0, y0, o0), P(s0, y1, o0), P(s1, y1, o0), n.clone().negate(), uv); // 뒤
  acc.pushQuad(P(s1, y0, o1), P(s1, y0, o0), P(s1, y1, o0), P(s1, y1, o1), t, uv); // 오른쪽
  acc.pushQuad(P(s0, y0, o0), P(s0, y0, o1), P(s0, y1, o1), P(s0, y1, o0), t.clone().negate(), uv); // 왼쪽
  acc.pushQuad(P(s0, y1, o1), P(s1, y1, o1), P(s1, y1, o0), P(s0, y1, o0), up, uv); // 위
  acc.pushQuad(P(s0, y0, o0), P(s1, y0, o0), P(s1, y0, o1), P(s0, y0, o1), up.clone().negate(), uv); // 아래
}

export interface StorefrontBatch {
  group: THREE.Group;
  hitObjects: THREE.Object3D[];
  bulbs: Placement[];
  tables: Placement[];
  anchors: Map<string, THREE.Vector3>;
  dispose: () => void;
}

export class SignCache {
  private readonly entries = new Map<string, { h: THREE.Mesh; v: THREE.Mesh | null; textures: THREE.Texture[]; mats: THREE.Material[] }>();

  get(plan: StorefrontPlan): { h: THREE.Mesh; v: THREE.Mesh | null } {
    const key = plan.restaurantId;
    const cached = this.entries.get(key);
    if (cached) return { h: cached.h, v: cached.v };
    const { style } = plan;
    const textures: THREE.Texture[] = [];
    const mats: THREE.Material[] = [];
    const emissiveStrength = style.neon ? 1.3 : 0.9;
    const sideMat = new THREE.MeshStandardMaterial({ color: style.signBg, roughness: 0.6, metalness: 0.2 });
    mats.push(sideMat);
    const hTex = signTexture(plan.name, { bg: style.signBg, fg: style.signFg, glow: style.neon ? '#ff8f7a' : undefined });
    textures.push(hTex);
    const hMat = new THREE.MeshStandardMaterial({ map: hTex, emissive: new THREE.Color('#ffffff'), emissiveMap: hTex, emissiveIntensity: emissiveStrength, roughness: 0.5 });
    mats.push(hMat);
    const signW = Math.min(plan.slotW * 0.92, 11);
    const h = new THREE.Mesh(new THREE.BoxGeometry(signW, 1.05, 0.18), [sideMat, sideMat, sideMat, sideMat, hMat, sideMat]);
    h.castShadow = true;
    let v: THREE.Mesh | null = null;
    if (style.vertical) {
      const vTex = signTexture(plan.name, { bg: style.signBg, fg: style.signFg, vertical: true, glow: style.neon ? '#ff8f7a' : undefined });
      textures.push(vTex);
      const vMat = new THREE.MeshStandardMaterial({ map: vTex, emissive: new THREE.Color('#ffffff'), emissiveMap: vTex, emissiveIntensity: emissiveStrength, roughness: 0.5 });
      mats.push(vMat);
      const floors = plan.building?.floors ?? 2;
      const vH = Math.min(floors * plan.floorH - 1.4, 4.8);
      v = new THREE.Mesh(new THREE.BoxGeometry(0.2, vH, 1.1), [vMat, vMat, sideMat, sideMat, sideMat, sideMat]);
      v.castShadow = true;
    }
    this.entries.set(key, { h, v, textures, mats });
    return { h, v };
  }

  prune(keep: Set<string>) {
    this.entries.forEach((e, key) => {
      if (keep.has(key)) return;
      e.h.geometry.dispose();
      e.v?.geometry.dispose();
      e.textures.forEach((t) => t.dispose());
      e.mats.forEach((m) => m.dispose());
      this.entries.delete(key);
    });
  }

  dispose() {
    this.prune(new Set());
  }
}

export function buildStorefronts(plans: StorefrontPlan[], mats: StorefrontMaterials, signs: SignCache): StorefrontBatch {
  const accFrame = new GeomAccumulator();
  const accDoor = new GeomAccumulator();
  const accStep = new GeomAccumulator();
  const accGlass = new GeomAccumulator();
  const accAwning = AWNINGS.map(() => new GeomAccumulator());
  const accRail = new GeomAccumulator();
  const accWood = new GeomAccumulator();
  const accDeck = new GeomAccumulator();
  const accPlanter = new GeomAccumulator();
  const accFoliage = new GeomAccumulator();
  const accStandalone = new GeomAccumulator();
  const group = new THREE.Group();
  const hitObjects: THREE.Object3D[] = [];
  const bulbs: Placement[] = [];
  const tables: Placement[] = [];
  const anchors = new Map<string, THREE.Vector3>();
  const geoms: THREE.BufferGeometry[] = [];
  const terraced = new Set<string>();

  for (const plan of plans) {
    const { center, frame: f, slotW, y0, floorH, style } = plan;
    const half = slotW / 2;
    anchors.set(plan.restaurantId, plan.anchor);

    if (!plan.building) {
      // 단독 매장 본체 (8 × 4 × 6m), 정면이 도로 쪽
      pushBox(accStandalone, center, f, -4, 4, 0, floorH, -6, 0);
      const roofTris: [Pt, Pt, Pt][] = [];
      const c = (s: number, o: number) => ({ x: center.x + f.tx * s + f.nx * o, z: center.z + f.tz * s + f.nz * o });
      roofTris.push([c(-4, -6), c(4, -6), c(4, 0)], [c(-4, -6), c(4, 0), c(-4, 0)]);
      accStandalone.pushTrianglesUp(roofTris, floorH + 0.01, 8);
    }

    if (plan.floor === 0) {
      // 프레임 + 유리 + 문 + 계단
      pushBox(accFrame, center, f, -half, half, y0 + 0.05, y0 + floorH - 0.3, 0.02, 0.36);
      const glassH = floorH - 1.0;
      const gW = slotW - 0.5;
      accGlass.pushQuad(
        fromFrame(center, f, -gW / 2, y0 + 0.5, 0.37),
        fromFrame(center, f, gW / 2, y0 + 0.5, 0.37),
        fromFrame(center, f, gW / 2, y0 + 0.5 + glassH, 0.37),
        fromFrame(center, f, -gW / 2, y0 + 0.5 + glassH, 0.37),
        new THREE.Vector3(f.nx, 0, f.nz),
        [0, 0, 1, 1],
      );
      // 멀리언
      for (let i = 1; i < 4; i += 1) {
        const s = -gW / 2 + (i * gW) / 4;
        pushBox(accFrame, center, f, s - 0.035, s + 0.035, y0 + 0.5, y0 + 0.5 + glassH, 0.37, 0.41);
      }
      const doorS = half * 0.6;
      pushBox(accDoor, center, f, doorS - 0.7, doorS + 0.7, y0 + 0.08, y0 + 2.5, 0.38, 0.44);
      pushBox(accStep, center, f, doorS - 1.2, doorS + 1.2, y0, y0 + 0.14, 0.4, 1.4);
      if (style.awning) {
        const idx = AWNINGS.indexOf(style.awning);
        const acc = accAwning[idx < 0 ? 0 : idx];
        const aw = slotW * 0.7;
        // 기울어진 차양: 벽에서 1.8m 돌출, 앞쪽이 0.55m 낮다
        const yTop = y0 + floorH - 0.55;
        acc.pushQuad(
          fromFrame(center, f, -aw / 2 - 0.5, yTop, 0.36),
          fromFrame(center, f, aw / 2 - 0.5, yTop, 0.36),
          fromFrame(center, f, aw / 2 - 0.5, yTop - 0.55, 2.1),
          fromFrame(center, f, -aw / 2 - 0.5, yTop - 0.55, 2.1),
          new THREE.Vector3(f.nx * 0.3, 0.95, f.nz * 0.3).normalize(),
          [0, 0, 3, 1],
        );
      }
    } else {
      // 위층: 켜진 창 띠 + 벽면 간판
      const gW = slotW - 0.8;
      const gH = floorH * 0.55;
      pushBox(accFrame, center, f, -gW / 2 - 0.15, gW / 2 + 0.15, y0 + 0.45, y0 + 0.45 + gH + 0.3, 0.02, 0.12);
      accGlass.pushQuad(
        fromFrame(center, f, -gW / 2, y0 + 0.6, 0.13),
        fromFrame(center, f, gW / 2, y0 + 0.6, 0.13),
        fromFrame(center, f, gW / 2, y0 + 0.6 + gH, 0.13),
        fromFrame(center, f, -gW / 2, y0 + 0.6 + gH, 0.13),
        new THREE.Vector3(f.nx, 0, f.nz),
        [0, 0, 1, 1],
      );
    }

    // 간판
    const { h, v } = signs.get(plan);
    const signY = plan.floor === 0 ? y0 + floorH + 0.62 : y0 + floorH * 0.8;
    h.position.copy(fromFrame(center, f, 0, signY, 0.28));
    h.rotation.y = Math.atan2(f.nx, f.nz);
    group.add(h);
    if (v && plan.building) {
      const floors = plan.building.floors;
      const vH = (v.geometry as THREE.BoxGeometry).parameters.height;
      const side = hash01(plan.restaurantId, 7) < 0.5 ? -1 : 1;
      v.position.copy(fromFrame(center, f, side * (half - 0.3), floors * floorH - vH / 2 - 0.4, 0.62));
      v.rotation.y = Math.atan2(f.nx, f.nz);
      group.add(v);
      // 브래킷
      pushBox(accRail, center, f, side * (half - 0.3) - 0.04, side * (half - 0.3) + 0.04, floors * floorH - 0.6, floors * floorH - 0.52, 0.05, 0.62);
    }

    // 히트 박스 (매장 칸 + 간판)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(slotW, floorH + 1.6, 1.2), mats.hit);
    hit.position.copy(fromFrame(center, f, 0, y0 + (floorH + 1.6) / 2, 0.4));
    hit.rotation.y = Math.atan2(f.nx, f.nz);
    hit.userData.restaurantId = plan.restaurantId;
    geoms.push(hit.geometry);
    group.add(hit);
    hitObjects.push(hit);

    // 옥상 테라스 (건물당 1회)
    const b = plan.building;
    if (b && plan.primary && !terraced.has(b.feature.id) && b.floors <= 4 && b.feature.area >= 60 && b.feature.area <= 700 && hash01(b.feature.id, 9) < 0.7) {
      terraced.add(b.feature.id);
      buildTerrace(b, accRail, accWood, accDeck, accPlanter, accFoliage, bulbs, tables);
    }
  }

  const add = (acc: GeomAccumulator, m: THREE.Material, cast = true) => {
    const g = acc.build();
    if (!g) return;
    geoms.push(g);
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  add(accFrame, mats.frame);
  add(accDoor, mats.door);
  add(accStep, mats.step, false);
  add(accGlass, mats.glass, false);
  accAwning.forEach((a, i) => add(a, mats.awnings[i]));
  add(accRail, mats.railing, false);
  add(accWood, mats.wood);
  add(accDeck, mats.deck, false);
  add(accPlanter, mats.planter);
  add(accFoliage, mats.foliage);
  add(accStandalone, mats.standalone);

  return {
    group,
    hitObjects,
    bulbs,
    tables,
    anchors,
    dispose: () => {
      geoms.forEach((g) => g.dispose());
      group.clear();
    },
  };
}

function buildTerrace(
  b: BuildingInfo,
  accRail: GeomAccumulator,
  accWood: GeomAccumulator,
  accDeck: GeomAccumulator,
  accPlanter: GeomAccumulator,
  accFoliage: GeomAccumulator,
  bulbs: Placement[],
  tables: Placement[],
) {
  const f = b.feature;
  const H = f.base + f.height;
  const ring = f.outer;
  const n = ring.length;
  const inset = 0.6;
  const railH = 1.05;
  const railPts: Pt[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = ring[i];
    const bb = ring[(i + 1) % n];
    const { nx, nz } = edgeOutward(a, bb, f.outer, f.holes);
    railPts.push({ x: a.x - nx * inset, z: a.z - nz * inset });
    // 다음 정점도 이 변 법선으로 넣어 두면 꺾임에서 두 점이 생기지만 시각적으로 무방
    railPts.push({ x: bb.x - nx * inset, z: bb.z - nz * inset });
  }
  // 난간: 변마다 상단 레일(얇은 박스) + 기둥
  for (let i = 0; i < railPts.length; i += 2) {
    const a = railPts[i];
    const c = railPts[i + 1];
    const len = Math.hypot(c.x - a.x, c.z - a.z);
    if (len < 1) continue;
    const tx = (c.x - a.x) / len;
    const tz = (c.z - a.z) / len;
    const frame: Frame = { nx: -tz, nz: tx, tx, tz };
    const mid = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 };
    pushBox(accRail, mid, frame, -len / 2, len / 2, H + railH - 0.04, H + railH, -0.025, 0.025);
    const posts = Math.max(1, Math.floor(len / 2.2));
    for (let k = 0; k <= posts; k += 1) {
      const s = -len / 2 + (k * len) / posts;
      pushBox(accRail, mid, frame, s - 0.03, s + 0.03, H, H + railH, -0.03, 0.03);
    }
    // 전구줄: 레일 위 1.6m 간격
    for (let d = 0.8; d < len; d += 1.6) {
      bulbs.push({ x: a.x + tx * d, y: H + railH + 0.9 - Math.sin((d / len) * Math.PI) * 0.35, z: a.z + tz * d, rotY: 0, scale: 1 });
    }
    // 전구 기둥
    if (len > 3) {
      pushBox(accRail, mid, frame, -len / 2 + 0.02, -len / 2 + 0.06, H, H + railH + 1.0, -0.02, 0.02);
    }
  }
  // 데크 바닥 (옥상 위 살짝)
  const tris: [Pt, Pt, Pt][] = [];
  try {
    const contour = ring.map((p) => new THREE.Vector2(p.x, p.z));
    const holes = f.holes.map((h) => h.map((p) => new THREE.Vector2(p.x, p.z)));
    const all = [...ring, ...f.holes.flat()];
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(contour, holes)) tris.push([all[i], all[j], all[k]]);
  } catch {
    /* 삼각분할 실패 → 데크 생략 */
  }
  accDeck.pushTrianglesUp(tris, H + 0.05, 2);

  // 테이블: 내부 점 몇 개 (경계에서 2m 이상)
  const [minx, minz, maxx, maxz] = f.bbox;
  let placed = 0;
  for (let t = 0; t < 30 && placed < 4; t += 1) {
    const p = { x: minx + hash01(f.id, 100 + t) * (maxx - minx), z: minz + hash01(f.id, 200 + t) * (maxz - minz) };
    if (!pointInPolygon(p, f.outer, f.holes)) continue;
    let ok = true;
    for (let i = 0; i < n && ok; i += 1) if (distToSegment(p, ring[i], ring[(i + 1) % n]) < 2.2) ok = false;
    if (!ok) continue;
    tables.push({ x: p.x, y: H + 0.05, z: p.z, rotY: hash01(f.id, 300 + t) * Math.PI, scale: 1 });
    placed += 1;
  }
  // 퍼걸러 (가장 긴 변 옆)
  let longest = 0;
  let li = 0;
  for (let i = 0; i < n; i += 1) {
    const l = Math.hypot(ring[(i + 1) % n].x - ring[i].x, ring[(i + 1) % n].z - ring[i].z);
    if (l > longest) {
      longest = l;
      li = i;
    }
  }
  if (longest > 7) {
    const a = ring[li];
    const c = ring[(li + 1) % n];
    const tx = (c.x - a.x) / longest;
    const tz = (c.z - a.z) / longest;
    const { nx, nz } = edgeOutward(a, c, f.outer, f.holes);
    const pw = Math.min(6, longest - 3);
    const pd = 3.6;
    const mid = { x: (a.x + c.x) / 2 - nx * (inset + 1.2 + pd / 2), z: (a.z + c.z) / 2 - nz * (inset + 1.2 + pd / 2) };
    if (pointInPolygon(mid, f.outer, f.holes)) {
      const frame: Frame = { nx, nz, tx, tz };
      const ph = 2.7;
      for (const [ss, oo] of [
        [-pw / 2, -pd / 2],
        [pw / 2, -pd / 2],
        [pw / 2, pd / 2],
        [-pw / 2, pd / 2],
      ]) {
        pushBox(accWood, mid, frame, ss - 0.09, ss + 0.09, H, H + ph, oo - 0.09, oo + 0.09);
      }
      for (let i = 0; i < 6; i += 1) {
        const s = -pw / 2 + (i * pw) / 5;
        pushBox(accWood, mid, frame, s - 0.06, s + 0.06, H + ph, H + ph + 0.16, -pd / 2 - 0.2, pd / 2 + 0.2);
      }
      pushBox(accWood, mid, frame, -pw / 2 - 0.2, pw / 2 + 0.2, H + ph - 0.14, H + ph, -pd / 2 - 0.06, -pd / 2 + 0.06);
      pushBox(accWood, mid, frame, -pw / 2 - 0.2, pw / 2 + 0.2, H + ph - 0.14, H + ph, pd / 2 - 0.06, pd / 2 + 0.06);
      // 화분: 퍼걸러 앞
      for (let i = 0; i < 3; i += 1) {
        const s = -pw / 2 + 0.8 + i * ((pw - 1.6) / 2);
        pushBox(accPlanter, mid, frame, s - 0.55, s + 0.55, H, H + 0.5, pd / 2 + 0.4, pd / 2 + 0.95);
        pushBox(accFoliage, mid, frame, s - 0.5, s + 0.5, H + 0.5, H + 1.05, pd / 2 + 0.45, pd / 2 + 0.9);
      }
    }
  }
}

export function frameRotY(f: Frame): number {
  return Math.atan2(f.nx, f.nz);
}
