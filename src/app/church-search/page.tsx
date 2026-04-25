'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChurchAutoSearchResult } from '@/types/Church';

function ChurchSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchName = searchParams.get('name') || '';
  
  const [searchResults, setSearchResults] = useState<ChurchAutoSearchResult[]>([]);
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
        const response = await fetch(`${backendURL}/search/church/auto?keyword=${encodeURIComponent(searchName)}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setSearchResults(data);
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

  // 교회 클릭 핸들러
  const handleChurchClick = (church: ChurchAutoSearchResult) => {
    router.push(`/church-mentor/${encodeURIComponent(church.churchName)}`);
  };

  // 새 검색 핸들러
  const handleNewSearch = () => {
    router.push('/church-mentor');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
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
                href="/church-mentor"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">교회 오빠</span>
              </Link>
              <div className="text-gray-300">|</div>
              <h1 className="text-xl font-bold text-gray-900">
                "{searchName}" 검색 결과
              </h1>
            </div>
            <button
              onClick={handleNewSearch}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>새 검색</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          <div className="text-center py-12">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">검색 중 오류가 발생했습니다</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">검색 결과가 없습니다</h2>
            <p className="text-gray-600 mb-6">"{searchName}"에 대한 검색 결과를 찾을 수 없습니다.</p>
            <div className="space-x-4">
              <button
                onClick={handleNewSearch}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                새 검색하기
              </button>
              <Link
                href="/church-mentor"
                className="inline-block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                교회 오빠로 돌아가기
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                "{searchName}" 검색 결과 ({searchResults.length}개)
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((church, index) => (
                <div
                  key={index}
                  onClick={() => handleChurchClick(church)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-red-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">{church.churchName}</h3>
                      <p className="text-sm text-gray-500 mt-1">📍 {church.churchAddr}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>담임목사:</span>
                          <span className="font-medium">{church.churchPastor}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ChurchSearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">로딩 중...</div></div>}>
      <ChurchSearchContent />
    </Suspense>
  );
}
