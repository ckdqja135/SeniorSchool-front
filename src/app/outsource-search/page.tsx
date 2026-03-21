'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function OutsourceSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchName = searchParams.get('name') || '';
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 검색 결과 가져오기
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchName) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        // 자동완성 API 사용 (검색어로 필터링된 결과)
        const response = await fetch(`${backendURL}/search/outsource/auto?keyword=${encodeURIComponent(searchName)}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setSearchResults(data);
        } else if (data.data && Array.isArray(data.data)) {
          setSearchResults(data.data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('검색 결과 로딩 오류:', error);
        setError('검색 결과를 불러오는 중 오류가 발생했습니다.');
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchName]);

  // 외주업체 클릭 핸들러
  const handleOutsourceClick = (outsource: any) => {
    if (outsource.outsourceIdx) {
      router.push(`/outsource-mentor/${outsource.outsourceIdx}`);
    } else {
      router.push(`/outsource-mentor/${encodeURIComponent(outsource.outsourceName)}`);
    }
  };

  // 새 검색 핸들러
  const handleNewSearch = () => {
    router.push('/outsource-mentor');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">검색 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/outsource-mentor"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">외주 오빠</span>
              </Link>
              <div className="text-gray-300">|</div>
              <h1 className="text-xl font-bold text-gray-900">
                "{searchName}" 검색 결과
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {searchResults.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-gray-500 mb-6">"{searchName}"에 대한 검색 결과를 찾을 수 없습니다.</p>
            <button
              onClick={handleNewSearch}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              새로 검색하기
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                검색 결과 ({searchResults.length}개)
              </h2>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {searchResults.map((outsource, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleOutsourceClick(outsource)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{outsource.outsourceName}</h3>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      {outsource.outsourceType}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">📍 {outsource.outsourceAddr}</p>
                  {outsource.outsourceCEO && (
                    <p className="text-sm text-gray-500">대표: {outsource.outsourceCEO}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OutsourceSearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <OutsourceSearchContent />
    </Suspense>
  );
}
