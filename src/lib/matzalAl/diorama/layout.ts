/**
 * 디오라마 시제품 배치 데이터 — 사거리 하나를 둘러싼 4개 블록, 식당 5곳.
 *
 * 좌표계: x 동(+)/서(−), z 남(+)/북(−), y 위. 단위 m.
 * 도로는 x=0 남북 도로와 z=0 동서 도로(폭 12m). 인도 3.5m. 블록은 |x|,|z| ≥ 9.5 부터.
 * 실제 지리 데이터가 아니라 참고 시안 구도(비스듬한 사거리, 낮은 상업 건물)를 재현한 가상 블록이다.
 * 실데이터 연동 단계에서는 이 정의를 OSM 건물 외곽선 + DB 식당 좌표로 생성하는 것이 목표다.
 */
import type { ExploreRestaurant } from '@/types/MatzalAl/explore';

export type Facade = 'brick' | 'plaster' | 'concrete' | 'charcoal' | 'wood';
export type Side = 'n' | 's' | 'e' | 'w';
export type RoofKind = 'flat' | 'parapet' | 'terrace' | 'hvac';
export type SignStyle = 'backlit' | 'neon' | 'wood';

export interface StorefrontDef {
  restaurantId: string;
  name: string;
  signStyle: SignStyle;
  /** 세로 간판을 어느 모서리에 붙일지. 없으면 가로 간판만 */
  verticalSignCorner?: 'left' | 'right';
  awning?: { a: string; b: string };
  /** 유리창 뒤 실내 조명 색 */
  interior: string;
  signBg: string;
  signFg: string;
}

export interface BuildingDef {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  floors: number;
  floorH: number;
  facade: Facade;
  color: string;
  /** 정면(간판·출입구) 방향 */
  front: Side;
  /** 정면 외에 유리창을 크게 낼 면 */
  glassSides?: Side[];
  roof: RoofKind;
  litRatio: number;
  storefront?: StorefrontDef;
  /** 벽면 문구 (어느 면에) */
  wallText?: { side: Side; lines: string[] };
  trimColor?: string;
}

export interface TreeDef {
  x: number;
  z: number;
  scale?: number;
}
export interface LampDef {
  x: number;
  z: number;
  /** 실제 PointLight 를 켤지 (성능상 교차로 근처만) */
  light: boolean;
}
export interface CarDef {
  x: number;
  z: number;
  /** 진행 방향(도로 축): 'x' 또는 'z'; 정차 차량은 speed 0 */
  axis: 'x' | 'z';
  dir: 1 | -1;
  speed: number;
  color: string;
}
export interface PersonDef {
  x: number;
  z: number;
  facing: number;
}

export const ROAD_HALF = 6;
export const SIDEWALK_W = 3.5;
export const LOT_START = ROAD_HALF + SIDEWALK_W; // 9.5
export const BLOCK_END = 56;
export const OUTER_ROAD = { from: BLOCK_END + SIDEWALK_W, to: BLOCK_END + SIDEWALK_W + 12 }; // 59.5 ~ 71.5

const R = (id: string, name: string, extra: Partial<StorefrontDef> = {}): StorefrontDef => ({
  restaurantId: id,
  name,
  signStyle: 'backlit',
  interior: '#ffd9a3',
  signBg: '#2b2420',
  signFg: '#fff1d6',
  ...extra,
});

