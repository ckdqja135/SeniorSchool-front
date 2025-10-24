import { useState, useEffect, useCallback } from 'react';
import { 
  MatzalAl, 
  PopularMatzalAl, 
  MatzalAlBoard, 
  MatzalAlAutoSearchResult 
} from '@/types/MatzalAl';
import {
  getMatzalAlList,
  getPopularMatzalAl,
  getMatzalAlDetail,
  getMatzalAlByName,
  searchMatzalAlAuto,
  getMatzalAlBoards,
  getPopularMatzalAlBoards,
  getRecentMatzalAlBoards,
  getMatzalAlBoardDetail,
  getRestaurantCommentsTop,
  getRestaurantRecentComments
} from '@/lib/matzalAl/matzalAlAPI';

// 맛잘알 목록 훅
export const useMatzalAlList = (params?: {
  page?: number;
  limit?: number;
  location?: string;
  type?: string;
}) => {
  const [matzalAlList, setMatzalAlList] = useState<MatzalAl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatzalAlList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMatzalAlList(params);
      setMatzalAlList(data);
    } catch (err) {
      setError('맛잘알 목록을 불러오는데 실패했습니다.');
      console.error('맛잘알 목록 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchMatzalAlList();
  }, [fetchMatzalAlList]);

  const refetch = useCallback(() => {
    fetchMatzalAlList();
  }, [fetchMatzalAlList]);

  return { matzalAlList, loading, error, refetch };
};

// 인기 맛잘알 훅
export const usePopularMatzalAl = (limit: number = 10) => {
  const [popularMatzalAl, setPopularMatzalAl] = useState<PopularMatzalAl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPopularMatzalAl = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPopularMatzalAl(limit);
      setPopularMatzalAl(data);
    } catch (err) {
      setError('인기 맛잘알을 불러오는데 실패했습니다.');
      console.error('인기 맛잘알 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPopularMatzalAl();
  }, [fetchPopularMatzalAl]);

  const refetch = useCallback(() => {
    fetchPopularMatzalAl();
  }, [fetchPopularMatzalAl]);

  return { popularMatzalAl, loading, error, refetch };
};

