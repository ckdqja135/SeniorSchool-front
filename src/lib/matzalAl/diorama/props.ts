/**
 * 거리 소품 — 인스턴싱.
 *
 * 가로수·가로등·옥상 설비·사람·차는 수백~수천 개가 놓이므로 종류별 InstancedMesh 하나로 그린다.
 * 각 매니저는 고정 용량을 갖고 `set(items)` 로 행렬·색을 통째로 다시 채운다 (셀이 바뀔 때만 호출).
 * 사람·차는 여러 부품을 한 지오메트리로 합치고 정점색으로 부위를 구분한다. 인스턴스 색은 부위색에 곱해진다
 * (셔츠·차체는 흰 정점색이라 인스턴스 색이 그대로 나온다).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Placement {
  x: number;
  y: number;
  z: number;
  rotY: number;
  scale?: number;
  color?: THREE.Color;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

/** 인스턴스 메시 하나를 감싸는 매니저 */
export class InstancedProp {
  readonly mesh: THREE.InstancedMesh;
  private readonly baseScale: THREE.Vector3;

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number, opts?: { castShadow?: boolean; receiveShadow?: boolean; baseScale?: THREE.Vector3 }) {
    this.mesh = new THREE.InstancedMesh(geometry, material, capacity);
    this.mesh.count = 0;
    this.mesh.castShadow = opts?.castShadow ?? false;
    this.mesh.receiveShadow = opts?.receiveShadow ?? false;
    this.mesh.frustumCulled = false;
    this.baseScale = opts?.baseScale ?? new THREE.Vector3(1, 1, 1);
    // instanceColor 버퍼를 미리 만들어 둔다 (없으면 setColorAt 이 처음 호출될 때 생성되며 그 전엔 흰색)
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
  }

  set(items: Placement[]) {
    const n = Math.min(items.length, this.mesh.instanceMatrix.count);
    for (let i = 0; i < n; i += 1) {
      const it = items[i];
      _p.set(it.x, it.y, it.z);
      _e.set(0, it.rotY, 0);
      _q.setFromEuler(_e);
      const s = it.scale ?? 1;
      _s.copy(this.baseScale).multiplyScalar(s);
      _m.compose(_p, _q, _s);
      this.mesh.setMatrixAt(i, _m);
      if (it.color) this.mesh.setColorAt(i, it.color);
      else this.mesh.setColorAt(i, WHITE);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    const m = this.mesh.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m.dispose();
  }
}

const WHITE = new THREE.Color('#ffffff');

/** 정점색을 지오메트리 전체에 채운다 */
function paint(geometry: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const n = geometry.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geometry;
}

function moved(geometry: THREE.BufferGeometry, x: number, y: number, z: number, rotX = 0, rotZ = 0, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  const g = geometry.clone();
  g.scale(sx, sy, sz);
  if (rotX) g.rotateX(rotX);
  if (rotZ) g.rotateZ(rotZ);
  g.translate(x, y, z);
  return g;
}

function stripIndexAndMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // 병합하려면 속성 집합이 같아야 하므로 uv 는 제거하고 position/normal/color 만 남긴다
  const cleaned = parts.map((g) => {
    const c = g.index ? g.toNonIndexed() : g;
    c.deleteAttribute('uv');
    return c;
  });
  const merged = mergeGeometries(cleaned, false);
  cleaned.forEach((g) => g.dispose());
  if (!merged) throw new Error('mergeGeometries failed');
  return merged;
}

// ---------- 가로수 ----------

export function makeTreeGeometry(): { trunk: THREE.BufferGeometry; canopy: THREE.BufferGeometry } {
  const trunk = new THREE.CylinderGeometry(0.16, 0.26, 2.6, 7);
  trunk.translate(0, 1.3, 0);
  const a = new THREE.IcosahedronGeometry(1.55, 1);
  a.translate(0, 3.3, 0);
  const b = new THREE.IcosahedronGeometry(1.15, 1);
  b.translate(0.95, 2.9, 0.35);
  const c = new THREE.IcosahedronGeometry(1.05, 1);
  c.translate(-0.85, 3.0, -0.45);
  const d = new THREE.IcosahedronGeometry(0.95, 1);
  d.translate(0.2, 4.0, -0.6);
  const canopy = stripIndexAndMerge([paint(a, '#ffffff'), paint(b, '#e9f0e3'), paint(c, '#d9e6d0'), paint(d, '#f3f7ee')]);
  a.dispose();
  b.dispose();
  c.dispose();
  d.dispose();
  return { trunk, canopy };
}

export const TREE_COLORS = ['#5f8f4e', '#6e9b57', '#7fae63', '#557f45', '#86b06a'].map((c) => new THREE.Color(c));

// ---------- 가로등 ----------