export const BUILDINGS: BuildingDef[] = [
  // ---- 북서 블록 ----
  {
    id: 'b-sanho',
    x: -19,
    z: -17,
    w: 17,
    d: 13,
    floors: 2,
    floorH: 3.7,
    facade: 'brick',
    color: '#b3705c',
    front: 'e',
    glassSides: ['s'],
    roof: 'parapet',
    litRatio: 0.7,
    trimColor: '#efe4d4',
    storefront: R('proto:1', '산호식당', { verticalSignCorner: 'left', signBg: '#1f1b19', signFg: '#ffe8c2', signStyle: 'backlit' }),
  },
  { id: 'nw-2', x: -41, z: -18, w: 20, d: 14, floors: 3, floorH: 3.4, facade: 'plaster', color: '#e9e1d3', front: 's', roof: 'hvac', litRatio: 0.55 },
  { id: 'nw-3', x: -20, z: -39, w: 16, d: 20, floors: 4, floorH: 3.3, facade: 'concrete', color: '#d5d0c8', front: 'e', roof: 'parapet', litRatio: 0.5 },
  { id: 'nw-4', x: -42, z: -41, w: 20, d: 20, floors: 3, floorH: 3.4, facade: 'plaster', color: '#dcd2c2', front: 'e', roof: 'hvac', litRatio: 0.45 },

  // ---- 북동 블록 ----
  { id: 'ne-1', x: 19, z: -17, w: 17, d: 13, floors: 2, floorH: 3.6, facade: 'plaster', color: '#e7dfd0', front: 's', roof: 'terrace', litRatio: 0.7, trimColor: '#b9ad9c' },
  { id: 'ne-2', x: 41, z: -18, w: 20, d: 14, floors: 3, floorH: 3.4, facade: 'concrete', color: '#cfcac2', front: 's', roof: 'hvac', litRatio: 0.5 },
  { id: 'ne-3', x: 20, z: -40, w: 17, d: 18, floors: 3, floorH: 3.4, facade: 'brick', color: '#c48a70', front: 'w', roof: 'parapet', litRatio: 0.55 },
  { id: 'ne-4', x: 43, z: -41, w: 20, d: 20, floors: 4, floorH: 3.3, facade: 'plaster', color: '#e4dccd', front: 'w', roof: 'hvac', litRatio: 0.45 },

  // ---- 남동 블록 ----
  {
    id: 'b-lavie',
    x: 20,
    z: 17,
    w: 18,
    d: 13,
    floors: 3,
    floorH: 3.5,
    facade: 'plaster',
    color: '#f1ebe1',
    front: 'n',
    glassSides: ['w'],
    roof: 'terrace',
    litRatio: 0.8,
    trimColor: '#cfc5b6',
    storefront: R('proto:3', '라비앙', { signBg: '#f3ede3', signFg: '#3b2f2a', signStyle: 'backlit' }),
  },
  { id: 'se-2', x: 18, z: 37, w: 15, d: 14, floors: 2, floorH: 3.6, facade: 'brick', color: '#c28b73', front: 'w', roof: 'parapet', litRatio: 0.6 },
  {
    id: 'b-sushi',
    x: 42,
    z: 17,
    w: 18,
    d: 13,
    floors: 2,
    floorH: 3.6,
    facade: 'charcoal',
    color: '#3a3b40',
    front: 'n',
    roof: 'terrace',
    litRatio: 0.75,
    trimColor: '#8a6a4a',
    storefront: R('proto:2', '스시 하루', { signBg: '#17181c', signFg: '#f6e7cf', signStyle: 'wood' }),
  },
  { id: 'se-4', x: 42, z: 42, w: 20, d: 20, floors: 4, floorH: 3.3, facade: 'brick', color: '#b98a72', front: 'w', roof: 'parapet', litRatio: 0.45 },

  // ---- 남서 블록 ----
  {
    id: 'b-dodam',
    x: -20,
    z: 18,
    w: 20,
    d: 15,
    floors: 2,
    floorH: 4.2,
    facade: 'charcoal',
    color: '#2f3034',
    front: 'n',
    glassSides: ['e'],
    roof: 'terrace',
    litRatio: 0.85,
    trimColor: '#a8825a',
    storefront: R('proto:5', '도담갈비', { verticalSignCorner: 'right', signBg: '#141416', signFg: '#ffe9c6', signStyle: 'backlit' }),
  },
  { id: 'sw-2', x: -44, z: 18, w: 20, d: 14, floors: 3, floorH: 3.4, facade: 'plaster', color: '#e6ded0', front: 'n', roof: 'hvac', litRatio: 0.5 },
  {
    id: 'b-menya',
    x: -20,
    z: 40,
    w: 16,
    d: 15,
    floors: 2,
    floorH: 3.6,
    facade: 'plaster',
    color: '#efe6d8',
    front: 'e',
    roof: 'parapet',
    litRatio: 0.7,
    trimColor: '#8b2f2f',
    storefront: R('proto:4', '멘야코지', {
      verticalSignCorner: 'right',
      awning: { a: '#c8413f', b: '#f6efe4' },
      signBg: '#1d1a1a',
      signFg: '#fff0d8',
      signStyle: 'neon',
    }),
  },
  {
    id: 'sw-4b',
    x: -44,
    z: 42,
    w: 20,
    d: 20,
    floors: 4,
    floorH: 3.3,
    facade: 'concrete',
    color: '#d0cbc3',
    front: 'e',
    roof: 'parapet',
    litRatio: 0.45,
    wallText: { side: 'e', lines: ['좋은', '음식이', '좋은 하루를', '만든다.'] },
  },
];

