import {
  DynamicBoard,
  DynamicBoardListResponse,
  DynamicBoardDetailResponse,
  DynamicRequest,
  DynamicRequestListResponse,
  ListParams,
} from '@/types/Services';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

if (!BASE_URL) {
  throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set');
}

const getAuthHeaders = () => {
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

// ===== 퍼블릭 게시판 API =====

// 게시판 목록 조회
export const fetchBoards = async (
  slug: string,
  params?: ListParams
): Promise<DynamicBoardListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.keyword) searchParams.append('keyword', params.keyword);
  if (params?.orderBy) searchParams.append('orderBy', params.orderBy);

  const url = `${BASE_URL}/services/${slug}/boards${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return { status: 200, data, totalCount: data.length, currentCount: data.length };
    }

    return data;
  } catch (error) {
    console.error('게시판 목록 조회 실패:', error);
    throw error;
  }
};

// 게시판 상세 조회
export const fetchBoardDetail = async (
  slug: string,
  id: number
): Promise<DynamicBoard | null> => {
  try {
    const response = await fetch(`${BASE_URL}/services/${slug}/boards/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('게시판 상세 조회 실패:', error);
    throw error;
  }
};

// 최근 게시글 조회
export const fetchRecentBoards = async (
  slug: string,
  limit: number = 5
): Promise<DynamicBoard[]> => {
  try {
    const response = await fetch(`${BASE_URL}/services/${slug}/boards/recent?limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) return data;
    return data.data || [];
  } catch (error) {
    console.error('최근 게시글 조회 실패:', error);
    return [];
  }
};

// 인기 게시글 TOP10 조회
export const fetchTopViewedBoards = async (
  slug: string,
  limit: number = 10
): Promise<DynamicBoard[]> => {
  try {
    const response = await fetch(`${BASE_URL}/services/${slug}/boards/top-viewed?limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) return data;
    return data.data || [];
  } catch (error) {
    console.error('인기 게시글 조회 실패:', error);
    return [];
  }
};

// 게시글 작성
export const createBoard = async (
  slug: string,
  boardData: {
    entityIdx: number;
    boardTitle: string;
    boardContent: string;
    boardId: string;
  }
): Promise<{ success: boolean; boardIdx?: number }> => {
  try {
    const response = await fetch(`${BASE_URL}/services/${slug}/boards/insert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(boardData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('게시글 작성 실패:', error);
    throw error;
  }
};

// 좋아요 토글
export const toggleBoardLike = async (
  slug: string,
  boardIdx: number
): Promise<{ success: boolean; likes: number }> => {
  try {
    const response = await fetch(`${BASE_URL}/services/${slug}/boards/${boardIdx}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('좋아요 토글 실패:', error);
    throw error;
  }
};

// ===== 퍼블릭 추가 요청 API =====

// 엔티티 추가 요청
export const createRequest = async (
  slug: string,
  requestData: { requestName: string; requestReason: string }
): Promise<{ success: boolean }> => {
  try {
    const response = await fetch(`${BASE_URL}/services/${slug}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('추가 요청 실패:', error);
    throw error;
  }
};

// ===== 어드민 게시판 API =====

// 어드민: 게시판 관리 목록
export const adminFetchBoards = async (
  slug: string,
  params?: ListParams
): Promise<DynamicBoardListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.keyword) searchParams.append('keyword', params.keyword);

  const url = `${BASE_URL}/admin/services/${slug}/board${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return { status: 200, data, totalCount: data.length, currentCount: data.length };
    }

    return data;
  } catch (error) {
    console.error('어드민 게시판 목록 조회 실패:', error);
    throw error;
  }
};

// 어드민: 게시글 삭제
export const adminDeleteBoard = async (slug: string, id: number): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services/${slug}/board/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('게시글 삭제 실패:', error);
    throw error;
  }
};

// ===== 어드민 추가 요청 관리 API =====

// 어드민: 추가 요청 목록
export const adminFetchRequests = async (
  slug: string,
  params?: ListParams
): Promise<DynamicRequestListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());

  const url = `${BASE_URL}/admin/services/${slug}/requests${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return { status: 200, data, totalCount: data.length, currentCount: data.length };
    }

    return data;
  } catch (error) {
    console.error('추가 요청 목록 조회 실패:', error);
    throw error;
  }
};

// 어드민: 요청 승인/거절
export const adminUpdateRequest = async (
  slug: string,
  id: number,
  status: number // 1:승인, 2:거절
): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services/${slug}/requests/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ requestStatus: status }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('요청 상태 변경 실패:', error);
    throw error;
  }
};
