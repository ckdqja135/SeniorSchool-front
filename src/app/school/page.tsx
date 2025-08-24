'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface University {
  univName: string;
  univLocate: string;
}

export default function SchoolPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<University[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // 검색 제출
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?name=${encodeURIComponent(searchTerm)}`);
    }
  };

  // 자동완성 선택
  const handleSuggestionClick = (suggestion: University) => {
    setSearchTerm(suggestion.univName);
    setShowSuggestions(false);
    setError(null);
    router.push(`/school/${encodeURIComponent(suggestion.univName)}`);
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

  return (
    <div className="relative">
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
              세상 모든 대학교 정보, 학교선배가 알려줄게
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
          </div>
        </div>
      </div>
    </div>
  );
}