/** 바깥 링(안개 속 배경 건물) — 창문은 적게, 디테일 없음 */
export const OUTER_BUILDINGS: BuildingDef[] = [
  { id: 'o-1', x: -92, z: -20, w: 30, d: 26, floors: 5, floorH: 3.3, facade: 'concrete', color: '#cdc8c0', front: 'e', roof: 'flat', litRatio: 0.4 },
  { id: 'o-2', x: -92, z: 22, w: 30, d: 28, floors: 6, floorH: 3.3, facade: 'plaster', color: '#dcd4c6', front: 'e', roof: 'flat', litRatio: 0.4 },
  { id: 'o-3', x: 92, z: -22, w: 30, d: 28, floors: 6, floorH: 3.3, facade: 'plaster', color: '#d9d1c4', front: 'w', roof: 'flat', litRatio: 0.4 },
  { id: 'o-4', x: 92, z: 20, w: 30, d: 26, floors: 5, floorH: 3.3, facade: 'concrete', color: '#cbc6be', front: 'w', roof: 'flat', litRatio: 0.4 },
  { id: 'o-5', x: -22, z: -92, w: 28, d: 28, floors: 5, floorH: 3.3, facade: 'brick', color: '#b78a74', front: 's', roof: 'flat', litRatio: 0.4 },
  { id: 'o-6', x: 22, z: -92, w: 28, d: 28, floors: 6, floorH: 3.3, facade: 'concrete', color: '#d1ccc4', front: 's', roof: 'flat', litRatio: 0.4 },
  { id: 'o-7', x: -22, z: 92, w: 28, d: 28, floors: 6, floorH: 3.3, facade: 'plaster', color: '#e0d8ca', front: 'n', roof: 'flat', litRatio: 0.4 },
  { id: 'o-8', x: 22, z: 92, w: 28, d: 28, floors: 5, floorH: 3.3, facade: 'brick', color: '#c08f78', front: 'n', roof: 'flat', litRatio: 0.4 },
  { id: 'o-9', x: -92, z: -92, w: 34, d: 34, floors: 7, floorH: 3.3, facade: 'concrete', color: '#c9c4bc', front: 'e', roof: 'flat', litRatio: 0.35 },
  { id: 'o-10', x: 92, z: -92, w: 34, d: 34, floors: 8, floorH: 3.3, facade: 'plaster', color: '#d6cec0', front: 'w', roof: 'flat', litRatio: 0.35 },
  { id: 'o-11', x: 92, z: 92, w: 34, d: 34, floors: 7, floorH: 3.3, facade: 'concrete', color: '#cfcac2', front: 'w', roof: 'flat', litRatio: 0.35 },
  { id: 'o-12', x: -92, z: 92, w: 34, d: 34, floors: 8, floorH: 3.3, facade: 'brick', color: '#b5836d', front: 'e', roof: 'flat', litRatio: 0.35 },
];

/** 가로수: 인도 위, 연석에서 1.2m 안쪽, 약 9m 간격 */
export const TREES: TreeDef[] = (() => {
  const list: TreeDef[] = [];
  const line = ROAD_HALF + 1.3; // 7.3
  const positions = [-50, -41, -32, -23, -14, 14, 23, 32, 41, 50];
  for (const p of positions) {
    list.push({ x: p, z: -line }, { x: p, z: line }, { x: -line, z: p }, { x: line, z: p });
  }
  // 옥외 링 도로변
  for (const p of [-50, -30, 30, 50]) {
    list.push({ x: p, z: -(BLOCK_END + 1.5) }, { x: p, z: BLOCK_END + 1.5 }, { x: -(BLOCK_END + 1.5), z: p }, { x: BLOCK_END + 1.5, z: p });
  }
  return list;
})();

/** 가로등: 교차로 4모서리 + 블록 중간 */
export const LAMPS: LampDef[] = [
  { x: -8, z: -8, light: true },
  { x: 8, z: -8, light: true },
  { x: 8, z: 8, light: true },
  { x: -8, z: 8, light: true },
  { x: -36, z: -7.2, light: true },
  { x: 36, z: -7.2, light: true },
  { x: -36, z: 7.2, light: true },
  { x: 36, z: 7.2, light: true },
  { x: -7.2, z: -36, light: false },
  { x: 7.2, z: -36, light: false },
  { x: -7.2, z: 36, light: false },
  { x: 7.2, z: 36, light: false },
];

