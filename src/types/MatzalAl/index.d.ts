// 맛잘알 기본 정보
export interface MatzalAl {
  matzalAlIdx: number;
  matzalAlName: string;
  matzalAlAddr: string;
  matzalAlLocation: string;
  matzalAlType: string;
  matzalAlViewCount: number;
  matzalAlRegDate: string;
}

// 식당 상세 정보
export interface RestaurantMenuItem {
  name: string;
  price: number;
}

export interface Restaurant {
  restaurantIdx: number;
  restaurantName: string;
  restaurantLocation: string;
  restaurantType: string;
  restaurantEstablished: string;
  restaurantOwner: string;
  restaurantLatX: number;
  restaurantLatY: number;
  restaurantURL: string;
  restaurantLotAddr: string;
  restaurantAddr: string;
  restaurantMapIMG: string;
  restaurantMenu?: RestaurantMenuItem[] | null;
  restaurantStatus: number;
  restaurantViewCount: number;
  averageRating?: number | null;
  ratingCount?: number;
}

// 인기 맛잘알
export interface PopularMatzalAl {
  matzalAlIdx: number;
  matzalAlName: string;
  matzalAlLocation: string;
  matzalAlType: string;
  viewCount: number;
}

// 맛잘알 게시판 (식당 후기)
export interface MatzalAlBoard {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  boardLike: number;
  boardHits: number;
  boardRegDate: string;
  restaurantIdx: number;
  restaurantName?: string;
  restaurant?: MatzalAl;
  boardID?: string;
  boardPW?: string;
  boardRating?: number | null;
  // API 응답에 따라 추가 필드들
  id?: string;
  title?: string;
  content?: string;
}

// 맛잘알 추가 요청
export interface MatzalAlRequest {
  matzalAlName: string;
  matzalAlAddr: string;
  matzalAlType: string;
  requesterId: string;
}

// 맛잘알 자동완성 검색 결과
export interface MatzalAlAutoSearchResult {
  matzalAlIdx: number;
  matzalAlName: string;
  matzalAlLocation: string;
  matzalAlType: string;
}

// API 응답 타입
export interface MatzalAlApiResponse<T> {
  status: number;
  message: string;
  data: T;
  success: boolean;
}
