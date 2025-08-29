'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface University {
  univName: string;
  univLocate: string;
}

interface PopularUniversity {
  univIdx: number;
  univName: string;
  univLocate: string;
  univType: string;
  univCampos: string;
  univViewCount: number;
}

export default function SchoolPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<University[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularUniversities, setPopularUniversities] = useState<PopularUniversity[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // 자동완성 검색어 가져오기
  const fetchSuggestions = async (keyword: string) => {
    if (!keyword.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // 백엔드 API 서버
      const backendURL = 'https://api.reviewhub.life';
      
      const response = await fetch(`${backendURL}/search/auto?keyword=${encodeURIComponent(keyword)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSuggestions(data);
      } else {
        console.warn('예상하지 못한 응답 형식:', data);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('자동완성 검색 오류:', error);
      setError('자동완성을 불러오는 중 오류가 발생했습니다.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색어 변경 시 자동완성 (디바운싱)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        fetchSuggestions(searchTerm);
      } else {
        setSuggestions([]);
        setError(null);
      }
    }, 300);

    return () => clearTimeout(timer);
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
    if (searchTerm.trim()) {
      addToRecentSearches(searchTerm.trim());
      router.push(`/search?name=${encodeURIComponent(searchTerm)}`);
    }
  };

  // 자동완성 선택
  const handleSuggestionClick = (suggestion: University) => {
    setSearchTerm(suggestion.univName);
    setShowSuggestions(false);
    setError(null);
    addToRecentSearches(suggestion.univName);
    // 검색 결과 페이지로 이동 (검색어를 URL 파라미터로 전달)
    router.push(`/search?name=${encodeURIComponent(suggestion.univName)}`);
  };

  // 검색어 입력 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setError(null);
    }
  };

  // 검색창 포커스
  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowSuggestions(true);
    }
  };

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setError(null);
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

  return (
    <div className="relative">
      {/* 뒤로가기 버튼 - 좌측 상단 */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          href="/" 
          className="flex items-center space-x-2 px-4 py-3 bg-white/90 backdrop-blur-sm hover:bg-white/95 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group border border-white/20"
        >
          <svg 
            className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 19l-7-7m0 0l7-7m-7 7h18" 
            />
          </svg>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
            Ori
          </span>
        </Link>
      </div>

      {/* 배경 이미지 */}
      <div className="relative w-full h-[330px]">
        <Image
          src="/images/titleIMG.jpg"
          alt="Title Image"
          fill
          className="object-cover"
          priority
        />
        
        {/* 검색 폼 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="font-black-han-sans text-4xl md:text-5xl mb-8 text-shadow-lg">
              세상 모든 대학교 정보, 대학 오빠가 알려줄게
            </h1>
            
            {/* 검색 폼 */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative" ref={searchRef}>
                <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                  {/* 검색 아이콘 */}
                  <div className="pl-6 pr-4 text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* 검색 입력창 */}
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder="찾고 싶은 대학교를 입력해보세요..."
                    required
                    className="flex-1 px-4 py-5 text-lg font-medium text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400"
                    autoComplete="off"
                  />
                  
                  {/* 검색 버튼 */}
                  <button
                    type="submit"
                    className="px-8 py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>검색</span>
                  </button>
                </div>

                {/* 자동완성 드롭다운 */}
                {showSuggestions && (suggestions.length > 0 || isLoading || error || searchTerm.trim()) && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl z-10 max-h-80 overflow-hidden">
                    {/* 로딩 표시 */}
                    {isLoading && (
                      <div className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
                        <div className="text-gray-600 font-medium">검색 중...</div>
                        <div className="text-gray-400 text-sm mt-1">잠시만 기다려주세요</div>
                      </div>
                    )}
                    
                    {/* 에러 표시 */}
                    {error && !isLoading && (
                      <div className="px-6 py-6 text-center">
                        <div className="text-red-500 text-lg mb-2">⚠️</div>
                        <div className="text-red-600 font-medium">{error}</div>
                      </div>
                    )}
                    
                    {/* 자동완성 결과 */}
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-6 py-4 cursor-pointer border-b border-gray-100/50 last:border-b-0 transition-all duration-200 group hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{suggestion.univName}</div>
                            <div className="text-sm text-gray-500">📍 {suggestion.univLocate}</div>
                          </div>
                          <div className="text-green-400 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* 결과가 없을 때 */}
                    {!isLoading && !error && suggestions.length === 0 && searchTerm.trim() && (
                      <div className="px-6 py-8 text-center">
                        <div className="text-gray-400 text-4xl mb-3">🔍</div>
                        <div className="text-gray-600 font-medium">검색 결과가 없습니다</div>
                        <div className="text-gray-400 text-sm mt-1">다른 검색어를 시도해보세요</div>
                      </div>
                    )}
                  </div>
                                 )}
               </div>
             </form>
             
             {/* 최근 검색어 태그들 - 검색창 바로 아래 */}
             {recentSearches.length > 0 && (
               <div className="mt-6">
                 <div className="flex items-center gap-3 flex-wrap justify-center">
                   {/* Clear All 버튼 */}
                   <button
                     onClick={() => {
                       setRecentSearches([]);
                       localStorage.removeItem('recentSearches');
                     }}
                     className="bg-gray-100 hover:bg-gray-200 text-red-500 hover:text-red-700 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                   >
                     Clear All
                   </button>
                   
                   {/* 최근 검색어 태그들 */}
                   {recentSearches.map((search, index) => (
                     <div
                       key={index}
                       className="group flex items-center space-x-2 bg-cyan-50 border border-cyan-200 rounded-full px-3 py-2 hover:bg-cyan-100 transition-all duration-200 cursor-pointer"
                       onClick={() => handleRecentSearchClick(search)}
                     >
                       <span className="text-green-700 font-medium text-sm">{search}</span>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           removeFromRecentSearches(index);
                         }}
                         className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                       >
                         <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                         </svg>
                       </button>
                     </div>
                   ))}
                   
                   {/* Reload 버튼 */}
                   <button
                     onClick={handleRefresh}
                     disabled={isRefreshing}
                     className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
                   >
                     <span>Reload</span>
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                   </button>
                 </div>
               </div>
             )}
           </div>
         </div>
       </div>

                                                                                                                               {/* 검색창 밑 컨텐츠 */}
           <div className="bg-white py-6">
             <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* 인기 대학교 섹션 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
               <div className="p-3 border-b border-gray-200">
                 <div className="flex items-center justify-between">
                   <h2 className="text-base font-bold text-gray-900">인기 대학교 TOP 10</h2>
                   <button
                     onClick={handleRefresh}
                     disabled={isRefreshing}
                     className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                       isRefreshing
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                         : 'bg-green-100 text-green-600 hover:bg-green-200'
                     }`}
                   >
                     <svg
                       className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`}
                       fill="none"
                       stroke="currentColor"
                       viewBox="0 0 24 24"
                     >
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                     </svg>
                     <span className="text-sm">{isRefreshing ? '갱신 중...' : '새로고침'}</span>
                   </button>
                 </div>
               </div>
               <div className="p-3">
                 <div className="grid grid-cols-1 gap-1.5">
                   {popularUniversities.map((university, index) => (
                     <div
                       key={university.univIdx}
                       onClick={() => handlePopularUniversityClick(university)}
                       className={`group p-1.5 rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                         isRefreshing ? 'animate-pulse' : ''
                       }`}
                     >
                       <div className="flex items-center space-x-1.5">
                         <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                           index < 3 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-gray-400 to-gray-600'
                         }`}>
                           {index + 1}
                         </div>
                         <div className="flex-1 min-w-0">
                           <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors duration-200 text-xs truncate">
                             {university.univName}
                           </h3>
                           <p className="text-xs text-gray-500 truncate">📍 {university.univLocate}</p>
                           <p className="text-xs text-gray-400 truncate">{university.univType} • {university.univCampos}</p>
                         </div>
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                           <svg className="w-2.5 h-2.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
}
