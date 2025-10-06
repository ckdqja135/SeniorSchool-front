import { 
  OutsourceListResponse, 
  OutsourceBoardListResponse, 
  OutsourceDetailResponse,
  OutsourceBoardDetailResponse,
  OutsourceCommentListResponse,
  OutsourceSearchParams,
  OutsourceBoardSearchParams,
  OutsourceBoard,
  OutsourceRequest
} from '@/types/Outsource';

const BASE_URL = 'https://api.reviewhub.life';

// 외주업체 목록 조회
export const getOutsourceList = async (params?: OutsourceSearchParams): Promise<OutsourceListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params?.name) searchParams.append('name', params.name);
  if (params?.type) searchParams.append('type', params.type);
  if (params?.location) searchParams.append('location', params.location);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  
  const url = `${BASE_URL}/outsource${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data as any,
        total: data.length
      };
    }
    
    return data;
  } catch (error) {
    console.error('외주업체 목록 조회 실패:', error);
    throw error;
  }
};

// 외주업체 상세 조회
export const getOutsourceDetail = async (outsourceName: string, outsourceAddr: string): Promise<OutsourceDetailResponse> => {
  const url = `${BASE_URL}/outsource/outsource?outsourceName=${encodeURIComponent(outsourceName)}&outsourceAddr=${encodeURIComponent(outsourceAddr)}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리 (첫 번째 요소 반환)
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data[0] || null,
        total: data.length
      };
    }
    
    return data;
  } catch (error) {
    console.error('외주업체 상세 조회 실패:', error);
    throw error;
  }
};

// 외주업체 후기 목록 조회
export const getOutsourceBoardList = async (params?: OutsourceBoardSearchParams): Promise<OutsourceBoardListResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params?.outsourceIdx) searchParams.append('outsourceIdx', params.outsourceIdx.toString());
  if (params?.writerId) searchParams.append('writerId', params.writerId);
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.orderBy) searchParams.append('orderBy', params.orderBy);
  
  const url = `${BASE_URL}/outsource/boards${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data as any,
        total: data.length
      };
    }
    
    return data;
  } catch (error) {
    console.error('외주업체 후기 목록 조회 실패:', error);
    throw error;
  }
};

// 외주업체 후기 상세 조회
export const getOutsourceBoardDetail = async (boardIdx: number): Promise<OutsourceBoardDetailResponse> => {
  const url = `${BASE_URL}/outsource/boards/detail?boardIdx=${boardIdx}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리 (첫 번째 요소 반환)
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data[0] || null as any,
        total: data.length
      };
    }
    
    return data;
  } catch (error) {
    console.error('외주업체 후기 상세 조회 실패:', error);
    throw error;
  }
};

// 최근 후기 목록 조회
export const getRecentOutsourceBoards = async (): Promise<OutsourceBoardListResponse> => {
  const url = `${BASE_URL}/outsource/boards/recent`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data as any,
        total: data.length
      };
    }
    
    return data;
  } catch (error) {
    console.error('최근 외주업체 후기 조회 실패:', error);
    throw error;
  }
};

// 인기 후기 TOP10 조회
export const getTopViewedOutsourceBoards = async (): Promise<OutsourceBoardListResponse> => {
  const url = `${BASE_URL}/outsource/boards/top-viewed`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리
    if (Array.isArray(data)) {
      return {
        success: true,
        data: data as any,
        total: data.length
      };
    }
    
    return data;
  } catch (error) {
    console.error('인기 외주업체 후기 조회 실패:', error);
    throw error;
  }
};

// 외주업체 후기 등록
export const createOutsourceBoard = async (boardData: {
  outsourceIdx: number;
  title: string;
  content: string;
  writerId: string;
}): Promise<{ success: boolean; boardIdx?: number }> => {
  const url = `${BASE_URL}/outsource/boards/insert`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(boardData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리
    if (Array.isArray(data)) {
      return {
        success: true
      };
    }
    
    return data;
  } catch (error) {
    console.error('외주업체 후기 등록 실패:', error);
    throw error;
  }
};

// 외주업체 후기 좋아요 토글
export const toggleOutsourceBoardLike = async (boardIdx: number): Promise<{ success: boolean; likes: number }> => {
  const url = `${BASE_URL}/outsource/boards/like`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ boardIdx }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리
    if (Array.isArray(data)) {
      return {
        success: true,
        likes: 0
      };
    }
    
    return data;
  } catch (error) {
    console.error('외주업체 후기 좋아요 실패:', error);
    throw error;
  }
};

// 외주업체 추가 요청
export const createOutsourceRequest = async (requestData: {
  outsourceName: string;
  outsourceAddr: string;
  outsourceType: string;
  outsourceLocation: string;
  requesterId: string;
}): Promise<{ success: boolean; requestIdx?: number }> => {
  const url = `${BASE_URL}/outsource/requests`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 배열인 경우 처리
    if (Array.isArray(data)) {
      return {
        success: true,
        requestIdx: undefined
      };
    }
    
    return data;
  } catch (error) {
    console.error('외주업체 추가 요청 실패:', error);
    throw error;
  }
};
