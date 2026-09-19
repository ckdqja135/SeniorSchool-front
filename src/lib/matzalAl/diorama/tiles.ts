/**
 * OpenFreeMap(OpenMapTiles 스키마) 벡터 타일을 받아 장면용 로컬 피처로 디코딩한다.
 *
 * - z14 타일 하나 ≈ 1.9km. 건물은 높이 버킷별 멀티폴리곤으로 묶여 오므로 링 단위로 풀어 개별 건물로 만든다
 *   (MVT 규칙: 부호 있는 면적 > 0 이 외곽 링, < 0 이 구멍. 구멍은 직전 외곽 링에 붙인다).
 * - 도로는 class 별 폭을 정하고 터널·철도·공사중은 제외한다.
 * - 공원·잔디·숲·운동장·물은 면 피처로 보관한다.
 * - 모든 좌표는 `LocalOrigin` 기준 m 로 변환해 두어 씬에서 바로 쓴다.
 */
import Pbf from 'pbf';
import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile';
import {
  bboxOf,
  centroidOf,
  hashString,
  signedArea,
  tilePixelToLngLat,
  toLocal,
  type LocalOrigin,
  type Pt,
} from './geo';

export const TILE_ZOOM = 14;
const TILE_URL = 'https://tiles.openfreemap.org/planet/20260913_164504_pt/{z}/{x}/{y}.pbf';

export interface BuildingFeature {
  id: string;
  outer: Pt[];
  holes: Pt[][];
  height: number;
  base: number;
  centroid: Pt;
  bbox: [number, number, number, number];
  area: number;
}

export type RoadClass = 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary' | 'minor' | 'service' | 'busway' | 'pedestrian';

export interface RoadFeature {
  id: string;
  pts: Pt[];
  cls: RoadClass;
  width: number;
  /**
   * 인도 리본을 그릴지. 간선(9m 이상)에만 그린다.
   * 좁은 골목까지 인도를 두르면 옆 도로를 덮어 조각보처럼 보인다.
   */
  sidewalk: boolean;
  bbox: [number, number, number, number];
}

export type AreaKind = 'park' | 'grass' | 'wood' | 'water' | 'pitch' | 'sand';

export interface AreaFeature {
  id: string;
  outer: Pt[];
  holes: Pt[][];
  kind: AreaKind;
  bbox: [number, number, number, number];
  centroid: Pt;
}

/**
 * 보행로(footway/path/cycleway) 선형. 도로로 그리지는 않고 **횡단보도 검출**에만 쓴다.
 * OSM 의 횡단보도(highway=footway + footway=crossing)는 타일에서 subclass=footway 로만 오지만,
 * 차도를 거의 직각으로 가로지르는 짧은 선분이라 기하로 찾아낼 수 있다.
 */
export interface FootwayFeature {
  id: string;
  pts: Pt[];
  bbox: [number, number, number, number];
  /** 데이터에 횡단보도로 명시됨(footway=crossing). 현재 타일 소스에는 이 태그가 없어 항상 undefined */
  crossing?: boolean;
}

export interface TileData {
  key: string;
  buildings: BuildingFeature[];
  roads: RoadFeature[];
  areas: AreaFeature[];
  footways: FootwayFeature[];
}

const ROAD_WIDTH: Record<RoadClass, number> = {
  motorway: 18,
  trunk: 15,
  primary: 13,
  secondary: 11,
  tertiary: 9,
  minor: 7,
  service: 4.5,
  busway: 7,
  pedestrian: 6,
};

function classifyRoad(props: Record<string, unknown>): RoadClass | null {
  const cls = String(props.class ?? '');
  const sub = String(props.subclass ?? '');
  if (props.brunnel === 'tunnel') return null;
  if (cls.endsWith('_construction')) return null;
  switch (cls) {
    case 'motorway':
    case 'trunk':
    case 'primary':
    case 'secondary':
    case 'tertiary':
    case 'minor':
    case 'service':
    case 'busway':
      return cls;
    case 'path':
      return sub === 'pedestrian' ? 'pedestrian' : null;
    default:
      return null;
  }
}

function classifyArea(layer: string, props: Record<string, unknown>): AreaKind | null {
  const cls = String(props.class ?? '');
  if (layer === 'park') return 'park';
  if (layer === 'water') return 'water';
  if (layer === 'landcover') {
    if (cls === 'grass') return 'grass';
    if (cls === 'wood') return 'wood';
    if (cls === 'sand') return 'sand';
    return null;
  }
  if (layer === 'landuse') {
    if (cls === 'pitch' || cls === 'playground' || cls === 'track') return 'pitch';
    return null;
  }
  return null;
}

export function tileKeyOf(x: number, y: number, z = TILE_ZOOM): string {
  return `${z}/${x}/${y}`;
}

/** 타일 픽셀 링 → 로컬 좌표 링 (닫힘점 중복 제거) */
function ringToLocal(origin: LocalOrigin, tx: number, ty: number, z: number, extent: number, ring: { x: number; y: number }[]): Pt[] {
  const out: Pt[] = [];
  for (const p of ring) {
    const { lng, lat } = tilePixelToLngLat(tx, ty, z, p.x, p.y, extent);
    const l = toLocal(origin, lat, lng);
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - l.x) < 0.05 && Math.abs(last.z - l.z) < 0.05) continue;
    out.push(l);
  }
  if (out.length > 1) {
    const a = out[0];
    const b = out[out.length - 1];
    if (Math.abs(a.x - b.x) < 0.05 && Math.abs(a.z - b.z) < 0.05) out.pop();
  }
  return out;
}

