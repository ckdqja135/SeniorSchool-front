import {
  DynamicEntity,
  DynamicEntityListResponse,
  DynamicEntityDetailResponse,
  AutoSearchResult,
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

// 엔티티 목록 조회 (퍼블릭)
export const fetchEntities = async (
  slug: string,
  params?: ListParams
): Promise<DynamicEntityListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.keyword) searchParams.append('keyword', params.keyword);
  if (params?.orderBy) searchParams.append('orderBy', params.orderBy);

  const url = `${BASE_URL}/services/${slug}/entities${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

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
    console.error('엔티티 목록 조회 실패:', error);
    throw error;
  }
};

// 엔티티 상세 조회 (퍼블릭)
export const fetchEntityDetail = async (
  slug: string,
  id: number
): Promise<DynamicEntity | null> => {
  try {
    const response = await fetch(`${BASE_URL}/services/${slug}/entities/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('엔티티 상세 조회 실패:', error);
    throw error;
  }
};

// 인기 엔티티 TOP10 (퍼블릭)
export const fetchTopViewedEntities = async (
  slug: string,
  limit: number = 10
): Promise<DynamicEntity[]> => {
  try {
    const response = await fetch(`${BASE_URL}/services/${slug}/entities/top-viewed?limit=${limit}`, {
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
    console.error('인기 엔티티 조회 실패:', error);
    return [];
  }
};

// 자동완성 검색 (퍼블릭)
export const autoSearchEntities = async (
  slug: string,
  keyword: string
): Promise<AutoSearchResult[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/services/${slug}/entities/auto-search?keyword=${encodeURIComponent(keyword)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) return data;
    return data.data || [];
  } catch (error) {
    console.error('자동완성 검색 실패:', error);
    return [];
  }
};

// 어드민: 엔티티 검색 (페이지네이션)
export const adminSearchEntities = async (
  slug: string,
  params?: ListParams
): Promise<DynamicEntityListResponse> => {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.keyword) searchParams.append('keyword', params.keyword);

  const url = `${BASE_URL}/admin/services/${slug}/search${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

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
    console.error('어드민 엔티티 검색 실패:', error);
    throw error;
  }
};

// 어드민: 엔티티 추가
export const createEntity = async (
  slug: string,
  entityData: Record<string, any>
): Promise<DynamicEntity | null> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services/${slug}/entities`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(entityData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('엔티티 추가 실패:', error);
    throw error;
  }
};

// 어드민: 엔티티 수정
export const updateEntity = async (
  slug: string,
  id: number,
  entityData: Record<string, any>
): Promise<DynamicEntity | null> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services/${slug}/entities/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(entityData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('엔티티 수정 실패:', error);
    throw error;
  }
};

// 어드민: 엔티티 삭제
export const deleteEntity = async (slug: string, id: number): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services/${slug}/entities/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('엔티티 삭제 실패:', error);
    throw error;
  }
};
