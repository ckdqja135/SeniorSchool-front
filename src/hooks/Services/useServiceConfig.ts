import { useState, useEffect, useCallback } from 'react';
import { ServiceConfig } from '@/types/Services';
import { fetchActiveServices, fetchServiceConfig } from '@/lib/services/serviceConfigAPI';

// 단일 서비스 설정 조회 훅
export const useServiceConfig = (slug: string) => {
  const [config, setConfig] = useState<ServiceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchServiceConfig(slug);
      setConfig(data);
    } catch (err) {
      console.error('서비스 설정 조회 오류:', err);
      setError(err instanceof Error ? err.message : '서비스 설정을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, error, refetch: fetchConfig };
};

// 전체 활성 서비스 목록 조회 훅
export const useActiveServices = () => {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchActiveServices();
      setServices(data);
    } catch (err) {
      console.error('활성 서비스 목록 조회 오류:', err);
      setError(err instanceof Error ? err.message : '서비스 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, refetch: fetchServices };
};
