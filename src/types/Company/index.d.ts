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
  // 직원 정보
  compEmployeeCount?: number;
  totalEmployees?: number;
  newHires?: number;
  resignations?: number;
  compAvgSalary?: number; // 평균 연봉 (원)
  compAvgTenure?: number; // 평균 근속 연수 (년)
  // 재무 정보
  compCapital?: number; // 자본금 (원)
  compSales?: number; // 매출액 (원)
  compOperatingProfit?: number; // 영업이익 (원)
  compNetIncome?: number; // 당기순이익 (원)
  compTotalAssets?: number; // 자산총계 (원)
  compTotalLiabilities?: number; // 부채총계 (원)
  compTotalEquity?: number; // 자본총계 (원)
  // OpenDart 연동 정보
  compCorpCode?: string; // OpenDart corp_code
  compDataUpdatedAt?: string; // OpenDart 데이터 업데이트 일시
  // 시스템 정보
  created_at?: string; // 등록일
  updated_at?: string; // 수정일
}

export interface CompanyAutoSearchResult {
  compIdx: number;
  compName: string;
  compLocation: string;
  compLocate?: string;
  compType: string;
  compIndustry: string;
  compCEO?: string;
  compAddr?: string;
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
  compName?: string; // 회사명 추가
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  boardRating?: number; // 회사 평점 (0.5 ~ 5.0)
  boardType?: 'company' | 'interview' | 'salary'; // 후기 타입: 회사 후기, 면접 후기, 연봉 후기
  // 연봉 후기 전용 필드
  years?: number; // 몇 년차
  position?: string; // 직군
  salary?: number; // 연봉 (만원)
  joinDate?: string; // 입사년월 (yyyy-mm 형식)
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
