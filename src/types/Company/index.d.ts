// 회사 관련 타입 정의

export interface Company {
  compIdx: number;
  compName: string;
  compLocation: string;
  compLocate?: string; // 위치 (별칭)
  compType: string;
  compIndustry: string;
  compSize?: string;
  compEstablish?: string;
  compCEO?: string;
  compLateX?: number;
  compLateY?: number;
  compURL?: string;
  compLotAddr?: string;
  compAddr?: string;
  compMapIMG?: string;
  compStatus?: number;
  compViewCount?: number;
  compEmployeeCount?: number;
  compCapital?: number;
  compSales?: number;
  totalEmployees?: number;
  newHires?: number;
  resignations?: number;
}

export interface CompanyAutoSearchResult {
  compIdx: number;
  compName: string;
  compLocation: string;
  compType: string;
  compIndustry: string;
}

export interface PopularCompany {
  compIdx: number;
  compName: string;
  compLocation: string;
  compType: string;
  compIndustry: string;
  viewCount?: number;
}

export interface CompanyBoard {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  compIdx: number;
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  company?: Company; // 옵셔널로 변경
}

export interface CompanyRequest {
  compName: string;
  compCEO?: string;
  compType: string;
  compIndustry: string;
  compAddr: string;
  requesterId?: string;
}

export interface CompanyComment {
  commentIdx: number;
  boardIdx: number;
  commentContent: string;
  commentWriter?: string; // API에서는 writerId 사용
  writerId?: string; // API 응답 필드
  commentRegDate?: string; // API에서는 regDate 사용
  regDate?: string; // API 응답 필드
  modDate?: string; // API 응답 필드
  commentLike: number;
  commentParent: number;
  commentDepth: number;
  replies?: CompanyComment[];
}

export interface ApiResponse<T> {
  status: number;
  data: T;
  totalCount?: number;
  currentCount?: number;
}
