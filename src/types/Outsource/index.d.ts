// 외주업체 타입 정의
export interface Outsource {
  outsourceIdx: number;
  outsourceName: string;
  outsourceAddr: string;
  outsourceType: string;
  outsourceLocation: string;
  createdAt: string;
  updatedAt: string;
}

// 외주업체 후기 타입 정의
export interface OutsourceBoard {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  outsourceIdx: number;
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  boardPW: string;
  outsourceName?: string;
  outsourceAddr?: string;
  commentCount?: number;
  outsource?: {
    outsourceIdx: number;
    outsourceName: string;
    outsourceLocation: string;
    outsourceType: string;
    outsourceEstablished: string;
    outsourceCEO: string;
    outsourceLatX: number;
    outsourceLatY: number;
    outsourceURL: string;
    outsourceLotAddr: string;
    outsourceAddr: string;
    outsourceMapIMG: string;
    outsourceStatus: number;
    outsourceViewCount: number;
  };
}

// 외주업체 후기 댓글 타입 정의
export interface OutsourceComment {
  commentIdx: number;
  boardIdx: number;
  commentContent: string;
  writerId: string;
  writerName: string;
  commentDepth: number;
  commentParent: number;
  createdAt: string;
  updatedAt: string;
  replies?: OutsourceComment[];
}

// 외주업체 추가 요청 타입 정의
export interface OutsourceRequest {
  requestIdx: number;
  outsourceName: string;
  outsourceAddr: string;
  outsourceType: string;
  outsourceLocation: string;
  requesterId: string;
  requesterName: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// API 응답 타입들
export interface OutsourceListResponse {
  success: boolean;
  data: Outsource[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface OutsourceBoardListResponse {
  success: boolean;
  data: OutsourceBoard[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface OutsourceDetailResponse {
  success: boolean;
  data: Outsource;
}

export interface OutsourceBoardDetailResponse {
  success: boolean;
  data: OutsourceBoard;
}

export interface OutsourceCommentListResponse {
  success: boolean;
  data: OutsourceComment[];
}

// 검색 파라미터 타입
export interface OutsourceSearchParams {
  name?: string;
  type?: string;
  location?: string;
  page?: number;
  limit?: number;
}

export interface OutsourceBoardSearchParams {
  outsourceIdx?: number;
  writerId?: string;
  page?: number;
  limit?: number;
  orderBy?: 'latest' | 'popular' | 'likes';
}
