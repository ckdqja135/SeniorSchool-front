/**
 * 실제 동네 디오라마 씬 (three.js) — 시제품(dioramaScene)의 룩을 실제 지리 데이터 + DB 식당에 적용한다.
 *
 * 흐름
 * 1. 카메라 타깃 주변 반경 R 의 셀(256m)을 구하고, 셀이 속한 z14 벡터 타일을 받아 피처를 셀별로 나눠 둔다.
 * 2. 셀마다 건물·도로·공원 지오메트리를 만든다 (프레임당 1셀). 멀어진 셀은 버린다.
 * 3. 셀이 바뀌면 가로수·가로등·옥상 설비 인스턴스를 다시 채우고, 셀이 준비된 식당은 건물 정면에 매장·간판을 만든다.
 * 4. 차는 로드된 도로 위를 달리고, 사람은 매장 앞·인도에 서 있으며, 선택된 식당 문 앞에는 줄이 생긴다.
 * 5. 핀(DOM)은 매 프레임 간판 위치로 투영하고 겹치면 접거나 숨긴다 (선택 핀 최우선).
 *
 * 조명·톤은 시제품과 같다: 낮은 태양(그림자) + 반구광 + 가로등 PointLight 풀(8개, 가장 가까운 등에 배정) + 블룸.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { ExploreRestaurant, LatLng } from '@/types/MatzalAl/explore';
import { AO_BLOB_LIFT, buildCell, CityMaterials, isCrosswalkDebug, makeBlockedTester, setCrosswalkDebug, stations, along, Y, type CellBuild } from './cityBuilder';
import { CELL_SIZE, cellIndexOf, hash01, lngLatToTile, makeOrigin, pointInRing, toLatLng, toLocal, type LocalOrigin, type Pt } from './geo';
import {
  CAR_COLORS,
  InstancedProp,
  makeBulbGeometry,
  makeCarGeometry,
  makeHvacGeometry,
  makeLampGeometry,
  makePersonGeometry,
  makeTableGeometry,
  makeTreeGeometry,
  SHIRT_COLORS,
  TREE_COLORS,
  type Placement,
} from './props';
import { buildStorefronts, planStorefronts, SignCache, StorefrontMaterials, type StorefrontBatch, type StorefrontPlan } from './storefronts';
import { loadTile, TILE_ZOOM, tileKeyOf, type BuildingFeature, type FootwayFeature, type RoadFeature, type TileData, type AreaFeature } from './tiles';
import { aoBlobTexture, lightPoolTexture } from './textures';

export interface CityViewport {
  center: LatLng;
  radiusKm: number;
  level: number;
}

export interface CitySceneOptions {
  initialCenter: LatLng;
  initialLevel: number;
  reducedMotion: boolean;
  onSelect: (id: string | null) => void;
  onViewport: (vp: CityViewport) => void;
  onLoading: (loading: boolean) => void;
  pinElements: () => Map<string, HTMLDivElement>;
  selectedId: () => string | null;
}

export interface CitySceneHandle {
  setRestaurants(all: ExploreRestaurant[], pinnedIds: Set<string>): void;
  setSelected(id: string | null): void;
  /** 매장 정면이 보이도록 카메라 이동. 매장이 아직 안 세워진 셀이면 세워진 뒤에 실행한다 */
  focus(id: string): void;
  flyTo(center: LatLng, level?: number): void;
  setUserLocation(loc: LatLng | null): void;
  /** 개발용: 도로 중심선·차도 경계·보행로·횡단보도 후보 오버레이. 셀을 다시 짓는다 */
  setDebug(on: boolean): void;
  /** 개발용: 현재 셀들의 횡단보도 후보 통계 */
  crosswalkStats(): { accepted: number; rejected: Record<string, number>; bands: number };
  zoomBy(factor: number): void;
  rotateBy(deltaRad: number): void;
  resetView(): void;
  resize(): void;
  dispose(): void;
}

/** 카메라 거리에 따라 커지는 빌드 반경 (멀리 볼수록 넓게 짓는다) */
const BUILD_RADIUS_MIN = 430;
const BUILD_RADIUS_MAX = 900;
const CAMERA = { polar: 0.9, azimuth: 2.45, fov: 38 };
const MIN_DIST = 28;
/** 롯데월드타워(555m) 같은 초고층도 담을 수 있는 최대 거리 */
const MAX_DIST = 1400;
/** 이 거리보다 멀면 그림자를 끈다 (보이지도 않고 비싸다) */
const SHADOW_MAX_DIST = 700;
const LIGHT_POOL = 8;
const CAR_COUNT = 22;

/** 카카오 level ↔ 카메라 거리(m). level 4 ≈ 104m (디오라마는 지도보다 가깝게 본다) */
export const levelToDistance = (level: number) => Math.min(MAX_DIST, Math.max(MIN_DIST, 6.5 * 2 ** level));
export const distanceToLevel = (d: number) => Math.max(1, Math.min(9, Math.round(Math.log2(d / 6.5))));

interface CellFeatures {
  buildings: BuildingFeature[];
  roads: RoadFeature[];
  areas: AreaFeature[];
  footways: FootwayFeature[];
}

interface CarState {
  road: RoadFeature;
  st: ReturnType<typeof stations>;
  total: number;
  dist: number;
  dir: 1 | -1;
  speed: number;
  color: THREE.Color;
  x: number;
  z: number;
  rotY: number;
}

/** 개발용 계측 (window.__cityStats). 프로덕션 번들에서는 값만 채우고 노출하지 않는다 */
const stats = { frames: 0, frameMs: 0, maxFrameMs: 0, cellMs: 0, cellsBuilt: 0, storefrontMs: 0, storefrontBuilds: 0, propsMs: 0, pinsMs: 0, renderMs: 0, cars: 0, pending: 0 };

let instanceSeq = 0;

