import { 
  MatzalAl, 
  PopularMatzalAl, 
  MatzalAlBoard, 
  MatzalAlRequest, 
  MatzalAlAutoSearchResult,
  MatzalAlApiResponse,
  Restaurant
} from '@/types/MatzalAl';

const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

if (!BACKEND_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set');
}

// 맛잘알 목록 조회
export const getMatzalAlList = async (params?: {
  page?: number;
  limit?: number;
  location?: string;
  type?: string;
}): Promise<MatzalAl[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.location) queryParams.append('location', params.location);
    if (params?.type) queryParams.append('type', params.type);

    const response = await fetch(`${BACKEND_URL}/matzal-al?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MatzalAlApiResponse<MatzalAl[]> = await response.json();
    
    if (data.status === 200 && data.data) {
      return data.data;
    }
    
    return [];
  } catch (error) {
    console.error('맛잘알 목록 조회 오류:', error);
    return [];
  }
};

// 인기 식당 조회 (식당 후기 API 사용)
export const getPopularMatzalAl = async (limit: number = 10): Promise<PopularMatzalAl[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/restaurant/top-viewed`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답에서 식당 정보 추출
    if (Array.isArray(data)) {
      return data
        .map((item: any) => ({
          matzalAlIdx: item.restaurantIdx || item.matzalAlIdx,
          matzalAlName: item.restaurantName || item.matzalAlName || '맛집명 없음',
          matzalAlLocation: item.restaurantAddr || item.matzalAlLocation || '위치 정보 없음',
          matzalAlType: item.restaurantType || item.matzalAlType || '맛집',
          viewCount: item.boardHits || item.viewCount || 0
        }))
        .filter((item: PopularMatzalAl) => item.matzalAlIdx && item.matzalAlName)
        .slice(0, limit);
    } else if (data.data && Array.isArray(data.data)) {
      return data.data
        .map((item: any) => ({
          matzalAlIdx: item.restaurantIdx || item.matzalAlIdx,
          matzalAlName: item.restaurantName || item.matzalAlName || '맛집명 없음',
          matzalAlLocation: item.restaurantAddr || item.matzalAlLocation || '위치 정보 없음',
          matzalAlType: item.restaurantType || item.matzalAlType || '맛집',
          viewCount: item.boardHits || item.viewCount || 0
        }))
        .filter((item: PopularMatzalAl) => item.matzalAlIdx && item.matzalAlName)
        .slice(0, limit);
    }
    
    return [];
  } catch (error) {
    console.error('인기 식당 조회 오류:', error);
    return [];
  }
};

// 맛잘알 상세 정보 조회
export const getMatzalAlDetail = async (matzalAlIdx: number): Promise<MatzalAl | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/matzal-al/${matzalAlIdx}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MatzalAlApiResponse<MatzalAl> = await response.json();
    
    if (data.status === 200 && data.data) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('맛잘알 상세 조회 오류:', error);
    return null;
  }
};

// 맛잘알 이름으로 검색
export const getMatzalAlByName = async (matzalAlName: string): Promise<MatzalAl | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/matzal-al/name/${encodeURIComponent(matzalAlName)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MatzalAlApiResponse<MatzalAl> = await response.json();
    
    if (data.status === 200 && data.data) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('맛잘알 이름 검색 오류:', error);
    return null;
  }
};

