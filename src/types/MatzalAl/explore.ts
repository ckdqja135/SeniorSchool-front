/**
 * 맛잘알 '지도' 탭(입체 탐색) 전용 타입 정의.
 *
 * - API(`GET /restaurant/nearby`) 응답을 화면용 모델 `ExploreRestaurant`로 정규화해서
 *   검색 · 카테고리 · 핀 · 정보 패널이 한 상태를 공유한다.
 * - 모든 렌더러(입체 / 지도 / 위성)는 같은 DB 데이터(`coord` = WGS84 좌표)를 그린다.
 */

/** 상단 카테고리 칩 (참고 이미지의 전체/한식/일식/양식/중식/카페) */
export type ExploreCategory = '전체' | '한식' | '일식' | '양식' | '중식' | '카페';

/** 식당 한 곳이 속하는 칩 카테고리. 어느 칩에도 안 맞으면 '기타'(전체에서만 노출) */
export type ExploreCuisine = Exclude<ExploreCategory, '전체'> | '기타';

/**
 * 지도 렌더러 종류. 셋 다 같은 DB 데이터(nearby)를 그린다.
 * - tilt : 입체 디오라마(three.js, OSM 건물 외곽선 + DB 식당 매장·간판, 해 질 무렵 톤)
 * - road : 카카오 일반 지도
 * - sky  : 카카오 스카이뷰 하이브리드(위성 사진 + 라벨)
 */
export type ExploreRenderer = 'tilt' | 'road' | 'sky';

/** 하단 정보 패널 상태 (접힘 / 기본 / 펼침) */
export type PanelState = 'collapsed' | 'default' | 'expanded';

/**
 * 데이터 출처.
 * - api       : 백엔드 API(DB)
 * - prototype : 디오라마 시각 시제품의 고정 표본 (실데이터 연동 전, /matzal-al-mentor/diorama 전용)
 */
export type ExploreDataSource = 'api' | 'prototype';

/** '내 주변' 버튼의 위치 조회 상태. 현재 위치는 사용자가 요청했을 때만 조회한다 */
export type LocateStatus = 'idle' | 'locating' | 'done' | 'denied' | 'unsupported' | 'error';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ExploreMenuItem {
  name: string;
  price: number | null;
}

/** 화면용 식당 모델 */
export interface ExploreRestaurant {
  /** 렌더러/패널에서 쓰는 고유 키. 'api:{restaurantIdx}' */
  id: string;
  /** 백엔드 식당 idx(문자열) */
  restaurantIdx: string | null;
  name: string;
  /** 칩 카테고리로 정규화한 업종 */
  cuisine: ExploreCuisine;
  /** 원본 업종 문자열(예: '스시/초밥'). 패널에 그대로 노출 */
  typeLabel: string;
  addr: string | null;
  imageUrl: string | null;
  menu: ExploreMenuItem[];
  /** 평균 평점. 후기 평점이 없으면 null (가짜 값으로 채우지 않는다) */
  averageRating: number | null;
  ratingCount: number;
  /** API가 계산한 조회 중심 기준 거리(km). 사용자 위치가 있으면 클라이언트에서 재계산 */
  distanceKm: number | null;
  source: ExploreDataSource;
  /** 실제 WGS84 좌표 (DB 값) */
  coord?: LatLng;
}

/** 주변 식당 조회 파라미터 (`/restaurant/nearby`) */
export interface NearbyQuery {
  lat: number;
  lng: number;
  /** km 단위 */
  radiusKm: number;
  limit: number;
}

/** 검색창 옆 필터 버튼의 옵션 */
export interface ExploreFilters {
  /** 패널 목록 정렬 기준 */
  sort: 'distance' | 'rating';
  /** 평점이 있는 식당만 */
  ratedOnly: boolean;
  /** 내가 저장한 식당만 */
  savedOnly: boolean;
}

/** 지도 뷰포트 변경 알림 (렌더러 → 셸). 렌더러를 바꿔도 같은 자리에서 이어보도록 셸이 보관한다 */
export interface ExploreViewport {
  center: LatLng;
  /** 화면 중심에서 모서리까지의 거리 기준 반경(km) */
  radiusKm: number;
  /** 카카오 level 기준 확대 단계 (입체 지도는 zoom ≈ 20 − level 로 환산) */
  level: number;
}

/**
 * 핀이 오버레이(검색창·패널)에 가려지지 않도록 하는 가시 영역 인셋(px).
 * 렌더러는 컨테이너 사각형에서 이 인셋을 뺀 영역 안에 선택 핀이 오도록 카메라를 보정한다.
 */
export interface VisibleInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** 정보 패널의 목록 탭. 주변 식당(nearby) / 지역별 핫플레이스 / 인기 후기 TOP 10 */
export type PanelTab = 'nearby' | 'hot' | 'reviews';

/**
 * 지역별 핫플레이스 항목. `GET /restaurant` 전체 목록에서 만들며, 조회수·평점 순으로 뽑는다.
 * 지도 안에서 눌렀을 때 그 자리로 이동하려고 좌표를 같이 보관한다 (없거나 한반도 밖이면 null).
 */
export interface HotplaceRestaurant {
  restaurantIdx: string;
  name: string;
  addr: string;
  typeLabel: string;
  viewCount: number;
  averageRating: number | null;
  ratingCount: number;
  coord: LatLng | null;
}

/** 인기 후기 TOP 10 항목 (`GET /restaurant/board/top-viewed`) */
export interface PopularReview {
  boardIdx: number;
  title: string;
  restaurantIdx: string | null;
  restaurantName: string | null;
  likeCount: number;
  hitCount: number;
}
