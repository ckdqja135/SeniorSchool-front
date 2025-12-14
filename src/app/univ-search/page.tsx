'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface University {
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

function UnivSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchName = searchParams.get('name') || '';

  const [searchResults, setSearchResults] = useState<University[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 중복 호출 방지를 위한 ref
  const lastFetchedSearchName = useRef<string | null>(null);

  // 검색 결과 가져오기
  useEffect(() => {
    const fetchSearchResults = async () => {
      if (!searchName) {
        setIsLoading(false);
        return;
      }

      // 중복 호출 방지: 같은 검색어로 다시 호출하지 않음
      if (lastFetchedSearchName.current === searchName) {
        return;
      }
      lastFetchedSearchName.current = searchName;

      try {
        setIsLoading(true);
        setError(null);

        const backendURL = 'https://api.reviewhub.life';
        // 자동완성 API 사용 (검색어로 필터링된 결과)
        const response = await fetch(`${backendURL}/search/auto?keyword=${encodeURIComponent(searchName)}`);

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

  // 대학교 클릭 핸들러
  const handleUniversityClick = (university: University) => {
    router.push(`/univ-mentor/${encodeURIComponent(university.univName)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">검색 결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/univ-mentor" className="text-2xl font-bold text-green-400">
              대학 오빠
            </Link>
            <div className="text-gray-300">
              검색 결과
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 결과 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            '{searchName}' 검색 결과
          </h1>
          <p className="text-gray-600">
            {searchResults.length}개의 대학교를 찾았습니다.
          </p>
        </div>

        {/* 검색 결과 목록 */}
        {error ? (
          <div className="text-center py-8">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">오류 발생</h2>
            <p className="text-gray-600 mb-8">{error}</p>
            <Link href="/univ-mentor" className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors">
              대학 오빠로 돌아가기
            </Link>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">검색 결과가 없습니다</h2>
            <p className="text-gray-600 mb-8">다른 검색어로 시도해보세요.</p>
            <Link href="/univ-mentor" className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors">
              대학 오빠로 돌아가기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((university, index) => (
              <div
                key={university.univIdx || `university-${index}`}
                onClick={() => handleUniversityClick(university)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-green-300 group"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{university.univName}</h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">📍 {university.univLocate}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>대학 종류:</span>
                        <span className="font-medium truncate ml-2">{university.univType}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>총장:</span>
                        <span className="font-medium truncate ml-2">{university.univPresident}</span>
                      </div>
                      {university.univEstablish && (
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>설립년도:</span>
                          <span className="font-medium">{university.univEstablish}년</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-green-400 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnivSearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">로딩 중...</div></div>}>
      <UnivSearchContent />
    </Suspense>
  );
}