export function makeLampGeometry(): { pole: THREE.BufferGeometry; head: THREE.BufferGeometry } {
  const pole = new THREE.CylinderGeometry(0.07, 0.11, 4.6, 8);
  pole.translate(0, 2.3, 0);
  const arm = new THREE.BoxGeometry(0.1, 0.1, 1.1);
  arm.translate(0, 4.55, 0.5);
  const merged = stripIndexAndMerge([paint(pole, '#33343a'), paint(arm, '#33343a')]);
  pole.dispose();
  arm.dispose();
  const head = new THREE.BoxGeometry(0.55, 0.2, 0.32);
  head.translate(0, 4.45, 1.0);
  return { pole: merged, head };
}

// ---------- 옥상 설비 ----------

export function makeHvacGeometry(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
}

// ---------- 사람 ----------

export function makePersonGeometry(): THREE.BufferGeometry {
  const legs = new THREE.CylinderGeometry(0.16, 0.19, 0.85, 8);
  legs.translate(0, 0.43, 0);
  const torso = new THREE.CylinderGeometry(0.21, 0.17, 0.78, 8);
  torso.translate(0, 1.22, 0);
  const head = new THREE.SphereGeometry(0.165, 10, 8);
  head.translate(0, 1.78, 0);
  const hair = new THREE.SphereGeometry(0.165, 10, 8);
  hair.scale(1.02, 0.62, 1.02);
  hair.translate(0, 1.86, 0);
  const merged = stripIndexAndMerge([paint(legs, '#3a3e4c'), paint(torso, '#ffffff'), paint(head, '#f0cfae'), paint(hair, '#2b2119')]);
  [legs, torso, head, hair].forEach((g) => g.dispose());
  return merged;
}

export const SHIRT_COLORS = ['#d95d5d', '#f0e6d2', '#6d8fbf', '#ecc06a', '#7fa77d', '#5b4a68', '#e9e9ee', '#c97b3f'].map((c) => new THREE.Color(c));

// ---------- 차 ----------

export function makeCarGeometry(): { body: THREE.BufferGeometry; lights: THREE.BufferGeometry } {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.BoxGeometry(1.9, 0.62, 4.3);
  body.translate(0, 0.62, 0);
  parts.push(paint(body, '#ffffff'));
  const cabin = new THREE.BoxGeometry(1.7, 0.6, 2.3);
  cabin.translate(0, 1.2, -0.2);
  parts.push(paint(cabin, '#23272e'));
  const roof = new THREE.BoxGeometry(1.6, 0.12, 2.1);
  roof.translate(0, 1.52, -0.2);
  parts.push(paint(roof, '#ffffff'));
  for (const [sx, sz] of [
    [-0.95, 1.35],
    [0.95, 1.35],
    [-0.95, -1.35],
    [0.95, -1.35],
  ]) {
    const w = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 12);
    w.rotateZ(Math.PI / 2);
    w.translate(sx, 0.34, sz);
    parts.push(paint(w, '#1d1e21'));
  }
  const merged = stripIndexAndMerge(parts);
  parts.forEach((g) => g.dispose());

  const lightParts: THREE.BufferGeometry[] = [];
  for (const sx of [-0.62, 0.62]) {
    const hl = new THREE.BoxGeometry(0.36, 0.16, 0.06);
    hl.translate(sx, 0.72, 2.16);
    lightParts.push(paint(hl, '#fff3d0'));
    const tl = new THREE.BoxGeometry(0.36, 0.14, 0.06);
    tl.translate(sx, 0.72, -2.16);
    lightParts.push(paint(tl, '#ff3b2e'));
  }
  const lights = stripIndexAndMerge(lightParts);
  lightParts.forEach((g) => g.dispose());
  return { body: merged, lights };
}

// ---------- 테라스 테이블 · 전구 ----------

export function makeTableGeometry(): THREE.BufferGeometry {
  const top = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12);
  top.translate(0, 0.78, 0);
  const post = new THREE.CylinderGeometry(0.05, 0.07, 0.75, 6);
  post.translate(0, 0.38, 0);
  const chairL = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  chairL.translate(-0.95, 0.24, 0);
  const chairR = new THREE.BoxGeometry(0.42, 0.42, 0.42);
  chairR.translate(0.95, 0.24, 0);
  const merged = stripIndexAndMerge([paint(top, '#c9a173'), paint(post, '#4a4744'), paint(chairL, '#4a4744'), paint(chairR, '#4a4744')]);
  [top, post, chairL, chairR].forEach((g) => g.dispose());
  return merged;
}

export function makeBulbGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.1, 6, 5);
}

export const CAR_COLORS = ['#f2f0ea', '#23252b', '#8b2f2f', '#5b6b8a', '#d9d5cc', '#3f4148', '#b8b3a8', '#2f5d8a'].map((c) => new THREE.Color(c));

export { moved };
