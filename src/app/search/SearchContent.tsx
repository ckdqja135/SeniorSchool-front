'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
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

interface PopularUniversity {
  univIdx: number;
  univName: string;
  univLocate: string;
  univType: string;
  univCampos: string;
  univViewCount: number;
}

export default function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchTerm = searchParams.get('name');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularUniversities, setPopularUniversities] = useState<PopularUniversity[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const searchRef = useRef<HTMLFormElement>(null);

  // 최근 검색 기록 로드
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // 인기 대학교 데이터 로드
  useEffect(() => {
    fetchPopularUniversities();
  }, []);

  // 검색어가 있으면 검색 수행
  useEffect(() => {
    if (searchTerm) {
      performSearch(searchTerm);
    }
  }, [searchTerm]);

  // 최근 검색 기록에 추가
  const addToRecentSearches = (term: string) => {
    const updated = [term, ...recentSearches.filter(item => item !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // 최근 검색 기록에서 제거
  const removeFromRecentSearches = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // 인기 대학교 데이터 가져오기
  const fetchPopularUniversities = async () => {
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/search/top-viewed`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 200 && data.data) {
        setPopularUniversities(data.data);
      }
    } catch (error) {
      console.error('인기 대학교 로딩 오류:', error);
    }
  };

  // 인기 대학교 새로고침
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPopularUniversities();
    
    // 애니메이션을 위한 지연
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // 검색 제출
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      addToRecentSearches(searchInput.trim());
      router.push(`/search?name=${encodeURIComponent(searchInput.trim())}`);
    }
  };

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

  // 최근 검색어 클릭
  const handleRecentSearchClick = (term: string) => {
    router.push(`/search?name=${encodeURIComponent(term)}`);
  };

  // 인기 대학교 클릭
  const handlePopularUniversityClick = (university: PopularUniversity) => {
    router.push(`/univ-mentor/${encodeURIComponent(university.univName)}`);
  };

  // 검색어가 있을 때 (검색 결과 표시)
  if (searchTerm) {
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
            <Link href="/search" className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors">
              검색 페이지로 돌아가기
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
              <Link href="/search" className="text-2xl font-bold text-green-600">
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">학교 정보를 찾는 중...</h2>
              <p className="text-gray-600 mb-8">
                "{searchTerm}"에 대한 정보를 가져오고 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 검색어가 없을 때 (메인 검색 페이지)
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
              대학교 검색
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 검색 입력창 */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative" ref={searchRef}>
              <div className="flex items-center bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                {/* 검색 아이콘 */}
                <div className="pl-6 pr-4 text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* 검색 입력창 */}
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="찾고 싶은 대학교를 입력해보세요..."
                  required
                  className="flex-1 px-4 py-4 text-lg font-medium text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400"
                  autoComplete="off"
                />
                
                {/* 검색 버튼 */}
                <button
                  type="submit"
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>검색</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽 컬럼 - 최근 검색 기록 */}
          <div className="space-y-6">
            {/* 최근 검색 기록 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">최근 검색</h2>
              </div>
              <div className="p-4">
                {recentSearches.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-3">🔍</div>
                    <p className="text-gray-500">아직 검색 기록이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <div
                        key={index}
                        className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                      >
                        <div
                          onClick={() => handleRecentSearchClick(search)}
                          className="flex-1 flex items-center space-x-3"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          <span className="text-gray-700 font-medium">{search}</span>
                        </div>
                        <button
                          onClick={() => removeFromRecentSearches(index)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-red-100 rounded-full"
                        >
                          <svg className="w-4 h-4 text-red-400 hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽 컬럼 - 인기 대학교 */}
          <div className="lg:col-span-2">
            {/* 인기 대학교 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">인기 대학교 TOP 10</h2>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      isRefreshing
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{isRefreshing ? '갱신 중...' : '새로고침'}</span>
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {popularUniversities.map((university, index) => (
                    <div
                      key={university.univIdx}
                      onClick={() => handlePopularUniversityClick(university)}
                      className={`group p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                        isRefreshing ? 'animate-pulse' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-gray-400 to-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200">
                            {university.univName}
                          </h3>
                          <p className="text-sm text-gray-500">📍 {university.univLocate}</p>
                          <p className="text-xs text-gray-400">{university.univType} • {university.univCampos}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
