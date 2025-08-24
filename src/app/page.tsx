'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface University {
  univName: string;
  univLocate: string;
}

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<University[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 자동완성 검색어 가져오기
  const fetchSuggestions = async (keyword: string) => {
    // 최소 2글자 이상일 때만 API 호출
    if (!keyword.trim() || keyword.trim().length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    // 이미 로딩 중이면 추가 호출 방지
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // 백엔드 API 서버
      const backendURL = 'https://api.reviewhub.life';
      
      const response = await fetch(`${backendURL}/search/auto?keyword=${encodeURIComponent(keyword)}`);
      
      if (!response.ok) {
        if (response.status === 429) {
          setError('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return;
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
    }, 800); // 500ms → 800ms로 증가

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
    
    // 최소 2글자 이상일 때만 자동완성 표시
    if (value.trim().length >= 2) {
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
            <form onSubmit={handleSearch} className="max-w-md mx-auto">
              <div className="relative" ref={searchRef}>
                <div className="flex">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder="대학교 이름을 입력하세요..."
                    required
                    className="flex-1 px-4 py-3 text-lg font-light text-gray-900 border-0 rounded-l-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-50"
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-green-600 text-white font-light text-lg rounded-r-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <i className="fa fa-search mr-3" aria-hidden="true"></i>
                    검색
                  </button>
                </div>

                {/* 자동완성 드롭다운 */}
                {showSuggestions && (suggestions.length > 0 || isLoading || error || searchTerm.trim()) && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                    {/* 로딩 표시 */}
                    {isLoading && (
                      <div className="px-4 py-3 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600 mx-auto mb-2"></div>
                        검색 중...
                      </div>
                    )}
                    
                    {/* 에러 표시 */}
                    {error && !isLoading && (
                      <div className="px-4 py-3 text-center text-red-500 text-sm">
                        {error}
                      </div>
                    )}
                    
                    {/* 자동완성 결과 */}
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                      >
                        <div className="font-medium text-gray-900">{suggestion.univName}</div>
                        <div className="text-sm text-gray-500">{suggestion.univLocate}</div>
                      </div>
                    ))}
                    
                    {/* 결과가 없을 때 */}
                    {!isLoading && !error && suggestions.length === 0 && searchTerm.trim() && (
                      <div className="px-4 py-3 text-center text-gray-500 text-sm">
                        검색 결과가 없습니다
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
