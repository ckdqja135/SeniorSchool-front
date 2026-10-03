/**
 * 지리 좌표 ↔ 장면 로컬 좌표(m) 변환과 타일 좌표 계산.
 *
 * 로컬 좌표계: 원점(origin)을 기준으로 x = 동(+)/서(−), z = 남(+)/북(−), y = 위. 단위 m.
 * 원점은 장면을 처음 열 때의 중심이며, 수십 km 안에서는 부동소수 정밀도 문제가 없다.
 */

export interface Pt {
  x: number;
  z: number;
}

export interface LocalOrigin {
  lat: number;
  lng: number;
  mPerDegLat: number;
  mPerDegLng: number;
}

export function makeOrigin(lat: number, lng: number): LocalOrigin {
  const rad = (lat * Math.PI) / 180;
  return {
    lat,
    lng,
    mPerDegLat: 111132.954 - 559.822 * Math.cos(2 * rad) + 1.175 * Math.cos(4 * rad),
    mPerDegLng: 111412.84 * Math.cos(rad) - 93.5 * Math.cos(3 * rad),
  };
}

export function toLocal(o: LocalOrigin, lat: number, lng: number): Pt {
  return { x: (lng - o.lng) * o.mPerDegLng, z: -(lat - o.lat) * o.mPerDegLat };
}

export function toLatLng(o: LocalOrigin, x: number, z: number): { lat: number; lng: number } {
  return { lat: o.lat - z / o.mPerDegLat, lng: o.lng + x / o.mPerDegLng };
}

/** 웹 메르카토르 타일 인덱스 */
export function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return {
    x: Math.floor(((lng + 180) / 360) * n),
    y: Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n),
  };
}

/** 타일 안의 픽셀(0..extent) → 위경도 */
export function tilePixelToLngLat(tx: number, ty: number, z: number, px: number, py: number, extent: number): { lng: number; lat: number } {
  const n = 2 ** z;
  const lng = ((tx + px / extent) / n) * 360 - 180;
  const yy = Math.PI * (1 - (2 * (ty + py / extent)) / n);
  const lat = (Math.atan(Math.sinh(yy)) * 180) / Math.PI;
  return { lng, lat };
}

/** 셀(공간 청크) 크기(m). 건물·도로 지오메트리는 셀 단위로 만들고 버린다 */
export const CELL_SIZE = 256;

export function cellKeyOf(x: number, z: number): string {
  return `${Math.floor(x / CELL_SIZE)},${Math.floor(z / CELL_SIZE)}`;
}

export function cellIndexOf(x: number, z: number): { cx: number; cz: number } {
  return { cx: Math.floor(x / CELL_SIZE), cz: Math.floor(z / CELL_SIZE) };
}

export function cellCenter(cx: number, cz: number): Pt {
  return { x: (cx + 0.5) * CELL_SIZE, z: (cz + 0.5) * CELL_SIZE };
}

// ---------- 기하 유틸 ----------

export function signedArea(ring: Pt[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i += 1) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    a += p.x * q.z - q.x * p.z;
  }
  return a / 2;
}

export function centroidOf(ring: Pt[]): Pt {
  let cx = 0;
  let cz = 0;
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i += 1) {
    const p = ring[i];
    const q = ring[(i + 1) % n];
    const f = p.x * q.z - q.x * p.z;
    cx += (p.x + q.x) * f;
    cz += (p.z + q.z) * f;
    a += f;
  }
  if (Math.abs(a) < 1e-6) {
    const s = ring.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
    return { x: s.x / ring.length, z: s.z / ring.length };
  }
  return { x: cx / (3 * a), z: cz / (3 * a) };
}

export function bboxOf(pts: Pt[]): [number, number, number, number] {
  let minx = Infinity;
  let minz = Infinity;
  let maxx = -Infinity;
  let maxz = -Infinity;
  for (const p of pts) {
    if (p.x < minx) minx = p.x;
    if (p.z < minz) minz = p.z;
    if (p.x > maxx) maxx = p.x;
    if (p.z > maxz) maxz = p.z;
  }
  return [minx, minz, maxx, maxz];
}

export function pointInRing(p: Pt, ring: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (a.z > p.z !== b.z > p.z && p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

export function pointInPolygon(p: Pt, outer: Pt[], holes: Pt[][]): boolean {
  if (!pointInRing(p, outer)) return false;
  for (const h of holes) if (pointInRing(p, h)) return false;
  return true;
}

/** 점 → 선분 최단 거리 */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  let t = l2 === 0 ? 0 : ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const qx = a.x + t * dx;
  const qz = a.z + t * dz;
  return Math.hypot(p.x - qx, p.z - qz);
}

export function distToPolyline(p: Pt, pts: Pt[]): number {
  let best = Infinity;
  for (let i = 0; i + 1 < pts.length; i += 1) {
    const d = distToSegment(p, pts[i], pts[i + 1]);
    if (d < best) best = d;
  }
  return best;
}

export function ringLength(pts: Pt[], closed: boolean): number {
  let l = 0;
  for (let i = 0; i + 1 < pts.length; i += 1) l += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].z - pts[i].z);
  if (closed && pts.length > 1) l += Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].z - pts[pts.length - 1].z);
  return l;
}

/** 문자열 → 안정적인 해시(양의 정수) */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** 해시 기반 0..1 난수 (같은 입력이면 같은 값) */
export function hash01(s: string, salt = 0): number {
  return (hashString(`${s}#${salt}`) % 100000) / 100000;
}
