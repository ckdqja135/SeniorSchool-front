/**
 * API 기본 URL을 반환하는 유틸리티 함수
 * 환경 변수 NEXT_PUBLIC_BASE_URL이 설정되어 있어야 합니다.
 */
export function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL environment variable is not set');
  }
  
  return baseUrl;
}

