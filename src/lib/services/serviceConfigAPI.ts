import {
  ServiceConfig,
  ServiceListResponse,
  ServiceDetailResponse,
  CreateServiceRequest,
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

// 활성 서비스 목록 조회 (퍼블릭 - 인증 불필요)
export const fetchActiveServices = async (): Promise<ServiceConfig[]> => {
  try {
    const response = await fetch(`${BASE_URL}/services`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return data;
    }

    if (data.data) {
      return data.data;
    }

    return [];
  } catch (error) {
    console.error('서비스 목록 조회 실패:', error);
    return [];
  }
};

// 특정 서비스 설정 조회
export const fetchServiceConfig = async (slug: string): Promise<ServiceConfig | null> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services/${slug}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.data) {
      return data.data;
    }

    return data;
  } catch (error) {
    console.error('서비스 설정 조회 실패:', error);
    return null;
  }
};

// 새 서비스 생성
export const createService = async (requestData: CreateServiceRequest): Promise<ServiceConfig | null> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('서비스 생성 실패:', error);
    throw error;
  }
};

// 서비스 설정 수정
export const updateService = async (slug: string, updateData: Partial<ServiceConfig>): Promise<ServiceConfig | null> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services/${slug}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error('서비스 수정 실패:', error);
    throw error;
  }
};

// 서비스 비활성화 (soft delete)
export const deleteService = async (slug: string): Promise<void> => {
  try {
    const response = await fetch(`${BASE_URL}/admin/services/${slug}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('서비스 삭제 실패:', error);
    throw error;
  }
};
