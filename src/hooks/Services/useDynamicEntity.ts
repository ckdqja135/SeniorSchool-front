import { useState, useEffect, useCallback } from 'react';
import { DynamicEntity, ListParams, AutoSearchResult } from '@/types/Services';
import {
  fetchEntities,
  fetchEntityDetail,
  fetchTopViewedEntities,
  autoSearchEntities,
  adminSearchEntities,
} from '@/lib/services/dynamicEntityAPI';

// 엔티티 목록 조회 훅 (퍼블릭)
export const useDynamicEntities = (slug: string, params?: ListParams) => {
  const [entities, setEntities] = useState<DynamicEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchEntities(slug, params);
      setEntities(response.data);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('엔티티 목록 조회 오류:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, params?.page, params?.limit, params?.keyword, params?.orderBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { entities, loading, error, totalCount, refetch: fetchData };
};

// 엔티티 상세 조회 훅 (퍼블릭)
export const useDynamicEntityDetail = (slug: string, id: number) => {
  const [entity, setEntity] = useState<DynamicEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!slug || !id) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchEntityDetail(slug, id);
      setEntity(data);
    } catch (err) {
      console.error('엔티티 상세 조회 오류:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { entity, loading, error, refetch: fetchData };
};

// 인기 엔티티 TOP10 훅
export const useTopViewedEntities = (slug: string, limit: number = 10) => {
  const [entities, setEntities] = useState<DynamicEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTopViewedEntities(slug, limit);
      setEntities(data);
    } catch (err) {
      console.error('인기 엔티티 조회 오류:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { entities, loading, error, refetch: fetchData };
};

// 자동완성 검색 훅
export const useAutoSearch = (slug: string) => {
  const [results, setResults] = useState<AutoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (keyword: string) => {
    if (!slug || !keyword.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await autoSearchEntities(slug, keyword);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  return { results, loading, search, clearResults: () => setResults([]) };
};

// 어드민: 엔티티 검색 훅
export const useAdminEntitySearch = (slug: string, params?: ListParams) => {
  const [entities, setEntities] = useState<DynamicEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const response = await adminSearchEntities(slug, params);
      setEntities(response.data);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('어드민 엔티티 검색 오류:', err);
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, params?.page, params?.limit, params?.keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { entities, loading, error, totalCount, refetch: fetchData };
};
