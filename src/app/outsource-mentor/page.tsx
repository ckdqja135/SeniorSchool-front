'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Outsource, OutsourceBoard } from '@/types/Outsource';
import { useOutsourceList, useTopViewedOutsourceBoards } from '@/hooks/Outsource/useOutsource';

export default function OutsourceMentorPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Outsource[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBoardRefreshing, setIsBoardRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    outsourceName: '',
    outsourceAddr: '',
    outsourceType: '웹개발',
    outsourceLocation: '서울',
    requesterId: ''
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // 중복 호출 방지를 위한 ref
  const hasFetchedPopularOutsources = useRef(false);
  const hasFetchedPopularBoards = useRef(false);

  // 최근 검색 기록 로드
  useEffect(() => {
    const saved = localStorage.getItem('recentOutsourceSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // 인기 외주업체 데이터 로드
  const { outsources: popularOutsources, loading: outsourcesLoading, refetch: refetchOutsources } = useOutsourceList({
    limit: 10
  });

  // 인기 후기 데이터 로드
  const { boards: popularBoards, loading: boardsLoading, refetch: refetchBoards } = useTopViewedOutsourceBoards();

  // 자동완성 API 호출
  const fetchSuggestions = async (term: string) => {
    if (!term.trim()) {
      setSuggestions([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`https://api.reviewhub.life/search/outsource/auto?keyword=${encodeURIComponent(term)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // API 응답이 배열인 경우 직접 사용
      if (Array.isArray(data)) {
        setSuggestions(data);
      } else if (data.success && data.data) {
        setSuggestions(data.data);
      } else {
        setSuggestions([]);
      }
      
      console.log('자동완성 API 응답:', data); // 디버깅용
    } catch (err) {
      console.error('자동완성 검색 오류:', err);
      setError('자동완성 검색에 실패했습니다.');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 검색어 변경 시 자동완성 호출
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        fetchSuggestions(searchTerm);
        setShowSuggestions(true); // 검색어가 있으면 자동완성 창 표시
      } else {
        setSuggestions([]);
        setError(null);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 최근 검색 기록에 추가
  const addToRecentSearches = (term: string) => {
    const updated = [term, ...recentSearches.filter(item => item !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentOutsourceSearches', JSON.stringify(updated));
  };

  // 최근 검색 기록에서 제거
  const removeFromRecentSearches = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem('recentOutsourceSearches', JSON.stringify(updated));
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    await refetchOutsources();
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // 후기 새로고침 핸들러
  const handleBoardRefresh = async () => {
    if (isBoardRefreshing) return;
    
    setIsBoardRefreshing(true);
    await refetchBoards();
    
    setTimeout(() => {
      setIsBoardRefreshing(false);
    }, 1000);
  };

  // 검색 제출
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    // 최근 검색어에 추가
    addToRecentSearches(searchTerm.trim());

    // 검색 결과를 확인하여 단일값이면 상세정보로, 다중값이면 검색결과로 이동
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/search/outsource/auto?keyword=${encodeURIComponent(searchTerm.trim())}`);
      
      if (response.ok) {
        const data = await response.json();
        let searchResults = [];
        
        if (Array.isArray(data)) {
          searchResults = data;
        } else if (data.data && Array.isArray(data.data)) {
          searchResults = data.data;
        }

        // 단일 결과면 상세정보로, 다중 결과면 검색결과로
        if (searchResults.length === 1) {
          // 단일 결과일 때는 상세정보 페이지로 이동 (outsourceIdx 사용)
          if (searchResults[0].outsourceIdx) {
            router.push(`/outsource-mentor/${searchResults[0].outsourceIdx}`);
          } else {
            // outsourceIdx가 없으면 외주업체명으로 이동
            router.push(`/outsource-mentor/${encodeURIComponent(searchResults[0].outsourceName)}`);
          }
        } else {
          // 다중 결과일 때는 검색결과 페이지로 이동
          router.push(`/outsource-search?name=${encodeURIComponent(searchTerm.trim())}`);
        }
      } else {
        // API 호출 실패시 검색결과 페이지로
        router.push(`/outsource-search?name=${encodeURIComponent(searchTerm.trim())}`);
      }
    } catch (error) {
      console.error('검색 결과 확인 오류:', error);
      // 에러 발생시 검색결과 페이지로
      router.push(`/outsource-search?name=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // 자동완성 선택
  const handleSuggestionClick = (suggestion: any) => {
    setSearchTerm(suggestion.outsourceName);
    setShowSuggestions(false);
    setError(null);
    addToRecentSearches(suggestion.outsourceName);
    
    // 자동완성 선택 시에는 상세정보로 직접 이동 (outsourceIdx 우선 사용)
    if (suggestion.outsourceIdx) {
      router.push(`/outsource-mentor/${suggestion.outsourceIdx}`);
    } else {
      router.push(`/outsource-mentor/${encodeURIComponent(suggestion.outsourceName)}`);
    }
  };

  // 검색 입력창 포커스
  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowSuggestions(true);
    }
  };

  // 검색 입력창 변경
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

  // 외부 클릭 시 자동완성 숨기기
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
  const handleRecentSearchClick = async (term: string) => {
    try {
      // 검색 결과를 확인하여 단일값이면 상세정보로, 다중값이면 검색결과로 이동
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/search/outsource/auto?keyword=${encodeURIComponent(term)}`);
      
      if (response.ok) {
        const data = await response.json();
        let searchResults = [];
        
        if (Array.isArray(data)) {
          searchResults = data;
        } else if (data.data && Array.isArray(data.data)) {
          searchResults = data.data;
        }

        // 단일 결과면 상세정보로, 다중 결과면 검색결과로
        if (searchResults.length === 1) {
          // 단일 결과일 때는 상세정보 페이지로 이동 (outsourceIdx 사용)
          if (searchResults[0].outsourceIdx) {
            router.push(`/outsource-mentor/${searchResults[0].outsourceIdx}`);
          } else {
            // outsourceIdx가 없으면 외주업체명으로 이동
            router.push(`/outsource-mentor/${encodeURIComponent(searchResults[0].outsourceName)}`);
          }
        } else {
          // 다중 결과일 때는 검색결과 페이지로 이동
          router.push(`/outsource-search?name=${encodeURIComponent(term)}`);
        }
      } else {
        // API 호출 실패시 검색결과 페이지로
        router.push(`/outsource-search?name=${encodeURIComponent(term)}`);
      }
    } catch (error) {
      console.error('최근 검색어 클릭 오류:', error);
      // 에러 발생시 검색결과 페이지로
      router.push(`/outsource-search?name=${encodeURIComponent(term)}`);
    }
  };

  // 인기 외주업체 클릭
  const handlePopularOutsourceClick = (outsource: Outsource) => {
    router.push(`/outsource/${outsource.outsourceIdx}`);
  };

  // 인기 후기 클릭
  const handlePopularBoardClick = (board: OutsourceBoard) => {
    router.push(`/outsource-board/${board.boardIdx}`);
  };

  // 외주업체 추가 요청 제출
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.outsourceName.trim() || !requestForm.outsourceAddr.trim()) {
      alert('외주업체명과 주소를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('https://api.reviewhub.life/outsource/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestForm),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert('외주업체 추가 요청이 성공적으로 제출되었습니다.');
        setShowRequestModal(false);
        setRequestForm({
          outsourceName: '',
          outsourceAddr: '',
          outsourceType: '웹개발',
          outsourceLocation: '서울',
          requesterId: ''
        });
      } else {
        throw new Error(data.message || '요청 제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('외주업체 추가 요청 오류:', error);
      alert('외주업체 추가 요청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 시간 포맷팅 함수
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const createdDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `약 ${diffInHours}시간 전`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}주 전`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}개월 전`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 뒤로가기 버튼 */}
      <div className="absolute top-4 left-4 z-10">
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
        <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white w-full">
            <h1 className="font-black-han-sans text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-6 sm:mb-8 text-shadow-lg leading-tight">
              <span className="block">세상 모든 외주업체 정보,</span>
              <span className="block">외주 오빠가 알려줄게</span>
            </h1>
            
            {/* 검색 폼 */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto">
              <div className="relative" ref={searchRef}>
                <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden mx-2 sm:mx-0">
                  {/* 검색 아이콘 */}
                  <div className="pl-3 sm:pl-6 pr-2 sm:pr-4 text-gray-400">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* 검색 입력창 */}
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder="찾고 싶은 외주업체를 입력해보세요..."
                    required
                    className="flex-1 px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-medium text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                    autoComplete="off"
                  />
                  
                  {/* 검색 버튼 */}
                  <button
                    type="submit"
                    className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold text-sm sm:text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap min-w-[70px] sm:min-w-[80px]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="whitespace-nowrap">검색</span>
                  </button>
                </div>

                {/* 자동완성 드롭다운 */}
                {showSuggestions && searchTerm.trim() && (
                  <div className="absolute top-full left-2 right-2 sm:left-0 sm:right-0 mt-3 bg-white/95 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl z-10 max-h-80 overflow-hidden">
                    {/* 로딩 표시 */}
                    {isLoading && (
                      <div className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-3"></div>
                        <div className="text-gray-600 font-medium">검색 중...</div>
                        <div className="text-gray-400 text-sm mt-1">잠시만 기다려주세요</div>
                      </div>
                    )}
                    
                    {/* 에러 표시 */}
                    {error && !isLoading && (
                      <div className="px-6 py-6 text-center">
                        <div className="text-yellow-500 text-lg mb-2">⚠️</div>
                        <div className="text-yellow-600 font-medium">{error}</div>
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
                          <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-yellow-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h2M7 16h6M7 8h6v4H7V8z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{suggestion.outsourceName}</div>
                            <div className="text-sm text-gray-500">📍 {suggestion.outsourceAddr}</div>
                            <div className="text-xs text-gray-400">🏢 {suggestion.outsourceType}</div>
                          </div>
                          <div className="text-yellow-400 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* 결과가 없을 때 */}
                    {!isLoading && !error && suggestions.length === 0 && (
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
                      localStorage.removeItem('recentOutsourceSearches');
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-yellow-500 hover:text-yellow-700 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
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
                      <span className="text-yellow-700 font-medium text-sm">{search}</span>
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
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 검색창 밑 컨텐츠 */}
      <div className="bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 인기 외주업체 섹션 */}
            <div className="relative">
              {/* 외주업체 추가 요청 버튼 - 섹션 왼쪽 바깥쪽 */}
              <div className="absolute -left-48 top-0">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 bg-yellow-100 text-yellow-600 hover:bg-yellow-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm">외주업체 추가 요청</span>
                </button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">인기 외주업체 TOP 10</h2>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                        isRefreshing 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                      <span className="text-sm font-medium">새로고침</span>
                    </button>
                  </div>
                </div>
                
                <div className="p-3">
                  {outsourcesLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center space-x-3 p-2 animate-pulse">
                          <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : popularOutsources && popularOutsources.length > 0 ? (
                    <div className="space-y-3">
                      {popularOutsources.slice(0, 10).map((outsource, index) => (
                        <div
                          key={outsource.outsourceIdx}
                          onClick={() => handlePopularOutsourceClick(outsource)}
                          className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        >
                          <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-yellow-600">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-sm">{outsource.outsourceName}</div>
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>📍 {outsource.outsourceLocation}</span>
                              <span>•</span>
                              <span>🏢 {outsource.outsourceType}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-gray-500">0</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 text-sm">인기 외주업체 데이터를 불러오는 중...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 인기 후기 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">인기 후기 TOP 10</h2>
                  <button
                    onClick={handleBoardRefresh}
                    disabled={isBoardRefreshing}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                      isBoardRefreshing 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <svg 
                      className={`w-4 h-4 ${isBoardRefreshing ? 'animate-spin' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm font-medium">새로고침</span>
                  </button>
                </div>
              </div>
              
              <div className="p-3">
                {boardsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center space-x-3 p-2 animate-pulse">
                        <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : popularBoards && popularBoards.length > 0 ? (
                  <div className="space-y-3">
                    {popularBoards.slice(0, 10).map((board, index) => (
                      <div
                        key={board.boardIdx}
                        onClick={() => handlePopularBoardClick(board)}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                      >
                        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-yellow-600">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm line-clamp-1">{board.boardTitle}</div>
                          {board.outsourceName && (
                            <div className="text-xs text-gray-500">🏢 {board.outsourceName}</div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs text-gray-500">{board.boardLike || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-xs text-gray-500">{board.commentCount || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">인기 후기 데이터를 불러오는 중...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 외주업체 추가 요청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">외주업체 추가 요청</h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    외주업체명 *
                  </label>
                  <input
                    type="text"
                    value={requestForm.outsourceName}
                    onChange={(e) => setRequestForm({...requestForm, outsourceName: e.target.value})}
                    placeholder="외주업체명을 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    대표자명
                  </label>
                  <input
                    type="text"
                    value={requestForm.requesterId}
                    onChange={(e) => setRequestForm({...requestForm, requesterId: e.target.value})}
                    placeholder="대표자명을 입력하세요 (선택사항)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    외주업체 주소 *
                  </label>
                  <input
                    type="text"
                    value={requestForm.outsourceAddr}
                    onChange={(e) => setRequestForm({...requestForm, outsourceAddr: e.target.value})}
                    placeholder="외주업체 주소를 입력하세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    외주업체 종류 *
                  </label>
                  <input
                    type="text"
                    value={requestForm.outsourceType}
                    onChange={(e) => setRequestForm({...requestForm, outsourceType: e.target.value})}
                    placeholder="외주업체 종류를 입력하세요 (예: 웹개발, 앱개발, 디자인 등)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? '요청 중...' : '요청하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