// 맛잘알 상세 정보 훅
export const useMatzalAlDetail = (matzalAlIdx: number) => {
  const [matzalAl, setMatzalAl] = useState<MatzalAl | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatzalAlDetail = useCallback(async () => {
    if (!matzalAlIdx) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMatzalAlDetail(matzalAlIdx);
      setMatzalAl(data);
    } catch (err) {
      setError('맛잘알 상세 정보를 불러오는데 실패했습니다.');
      console.error('맛잘알 상세 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [matzalAlIdx]);

  useEffect(() => {
    fetchMatzalAlDetail();
  }, [fetchMatzalAlDetail]);

  const refetch = useCallback(() => {
    fetchMatzalAlDetail();
  }, [fetchMatzalAlDetail]);

  return { matzalAl, loading, error, refetch };
};

// 맛잘알 이름 검색 훅
export const useMatzalAlByName = (matzalAlName: string) => {
  const [matzalAl, setMatzalAl] = useState<MatzalAl | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatzalAlByName = useCallback(async () => {
    if (!matzalAlName.trim()) {
      setMatzalAl(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMatzalAlByName(matzalAlName);
      setMatzalAl(data);
    } catch (err) {
      setError('맛잘알 검색에 실패했습니다.');
      console.error('맛잘알 이름 검색 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [matzalAlName]);

  return { matzalAl, loading, error, fetchMatzalAlByName };
};

// 맛잘알 자동완성 검색 훅
export const useMatzalAlAutoSearch = (keyword: string) => {
  const [suggestions, setSuggestions] = useState<MatzalAlAutoSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchMatzalAl = useCallback(async () => {
    if (!keyword.trim()) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await searchMatzalAlAuto(keyword);
      setSuggestions(data);
    } catch (err) {
      setError('자동완성 검색에 실패했습니다.');
      console.error('맛잘알 자동완성 검색 오류:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  return { suggestions, loading, error, searchMatzalAl };
};

// 맛잘알 게시판 목록 훅
export const useMatzalAlBoards = (params?: {
  matzalAlIdx?: number;
  page?: number;
  limit?: number;
}) => {
  const [boards, setBoards] = useState<MatzalAlBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMatzalAlBoards(params);
      setBoards(data);
    } catch (err) {
      setError('맛잘알 게시판을 불러오는데 실패했습니다.');
      console.error('맛잘알 게시판 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const refetch = useCallback(() => {
    fetchBoards();
  }, [fetchBoards]);

  return { boards, loading, error, refetch };
};

// 인기 맛잘알 게시판 훅
export const usePopularMatzalAlBoards = (limit: number = 10) => {
  const [boards, setBoards] = useState<MatzalAlBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPopularBoards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPopularMatzalAlBoards(limit);
      setBoards(data);
    } catch (err) {
      setError('인기 맛잘알 게시판을 불러오는데 실패했습니다.');
      console.error('인기 맛잘알 게시판 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchPopularBoards();
  }, [fetchPopularBoards]);

  const refetch = useCallback(() => {
    fetchPopularBoards();
  }, [fetchPopularBoards]);

  return { boards, loading, error, refetch };
};

// 최근 맛잘알 게시판 훅
export const useRecentMatzalAlBoards = (limit: number = 10) => {
  const [boards, setBoards] = useState<MatzalAlBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentBoards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecentMatzalAlBoards(limit);
      setBoards(data);
    } catch (err) {
      setError('최근 맛잘알 게시판을 불러오는데 실패했습니다.');
      console.error('최근 맛잘알 게시판 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentBoards();
  }, [limit]); // fetchRecentBoards 대신 limit을 직접 의존성으로 사용

  const refetch = useCallback(() => {
    fetchRecentBoards();
  }, [fetchRecentBoards]);

  return { boards, loading, error, refetch };
};

// 맛잘알 게시판 상세 훅
export const useMatzalAlBoardDetail = (boardIdx: number) => {
  const [board, setBoard] = useState<MatzalAlBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoardDetail = useCallback(async () => {
    if (!boardIdx) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMatzalAlBoardDetail(boardIdx);
      setBoard(data);
    } catch (err) {
      setError('맛잘알 게시판 상세 정보를 불러오는데 실패했습니다.');
      console.error('맛잘알 게시판 상세 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [boardIdx]);

  useEffect(() => {
    fetchBoardDetail();
  }, [fetchBoardDetail]);

  const refetch = useCallback(() => {
    fetchBoardDetail();
  }, [fetchBoardDetail]);

  return { board, loading, error, refetch };
};

// 식당 후기 TOP10 훅
export const useRestaurantCommentsTop = (limit: number = 10) => {
  const [topComments, setTopComments] = useState<MatzalAlBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRestaurantCommentsTop(limit);
      setTopComments(data);
    } catch (err) {
      setError('식당 후기 TOP10을 불러오는데 실패했습니다.');
      console.error('식당 후기 TOP10 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchTopComments();
  }, [fetchTopComments]);

  const refetch = useCallback(() => {
    fetchTopComments();
  }, [fetchTopComments]);

  return { topComments, loading, error, refetch };
};

// 식당 최근 후기 훅
export const useRestaurantRecentComments = (limit: number = 5) => {
  const [recentComments, setRecentComments] = useState<MatzalAlBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRestaurantRecentComments(limit);
      setRecentComments(data);
    } catch (err) {
      setError('식당 최근 후기를 불러오는데 실패했습니다.');
      console.error('식당 최근 후기 조회 오류:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentComments();
  }, [fetchRecentComments]);

  const refetch = useCallback(() => {
    fetchRecentComments();
  }, [fetchRecentComments]);

  return { recentComments, loading, error, refetch };
};
