import { useState, useEffect, useCallback } from 'react';
import { DynamicBoard, DynamicRequest, ListParams } from '@/types/Services';
import {
  fetchBoards,
  fetchRecentBoards,
  fetchTopViewedBoards,
  adminFetchBoards,
  adminFetchRequests,
} from '@/lib/services/dynamicBoardAPI';

// 게시판 목록 조회 훅 (퍼블릭)
export const useDynamicBoards = (slug: string, params?: ListParams) => {
  const [boards, setBoards] = useState<DynamicBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchBoards(slug, params);
      setBoards(response.data);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('게시판 목록 조회 오류:', err);
      setError(err instanceof Error ? err.message : '게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, params?.page, params?.limit, params?.keyword, params?.orderBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { boards, loading, error, totalCount, refetch: fetchData };
};

// 최근 게시글 조회 훅
export const useRecentDynamicBoards = (slug: string, limit: number = 5) => {
  const [boards, setBoards] = useState<DynamicBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchRecentBoards(slug, limit);
      setBoards(data);
    } catch (err) {
      console.error('최근 게시글 조회 오류:', err);
      setError(err instanceof Error ? err.message : '최근 게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { boards, loading, error, refetch: fetchData };
};

// 인기 게시글 TOP10 조회 훅
export const useTopViewedDynamicBoards = (slug: string, limit: number = 10) => {
  const [boards, setBoards] = useState<DynamicBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTopViewedBoards(slug, limit);
      setBoards(data);
    } catch (err) {
      console.error('인기 게시글 조회 오류:', err);
      setError(err instanceof Error ? err.message : '인기 게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { boards, loading, error, refetch: fetchData };
};

// 어드민: 게시판 관리 목록 훅
export const useAdminDynamicBoards = (slug: string, params?: ListParams) => {
  const [boards, setBoards] = useState<DynamicBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const response = await adminFetchBoards(slug, params);
      setBoards(response.data);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('어드민 게시판 목록 조회 오류:', err);
      setError(err instanceof Error ? err.message : '게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, params?.page, params?.limit, params?.keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { boards, loading, error, totalCount, refetch: fetchData };
};

// 어드민: 추가 요청 관리 목록 훅
export const useAdminDynamicRequests = (slug: string, params?: ListParams) => {
  const [requests, setRequests] = useState<DynamicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);

    try {
      const response = await adminFetchRequests(slug, params);
      setRequests(response.data);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('추가 요청 목록 조회 오류:', err);
      setError(err instanceof Error ? err.message : '요청 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, params?.page, params?.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { requests, loading, error, totalCount, refetch: fetchData };
};
