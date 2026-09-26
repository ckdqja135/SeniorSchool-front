// 서비스 설정 타입 정의
export interface ServiceConfig {
  serviceIdx: number;
  serviceSlug: string;
  serviceName: string;
  serviceDisplay: string;
  serviceEmoji: string;
  serviceColor: string;
  templateType: 'basic' | 'company' | 'restaurant';
  serviceStatus: number;
  serviceOrder: number;
  fields: EntityFieldConfig[];
  createdAt: string;
  updatedAt: string;
}

// 엔티티 필드 설정 타입
export interface EntityFieldConfig {
  fieldIdx: number;
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'url' | 'image' | 'rating' | 'textarea';
  isRequired: boolean;
  showInList: boolean;
  showInDetail: boolean;
  showInSearch: boolean;
  sortOrder: number;
}

// 동적 엔티티 타입
export interface DynamicEntity {
  entityIdx: number;
  [fieldKey: string]: any;
  status: number;
  viewCount: number;
  createdAt: string;
  updatedAt?: string;
}

// 동적 게시판 타입
export interface DynamicBoard {
  boardIdx: number;
  entityIdx: number;
  entityName?: string;
  boardTitle: string;
  boardContent: string;
  boardId: string;
  boardLike: number;
  boardHits: number;
  boardRegDate: string;
  commentCount?: number;
}

// 동적 댓글 타입
export interface DynamicComment {
  commentIdx: number;
  boardIdx: number;
  commentContent: string;
  commentId: string;
  commentLike: number;
  createdAt: string;
}

// 동적 추가 요청 타입
export interface DynamicRequest {
  requestIdx: number;
  requestName: string;
  requestReason: string;
  requestStatus: number; // 0:대기, 1:승인, 2:거절
  createdAt: string;
}

// 서비스 생성 요청 타입
export interface CreateServiceRequest {
  serviceSlug: string;
  serviceName: string;
  serviceDisplay: string;
  serviceEmoji: string;
  serviceColor: string;
  templateType: 'basic' | 'company' | 'restaurant';
  customFields?: CustomFieldInput[];
}

// 커스텀 필드 입력 타입
export interface CustomFieldInput {
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'text' | 'number' | 'date' | 'url' | 'image' | 'rating' | 'textarea';
  isRequired?: boolean;
  showInList?: boolean;
  showInDetail?: boolean;
  showInSearch?: boolean;
}

// API 응답 타입
export interface ServiceListResponse {
  status: number;
  data: ServiceConfig[];
  message?: string;
}

export interface ServiceDetailResponse {
  status: number;
  data: ServiceConfig;
  message?: string;
}

export interface DynamicEntityListResponse {
  status: number;
  data: DynamicEntity[];
  totalCount: number;
  currentCount: number;
  message?: string;
}

export interface DynamicEntityDetailResponse {
  status: number;
  data: DynamicEntity;
  message?: string;
}

export interface DynamicBoardListResponse {
  status: number;
  data: DynamicBoard[];
  totalCount: number;
  currentCount: number;
  message?: string;
}

export interface DynamicBoardDetailResponse {
  status: number;
  data: DynamicBoard;
  message?: string;
}

export interface DynamicRequestListResponse {
  status: number;
  data: DynamicRequest[];
  totalCount: number;
  currentCount: number;
  message?: string;
}

// 검색/페이지네이션 파라미터
export interface ListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  orderBy?: string;
}

// 자동완성 검색 결과
export interface AutoSearchResult {
  entityIdx: number;
  name: string;
  [key: string]: any;
}

// 템플릿 정의 타입
export interface TemplateDefinition {
  type: 'basic' | 'company' | 'restaurant';
  label: string;
  description: string;
  examples: string;
  defaultFields: EntityFieldConfig[];
}
