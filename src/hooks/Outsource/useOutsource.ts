import { useState, useEffect } from 'react';
import { 
  getOutsourceList, 
  getRecentOutsourceBoards, 
  getTopViewedOutsourceBoards 
} from '@/lib/outsource/outsourceAPI';
import { 
  Outsource, 
  OutsourceBoard, 
  OutsourceSearchParams, 
  OutsourceBoardSearchParams 
} from '@/types/Outsource';

// 외주업체 목록 조회 훅
export const useOutsourceList = (params?: OutsourceSearchParams) => {
  const [outsources, setOutsources] = useState<Outsource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchOutsources = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getOutsourceList(params);
      console.log('외주업체 목록 API 응답:', response);
      setOutsources(response.data);
      setTotal(response.total || 0);
    } catch (err) {
      console.error('외주업체 목록 조회 오류:', err);
      setError(err instanceof Error ? err.message : '외주업체 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutsources();
  }, [params?.name, params?.type, params?.location, params?.page]);

  return { outsources, loading, error, total, refetch: fetchOutsources };
};

// 최근 외주업체 후기 조회 훅
export const useRecentOutsourceBoards = () => {
  const [boards, setBoards] = useState<OutsourceBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentBoards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getRecentOutsourceBoards();
      setBoards(response.data);
    } catch (err) {
      console.error('최근 외주 후기 로딩 오류:', err);
      setError(null);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentBoards();
  }, []);

  return { boards, loading, error, refetch: fetchRecentBoards };
};

// 인기 외주업체 후기 TOP10 조회 훅
export const useTopViewedOutsourceBoards = () => {
  const [boards, setBoards] = useState<OutsourceBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTopBoards = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getTopViewedOutsourceBoards();
      console.log('인기 후기 API 응답:', response);
      setBoards(response.data);
    } catch (err) {
      console.error('인기 후기 조회 오류:', err);
      setError(err instanceof Error ? err.message : '인기 후기를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopBoards();
  }, []);

  return { boards, loading, error, refetch: fetchTopBoards };
};
