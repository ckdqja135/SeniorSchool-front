// 교회 오빠 API 타입 정의

export interface Church {
  churchIdx: number;
  churchName: string;
  churchType: string;
  churchLocation: string;
  churchEstablished?: string;
  churchPastor: string;
  churchLatX?: number;
  churchLatY?: number;
  churchURL?: string;
  churchLotAddr?: string;
  churchAddr?: string;
  churchMapIMG?: string;
  churchStatus: number; // 1: 활성, 0: 비활성
  churchViewCount?: number;
  churchRegDate?: string;
  churchModDate?: string;
}

export interface ChurchBoard {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  churchIdx: number;
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  church: Church;
}

export interface ChurchComment {
  commentIdx: number;
  commentContent: string;
  boardIdx: number;
  commentRegDate: string;
  commentID: string;
  commentLike: number;
}

export interface PopularChurch {
  churchIdx: number;
  churchName: string;
  churchType: string;
  churchLocation: string;
  churchViewCount: number;
}

export interface ChurchSearchResult {
  churchIdx: number;
  churchName: string;
  churchType: string;
  churchLocation: string;
  churchPastor: string;
  churchStatus?: number;
  churchEstablished?: string;
  churchViewCount?: number;
}

export interface ChurchAutoSearchResult {
  churchName: string;
  churchAddr: string;
  churchPastor: string;
}

export interface ChurchRequest {
  churchName: string;
  churchPastor: string;
  churchType: string;
  churchLocation: string;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
  totalCount?: number;
  currentCount?: number;
  message?: string;
}

export interface ChurchSearchParams {
  name?: string;
  type?: string;
  location?: string;
  churchName?: string;
  churchLocation?: string;
  churchType?: string;
  churchPastor?: string;
  churchStatus?: string;
  rowsPerPage?: number;
  currentPage?: number;
}

export interface BoardSearchParams {
  churchIdx: number;
  id?: string;
  title?: string;
  content?: string;
}

export interface CommentSearchParams {
  boardIdx: number;
}

export interface BoardLikeParams {
  boardIdx: number;
  userID: string;
}

export interface CommentParams {
  boardIdx: number;
  commentContent: string;
  commentID: string;
}

export interface CommentModifyParams {
  commentIdx: number;
  commentContent: string;
}

export interface CommentDeleteParams {
  commentIdx: number;
}