// 식당 상세 정보 조회
export const getRestaurantDetail = async (restaurantName: string, restaurantAddr?: string): Promise<Restaurant | null> => {
  try {
    const params = new URLSearchParams();
    params.append('restaurantName', restaurantName);
    if (restaurantAddr) {
      params.append('restaurantAddr', restaurantAddr);
    }

    const response = await fetch(`${BACKEND_URL}/restaurant/restaurant?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 직접 객체인 경우
    if (data.restaurantIdx) {
      return data;
    }
    
    // API 응답이 data 객체 안에 있는 경우
    if (data.data && data.data.restaurantIdx) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('식당 상세 조회 오류:', error);
    return null;
  }
};

// 맛잘알 자동완성 검색
export const searchMatzalAlAuto = async (keyword: string): Promise<MatzalAlAutoSearchResult[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/search/matzal-al/auto?keyword=${encodeURIComponent(keyword)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답이 배열인 경우 직접 사용
    if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  } catch (error) {
    console.error('맛잘알 자동완성 검색 오류:', error);
    return [];
  }
};

// 맛잘알 게시판 목록 조회
export const getMatzalAlBoards = async (params?: {
  matzalAlIdx?: number;
  page?: number;
  limit?: number;
}): Promise<MatzalAlBoard[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.matzalAlIdx) queryParams.append('matzalAlIdx', params.matzalAlIdx.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${BACKEND_URL}/matzal-al/board?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MatzalAlApiResponse<MatzalAlBoard[]> = await response.json();
    
    if (data.status === 200 && data.data) {
      return data.data;
    }
    
    return [];
  } catch (error) {
    console.error('맛잘알 게시판 목록 조회 오류:', error);
    return [];
  }
};

// 식당 후기 목록 조회
export const getRestaurantBoards = async (params: {
  restaurantIdx: number;
  id?: string;
  title?: string;
  content?: string;
}): Promise<MatzalAlBoard[]> => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append('restaurantIdx', params.restaurantIdx.toString());
    if (params.id) queryParams.append('id', params.id);
    if (params.title) queryParams.append('title', params.title);
    if (params.content) queryParams.append('content', params.content);

    const response = await fetch(`${BACKEND_URL}/restaurant/boards?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 구조에 따라 데이터 처리
    if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    return [];
  } catch (error) {
    console.error('식당 후기 목록 조회 오류:', error);
    return [];
  }
};

// 인기 맛잘알 게시판 조회 (식당 후기 API 사용)
export const getPopularMatzalAlBoards = async (limit: number = 10): Promise<MatzalAlBoard[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/restaurant/boards/top-viewed`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 구조에 따라 데이터 처리
    if (Array.isArray(data)) {
      return data.slice(0, limit);
    } else if (data.data && Array.isArray(data.data)) {
      return data.data.slice(0, limit);
    }
    
    return [];
  } catch (error) {
    console.error('인기 식당 후기 조회 오류:', error);
    return [];
  }
};

// 최근 맛잘알 게시판 조회 (식당 후기 API 사용)
export const getRecentMatzalAlBoards = async (limit: number = 10): Promise<MatzalAlBoard[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/restaurant/boards/recent`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 구조에 따라 데이터 처리
    if (Array.isArray(data)) {
      // restaurant 객체가 포함된 데이터 구조 처리
      const processedData = data.map((item: any) => ({
        ...item,
        restaurantName: item.restaurant?.restaurantName || item.restaurantName || '맛집명 없음',
        restaurantLocation: item.restaurant?.restaurantLocation || item.restaurantLocation || '위치 정보 없음',
        restaurantType: item.restaurant?.restaurantType || item.restaurantType || '맛집'
      }));
      return processedData.slice(0, limit);
    } else if (data.data && Array.isArray(data.data)) {
      // restaurant 객체가 포함된 데이터 구조 처리
      const processedData = data.data.map((item: any) => ({
        ...item,
        restaurantName: item.restaurant?.restaurantName || item.restaurantName || '맛집명 없음',
        restaurantLocation: item.restaurant?.restaurantLocation || item.restaurantLocation || '위치 정보 없음',
        restaurantType: item.restaurant?.restaurantType || item.restaurantType || '맛집'
      }));
      return processedData.slice(0, limit);
    }
    
    return [];
  } catch (error) {
    console.error('최근 식당 후기 조회 오류:', error);
    return [];
  }
};

// 맛잘알 게시판 상세 조회
export const getMatzalAlBoardDetail = async (boardIdx: number): Promise<MatzalAlBoard | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/matzal-al/board/${boardIdx}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MatzalAlApiResponse<MatzalAlBoard> = await response.json();
    
    if (data.status === 200 && data.data) {
      return data.data;
    }
    
    return null;
  } catch (error) {
    console.error('맛잘알 게시판 상세 조회 오류:', error);
    return null;
  }
};

// 식당 후기 등록
export const createRestaurantBoard = async (boardData: {
  boardTitle: string;
  boardContent: string;
  restaurantIdx: number;
  boardID: string;
  boardPW: string;
}): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/restaurant/boards/insert`, {
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
    return data.success || data.status === 200;
  } catch (error) {
    console.error('식당 후기 등록 오류:', error);
    return false;
  }
};

// 맛잘알 추가 요청 (식당 추가 요청 API 사용)
export const requestMatzalAl = async (request: MatzalAlRequest): Promise<boolean> => {
  try {
    // API 요청 형식에 맞게 데이터 변환
    const requestData = {
      restaurantName: request.matzalAlName,
      restaurantOwner: request.requesterId || '',
      restaurantType: request.matzalAlType,
      restaurantAddr: request.matzalAlAddr
    };

    const response = await fetch(`${BACKEND_URL}/restaurant/requests`, {
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
    return data.success || data.status === 200;
  } catch (error) {
    console.error('식당 추가 요청 오류:', error);
    return false;
  }
};

// 식당 후기 TOP10 조회 (조회수 기준)
export const getRestaurantCommentsTop = async (limit: number = 10): Promise<MatzalAlBoard[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/restaurant/board/top-viewed`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 구조에 따라 데이터 처리
    if (Array.isArray(data)) {
      return data.slice(0, limit);
    } else if (data.data && Array.isArray(data.data)) {
      return data.data.slice(0, limit);
    }
    
    return [];
  } catch (error) {
    console.error('식당 후기 TOP10 조회 오류:', error);
    return [];
  }
};

// 식당 최근 후기 5개 조회
export const getRestaurantRecentComments = async (limit: number = 5): Promise<MatzalAlBoard[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/restaurant/recent`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // API 응답 구조에 따라 데이터 처리
    if (Array.isArray(data)) {
      return data.slice(0, limit);
    } else if (data.data && Array.isArray(data.data)) {
      return data.data.slice(0, limit);
    }
    
    return [];
  } catch (error) {
    console.error('식당 최근 후기 조회 오류:', error);
    return [];
  }
};