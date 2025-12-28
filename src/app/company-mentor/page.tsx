'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Company, PopularCompany, CompanyBoard, CompanyRequest, CompanyAutoSearchResult, ApiResponse } from '@/types/Company';

export default function CompanyMentorPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<CompanyAutoSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularCompanies, setPopularCompanies] = useState<PopularCompany[]>([]);
  const [popularBoards, setPopularBoards] = useState<CompanyBoard[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBoardRefreshing, setIsBoardRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestForm, setRequestForm] = useState<CompanyRequest>({
    compName: '',
    compCEO: '',
    compType: '대기업',
    compIndustry: 'IT',
    compAddr: '',
    requesterId: ''
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // 중복 호출 방지를 위한 ref
  const hasFetchedPopularCompanies = useRef(false);
  const hasFetchedPopularBoards = useRef(false);

  // 최근 검색 기록 로드
  useEffect(() => {
    const saved = localStorage.getItem('recentCompanySearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // 인기 회사 데이터 로드
  useEffect(() => {
    fetchPopularCompanies();
  }, []);

  // 인기 후기 데이터 로드
  useEffect(() => {
    // 중복 호출 방지
    if (hasFetchedPopularBoards.current) return;
    hasFetchedPopularBoards.current = true;
    
    fetchPopularBoards();
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
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/search/comp/?compName=${encodeURIComponent(keyword)}`);
      
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
    localStorage.setItem('recentCompanySearches', JSON.stringify(updated));
  };

  // 최근 검색 기록에서 제거
  const removeFromRecentSearches = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem('recentCompanySearches', JSON.stringify(updated));
  };

  // 인기 회사 데이터 가져오기
  const fetchPopularCompanies = async () => {
    // 중복 호출 방지
    if (hasFetchedPopularCompanies.current) return;
    hasFetchedPopularCompanies.current = true;

    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/comp/top-viewed`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 200 && data.data) {
        // 인기 회사 TOP10 데이터를 직접 사용
        const companies = data.data
          .map((company: any) => ({
            compIdx: company.compIdx,
            compName: company.compName || '회사명 없음',
            compLocation: company.compLocate || company.compLocation || '위치 정보 없음',
            compType: company.compType || '회사',
            compIndustry: company.compIndustry || 'IT',
            viewCount: company.compViewCount || 0
          }))
          .filter((company: PopularCompany) => company.compIdx && company.compName);
        
        setPopularCompanies(companies.slice(0, 10));
      }
    } catch (error) {
      console.error('인기 회사 로딩 오류:', error);
    }
  };

  // 인기 후기 데이터 가져오기 (최근 후기에서 가져오기)
  const fetchPopularBoards = async () => {
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/comp/board/recent`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 200 && data.data) {
        // company.compName을 compName으로 매핑
        const mappedBoards = data.data.map((board: any) => ({
          ...board,
          compName: board.company?.compName || board.compName
        }));
        // 최근 후기 데이터를 그대로 사용 (조회수 기준으로 정렬)
        const sortedBoards = mappedBoards.sort((a: CompanyBoard, b: CompanyBoard) => b.boardHits - a.boardHits);
        setPopularBoards(sortedBoards.slice(0, 10));
      }
    } catch (error) {
      console.error('인기 후기 로딩 오류:', error);
    }
  };

  // 인기 회사 새로고침
  const handleRefresh = async () => {
    if (isRefreshing) return; // 이미 새로고침 중이면 중복 실행 방지
    
    setIsRefreshing(true);
    await fetchPopularCompanies();
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // 인기 후기 새로고침
  const handleBoardRefresh = async () => {
    if (isBoardRefreshing) return; // 이미 새로고침 중이면 중복 실행 방지
    
    setIsBoardRefreshing(true);
    await fetchPopularBoards();
    
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
  const handleSuggestionClick = (suggestion: CompanyAutoSearchResult) => {
    setSearchTerm(suggestion.compName);
    setShowSuggestions(false);
    setError(null);
    addToRecentSearches(suggestion.compName);
    // 자동완성 선택 시에는 compIdx와 함께 상세 페이지로 이동
    router.push(`/company-mentor/${encodeURIComponent(suggestion.compName)}?compIdx=${suggestion.compIdx}`);
  };

  // 검색 수행 및 결과에 따른 라우팅
  const performSearchAndNavigate = async (searchTerm: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const backendURL = 'https://api.reviewhub.life';
      
      // 자동완성 API를 사용해서 결과 개수 확인
      const autoResponse = await fetch(`${backendURL}/search/comp/?compName=${encodeURIComponent(searchTerm)}`);
      
      if (!autoResponse.ok) {
        throw new Error(`HTTP error! status: ${autoResponse.status}`);
      }

      const autoData = await autoResponse.json();
      
      
      const results = Array.isArray(autoData) ? autoData : (autoData.data || []);

      // 자동완성 결과가 배열인지 확인
      if (Array.isArray(results)) {
        if (results.length === 1) {
          // 정확히 1개 결과가 있으면 compIdx와 함께 바로 상세 페이지로 이동
          router.push(`/company-mentor/${encodeURIComponent(results[0].compName)}?compIdx=${results[0].compIdx}`);
        } else {
          // 2개 이상의 결과가 있으면 검색 결과 페이지로 이동
          router.push(`/company-search?name=${encodeURIComponent(searchTerm)}`);
        }
      } else {
        // 결과가 없으면 검색 결과 페이지로 이동
        router.push(`/company-search?name=${encodeURIComponent(searchTerm)}`);
      }
    } catch (error) {
      console.error('검색 오류:', error);
      setError('검색 중 오류가 발생했습니다.');
      // 오류 발생 시에도 검색 결과 페이지로 이동
      router.push(`/company-search?name=${encodeURIComponent(searchTerm)}`);
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
    router.push(`/company-search?name=${encodeURIComponent(term)}`);
  };

  // 인기 회사 클릭
  const handlePopularCompanyClick = (company: PopularCompany) => {
    const url = `/company-mentor/${encodeURIComponent(company.compName)}?compIdx=${company.compIdx}`;
    console.log('🔗 회사 클릭 - URL:', url);
    console.log('🔗 회사 정보:', { compName: company.compName, compIdx: company.compIdx });
    router.push(url);
  };

  // 인기 후기 클릭
  const handlePopularBoardClick = (board: CompanyBoard) => {
    if (board.compName) {
      router.push(`/company-board/${board.boardIdx}?company=${encodeURIComponent(board.compName)}`);
    } else {
      router.push(`/company-board/${board.boardIdx}`);
    }
  };

  // 회사 추가 요청 제출
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.compName.trim() || !requestForm.compAddr.trim()) {
      alert('회사명과 주소를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/comp/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestForm),
      });

      if (response.ok) {
        alert('회사 추가 요청이 성공적으로 전송되었습니다.');
        setShowRequestModal(false);
        setRequestForm({
          compName: '',
          compCEO: '',
          compType: '대기업',
          compIndustry: 'IT',
          compAddr: '',
          requesterId: ''
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('회사 추가 요청 오류:', error);
      alert('회사 추가 요청 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowRequestModal(false);
    setRequestForm({
      compName: '',
      compCEO: '',
      compType: '대기업',
      compIndustry: 'IT',
      compAddr: '',
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
              <span className="block">세상 모든 회사 정보,</span>
              <span className="block">회사 오빠가 알려줄게</span>
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
                    placeholder="찾고 싶은 회사를 입력해보세요..."
                    required
                    className="flex-1 px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-medium text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                    autoComplete="off"
                  />
                  
                  {/* 검색 버튼 */}
                  <button
                    type="submit"
                    className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold text-sm sm:text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap min-w-[70px] sm:min-w-[80px]"
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
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-3"></div>
                        <div className="text-gray-600 font-medium">검색 중...</div>
                        <div className="text-gray-400 text-sm mt-1">잠시만 기다려주세요</div>
                      </div>
                    )}
                    
                    {/* 에러 표시 */}
                    {error && !isLoading && (
                      <div className="px-6 py-6 text-center">
                        <div className="text-purple-500 text-lg mb-2">⚠️</div>
                        <div className="text-purple-600 font-medium">{error}</div>
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
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-100 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{suggestion.compName}</div>
                            <div className="text-sm text-gray-500">📍 {suggestion.compLocation}</div>
                            <div className="text-xs text-gray-400">🏢 {suggestion.compType} • {suggestion.compIndustry}</div>
                          </div>
                          <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-all duration-200">
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
                      localStorage.removeItem('recentCompanySearches');
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-purple-500 hover:text-purple-700 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
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
                      <span className="text-purple-700 font-medium text-sm">{search}</span>
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

      {/* 회사 추가 요청 CTA 배너 - 검색창 바로 아래 */}
      <div className="bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                회사를 추가하고 싶으신가요?
              </h3>
              <p className="text-purple-50 text-sm md:text-base">
                지금 요청하고 더 많은 정보를 공유해보세요
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg shadow-lg hover:bg-purple-50 transition-all duration-300 hover:scale-105 hover:shadow-xl whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>회사 추가 요청</span>
            </button>
          </div>
        </div>
      </div>

      {/* 검색창 밑 컨텐츠 */}
      <div className="bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 인기 회사 섹션 */}
            <div className="relative">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">인기 회사 TOP 10</h2>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                        isRefreshing
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
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
                    {popularCompanies.map((company, index) => (
                      <div
                        key={company.compIdx}
                        onClick={() => handlePopularCompanyClick(company)}
                        className={`group p-1.5 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                          isRefreshing ? 'animate-pulse' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                            index < 3 ? 'bg-gradient-to-r from-purple-400 to-purple-500' : 'bg-gradient-to-r from-gray-400 to-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-200 text-xs truncate">
                              {company.compName}
                            </h3>
                            <p className="text-xs text-gray-500 truncate">📍 {company.compLocation}</p>
                            <p className="text-xs text-gray-400 truncate">🏢 {company.compType} • 🏭 {company.compIndustry} • 👁️ {company.viewCount || 0}</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
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
                  {popularBoards.map((board, index) => (
                    <div
                      key={board.boardIdx}
                      onClick={() => handlePopularBoardClick(board)}
                      className={`group p-1.5 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                        isBoardRefreshing ? 'animate-pulse' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                          index < 3 ? 'bg-gradient-to-r from-purple-400 to-purple-500' : 'bg-gradient-to-r from-gray-400 to-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-200 text-xs truncate">
                            {board.boardTitle}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">🏢 {board.company?.compName || '회사명 없음'}</p>
                          <p className="text-xs text-gray-400 truncate">❤️ {board.boardLike} • 👁️ {board.boardHits}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* 회사 추가 요청 모달 */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">회사 추가 요청</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">새로운 회사 정보를 요청해주세요.</p>
            </div>

            {/* 모달 폼 */}
            <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
              {/* 회사 이름 */}
              <div>
                <label htmlFor="compName" className="block text-sm font-medium text-gray-700 mb-2">
                  회사 이름 *
                </label>
                <input
                  type="text"
                  id="compName"
                  value={requestForm.compName}
                  onChange={(e) => setRequestForm({...requestForm, compName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="회사 이름을 입력하세요"
                  required
                />
              </div>

              {/* 대표자명 */}
              <div>
                <label htmlFor="compCEO" className="block text-sm font-medium text-gray-700 mb-2">
                  대표자명
                </label>
                <input
                  type="text"
                  id="compCEO"
                  value={requestForm.compCEO}
                  onChange={(e) => setRequestForm({...requestForm, compCEO: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="대표자명을 입력하세요 (선택사항)"
                />
              </div>

              {/* 회사 주소 */}
              <div>
                <label htmlFor="compAddr" className="block text-sm font-medium text-gray-700 mb-2">
                  회사 주소 *
                </label>
                <input
                  type="text"
                  id="compAddr"
                  value={requestForm.compAddr}
                  onChange={(e) => setRequestForm({...requestForm, compAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="회사 주소를 입력하세요"
                  required
                />
              </div>

              {/* 회사 종류 */}
              <div>
                <label htmlFor="compType" className="block text-sm font-medium text-gray-700 mb-2">
                  회사 종류 *
                </label>
                <select
                  id="compType"
                  value={requestForm.compType}
                  onChange={(e) => setRequestForm({...requestForm, compType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="대기업">대기업</option>
                  <option value="중견기업">중견기업</option>
                  <option value="중소기업">중소기업</option>
                  <option value="스타트업">스타트업</option>
                  <option value="공기업">공기업</option>
                  <option value="외국계">외국계</option>
                </select>
              </div>

              {/* 업종 */}
              <div>
                <label htmlFor="compIndustry" className="block text-sm font-medium text-gray-700 mb-2">
                  업종 *
                </label>
                <select
                  id="compIndustry"
                  value={requestForm.compIndustry}
                  onChange={(e) => setRequestForm({...requestForm, compIndustry: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="IT">IT</option>
                  <option value="금융">금융</option>
                  <option value="제조">제조</option>
                  <option value="서비스">서비스</option>
                  <option value="건설">건설</option>
                  <option value="유통">유통</option>
                  <option value="의료">의료</option>
                  <option value="교육">교육</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 요청자 ID */}
              <div>
                <label htmlFor="requesterId" className="block text-sm font-medium text-gray-700 mb-2">
                  요청자 ID
                </label>
                <input
                  type="text"
                  id="requesterId"
                  value={requestForm.requesterId}
                  onChange={(e) => setRequestForm({...requestForm, requesterId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="요청자 ID를 입력하세요 (선택사항)"
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
                      ? 'bg-purple-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700'
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