export function createCityScene(container: HTMLElement, opts: CitySceneOptions): CitySceneHandle {
  const instanceId = (instanceSeq += 1);
  const origin: LocalOrigin = makeOrigin(opts.initialCenter.lat, opts.initialCenter.lng);
  if (process.env.NODE_ENV !== 'production') console.info(`[city#${instanceId}] create`, opts.initialCenter, opts.initialLevel);
  if (process.env.NODE_ENV !== 'production') (window as unknown as { __cityStats: typeof stats }).__cityStats = stats;
  const mats = new CityMaterials();
  const sfMats = new StorefrontMaterials();
  const signs = new SignCache();

  // ---------- 렌더러 · 카메라 ----------
  // 로그 깊이 버퍼: 근경(수 m)과 초고층·원경(수 km)을 같이 담을 때 깊이 정밀도 부족으로 생기는
  // 도로·지면 깜빡임(z-fighting)을 막는다
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true });
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
  // 안개 거리는 빌드 반경에 맞춰 갱신한다 (지어진 영역의 가장자리를 가린다)
  const fog = new THREE.Fog(fogColor, 210, 520);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, container.clientWidth / Math.max(1, container.clientHeight), 0.5, 6000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !opts.reducedMotion;
  controls.dampingFactor = 0.09;
  controls.screenSpacePanning = false;
  controls.minDistance = MIN_DIST;
  controls.maxDistance = MAX_DIST;
  controls.minPolarAngle = 0.42;
  // 초고층 건물을 올려다볼 수 있도록 수평에 가깝게까지 허용
  controls.maxPolarAngle = 1.4;
  // 커서 기준 줌은 커서가 지평선 위를 가리킬 때 타깃을 수 km 밖으로 날려 버리므로 끈다
  controls.zoomToCursor = false;
  controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
  controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.panSpeed = 1.1;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.3, 0.6, 0.86));
  composer.addPass(new OutputPass());

  const placeCamera = (target: THREE.Vector3, distance: number, polar = CAMERA.polar, azimuth = CAMERA.azimuth) => {
    controls.target.copy(target);
    camera.position.set(
      target.x + distance * Math.sin(polar) * Math.sin(azimuth),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.cos(azimuth),
    );
    controls.update();
  };
  placeCamera(new THREE.Vector3(0, 0, 0), levelToDistance(opts.initialLevel));

  // ---------- 조명 ----------
  scene.add(new THREE.HemisphereLight('#8fa3c7', '#d9b48f', 0.8));
  scene.add(new THREE.AmbientLight('#6f7d9c', 0.35));
  const sun = new THREE.DirectionalLight('#ffb27a', 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 420;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(sun.target);
  const SUN_OFFSET = new THREE.Vector3(-90, 70, 55);
  const updateSun = () => {
    sun.position.copy(controls.target).add(SUN_OFFSET);
    sun.target.position.copy(controls.target);
    sun.target.updateMatrixWorld();
  };
  updateSun();

  const lampLights: THREE.PointLight[] = [];
  for (let i = 0; i < LIGHT_POOL; i += 1) {
    const l = new THREE.PointLight('#ffd6a0', 60, 18, 2);
    l.visible = false;
    scene.add(l);
    lampLights.push(l);
  }

  // ---------- 지면 ----------
  const groundGeom = new THREE.PlaneGeometry(4000, 4000);
  const ground = new THREE.Mesh(groundGeom, mats.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  (mats.ground.map as THREE.Texture).repeat.set(4000 / 12, 4000 / 12);
  scene.add(ground);

  // ---------- 인스턴스 소품 ----------
  const treeGeo = makeTreeGeometry();
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5b4331', roughness: 0.9 });
  const canopyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
  const trunks = new InstancedProp(treeGeo.trunk, trunkMat, 5000, { castShadow: true });
  const canopies = new InstancedProp(treeGeo.canopy, canopyMat, 5000, { castShadow: true });
  const lampGeo = makeLampGeometry();
  const poleMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4 });
  const headMat = new THREE.MeshStandardMaterial({ color: '#fff0cc', emissive: new THREE.Color('#ffdca0'), emissiveIntensity: 2.2 });
  const poles = new InstancedProp(lampGeo.pole, poleMat, 1200, { castShadow: true });
  const heads = new InstancedProp(lampGeo.head, headMat, 1200);
  const poolTex = lightPoolTexture();
  const poolGeo = new THREE.PlaneGeometry(9, 9);
  poolGeo.rotateX(-Math.PI / 2);
  // 가로등 밑동(Y.prop) 기준으로 Y.decal 높이에 깔린다 → 차도·횡단보도 위에서도 잘리지 않는다
  poolGeo.translate(0, Y.decal - Y.prop, 1.2);
  const pools = new InstancedProp(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 1200);
  pools.mesh.renderOrder = 2;
  const hvacMat = new THREE.MeshStandardMaterial({ color: '#b8b6b2', roughness: 0.7, metalness: 0.3 });
  const hvacs = new InstancedProp(makeHvacGeometry(), hvacMat, 1200, { castShadow: true });
  const personMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const people = new InstancedProp(makePersonGeometry(), personMat, 400, { castShadow: true });
  const carGeo = makeCarGeometry();
  const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.4 });
  const carLightMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.6 });
  const carBodies = new InstancedProp(carGeo.body, carMat, CAR_COUNT, { castShadow: true });
  const carLights = new InstancedProp(carGeo.lights, carLightMat, CAR_COUNT);
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: new THREE.Color('#ffe2a8'), emissiveIntensity: 2.4 });
  const bulbs = new InstancedProp(makeBulbGeometry(), bulbMat, 3000);
  const tableMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const tables = new InstancedProp(makeTableGeometry(), tableMat, 400, { castShadow: true });
  const aoTex = aoBlobTexture();
  const aoGeo = new THREE.PlaneGeometry(1, 1);
  aoGeo.rotateX(-Math.PI / 2);
  const aoBlobs = new InstancedProp(aoGeo, new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }), 2000);
  aoBlobs.mesh.renderOrder = 1;
  [trunks, canopies, poles, heads, pools, hvacs, people, carBodies, carLights, bulbs, tables, aoBlobs].forEach((p) => scene.add(p.mesh));

  // 선택 강조 링
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.2, 3.9, 40), new THREE.MeshBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.8, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.renderOrder = 4;
  scene.add(ring);

  // ---------- 타일 · 셀 ----------
  const tiles = new Map<string, TileData | null>(); // null = 로딩 중
  const tilePromises = new Map<string, Promise<void>>();
  const cellFeatures = new Map<string, CellFeatures>();
  const cells = new Map<string, CellBuild>();
  const cellGroup = new THREE.Group();
  scene.add(cellGroup);
  let propsDirty = false;
  let restaurantsDirty = false;
  let lastLoading = false;
  let disposed = false;

  const featuresOf = (key: string): CellFeatures => {
    let f = cellFeatures.get(key);
    if (!f) {
      f = { buildings: [], roads: [], areas: [], footways: [] };
      cellFeatures.set(key, f);
    }
    return f;
  };

  const binTile = (t: TileData) => {
    for (const b of t.buildings) featuresOf(cellKey(b.centroid)).buildings.push(b);
    for (const r of t.roads) {
      const c = { x: (r.bbox[0] + r.bbox[2]) / 2, z: (r.bbox[1] + r.bbox[3]) / 2 };
      featuresOf(cellKey(c)).roads.push(r);
    }
    for (const a of t.areas) featuresOf(cellKey(a.centroid)).areas.push(a);
    for (const w of t.footways) {
      const c = { x: (w.bbox[0] + w.bbox[2]) / 2, z: (w.bbox[1] + w.bbox[3]) / 2 };
      featuresOf(cellKey(c)).footways.push(w);
    }
  };
  const cellKey = (p: Pt) => {
    const { cx, cz } = cellIndexOf(p.x, p.z);
    return `${cx},${cz}`;
  };

  const tileForCell = (cx: number, cz: number) => {
    const c = toLatLng(origin, (cx + 0.5) * CELL_SIZE, (cz + 0.5) * CELL_SIZE);
    return lngLatToTile(c.lng, c.lat, TILE_ZOOM);
  };
  const ensureTile = (tx: number, ty: number) => {
    const key = tileKeyOf(tx, ty);
    if (tiles.has(key)) return;
    tiles.set(key, null);
    const p = loadTile(origin, tx, ty)
      .then((data) => {
        if (disposed) return;
        tiles.set(key, data);
        binTile(data);
      })
      .catch(() => {
        if (disposed) return;
        // 실패한 타일은 빈 타일로 두고 다음에 다시 시도하지 않는다 (재시도는 페이지 재진입)
        tiles.set(key, { key, buildings: [], roads: [], areas: [], footways: [] });
      })
      .finally(() => tilePromises.delete(key));
    tilePromises.set(key, p);
  };
  /** 셀에 필요한 타일이 모두 도착했는지 (셀은 최대 4개 타일에 걸칠 수 있다) */
  const cellReady = (cx: number, cz: number): boolean => {
    let ready = true;
    for (const [ox, oz] of [
      [0.02, 0.02],
      [0.98, 0.02],
      [0.02, 0.98],
      [0.98, 0.98],
    ]) {
      const c = toLatLng(origin, (cx + ox) * CELL_SIZE, (cz + oz) * CELL_SIZE);
      const t = lngLatToTile(c.lng, c.lat, TILE_ZOOM);
      ensureTile(t.x, t.y);
      if (!tiles.get(tileKeyOf(t.x, t.y))) ready = false;
    }
    return ready;
  };

  const neighborhood = (cx: number, cz: number): CellFeatures => {
    const out: CellFeatures = { buildings: [], roads: [], areas: [], footways: [] };
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const f = cellFeatures.get(`${cx + dx},${cz + dz}`);
        if (!f) continue;
        out.buildings.push(...f.buildings);
        out.roads.push(...f.roads);
        out.areas.push(...f.areas);
        out.footways.push(...f.footways);
      }
    }
    return out;
  };

  /** 첫 진입 지점이 건물 안이면 가장 가까운 도로 위로 옮긴다 (거리 풍경으로 시작하도록). 한 번만 */
  let streetSnapped = false;
  const snapTargetToStreet = () => {
    if (streetSnapped) return;
    const t = controls.target;
    const { cx, cz } = cellIndexOf(t.x, t.z);
    const around = neighborhood(cx, cz);
    if (around.roads.length === 0 && around.buildings.length === 0) return;
    streetSnapped = true;
    const blocked = makeBlockedTester(around.buildings, 2);
    if (!blocked({ x: t.x, z: t.z })) return;
    let best: Pt | null = null;
    let bestD = 140;
    for (const r of around.roads) {
      if (r.width < 6) continue;
      const st = stations(r.pts);
      const total = st[st.length - 1]?.cum ?? 0;
      for (let d = 0; d <= total; d += 4) {
        const pos = along(st, d);
        if (!pos) continue;
        const dist = Math.hypot(pos.p.x - t.x, pos.p.z - t.z);
        if (dist < bestD) {
          bestD = dist;
          best = pos.p;
        }
      }
    }
    if (!best) return;
    const dx = best.x - t.x;
    const dz = best.z - t.z;
    controls.target.set(best.x, 0, best.z);
    camera.position.x += dx;
    camera.position.z += dz;
    controls.update();
    updateSun();
    emitViewport(true);
  };

  const buildOneCell = (key: string, cx: number, cz: number) => {
    const t0 = performance.now();
    const own = cellFeatures.get(key) ?? { buildings: [], roads: [], areas: [], footways: [] };
    const around = neighborhood(cx, cz);
    const built = buildCell(
      {
        buildings: own.buildings,
        buildingsAround: around.buildings,
        roads: own.roads,
        roadsAround: around.roads,
        areas: own.areas,
        isBlocked: makeBlockedTester(around.buildings),
        cellMin: { x: cx * CELL_SIZE, z: cz * CELL_SIZE },
        footwaysAround: around.footways,
      },
      mats,
    );
    cellGroup.add(built.group);
    if (built.debugSegments && built.debugSegments.length > 0) {
      const segs = built.debugSegments;
      const pos = new Float32Array(segs.length * 6);
      const col = new Float32Array(segs.length * 6);
      const tmpColor = new THREE.Color();
      segs.forEach((sg, i) => {
        pos.set([sg.a.x, sg.y, sg.a.z, sg.b.x, sg.y, sg.b.z], i * 6);
        tmpColor.setHex(sg.color);
        col.set([tmpColor.r, tmpColor.g, tmpColor.b, tmpColor.r, tmpColor.g, tmpColor.b], i * 6);
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.95 }));
      lines.renderOrder = 50;
      built.group.add(lines);
    }
    cells.set(key, built);
    propsDirty = true;
    restaurantsDirty = true;
    stats.cellMs += performance.now() - t0;
    stats.cellsBuilt += 1;
    snapTargetToStreet();
  };

  let pendingCells: { key: string; cx: number; cz: number; d: number }[] = [];
  let buildRadius = BUILD_RADIUS_MIN;
  let dropRadius = BUILD_RADIUS_MIN + 220;
  /** 카메라 거리에 맞춰 빌드 반경·안개·그림자 범위를 조정한다 */
  const updateRanges = () => {
    const d = camera.position.distanceTo(controls.target);
    buildRadius = Math.min(BUILD_RADIUS_MAX, Math.max(BUILD_RADIUS_MIN, d * 1.15));
    dropRadius = buildRadius + 220;
    // 안개는 카메라 거리 기준. 멀리 빼도 화면이 통째로 안개에 잠기지 않게 하되,
    // 지어진 영역의 바깥 경계(= 거리 + 빌드 반경)는 안개 안으로 넣어 '섬'처럼 보이지 않게 한다
    const far = Math.min(Math.max(d * 2.6, 480), d + buildRadius * 1.15);
    fog.far = far;
    fog.near = far * 0.42;
    const shadowHalf = Math.min(260, Math.max(120, d * 0.9));
    if (Math.abs(sun.shadow.camera.right - shadowHalf) > 8) {
      sun.shadow.camera.left = -shadowHalf;
      sun.shadow.camera.right = shadowHalf;
      sun.shadow.camera.top = shadowHalf;
      sun.shadow.camera.bottom = -shadowHalf;
      sun.shadow.camera.updateProjectionMatrix();
    }
    const wantShadow = d <= SHADOW_MAX_DIST;
    if (sun.castShadow !== wantShadow) sun.castShadow = wantShadow;
  };

  const updateCells = () => {
    updateRanges();
    const t = controls.target;
    const { cx: tcx, cz: tcz } = cellIndexOf(t.x, t.z);
    const span = Math.ceil(buildRadius / CELL_SIZE) + 1;
    pendingCells = [];
    for (let cx = tcx - span; cx <= tcx + span; cx += 1) {
      for (let cz = tcz - span; cz <= tcz + span; cz += 1) {
        const c = { x: (cx + 0.5) * CELL_SIZE, z: (cz + 0.5) * CELL_SIZE };
        const d = Math.hypot(c.x - t.x, c.z - t.z);
        if (d > buildRadius) continue;
        const key = `${cx},${cz}`;
        if (cells.has(key)) continue;
        pendingCells.push({ key, cx, cz, d });
      }
    }
    pendingCells.sort((a, b) => a.d - b.d);
    // 멀어진 셀 정리
    cells.forEach((built, key) => {
      const [cx, cz] = key.split(',').map(Number);
      const c = { x: (cx + 0.5) * CELL_SIZE, z: (cz + 0.5) * CELL_SIZE };
      if (Math.hypot(c.x - t.x, c.z - t.z) > dropRadius) {
        cellGroup.remove(built.group);
        built.dispose();
        cells.delete(key);
        propsDirty = true;
        restaurantsDirty = true;
      }
    });
  };

  /** 프레임당 셀 1개 빌드 (타일이 준비된 것부터) */
  const stepCells = () => {
    let loading = false;
    for (let i = 0; i < pendingCells.length; i += 1) {
      const pc = pendingCells[i];
      if (cells.has(pc.key)) continue;
      // 이웃 셀 타일까지 있어야 교차부·차단 판정이 맞다 (없어도 진행은 한다)
      if (!cellReady(pc.cx, pc.cz)) {
        loading = true;
        continue;
      }
      buildOneCell(pc.key, pc.cx, pc.cz);
      pendingCells.splice(i, 1);
      break;
    }
    if (pendingCells.length > 0 && !loading) loading = true;
    if (loading !== lastLoading) {
      lastLoading = loading;
      opts.onLoading(loading);
    }
  };

  // ---------- 소품 재구성 ----------
  const rebuildProps = () => {
    propsDirty = false;
    const t0 = performance.now();
    const treeItems: Placement[] = [];
    const lampItems: Placement[] = [];
    const hvacItems: Placement[] = [];
    cells.forEach((c) => {
      treeItems.push(...c.trees);
      lampItems.push(...c.lamps);
      hvacItems.push(...c.hvac);
    });
    const treeColored = treeItems.map((t, i) => ({ ...t, color: TREE_COLORS[i % TREE_COLORS.length] }));
    trunks.set(treeItems);
    canopies.set(treeColored);
    poles.set(lampItems);
    heads.set(lampItems);
    pools.set(lampItems);
    hvacs.set(hvacItems);
    lampPositions = lampItems;
    assignLights();
    rebuildCars();
    rebuildHeightIndex();
    stats.propsMs += performance.now() - t0;
  };

  // ---------- 카메라 충돌 (건물 높이 인덱스) ----------
  const HGRID = 32;
  let heightGrid = new Map<string, BuildingFeature[]>();
  const rebuildHeightIndex = () => {
    heightGrid = new Map();
    cells.forEach((_, key) => {
      const f = cellFeatures.get(key);
      if (!f) return;
      for (const b of f.buildings) {
        const [minx, minz, maxx, maxz] = b.bbox;
        for (let gx = Math.floor(minx / HGRID); gx <= Math.floor(maxx / HGRID); gx += 1) {
          for (let gz = Math.floor(minz / HGRID); gz <= Math.floor(maxz / HGRID); gz += 1) {
            const k = `${gx},${gz}`;
            const list = heightGrid.get(k);
            if (list) list.push(b);
            else heightGrid.set(k, [b]);
          }
        }
      }
    });
  };
  /** 점 위 건물의 지붕 높이 (건물 없으면 0) */
  const roofHeightAt = (x: number, z: number): number => {
    const list = heightGrid.get(`${Math.floor(x / HGRID)},${Math.floor(z / HGRID)}`);
    if (!list) return 0;
    let h = 0;
    const p = { x, z };
    for (const b of list) {
      const top = b.base + b.height;
      if (top <= h) continue;
      const [minx, minz, maxx, maxz] = b.bbox;
      if (x < minx || x > maxx || z < minz || z > maxz) continue;
      if (pointInRing(p, b.outer)) h = top;
    }
    return h;
  };
  /**
   * 카메라가 건물 안으로 들어가지 않게 한다.
   * 건물 안(지붕 아래)이면 먼저 궤도 거리를 늘려 밖으로 물러나고(높이도 자연히 올라간다),
   * 물러날 곳이 없을 때만 지붕 위로 올린다. 시야를 가리는 건물은 그대로 둔다 —
   * 3D 지도에서 앞 건물에 가려지는 것은 자연스럽고, 억지로 넘겨다보면 초고층 옆에서 카메라가 튄다.
   */
  /**
   * 시선 중심 높이. 가까이서는 지면(0)을 보고, 멀리 뺄수록 위로 올린다.
   * 555m 짜리 초고층이 화면 위로 잘리지 않으려면 중심이 같이 올라가야 한다.
   * 타깃과 카메라를 같은 양만큼 올려 궤도 각도는 건드리지 않는다.
   */
  const applyTargetHeight = () => {
    const t = controls.target;
    const dist = camera.position.distanceTo(t);
    const desiredY = Math.min(240, Math.max(0, (dist - 200) * 0.2));
    const dy = desiredY - t.y;
    if (Math.abs(dy) < 0.05) return;
    const step = opts.reducedMotion ? dy : dy * 0.25;
    t.y += step;
    camera.position.y += step;
  };

  const CAM_CLEARANCE = 4;
  const resolveCameraCollision = () => {
    const target = controls.target;
    const cam = camera.position;
    const off = new THREE.Vector3().subVectors(cam, target);
    const dist = off.length();
    if (dist < 1) return;
    const roof = roofHeightAt(cam.x, cam.z);
    if (roof > 0 && cam.y < roof + CAM_CLEARANCE) {
      const dir = off.clone().divideScalar(dist);
      let escaped = false;
      for (let d = dist + 6; d <= MAX_DIST; d += 6) {
        const px = target.x + dir.x * d;
        const py = target.y + dir.y * d;
        const pz = target.z + dir.z * d;
        const rh = roofHeightAt(px, pz);
        if (rh === 0 || py >= rh + CAM_CLEARANCE) {
          cam.set(px, py, pz);
          escaped = true;
          break;
        }
      }
      if (!escaped) cam.y = roofHeightAt(cam.x, cam.z) + CAM_CLEARANCE;
    }
    if (cam.y < 3) cam.y = 3;
  };

  let lampPositions: Placement[] = [];
  const assignLights = () => {
    const t = controls.target;
    const sorted = lampPositions
      .map((l) => ({ l, d: Math.hypot(l.x - t.x, l.z - t.z) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, LIGHT_POOL);
    lampLights.forEach((light, i) => {
      const s = sorted[i];
      if (!s) {
        light.visible = false;
        return;
      }
      light.visible = true;
      // 등 머리 위치 = 기둥 + 회전된 (0, 4.3, 1.0)
      light.position.set(s.l.x + Math.sin(s.l.rotY) * 1.0, s.l.y + 4.3, s.l.z + Math.cos(s.l.rotY) * 1.0);
    });
  };

  // ---------- 식당 · 매장 ----------
  let allRestaurants: ExploreRestaurant[] = [];
  let pinnedIds = new Set<string>();
  let batch: StorefrontBatch | null = null;
  let plans = new Map<string, StorefrontPlan>();
  const anchorFallback = new Map<string, THREE.Vector3>();

  const rebuildStorefronts = () => {
    restaurantsDirty = false;
    const t0 = performance.now();
    const items = allRestaurants
      .filter((r) => r.coord)
      .map((r) => ({ restaurant: r, local: toLocal(origin, r.coord!.lat, r.coord!.lng) }))
      .filter((it) => cells.has(cellKey(it.local)));
    plans = planStorefronts(items, {
      buildingsNear: (p) => {
        const { cx, cz } = cellIndexOf(p.x, p.z);
        return neighborhood(cx, cz).buildings;
      },
      roadsNear: (p) => {
        const { cx, cz } = cellIndexOf(p.x, p.z);
        return neighborhood(cx, cz).roads;
      },
    });
    if (batch) {
      scene.remove(batch.group);
      batch.dispose();
    }
    signs.prune(new Set(plans.keys()));
    batch = buildStorefronts(Array.from(plans.values()), sfMats, signs);
    scene.add(batch.group);
    bulbs.set(batch.bulbs);
    tables.set(batch.tables);
    anchorFallback.clear();
    for (const r of allRestaurants) {
      if (!r.coord || plans.has(r.id)) continue;
      const l = toLocal(origin, r.coord.lat, r.coord.lng);
      anchorFallback.set(r.id, new THREE.Vector3(l.x, 7, l.z));
    }
    rebuildPeople();
    applySelection(opts.selectedId());
    if (pendingFocusId && (plans.has(pendingFocusId) || (pendingFocusUntouched && anchorFallback.has(pendingFocusId)))) {
      focusOn(pendingFocusId);
    }
    stats.storefrontMs += performance.now() - t0;
    stats.storefrontBuilds += 1;
  };

  // ---------- 사람 ----------
  let peopleAnchor = new THREE.Vector3(Infinity, 0, Infinity);
  const queueItems: Placement[] = [];
  const staticPeople: Placement[] = [];
  const rebuildPeople = () => {
    staticPeople.length = 0;
    peopleAnchor.copy(controls.target);
    const t = controls.target;
    // 매장 앞
    plans.forEach((p) => {
      if (p.floor !== 0 || !p.door) return;
      const n = 1 + Math.floor(hash01(p.restaurantId, 11) * 3);
      for (let i = 0; i < n; i += 1) {
        const s = (hash01(p.restaurantId, 20 + i) - 0.5) * p.slotW * 0.8;
        const o = 1.6 + hash01(p.restaurantId, 30 + i) * 2.2;
        staticPeople.push({
          x: p.center.x + p.frame.tx * s + p.frame.nx * o,
          y: Y.person,
          z: p.center.z + p.frame.tz * s + p.frame.nz * o,
          rotY: hash01(p.restaurantId, 40 + i) * Math.PI * 2,
          scale: 0.92 + hash01(p.restaurantId, 50 + i) * 0.14,
          color: SHIRT_COLORS[Math.floor(hash01(p.restaurantId, 60 + i) * SHIRT_COLORS.length)],
        });
      }
    });
    // 인도 위 행인 (타깃 220m 안)
    let count = 0;
    cells.forEach((c, key) => {
      const [cx, cz] = key.split(',').map(Number);
      const cc = { x: (cx + 0.5) * CELL_SIZE, z: (cz + 0.5) * CELL_SIZE };
      if (Math.hypot(cc.x - t.x, cc.z - t.z) > 260) return;
      const f = cellFeatures.get(key);
      if (!f) return;
      for (const r of f.roads) {
        if (!r.sidewalk || r.width < 7) continue;
        const st = stations(r.pts);
        const total = st[st.length - 1]?.cum ?? 0;
        for (let d = 9 + hash01(r.id, 1) * 10; d < total && count < 220; d += 22) {
          const k = hash01(r.id, Math.round(d));
          if (k < 0.45) continue;
          const pos = along(st, d);
          if (!pos) continue;
          const side = k < 0.72 ? 1 : -1;
          const off = r.width / 2 + 1.2 + (k * 7) % 1.6;
          const p = { x: pos.p.x + pos.nx * off * side, z: pos.p.z + pos.nz * off * side };
          if (Math.hypot(p.x - t.x, p.z - t.z) > 220) continue;
          staticPeople.push({ x: p.x, y: Y.person, z: p.z, rotY: k * 40, scale: 0.9 + ((k * 13) % 1) * 0.16, color: SHIRT_COLORS[Math.floor(((k * 101) % 1) * SHIRT_COLORS.length)] });
          count += 1;
        }
      }
    });
    pushPeople();
  };
  const pushPeople = () => {
    const items = [...queueItems, ...staticPeople];
    people.set(items);
    aoBlobs.set(items.map((p) => ({ x: p.x, y: p.y + AO_BLOB_LIFT, z: p.z, rotY: 0, scale: 1.1 })));
  };

  // ---------- 선택 ----------
  let selectedId: string | null = null;
  let focusTarget: THREE.Vector3 | null = null;
  /** 포커스 시 카메라가 매장 정면(바깥쪽)에 서도록 맞출 방위각 (null 이면 유지) */
  let focusAzimuth: number | null = null;
  /**
   * focus() 요청 시점에 매장(plan)이 아직 없으면 여기 두고, 셀이 세워져 매장이 생기면 정면으로 다시 잡는다.
   * 사용자가 직접 지도를 움직이거나(controls start) flyTo 하면 버린다.
   */
  let pendingFocusId: string | null = null;
  /** 아직 한 번도 카메라를 못 잡은 상태 (좌표 fallback 조차 없었음) */
  let pendingFocusUntouched = false;

  /** 매장 정면 카메라. 핀 클릭·패널 목록(핫플/후기) 선택이 같이 쓴다 */
  const focusOn = (id: string) => {
    const plan = plans.get(id);
    const fb = anchorFallback.get(id);
    if (!plan && !fb) {
      pendingFocusId = id;
      pendingFocusUntouched = true;
      return;
    }
    // 매장이 아직 없으면 좌표로 우선 잡고(fallback), 매장이 생기면 rebuildStorefronts 가 정면으로 다시 잡는다
    pendingFocusId = plan ? null : id;
    pendingFocusUntouched = false;
    focusAzimuth = null;
    if (plan?.door) {
      focusTarget = new THREE.Vector3(plan.door.pos.x + plan.frame.nx * 5, 0, plan.door.pos.z + plan.frame.nz * 5);
    } else if (plan) {
      focusTarget = new THREE.Vector3(plan.center.x + plan.frame.nx * 6, 0, plan.center.z + plan.frame.nz * 6);
    } else if (fb) {
      focusTarget = new THREE.Vector3(fb.x, 0, fb.z);
    } else return;
    // 매장 정면이 보이도록 카메라를 바깥쪽(도로 쪽)에 세운다. 살짝 비스듬히(+25°) 봐서 입체감을 살린다
    if (plan) focusAzimuth = Math.atan2(plan.frame.nx, plan.frame.nz) + 0.44;
    const dist = camera.position.distanceTo(controls.target);
    if (dist > 110) {
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, 95);
    }
  };
  const applySelection = (id: string | null) => {
    selectedId = id;
    queueItems.length = 0;
    const plan = id ? plans.get(id) : undefined;
    if (!plan || !plan.door) {
      ring.visible = false;
      pushPeople();
      return;
    }
    const { pos, frame } = plan.door;
    const n = 7 + Math.floor(hash01(id!, 70) * 4);
    const dirSign = hash01(id!, 71) < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i += 1) {
      const s = dirSign * (1.0 + i * 0.78);
      const o = (i % 2) * 0.35;
      queueItems.push({
        x: pos.x + frame.tx * s + frame.nx * o,
        y: Y.person,
        z: pos.z + frame.tz * s + frame.nz * o,
        rotY: Math.atan2(-frame.tx * dirSign, -frame.tz * dirSign) + (hash01(id!, 80 + i) - 0.5) * 0.5,
        scale: 0.92 + hash01(id!, 90 + i) * 0.14,
        color: SHIRT_COLORS[Math.floor(hash01(id!, 100 + i) * SHIRT_COLORS.length)],
      });
    }
    ring.position.set(pos.x + frame.nx * 1.4, Y.decal, pos.z + frame.nz * 1.4);
    ring.visible = true;
    pushPeople();
  };

  // ---------- 차 ----------
  let cars: CarState[] = [];
  const drivableRoads = (): RoadFeature[] => {
    const out: RoadFeature[] = [];
    cells.forEach((_, key) => {
      const f = cellFeatures.get(key);
      if (!f) return;
      for (const r of f.roads) if (r.width >= 7 && r.width <= 15 && r.pts.length >= 2) out.push(r);
    });
    return out;
  };
  const spawnCar = (i: number, roads: RoadFeature[]): CarState | null => {
    if (roads.length === 0) return null;
    const road = roads[Math.floor(hash01(`car${i}`, roads.length) * roads.length) % roads.length];
    const st = stations(road.pts);
    const total = st[st.length - 1].cum;
    if (total < 10) return null;
    return {
      road,
      st,
      total,
      dist: hash01(`car${i}`, 2) * total,
      dir: hash01(`car${i}`, 3) < 0.5 ? 1 : -1,
      speed: 3.5 + hash01(`car${i}`, 4) * 3,
      color: CAR_COLORS[i % CAR_COLORS.length],
      x: 0,
      z: 0,
      rotY: 0,
    };
  };
  const rebuildCars = () => {
    const roads = drivableRoads();
    const roadIds = new Set(roads.map((r) => r.id));
    const next: CarState[] = [];
    for (let i = 0; i < CAR_COUNT; i += 1) {
      const existing = cars[i];
      if (existing && roadIds.has(existing.road.id)) {
        next.push(existing);
        continue;
      }
      const c = spawnCar(i + Math.floor(Math.random() * 1000), roads);
      if (c) next.push(c);
    }
    cars = next;
  };
  const advanceCars = (dt: number) => {
    const items: Placement[] = [];
    for (let i = 0; i < cars.length; i += 1) {
      const c = cars[i];
      c.dist += c.dir * c.speed * dt;
      if (c.dist > c.total || c.dist < 0) {
        // 끝에 닿으면 근처 도로로 갈아타거나 되돌아온다
        const roads = drivableRoads();
        const endP = c.dist > c.total ? c.road.pts[c.road.pts.length - 1] : c.road.pts[0];
        const near = roads.filter((r) => r.id !== c.road.id && (Math.hypot(r.pts[0].x - endP.x, r.pts[0].z - endP.z) < 20 || Math.hypot(r.pts[r.pts.length - 1].x - endP.x, r.pts[r.pts.length - 1].z - endP.z) < 20));
        if (near.length > 0) {
          const r = near[Math.floor(Math.random() * near.length)];
          const st = stations(r.pts);
          const startsHere = Math.hypot(r.pts[0].x - endP.x, r.pts[0].z - endP.z) < 20;
          c.road = r;
          c.st = st;
          c.total = st[st.length - 1].cum;
          c.dir = startsHere ? 1 : -1;
          c.dist = startsHere ? 0 : c.total;
        } else {
          c.dir = c.dir === 1 ? -1 : 1;
          c.dist = Math.max(0, Math.min(c.total, c.dist));
        }
      }
      const pos = along(c.st, Math.max(0, Math.min(c.total, c.dist)));
      if (!pos) continue;
      // 우측통행: 진행 방향 기준 오른쪽 차로 (법선 n 은 +t 진행 시 오른쪽)
      const lane = c.road.width * 0.25;
      const x = pos.p.x + pos.nx * lane * c.dir;
      const z = pos.p.z + pos.nz * lane * c.dir;
      const tx = pos.nz * c.dir;
      const tz = -pos.nx * c.dir;
      c.x = x;
      c.z = z;
      c.rotY = Math.atan2(tx, tz);
      items.push({ x, y: Y.vehicle, z, rotY: c.rotY, color: c.color });
    }
    carBodies.set(items);
    carLights.set(items.map((it) => ({ ...it, color: undefined })));
  };

  // ---------- 입력 ----------
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
    const hits = batch ? raycaster.intersectObjects(batch.hitObjects, false) : [];
    const hit = hits.find((h) => h.object.userData.restaurantId);
    opts.onSelect(hit ? (hit.object.userData.restaurantId as string) : null);
  };
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  // ---------- 뷰포트 알림 ----------
  let lastEmitted = { x: Infinity, z: Infinity, d: 0 };
  const emitViewport = (force = false) => {
    const t = controls.target;
    const d = camera.position.distanceTo(t);
    if (!force && Math.hypot(t.x - lastEmitted.x, t.z - lastEmitted.z) < 8 && Math.abs(d - lastEmitted.d) < 6) return;
    lastEmitted = { x: t.x, z: t.z, d };
    const c = toLatLng(origin, t.x, t.z);
    opts.onViewport({ center: c, radiusKm: Math.min(1.6, Math.max(0.35, (d * 2.2) / 1000)), level: distanceToLevel(d) });
  };
  controls.addEventListener('start', () => {
    focusTarget = null;
    focusAzimuth = null;
    pendingFocusId = null;
  });
  controls.addEventListener('end', () => {
    emitViewport();
    updateCells();
    assignLights();
  });

  // ---------- 핀 ----------
  const tmp = new THREE.Vector3();
  const ICON_W = 48;
  const ICON_H = 58;
  const updatePins = () => {
    const els = opts.pinElements();
    if (els.size === 0) return;
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    const items: { id: string; x: number; y: number; depth: number; inFront: boolean }[] = [];
    els.forEach((_, id) => {
      const anchor = batch?.anchors.get(id) ?? anchorFallback.get(id);
      if (!anchor) return;
      tmp.copy(anchor).project(camera);
      items.push({ id, x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h, depth: camera.position.distanceTo(anchor), inFront: tmp.z < 1 });
    });
    items.sort((a, b) => (a.id === selectedId ? -1 : b.id === selectedId ? 1 : a.depth - b.depth));
    const placed: { l: number; t: number; r: number; b: number }[] = [];
    const overlaps = (r: { l: number; t: number; r: number; b: number }) => placed.some((p) => r.l < p.r && r.r > p.l && r.t < p.b && r.b > p.t);
    const seen = new Set<string>();
    for (const it of items) {
      const el = els.get(it.id);
      if (!el) continue;
      seen.add(it.id);
      if (!it.inFront || it.x < -80 || it.x > w + 80 || it.y < -80 || it.y > h + 80 || it.depth > 330) {
        el.dataset.mode = 'hidden';
        continue;
      }
      const label = el.querySelector<HTMLElement>('[data-pin-label]');
      const labelW = label ? label.offsetWidth + 8 : 0;
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
      el.style.zIndex = it.id === selectedId ? '40' : String(30 - Math.min(20, Math.floor(it.depth / 12)));
    }
    els.forEach((el, id) => {
      if (!seen.has(id)) el.dataset.mode = 'hidden';
    });
  };

  // ---------- 사용자 위치 ----------
  const userDot = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), new THREE.MeshStandardMaterial({ color: '#3B82F6', emissive: new THREE.Color('#3B82F6'), emissiveIntensity: 0.8 }));
  userDot.visible = false;
  scene.add(userDot);

  // ---------- 루프 ----------
  let raf = 0;
  let last = performance.now();
  let frame = 0;
  let tickErrors = 0;
  let lastTickAt = performance.now();
  const tick = () => {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    lastTickAt = performance.now();
    try {
      tickInner();
    } catch (err) {
      tickErrors += 1;
      if (tickErrors <= 3) console.error(`[city#${instanceId}] frame error`, err);
    }
  };
  // 탭이 가려져 rAF 가 멈춰도(백그라운드) 타일·셀·매장 준비는 이어 간다 (렌더는 하지 않음)
  const bgTimer = window.setInterval(() => {
    if (disposed || performance.now() - lastTickAt < 400) return;
    try {
      stepCells();
      if (propsDirty) rebuildProps();
      if (restaurantsDirty) rebuildStorefronts();
    } catch (err) {
      tickErrors += 1;
      if (tickErrors <= 3) console.error(`[city#${instanceId}] background step error`, err);
    }
  }, 300);
  const tickInner = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frame += 1;
    const f0 = performance.now();

    stepCells();
    if (propsDirty) rebuildProps();
    if (restaurantsDirty) rebuildStorefronts();
    if (!opts.reducedMotion) {
      advanceCars(dt);
      if (ring.visible) {
        const s = 1 + Math.sin(now / 420) * 0.06;
        ring.scale.set(s, s, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(now / 420) * 0.2;
      }
    }
    if (focusTarget) {
      const cur = controls.target;
      const delta = focusTarget.clone().sub(cur);
      // 방위각도 함께 돌린다 (가장 짧은 방향으로)
      if (focusAzimuth !== null) {
        const off = camera.position.clone().sub(cur);
        const sph = new THREE.Spherical().setFromVector3(off);
        let dTheta = focusAzimuth - sph.theta;
        dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
        if (Math.abs(dTheta) < 0.01) {
          focusAzimuth = null;
        } else {
          sph.theta += opts.reducedMotion ? dTheta : dTheta * 0.08;
          camera.position.copy(cur).add(new THREE.Vector3().setFromSpherical(sph));
        }
      }
      if (delta.length() < 0.15 && focusAzimuth === null) {
        focusTarget = null;
        emitViewport();
        updateCells();
      } else if (delta.length() >= 0.15) {
        const step = opts.reducedMotion ? delta : delta.multiplyScalar(0.08);
        cur.add(step);
        camera.position.add(step);
      }
    }
    controls.update();
    applyTargetHeight();
    resolveCameraCollision();
    if (frame % 15 === 0) {
      updateSun();
      if (peopleAnchor.distanceTo(controls.target) > 70) rebuildPeople();
      // 지면 재중심 (텍스처 주기 12m 에 맞춰)
      const gx = Math.round(controls.target.x / 12) * 12;
      const gz = Math.round(controls.target.z / 12) * 12;
      if (Math.abs(gx - ground.position.x) > 600 || Math.abs(gz - ground.position.z) > 600) ground.position.set(gx, 0, gz);
    }
    if (frame % 30 === 0) {
      updateCells();
    }
    const r0 = performance.now();
    composer.render();
    const p0 = performance.now();
    updatePins();
    const fEnd = performance.now();
    stats.renderMs += p0 - r0;
    stats.pinsMs += fEnd - p0;
    stats.frames += 1;
    stats.frameMs += fEnd - f0;
    stats.maxFrameMs = Math.max(stats.maxFrameMs, fEnd - f0);
    stats.cars = cars.length;
    stats.pending = pendingCells.length;
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

  updateCells();
  emitViewport(true);

  if (process.env.NODE_ENV !== 'production') {
    // 그래픽 디버그용: 그림자·톤 등을 콘솔에서 직접 만져 보기 위한 핸들
    (window as unknown as { __cityGfx: unknown }).__cityGfx = { renderer, scene, camera, controls, sun, composer };
    (window as unknown as { __cityDebug: unknown }).__cityDebug = () => ({
      cells: cells.size,
      pendingCells: pendingCells.map((c) => ({ key: c.key, ready: cellReady(c.cx, c.cz) })),
      tiles: Array.from(tiles.entries()).map(([k, v]) => `${k}:${v ? 'ok' : 'loading'}`),
      buildRadius,
      restaurants: allRestaurants.length,
      plans: plans.size,
      fallback: anchorFallback.size,
      target: controls.target.toArray(),
      dist: camera.position.distanceTo(controls.target),
      list: allRestaurants.map((r) => {
        const l = r.coord ? toLocal(origin, r.coord.lat, r.coord.lng) : null;
        const p = plans.get(r.id);
        return { id: r.id, name: r.name, local: l ? [Math.round(l.x), Math.round(l.z)] : null, cellBuilt: l ? cells.has(cellKey(l)) : false, plan: p ? { floor: p.floor, building: !!p.building } : null, fallback: anchorFallback.has(r.id) };
      }),
    });
  }

  return {
    setRestaurants(all, pinned) {
      allRestaurants = all;
      pinnedIds = pinned;
      restaurantsDirty = true;
    },
    setSelected(id) {
      if (pendingFocusId && pendingFocusId !== id) pendingFocusId = null;
      applySelection(id);
    },
    focus(id) {
      focusOn(id);
    },
    flyTo(center, level) {
      const l = toLocal(origin, center.lat, center.lng);
      focusTarget = null;
      pendingFocusId = null;
      const dist = level !== undefined ? levelToDistance(level) : camera.position.distanceTo(controls.target);
      const off = camera.position.clone().sub(controls.target).normalize().multiplyScalar(dist);
      controls.target.set(l.x, 0, l.z);
      camera.position.copy(controls.target).add(off);
      controls.update();
      updateSun();
      updateCells();
      emitViewport(true);
      assignLights();
    },
    setDebug(on) {
      if (on === isCrosswalkDebug()) return;
      setCrosswalkDebug(on);
      cells.forEach((c) => {
        cellGroup.remove(c.group);
        c.dispose();
      });
      cells.clear();
      propsDirty = true;
      restaurantsDirty = true;
      updateCells();
    },
    crosswalkStats() {
      const rejected: Record<string, number> = {};
      let accepted = 0;
      let bands = 0;
      cells.forEach((c) => {
        bands += c.crosswalks.length;
        for (const cand of c.crosswalkCandidates) {
          if (cand.accepted) accepted += 1;
          else rejected[cand.reason ?? '?'] = (rejected[cand.reason ?? '?'] ?? 0) + 1;
        }
      });
      return { accepted, rejected, bands };
    },
    setUserLocation(loc) {
      if (!loc) {
        userDot.visible = false;
        return;
      }
      const l = toLocal(origin, loc.lat, loc.lng);
      userDot.position.set(l.x, 1.2, l.z);
      userDot.visible = true;
    },
    zoomBy(factor) {
      const dir = camera.position.clone().sub(controls.target);
      const len = Math.max(MIN_DIST, Math.min(MAX_DIST, dir.length() / factor));
      camera.position.copy(controls.target).addScaledVector(dir.normalize(), len);
      controls.update();
      emitViewport();
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
      const dist = camera.position.distanceTo(controls.target);
      placeCamera(controls.target.clone(), dist);
    },
    resize,
    dispose() {
      if (process.env.NODE_ENV !== 'production') console.info(`[city#${instanceId}] dispose`);
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(bgTimer);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      composer.dispose();
      cells.forEach((c) => c.dispose());
      cells.clear();
      if (batch) batch.dispose();
      signs.dispose();
      [trunks, canopies, poles, heads, pools, hvacs, people, carBodies, carLights, bulbs, tables, aoBlobs].forEach((p) => p.dispose());
      poolTex.dispose();
      aoTex.dispose();
      groundGeom.dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      userDot.geometry.dispose();
      (userDot.material as THREE.Material).dispose();
      mats.dispose();
      sfMats.dispose();
      renderer.dispose();
      if (process.env.NODE_ENV !== 'production') (window as unknown as { __cityGfx: unknown }).__cityGfx = null;
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
  };
}
