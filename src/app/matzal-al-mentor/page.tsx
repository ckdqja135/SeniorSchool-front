'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRestaurantCommentsTop } from '@/hooks/MatzalAl/useMatzalAl';
import { requestMatzalAl } from '@/lib/matzalAl/matzalAlAPI';

export default function MatzalAlMentorPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularMatzalAl, setPopularMatzalAl] = useState<any[]>([]);
  const [popularBoards, setPopularBoards] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBoardRefreshing, setIsBoardRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState({
    matzalAlName: '',
    matzalAlAddr: '',
    matzalAlType: '맛집',
    requesterId: ''
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // 중복 호출 방지를 위한 ref
  const hasFetchedPopularMatzalAl = useRef(false);
  const hasFetchedPopularBoards = useRef(false);

  // 새로운 식당 후기 API 훅
  const { topComments, loading: topCommentsLoading, error: topCommentsError, refetch: refetchTopComments } = useRestaurantCommentsTop(10);

  // 최근 검색 기록 로드
  useEffect(() => {
    const saved = localStorage.getItem('recentMatzalAlSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // 인기 맛잘알 데이터 로드
  useEffect(() => {
    fetchPopularMatzalAl();
  }, []);

  // 인기 후기 데이터 로드 (새로운 API 사용)
  useEffect(() => {
    if (topComments && topComments.length > 0) {
      setPopularBoards(topComments);
    }
  }, [topComments]);

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
      // TODO: 맛잘알 API 엔드포인트로 변경
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/search/matzal-al/?matzalAlName=${encodeURIComponent(keyword)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSuggestions(data);
      } else if (data.data && Array.isArray(data.data)) {
        setSuggestions(data.data);
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
    localStorage.setItem('recentMatzalAlSearches', JSON.stringify(updated));
  };

  // 최근 검색 기록에서 제거
  const removeFromRecentSearches = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem('recentMatzalAlSearches', JSON.stringify(updated));
  };

  // 인기 식당 데이터 가져오기
  const fetchPopularMatzalAl = async () => {
    // 중복 호출 방지
    if (hasFetchedPopularMatzalAl.current) return;
    hasFetchedPopularMatzalAl.current = true;

    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/restaurant/top-viewed`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 이미지 URL 헬퍼 함수
      const getImageUrl = (imagePath: string | undefined | null): string | null => {
        if (!imagePath) return null;
        const backendURL = 'https://api.reviewhub.life';
        // 이미 절대 URL인 경우 그대로 반환
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
          return imagePath;
        }
        // 상대 경로인 경우 서버 URL과 결합
        if (imagePath.startsWith('/')) {
          return `${backendURL}${imagePath}`;
        }
        // 그 외의 경우 서버 URL과 결합
        return `${backendURL}/${imagePath}`;
      };

      // API 응답에서 식당 정보 추출
      if (Array.isArray(data)) {
        const restaurants = data
          .map((item: any) => ({
            matzalAlIdx: item.restaurantIdx || item.matzalAlIdx,
            matzalAlName: item.restaurantName || item.matzalAlName || '맛집명 없음',
            matzalAlLocation: item.restaurantAddr || item.matzalAlLocation || '위치 정보 없음',
            matzalAlType: item.restaurantType || item.matzalAlType || '맛집',
            viewCount: item.restaurantViewCount || item.boardHits || item.viewCount || 0,
            restaurantImage: item.restaurantImage || null,
            averageRating: item.averageRating !== null && item.averageRating !== undefined 
              ? (typeof item.averageRating === 'string' ? parseFloat(item.averageRating) : Number(item.averageRating))
              : null,
            ratingCount: item.ratingCount || 0
          }))
          .filter((item: any) => item.matzalAlIdx && item.matzalAlName);
        
        setPopularMatzalAl(restaurants.slice(0, 10));
      } else if (data.data && Array.isArray(data.data)) {
        const restaurants = data.data
          .map((item: any) => ({
            matzalAlIdx: item.restaurantIdx || item.matzalAlIdx,
            matzalAlName: item.restaurantName || item.matzalAlName || '맛집명 없음',
            matzalAlLocation: item.restaurantAddr || item.matzalAlLocation || '위치 정보 없음',
            matzalAlType: item.restaurantType || item.matzalAlType || '맛집',
            viewCount: item.restaurantViewCount || item.boardHits || item.viewCount || 0,
            restaurantImage: item.restaurantImage || null,
            averageRating: item.averageRating !== null && item.averageRating !== undefined 
              ? (typeof item.averageRating === 'string' ? parseFloat(item.averageRating) : Number(item.averageRating))
              : null,
            ratingCount: item.ratingCount || 0
          }))
          .filter((item: any) => item.matzalAlIdx && item.matzalAlName);
        
        setPopularMatzalAl(restaurants.slice(0, 10));
      }
    } catch (error) {
      console.error('인기 식당 로딩 오류:', error);
    }
  };

  // 인기 후기 데이터 가져오기 (새로운 식당 후기 TOP10 API 사용)
  const fetchPopularBoards = async () => {
    try {
      // 새로운 API를 사용하여 TOP10 후기 가져오기
      if (topComments && topComments.length > 0) {
        setPopularBoards(topComments);
      } else {
        setPopularBoards([]);
      }
    } catch (error) {
      console.error('인기 후기 로딩 오류:', error);
    }
  };

  // 별점 렌더링 함수
  const renderStarRating = (score?: number | null, size: 'sm' | 'md' = 'sm') => {
    // null이거나 0이면 빈 별 5개 표시
    const safeScore = score && score > 0 ? Math.max(0, Math.min(score, 5)) : 0;
    const sizeClasses = size === 'sm'
      ? { wrapper: 'w-3 h-3 text-xs', star: 'text-xs' }
      : { wrapper: 'w-4 h-4 text-sm', star: 'text-sm' };

    return (
      <div className="flex items-center space-x-0.5">
        {Array.from({ length: 5 }).map((_, idx) => {
          const fillLevel = Math.min(Math.max(safeScore - idx, 0), 1);
          return (
            <div key={`star-${idx}`} className={`relative ${sizeClasses.wrapper}`}>
              <span className={`absolute inset-0 text-gray-300 select-none ${sizeClasses.star}`}>★</span>
              <span
                className={`absolute inset-0 text-yellow-400 overflow-hidden select-none ${sizeClasses.star}`}
                style={{ width: `${fillLevel * 100}%` }}
              >
                ★
              </span>
              <span className={`invisible ${sizeClasses.star}`}>★</span>
            </div>
          );
        })}
      </div>
    );
  };

  // 인기 맛잘알 새로고침
  const handleRefresh = async () => {
    if (isRefreshing) return; // 이미 새로고침 중이면 중복 실행 방지
    
    setIsRefreshing(true);
    await fetchPopularMatzalAl();
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // 인기 후기 새로고침
  const handleBoardRefresh = async () => {
    if (isBoardRefreshing) return; // 이미 새로고침 중이면 중복 실행 방지
    
    setIsBoardRefreshing(true);
    await refetchTopComments();
    
    setTimeout(() => {
      setIsBoardRefreshing(false);
    }, 1000);
  };

  // 검색 제출
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      addToRecentSearches(searchTerm.trim());
      await performSearchAndNavigate(searchTerm.trim());
    }
  };

  // 자동완성 선택
  const handleSuggestionClick = (suggestion: any) => {
    setSearchTerm(suggestion.matzalAlName);
    setShowSuggestions(false);
    setError(null);
    addToRecentSearches(suggestion.matzalAlName);
    // 자동완성 선택 시에는 matzalAlIdx와 함께 상세 페이지로 이동
    router.push(`/matzal-al-mentor/${encodeURIComponent(suggestion.matzalAlName)}?matzalAlIdx=${suggestion.matzalAlIdx}`);
  };

  // 검색 수행 및 결과에 따른 라우팅
  const performSearchAndNavigate = async (searchTerm: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const backendURL = 'https://api.reviewhub.life';
      
      // 자동완성 API를 사용해서 결과 개수 확인
      const autoResponse = await fetch(`${backendURL}/search/matzal-al/?matzalAlName=${encodeURIComponent(searchTerm)}`);
      
      if (!autoResponse.ok) {
        throw new Error(`HTTP error! status: ${autoResponse.status}`);
      }

      const autoData = await autoResponse.json();
      
      const results = Array.isArray(autoData) ? autoData : (autoData.data || []);

      // 자동완성 결과가 배열인지 확인
      if (Array.isArray(results)) {
        if (results.length === 1) {
          // 정확히 1개 결과가 있으면 matzalAlIdx와 함께 바로 상세 페이지로 이동
          router.push(`/matzal-al-mentor/${encodeURIComponent(results[0].matzalAlName)}?matzalAlIdx=${results[0].matzalAlIdx}`);
        } else {
          // 2개 이상의 결과가 있으면 검색 결과 페이지로 이동
          router.push(`/matzal-al-search?name=${encodeURIComponent(searchTerm)}`);
        }
      } else {
        // 결과가 없으면 검색 결과 페이지로 이동
        router.push(`/matzal-al-search?name=${encodeURIComponent(searchTerm)}`);
      }
    } catch (error) {
      console.error('검색 오류:', error);
      setError('검색 중 오류가 발생했습니다.');
      // 오류 발생 시에도 검색 결과 페이지로 이동
      router.push(`/matzal-al-search?name=${encodeURIComponent(searchTerm)}`);
    } finally {
      setIsLoading(false);
    }
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
    router.push(`/matzal-al-search?name=${encodeURIComponent(term)}`);
  };

  // 인기 맛잘알 클릭
  const handlePopularMatzalAlClick = (matzalAl: any) => {
    const url = `/matzal-al-mentor/${encodeURIComponent(matzalAl.matzalAlName)}?matzalAlIdx=${matzalAl.matzalAlIdx}`;
    console.log('🔗 맛잘알 클릭 - URL:', url);
    console.log('🔗 맛잘알 정보:', { matzalAlName: matzalAl.matzalAlName, matzalAlIdx: matzalAl.matzalAlIdx });
    router.push(url);
  };

  // 인기 후기 클릭
  const handlePopularBoardClick = (board: any) => {
    if (board.matzalAlName) {
      router.push(`/matzal-al-board/${board.boardIdx}?matzalAl=${encodeURIComponent(board.matzalAlName)}`);
    } else {
      router.push(`/matzal-al-board/${board.boardIdx}`);
    }
  };

  // 맛잘알 추가 요청 제출
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.matzalAlName.trim() || !requestForm.matzalAlAddr.trim()) {
      alert('맛집명과 주소를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const ok = await requestMatzalAl(requestForm);
      if (ok) {
        alert('맛잘알 추가 요청이 성공적으로 전송되었습니다.');
        setShowRequestModal(false);
        setRequestForm({
          matzalAlName: '',
          matzalAlAddr: '',
          matzalAlType: '맛집',
          requesterId: ''
        });
      } else {
        throw new Error('요청 실패');
      }
    } catch (error) {
      console.error('맛잘알 추가 요청 오류:', error);
      alert('맛잘알 추가 요청 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowRequestModal(false);
    setRequestForm({
      matzalAlName: '',
      matzalAlAddr: '',
      matzalAlType: '맛집',
      requesterId: ''
    });
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
        <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white w-full">
            <h1 className="font-black-han-sans text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-6 sm:mb-8 text-shadow-lg leading-tight">
              <span className="block">세상 모든 맛집 정보,</span>
              <span className="block">맛잘알 오빠가 알려줄게</span>
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
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder="찾고 싶은 맛집을 입력해보세요..."
                    required
                    className="flex-1 px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-medium text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                    autoComplete="off"
                  />
                  
                  {/* 검색 버튼 */}
                  <button
                    type="submit"
                    className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm sm:text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap min-w-[70px] sm:min-w-[80px]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="whitespace-nowrap">검색</span>
                  </button>
                </div>

                {/* 자동완성 드롭다운 */}
                {showSuggestions && (suggestions.length > 0 || isLoading || error || searchTerm.trim()) && (
                  <div className="absolute top-full left-2 right-2 sm:left-0 sm:right-0 mt-3 bg-white/95 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl z-10 max-h-80 overflow-hidden">
                    {/* 로딩 표시 */}
                    {isLoading && (
                      <div className="px-6 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                        <div className="text-gray-600 font-medium">검색 중...</div>
                        <div className="text-gray-400 text-sm mt-1">잠시만 기다려주세요</div>
                      </div>
                    )}
                    
                    {/* 에러 표시 */}
                    {error && !isLoading && (
                      <div className="px-6 py-6 text-center">
                        <div className="text-blue-500 text-lg mb-2">⚠️</div>
                        <div className="text-blue-600 font-medium">{error}</div>
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
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{suggestion.matzalAlName}</div>
                            <div className="text-sm text-gray-500">📍 {suggestion.matzalAlLocation}</div>
                            <div className="text-xs text-gray-400">🍽️ {suggestion.matzalAlType}</div>
                          </div>
                          <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-200">
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
                      localStorage.removeItem('recentMatzalAlSearches');
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-blue-500 hover:text-blue-700 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
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
                      <span className="text-blue-700 font-medium text-sm">{search}</span>
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
          {/* 3×3 맛집 카드 그리드 섹션 */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">오늘의 맛잘알 추천</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularMatzalAl.slice(0, 9).map((matzalAl, index) => (
                <div
                  key={matzalAl.matzalAlIdx}
                  onClick={() => handlePopularMatzalAlClick(matzalAl)}
                  className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden"
                >
                  {/* 이미지 영역 */}
                  <div className="relative w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    {/* 실제 이미지 또는 플레이스홀더 */}
                    {(() => {
                      const backendURL = 'https://api.reviewhub.life';
                      const getImageUrl = (imagePath: string | undefined | null): string | null => {
                        if (!imagePath) return null;
                        if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
                          return imagePath;
                        }
                        if (imagePath.startsWith('/')) {
                          return `${backendURL}${imagePath}`;
                        }
                        return `${backendURL}/${imagePath}`;
                      };
                      const imageUrl = getImageUrl((matzalAl as any).restaurantImage);
                      
                      return imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={matzalAl.matzalAlName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 이미지 로드 실패 시 플레이스홀더 표시
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const placeholder = parent.querySelector('.image-placeholder') as HTMLElement;
                              if (placeholder) {
                                placeholder.style.display = 'flex';
                              }
                            }
                          }}
                        />
                      ) : null;
                    })()}
                    {/* 플레이스홀더 이미지 */}
                    <div className={`absolute inset-0 flex items-center justify-center image-placeholder ${((matzalAl as any).restaurantImage ? 'hidden' : '')}`}>
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    {/* 평점 뱃지 - 우측 상단 */}
                    {(matzalAl as any).averageRating !== null && (matzalAl as any).averageRating !== undefined && (matzalAl as any).averageRating > 0 ? (
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
                        <span className="text-xs font-semibold text-gray-700">
                          {((matzalAl as any).averageRating as number).toFixed(1)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  
                  {/* 카드 내용 영역 */}
                  <div className="p-4">
                    {/* 가게명 */}
                    <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {matzalAl.matzalAlName}
                    </h3>
                    
                    {/* 주소 */}
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {matzalAl.matzalAlLocation}
                    </p>
                    
                    {/* 카테고리 뱃지 */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {matzalAl.matzalAlType || '맛집'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 인기 식당 TOP 10 및 인기 후기 TOP 10 섹션 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 인기 맛잘알 섹션 */}
            <div className="relative">
              {/* 맛잘알 추가 요청 버튼 - 섹션 왼쪽 바깥쪽 */}
              <div className="absolute -left-48 top-0">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 bg-blue-100 text-blue-600 hover:bg-blue-200"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm">맛잘알 추가 요청</span>
                </button>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">인기 식당 TOP 10</h2>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                        isRefreshing
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
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
                    {popularMatzalAl.length > 0 ? (
                      popularMatzalAl.map((matzalAl, index) => (
                        <div
                          key={matzalAl.matzalAlIdx}
                          onClick={() => handlePopularMatzalAlClick(matzalAl)}
                          className={`group p-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                            isRefreshing ? 'animate-pulse' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                              index < 3 ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-gray-400 to-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 text-xs truncate">
                                {matzalAl.matzalAlName}
                              </h3>
                              <p className="text-xs text-gray-500 truncate">📍 {matzalAl.matzalAlLocation}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {matzalAl.averageRating !== null && matzalAl.averageRating !== undefined && matzalAl.averageRating > 0 ? (
                                  <>
                                    {renderStarRating(matzalAl.averageRating, 'sm')}
                                    <span className="text-xs text-gray-600 font-semibold">
                                      {matzalAl.averageRating.toFixed(1)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      ({matzalAl.ratingCount || 0})
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    {renderStarRating(null, 'sm')}
                                    <span className="text-xs text-gray-400">평점 없음</span>
                                  </>
                                )}
                                <span className="text-xs text-gray-400">•</span>
                                <p className="text-xs text-gray-400 truncate">🍽️ {matzalAl.matzalAlType} • 👁️ {matzalAl.viewCount || 0}</p>
                              </div>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                              <svg className="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">아직 등록된 맛잘알 후기가 없습니다.</p>
                    )}
                  </div>
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
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    <svg
                      className={`w-3 h-3 ${isBoardRefreshing ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm">{isBoardRefreshing ? '갱신 중...' : '새로고침'}</span>
                  </button>
                </div>
              </div>
              
              <div className="p-3">
                <div className="grid grid-cols-1 gap-1.5">
                  {popularBoards.length > 0 ? (
                    popularBoards.map((board, index) => (
                      <div
                        key={board.boardIdx}
                        onClick={() => handlePopularBoardClick(board)}
                        className={`group p-1.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                          isBoardRefreshing ? 'animate-pulse' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                            index < 3 ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-gray-400 to-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200 text-xs truncate">
                              {board.boardTitle}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">🍽️ {board.restaurantName || '맛집명 없음'}</p>
                            <p className="text-xs text-gray-400 truncate">❤️ {board.boardLike} • 👁️ {board.boardHits}</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">아직 등록된 맛잘알 후기가 없습니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 맛잘알 추가 요청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">맛잘알 추가 요청</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">새로운 맛집 정보를 요청해주세요.</p>
            </div>

            {/* 모달 폼 */}
            <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
              {/* 맛집 이름 */}
              <div>
                <label htmlFor="matzalAlName" className="block text-sm font-medium text-gray-700 mb-2">
                  맛집 이름 *
                </label>
                <input
                  type="text"
                  id="matzalAlName"
                  value={requestForm.matzalAlName}
                  onChange={(e) => setRequestForm({...requestForm, matzalAlName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="맛집 이름을 입력하세요"
                  required
                />
              </div>

              {/* 대표자명 */}
              <div>
                <label htmlFor="requesterId" className="block text-sm font-medium text-gray-700 mb-2">
                  요청자명
                </label>
                <input
                  type="text"
                  id="requesterId"
                  value={requestForm.requesterId}
                  onChange={(e) => setRequestForm({...requestForm, requesterId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="요청자명을 입력하세요 (선택사항)"
                />
              </div>

              {/* 맛집 주소 */}
              <div>
                <label htmlFor="matzalAlAddr" className="block text-sm font-medium text-gray-700 mb-2">
                  맛집 주소 *
                </label>
                <input
                  type="text"
                  id="matzalAlAddr"
                  value={requestForm.matzalAlAddr}
                  onChange={(e) => setRequestForm({...requestForm, matzalAlAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="맛집 주소를 입력하세요"
                  required
                />
              </div>

              {/* 맛집 종류 */}
              <div>
                <label htmlFor="matzalAlType" className="block text-sm font-medium text-gray-700 mb-2">
                  맛집 종류 *
                </label>
                <input
                  type="text"
                  id="matzalAlType"
                  value={requestForm.matzalAlType}
                  onChange={(e) => setRequestForm({ ...requestForm, matzalAlType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="예: 한식, 중식, 일식, 디저트, 카페 등"
                  required
                />
              </div>

              {/* 제출 버튼 */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                    isSubmitting
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? '요청 중...' : '요청하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