/** 멀티폴리곤 피처의 링들을 (외곽, 구멍[]) 묶음으로 분리 */
function splitPolygons(feature: VectorTileFeature, origin: LocalOrigin, tx: number, ty: number, z: number): { outer: Pt[]; holes: Pt[][] }[] {
  const raw = feature.loadGeometry();
  const extent = feature.extent;
  const polys: { outer: Pt[]; holes: Pt[][] }[] = [];
  for (const ring of raw) {
    // MVT 규칙: 타일 좌표(y 아래)에서 부호 있는 면적 > 0 이면 외곽
    let a = 0;
    for (let i = 0, n = ring.length; i < n; i += 1) {
      const p = ring[i];
      const q = ring[(i + 1) % n];
      a += p.x * q.y - q.x * p.y;
    }
    const local = ringToLocal(origin, tx, ty, z, extent, ring);
    if (local.length < 3) continue;
    if (a > 0) polys.push({ outer: local, holes: [] });
    else if (polys.length > 0) polys[polys.length - 1].holes.push(local);
  }
  return polys;
}

export async function loadTile(origin: LocalOrigin, tx: number, ty: number, signal?: AbortSignal, z = TILE_ZOOM): Promise<TileData> {
  const url = TILE_URL.replace('{z}', String(z)).replace('{x}', String(tx)).replace('{y}', String(ty));
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`tile ${z}/${tx}/${ty} HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const tile = new VectorTile(new Pbf(new Uint8Array(buf)));
  const key = tileKeyOf(tx, ty, z);

  const buildings: BuildingFeature[] = [];
  const bl = tile.layers.building;
  if (bl) {
    for (let i = 0; i < bl.length; i += 1) {
      const f = bl.feature(i);
      const props = f.properties as Record<string, unknown>;
      if (props.hide_3d) continue;
      const height = Math.max(3, Number(props.render_height) || 10);
      const base = Math.max(0, Number(props.render_min_height) || 0);
      const polys = splitPolygons(f, origin, tx, ty, z);
      polys.forEach((poly, j) => {
        const area = Math.abs(signedArea(poly.outer));
        if (area < 12) return; // 너무 작은 조각(경계 절단 부스러기)은 버린다
        const centroid = centroidOf(poly.outer);
        buildings.push({
          id: `${key}:b${i}:${j}`,
          outer: poly.outer,
          holes: poly.holes,
          height,
          base,
          centroid,
          bbox: bboxOf(poly.outer),
          area,
        });
      });
    }
  }

  const roads: RoadFeature[] = [];
  const footways: FootwayFeature[] = [];
  const rl = tile.layers.transportation;
  if (rl) {
    for (let i = 0; i < rl.length; i += 1) {
      const f = rl.feature(i);
      if (f.type !== 2) continue;
      const props = f.properties as Record<string, unknown>;
      if (props.class === 'path' && props.brunnel !== 'tunnel' && props.brunnel !== 'bridge') {
        const sub = String(props.subclass ?? '');
        if (sub === 'footway' || sub === 'path' || sub === 'cycleway') {
          f.loadGeometry().forEach((line, j) => {
            const pts = ringToLocal(origin, tx, ty, z, f.extent, line);
            if (pts.length >= 2) footways.push({ id: `${key}:f${i}:${j}`, pts, bbox: bboxOf(pts) });
          });
        }
      }
      const cls = classifyRoad(props);
      if (!cls) continue;
      const lines = f.loadGeometry();
      lines.forEach((line, j) => {
        const pts = ringToLocal(origin, tx, ty, z, f.extent, line);
        if (pts.length < 2) return;
        roads.push({
          id: `${key}:r${i}:${j}`,
          pts,
          cls,
          width: ROAD_WIDTH[cls],
          sidewalk: ROAD_WIDTH[cls] >= 9 && cls !== 'motorway',
          bbox: bboxOf(pts),
        });
      });
    }
  }

  const areas: AreaFeature[] = [];
  for (const layerName of ['park', 'landcover', 'landuse', 'water'] as const) {
    const layer = tile.layers[layerName];
    if (!layer) continue;
    for (let i = 0; i < layer.length; i += 1) {
      const f = layer.feature(i);
      if (f.type !== 3) continue;
      const kind = classifyArea(layerName, f.properties as Record<string, unknown>);
      if (!kind) continue;
      const polys = splitPolygons(f, origin, tx, ty, z);
      polys.forEach((poly, j) => {
        if (Math.abs(signedArea(poly.outer)) < 40) return;
        areas.push({ id: `${key}:${layerName}${i}:${j}`, outer: poly.outer, holes: poly.holes, kind, bbox: bboxOf(poly.outer), centroid: centroidOf(poly.outer) });
      });
    }
  }

  return { key, buildings, roads, areas, footways };
}

/** 피처 id → 결정적 난수 시드 */
export function featureSeed(id: string): number {
  return hashString(id);
}
