'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SearchResult {
  univIdx: number;
  univName: string;
  univLocate: string;
  univType: string;
  univEstablish: string;
  univPresident: string;
  univCampos: string;
  univLateX: number;
  univLateY: number;
  univURL: string;
  univLotAddr: string;
  univAddr: string;
  univMapIMG: string;
  univStatus: number;
  univViewCount: number;
}

export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchTerm = searchParams.get('name');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchTerm) {
      performSearch(searchTerm);
    }
  }, [searchTerm]);

  const performSearch = async (term: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 백엔드 API URL
      const backendURL = 'https://api.reviewhub.life';

      const response = await fetch(`${backendURL}/search/school/?univName=${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // console.log('API 응답 데이터:', data);
      
             // 정확한 학교를 찾았으면 바로 해당 학교 상세 페이지로 이동
       if (data && typeof data === 'object' && data.univName) {
         router.push(`/univ-mentor/${encodeURIComponent(data.univName)}`);
         return;
       }

       // 배열인 경우 (여러 결과가 있을 수 있음)
       if (Array.isArray(data) && data.length > 0) {
         // 첫 번째 결과로 이동
         router.push(`/univ-mentor/${encodeURIComponent(data[0].univName)}`);
         return;
       }
      
      // 결과가 없으면 에러 처리
      setError('해당하는 학교를 찾을 수 없습니다.');
    } catch (error) {
      console.error('검색 오류:', error);
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">검색 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">오류 발생</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link href="/" className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
                         <Link href="/univ-mentor" className="text-2xl font-bold text-green-600">
               대학 오빠
             </Link>
            <div className="text-gray-600">
              "{searchTerm}" 검색 결과
            </div>
          </div>
        </div>
      </div>

      {/* 검색 중 리다이렉트 메시지 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">학교 정보를 찾는 중...</h2>
          <p className="text-gray-600 mb-8">
            "{searchTerm}"에 대한 정보를 가져오고 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