export const CARS: CarDef[] = [
  // 우측통행: +x 진행은 z>0 차로, +z 진행은 x<0 차로
  { x: -30, z: 3.2, axis: 'x', dir: 1, speed: 4.5, color: '#f2f0ea' },
  { x: 25, z: -3.2, axis: 'x', dir: -1, speed: 3.8, color: '#23252b' },
  { x: -3.2, z: -35, axis: 'z', dir: 1, speed: 4.2, color: '#8b2f2f' },
  { x: 3.2, z: 30, axis: 'z', dir: -1, speed: 3.5, color: '#5b6b8a' },
  // 정차
  { x: -5.2, z: 22, axis: 'z', dir: 1, speed: 0, color: '#d9d5cc' },
  { x: 5.2, z: -26, axis: 'z', dir: -1, speed: 0, color: '#3f4148' },
  { x: 28, z: -5.2, axis: 'x', dir: -1, speed: 0, color: '#b8b3a8' },
];

/** 거리의 사람들 (정적) */
export const PEOPLE: PersonDef[] = [
  { x: -12, z: 8, facing: 0.4 },
  { x: -10.5, z: 8.6, facing: -2.2 },
  { x: -34, z: 7.8, facing: 1.5 },
  { x: -7.8, z: 30, facing: -0.3 },
  { x: 14, z: -8.2, facing: 1.6 },
  { x: 8.2, z: 20, facing: 3.0 },
  { x: -8.2, z: -24, facing: 0.2 },
  { x: 30, z: 8.1, facing: -1.2 },
  { x: -28, z: -8.1, facing: 2.4 },
  { x: 8.3, z: 44, facing: 0.9 },
];

/** 핀·패널용 식당 데이터 (시제품 고정값). 좌표 대신 건물 id 로 연결한다 */
export interface PrototypeRestaurant extends ExploreRestaurant {
  buildingId: string;
}

export const PROTOTYPE_RESTAURANTS: PrototypeRestaurant[] = [
  {
    id: 'proto:1',
    buildingId: 'b-sanho',
    restaurantIdx: null,
    name: '산호식당',
    cuisine: '한식',
    typeLabel: '한식 · 백반',
    addr: '오리동 1길 12 (시제품)',
    imageUrl: null,
    menu: [
      { name: '제육볶음 정식', price: 9000 },
      { name: '고등어구이', price: 11000 },
    ],
    averageRating: 4.8,
    ratingCount: 214,
    distanceKm: 0.083,
    source: 'prototype',
  },
  {
    id: 'proto:2',
    buildingId: 'b-sushi',
    restaurantIdx: null,
    name: '스시 하루',
    cuisine: '일식',
    typeLabel: '일식 · 스시/초밥',
    addr: '오리동 2길 5 (시제품)',
    imageUrl: null,
    menu: [{ name: '런치 오마카세', price: 38000 }],
    averageRating: 4.6,
    ratingCount: 98,
    distanceKm: 0.12,
    source: 'prototype',
  },
  {
    id: 'proto:3',
    buildingId: 'b-lavie',
    restaurantIdx: null,
    name: '라비앙',
    cuisine: '양식',
    typeLabel: '양식 · 프렌치',
    addr: '오리동 3길 21 (시제품)',
    imageUrl: null,
    menu: [{ name: '코스 A', price: 45000 }],
    averageRating: 4.7,
    ratingCount: 156,
    distanceKm: 0.21,
    source: 'prototype',
  },
  {
    id: 'proto:4',
    buildingId: 'b-menya',
    restaurantIdx: null,
    name: '멘야코지',
    cuisine: '일식',
    typeLabel: '일식 · 라멘',
    addr: '오리동 3길 40 (시제품)',
    imageUrl: null,
    menu: [{ name: '돈코츠 라멘', price: 11000 }],
    averageRating: 4.5,
    ratingCount: 302,
    distanceKm: 0.095,
    source: 'prototype',
  },
  {
    id: 'proto:5',
    buildingId: 'b-dodam',
    restaurantIdx: null,
    name: '도담갈비',
    cuisine: '한식',
    typeLabel: '한식 · 숯불갈비',
    addr: '오리동 4길 2 (시제품)',
    imageUrl: null,
    menu: [
      { name: '양념갈비 (200g)', price: 19000 },
      { name: '생갈비 (200g)', price: 23000 },
    ],
    averageRating: 4.8,
    ratingCount: 932,
    distanceKm: 0.06,
    source: 'prototype',
  },
];

export const DEFAULT_SELECTED_ID = 'proto:5';
