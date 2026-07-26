/**
 * 외주 업체 정보 타입 정의
 */

// ========== Enums ==========

/**
 * 외주 업체 분야 대분류
 */
export enum VendorCategory {
    DEVELOPMENT = 'DEVELOPMENT',
    DESIGN = 'DESIGN',
    MARKETING = 'MARKETING',
    VIDEO = 'VIDEO',
    CONSULTING = 'CONSULTING',
    OTHER = 'OTHER',
}

/**
 * 평균 예산 구간
 */
export enum AvgBudgetRange {
    RANGE_0_1 = 'RANGE_0_1',         // 0~100만원
    RANGE_1_3 = 'RANGE_1_3',         // 100~300만원
    RANGE_3_5 = 'RANGE_3_5',         // 300~500만원
    RANGE_5_10 = 'RANGE_5_10',       // 500~1000만원
    RANGE_10_UP = 'RANGE_10_UP',     // 1000만원 이상
}

// ========== 팀 구성 ==========

/**
 * 팀 구성 (역할별 인원 수)
 */
export interface TeamComposition {
    /** 프론트엔드 개발자 수 (0~50) */
    frontend: number;
    /** 백엔드 개발자 수 (0~50) */
    backend: number;
    /** AI/데이터 엔지니어 수 (0~50) */
    ai: number;
    /** 모바일 개발자 수 (0~50) */
    mobile: number;
    /** 디자이너 수 (0~50) */
    designer: number;
    /** PM/기획자 수 (0~50) */
    pm: number;
    /** DevOps/인프라 엔지니어 수 (0~50) */
    devops: number;
    /** QA/테스터 수 (0~50) */
    qa: number;
    /** 기타 인원 수 (0~50) */
    etc: number;
    /** 전체 인원 수 (자동 계산) */
    total: number;
}

// ========== 정부지원사업 ==========

/**
 * 정부지원사업 수행 경력 정보
 */
export interface GovSupportInfo {
    /** 정부지원사업 수행 경력 여부 */
    hasGovSupportExperience: boolean;
    /** 수행한 정부지원사업 목록 (최대 10개, 각 2~50자) */
    govSupportPrograms?: string[];
    /** 총 수행 횟수 (1~100) */
    govSupportTotalCount?: number;
    /** 최근 수행 연도 (2000~현재년도) */
    govSupportRecentYear?: number;
    /** 대표 과제명 (최대 100자) */
    govSupportMainTitle?: string;
    /** 관련 링크 (성과/보도자료 등, URL 형식, 최대 3개) */
    govSupportLinks?: string[];
    /** 요약 설명 (최대 500자) */
    govSupportSummary?: string;
}

// ========== 개발 분야 전용 ==========

/**
 * 개발 분야 전용 필드
 */
export interface DevSpecificInfo {
    /** 주요 기술스택 요약 (1~10개, 각 2~30자) */
    techStackSummary: string[];
    /** 프론트엔드 스택 (0~15개) */
    frontendStacks?: string[];
    /** 백엔드 스택 (0~15개) */
    backendStacks?: string[];
    /** 인공지능/데이터 스택 (0~15개) */
    aiStacks?: string[];
    /** 모바일/크로스 플랫폼 스택 (0~15개) */
    mobileStacks?: string[];
    /** 인프라/배포 환경 (0~15개) */
    infraStacks?: string[];
    /** 테크 분야 태그 (0~10개) */
    devTags?: string[];
    /** 코드 저장소 링크 목록 (URL 형식, 최대 5개) */
    repoUrls?: string[];
    /** GitHub 조직/계정 (최대 100자) */
    githubAccount?: string;
    /** 개발 경력 팀 평균 (년, 0~30) */
    avgDevExperienceYears?: number;
    /** 주로 하는 프로젝트 타입 (최대 5개) */
    devProjectTypes?: string[];
    /** 선호 기술/스택 메모 (최대 500자) */
    devPreferenceNote?: string;
}

// ========== 공통 필드 (Base Vendor) ==========

/**
 * 모든 외주 업체 공통 필드
 */
export interface BaseVendor {
    /** 업체 ID (서버에서 생성) */
    id?: string;
    /** 업체명/브랜드명 (2~50자, 특수문자 제한) */
    name: string;
    /** 대표자명 (2~30자) */
    outsourceCEO: string;
    /** 한 줄 소개 (5~80자) */
    tagline: string;
    /** 분야(대분류) */
    category: VendorCategory;
    /** 커스텀 분야명 (category가 OTHER일 때 필수, 한글만 2~20자) */
    customCategory?: string;
    /** 세부 서비스 타입 (최대 5개, 각 2~30자) */
    serviceTypes?: string[];
    /** 소개 상세 설명 (최대 2000자) */
    description?: string;
    /** 최소 프로젝트 단가(원, 0 이상) */
    minBudget?: number;
    /** 평균 프로젝트 단가(원, 0 이상) */
    avgBudget?: number;
    /** 최대 프로젝트 단가(원, 0 이상) */
    maxBudget?: number;
    /** 평균 단가 구간 */
    avgBudgetRange?: AvgBudgetRange;
    /** 대표 포트폴리오 URL */
    mainPortfolioUrl?: string;
    /** 웹사이트 URL */
    websiteUrl?: string;
    /** 지역 (도/시, 최대 50자) */
    region?: string;
    /** 타임존 (IANA 또는 문자열) */
    timezone?: string;
    /** 연락 이메일 (이메일 형식) */
    contactEmail: string;
    /** 연락 전화/카카오 등 (최대 100자) */
    contactChannel?: string;
    /** 공개 가능 여부(프로필) */
    isPublic: boolean;
    /** 팀 구성 */
    team?: TeamComposition;
    /** 정부지원사업 정보 */
    govSupport?: GovSupportInfo;
    /** 생성일 */
    createdAt?: Date;
    /** 수정일 */
    updatedAt?: Date;
}

// ========== 개발 분야 외주 업체 ==========

/**
 * 개발 분야 외주 업체 (BaseVendor + DevSpecificInfo)
 */
export interface DevVendor extends BaseVendor {
    category: VendorCategory.DEVELOPMENT;
    /** 개발 분야 전용 정보 */
    devInfo: DevSpecificInfo;
}

// ========== 리스트/카드용 요약 타입 ==========

/**
 * 리스트/카드에서 사용할 외주 업체 요약 정보
 */
export interface VendorListItem {
    id: string;
    name: string;
    tagline: string;
    category: VendorCategory;
    avgBudgetRange?: AvgBudgetRange;
    region?: string;
    team?: {
        total: number;
        frontend?: number;
        backend?: number;
        ai?: number;
    };
    hasGovSupport: boolean;
    techStackSummary?: string[];
    isPublic: boolean;
}

/**
 * 전체 외주 업체 타입 (Union Type)
 */
export type Vendor = DevVendor | BaseVendor;
