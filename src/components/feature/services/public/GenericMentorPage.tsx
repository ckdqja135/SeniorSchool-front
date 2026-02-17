'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ServiceConfig, DynamicEntity, DynamicBoard, AutoSearchResult } from '@/types/Services';
import { useTopViewedEntities, useAutoSearch } from '@/hooks/Services/useDynamicEntity';
import { useTopViewedDynamicBoards } from '@/hooks/Services/useDynamicBoard';
import { createRequest } from '@/lib/services/dynamicBoardAPI';

interface GenericMentorPageProps {
  config: ServiceConfig;
}

const colorMap: Record<string, { gradient: string; text: string; bg: string; border: string }> = {
  blue: { gradient: 'from-blue-500 to-blue-600', text: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-500' },
  red: { gradient: 'from-red-500 to-red-600', text: 'text-red-600', bg: 'bg-red-100', border: 'border-red-500' },
  green: { gradient: 'from-green-500 to-green-600', text: 'text-green-600', bg: 'bg-green-100', border: 'border-green-500' },
  purple: { gradient: 'from-purple-500 to-purple-600', text: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-500' },
  orange: { gradient: 'from-orange-500 to-orange-600', text: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-500' },
  teal: { gradient: 'from-teal-500 to-teal-600', text: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-500' },
  indigo: { gradient: 'from-indigo-500 to-indigo-600', text: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-500' },
  pink: { gradient: 'from-pink-500 to-pink-600', text: 'text-pink-600', bg: 'bg-pink-100', border: 'border-pink-500' },
  yellow: { gradient: 'from-yellow-500 to-yellow-600', text: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-500' },
  cyan: { gradient: 'from-cyan-500 to-cyan-600', text: 'text-cyan-600', bg: 'bg-cyan-100', border: 'border-cyan-500' },
};

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

export default function GenericMentorPage({ config }: GenericMentorPageProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);

  const colors = colorMap[config.serviceColor] || colorMap.blue;

  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBoardRefreshing, setIsBoardRefreshing] = useState(false);

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestReason, setRequestReason] = useState('');

  // Hooks
  const { entities: popularEntities, loading: entitiesLoading, refetch: refetchEntities } = useTopViewedEntities(config.serviceSlug, 10);
  const { boards: popularBoards, loading: boardsLoading, refetch: refetchBoards } = useTopViewedDynamicBoards(config.serviceSlug, 10);
  const { results: autoSearchResults, loading: searchLoading, search: performAutoSearch, clearResults } = useAutoSearch(config.serviceSlug);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`recentSearch_${config.serviceSlug}`);
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, [config.serviceSlug]);

  // Auto-complete debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim()) {
        performAutoSearch(searchTerm);
        setShowSuggestions(true);
      } else {
        clearResults();
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recent searches helpers
  const addToRecentSearches = (term: string) => {
    const updated = [term, ...recentSearches.filter(item => item !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(`recentSearch_${config.serviceSlug}`, JSON.stringify(updated));
  };

  const removeFromRecentSearches = (index: number) => {
    const updated = recentSearches.filter((_, i) => i !== index);
    setRecentSearches(updated);
    localStorage.setItem(`recentSearch_${config.serviceSlug}`, JSON.stringify(updated));
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(`recentSearch_${config.serviceSlug}`);
  };

  // Search handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    addToRecentSearches(searchTerm.trim());

    if (autoSearchResults.length === 1) {
      router.push(`/s/${config.serviceSlug}/mentor/${autoSearchResults[0].entityIdx}`);
    } else {
      router.push(`/s/${config.serviceSlug}/mentor?keyword=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleSuggestionClick = (result: AutoSearchResult) => {
    setSearchTerm(result.name);
    setShowSuggestions(false);
    addToRecentSearches(result.name);
    router.push(`/s/${config.serviceSlug}/mentor/${result.entityIdx}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim()) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      clearResults();
    }
  };

  const handleInputFocus = () => {
    if (searchTerm.trim()) {
      setShowSuggestions(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchTerm(term);
    addToRecentSearches(term);
    router.push(`/s/${config.serviceSlug}/mentor?keyword=${encodeURIComponent(term)}`);
  };

  // Entity click
  const handleEntityClick = (entity: DynamicEntity) => {
    router.push(`/s/${config.serviceSlug}/mentor/${entity.entityIdx}`);
  };

  // Board click
  const handleBoardClick = (board: DynamicBoard) => {
    router.push(`/s/${config.serviceSlug}/board/${board.boardIdx}`);
  };

  // Refresh handlers
  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await refetchEntities();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleBoardRefresh = async () => {
    if (isBoardRefreshing) return;
    setIsBoardRefreshing(true);
    await refetchBoards();
    setTimeout(() => {
      setIsBoardRefreshing(false);
    }, 1000);
  };

  // Request modal handlers
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestName.trim() || !requestReason.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createRequest(config.serviceSlug, {
        requestName: requestName.trim(),
        requestReason: requestReason.trim(),
      });
      alert('추가 요청이 성공적으로 전송되었습니다.');
      setShowRequestModal(false);
      setRequestName('');
      setRequestReason('');
    } catch (error) {
      console.error('추가 요청 오류:', error);
      alert('추가 요청 전송 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowRequestModal(false);
    setRequestName('');
    setRequestReason('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Back button */}
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

      {/* Hero Section */}
      <div className={`relative w-full h-[330px] bg-gradient-to-r ${colors.gradient}`}>
        <div className="absolute inset-0 bg-black/10" />

        {/* Search form overlay */}
        <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white w-full">
            <div className="text-5xl sm:text-6xl mb-4">{config.serviceEmoji}</div>
            <h1 className="font-black-han-sans text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-6 sm:mb-8 text-shadow-lg leading-tight">
              <span className="block">{config.serviceDisplay}</span>
            </h1>

            {/* Search form */}
            <form onSubmit={handleSearch} className="max-w-xl mx-auto">
              <div className="relative" ref={searchRef}>
                <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden mx-2 sm:mx-0">
                  {/* Search icon */}
                  <div className="pl-3 sm:pl-6 pr-2 sm:pr-4 text-gray-400">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Search input */}
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={`찾고 싶은 ${config.serviceName}을(를) 입력해보세요...`}
                    required
                    className="flex-1 px-2 sm:px-4 py-3 sm:py-4 text-sm sm:text-base font-medium text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0 placeholder-gray-400 placeholder:text-xs sm:placeholder:text-sm"
                    autoComplete="off"
                  />

                  {/* Search button */}
                  <button
                    type="submit"
                    className={`px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white font-semibold text-sm sm:text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap min-w-[70px] sm:min-w-[80px]`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="whitespace-nowrap">검색</span>
                  </button>
                </div>

                {/* Auto-complete dropdown */}
                {showSuggestions && (autoSearchResults.length > 0 || searchLoading || searchTerm.trim()) && (
                  <div className="absolute top-full left-2 right-2 sm:left-0 sm:right-0 mt-3 bg-white/95 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl z-10 max-h-80 overflow-hidden">
                    {/* Loading */}
                    {searchLoading && (
                      <div className="px-6 py-8 text-center">
                        <div className={`animate-spin rounded-full h-8 w-8 ${colors.border} border-b-2 mx-auto mb-3`}></div>
                        <div className="text-gray-600 font-medium">검색 중...</div>
                        <div className="text-gray-400 text-sm mt-1">잠시만 기다려주세요</div>
                      </div>
                    )}

                    {/* Results */}
                    {!searchLoading && autoSearchResults.map((result, index) => (
                      <div
                        key={result.entityIdx || index}
                        onClick={() => handleSuggestionClick(result)}
                        className="px-6 py-4 cursor-pointer border-b border-gray-100/50 last:border-b-0 transition-all duration-200 group hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${colors.bg} rounded-full flex items-center justify-center`}>
                            <span className="text-lg">{config.serviceEmoji}</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{result.name}</div>
                          </div>
                          <div className={`${colors.text} opacity-0 group-hover:opacity-100 transition-all duration-200`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* No results */}
                    {!searchLoading && autoSearchResults.length === 0 && searchTerm.trim() && (
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

            {/* Recent search tags */}
            {recentSearches.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {/* Clear All button */}
                  <button
                    onClick={clearAllRecentSearches}
                    className={`bg-gray-100 hover:bg-gray-200 ${colors.text} px-4 py-2 rounded-full text-sm font-medium transition-all duration-200`}
                  >
                    Clear All
                  </button>

                  {/* Recent search tags */}
                  {recentSearches.map((search, index) => (
                    <div
                      key={index}
                      className="group flex items-center space-x-2 bg-white/20 border border-white/30 rounded-full px-3 py-2 hover:bg-white/30 transition-all duration-200 cursor-pointer"
                      onClick={() => handleRecentSearchClick(search)}
                    >
                      <span className="text-white font-medium text-sm">{search}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromRecentSearches(index);
                        }}
                        className="w-4 h-4 text-white/60 hover:text-white transition-colors duration-200"
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

      {/* Add Request CTA Banner */}
      <div className={`bg-gradient-to-r ${colors.gradient} py-6 shadow-lg`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                {config.serviceName}을(를) 추가하고 싶으신가요?
              </h3>
              <p className="text-white/80 text-sm md:text-base">
                지금 요청하고 더 많은 정보를 공유해보세요
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className={`flex items-center space-x-2 px-6 py-3 bg-white ${colors.text} font-semibold rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-300 hover:scale-105 hover:shadow-xl whitespace-nowrap`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>{config.serviceName} 추가 요청</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Entities Section */}
            <div className="relative">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-gray-900">
                      인기 {config.serviceName} TOP 10
                    </h2>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                        isRefreshing
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : `${colors.bg} ${colors.text} hover:opacity-80`
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
                  {entitiesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className={`animate-spin rounded-full h-8 w-8 ${colors.border} border-b-2`}></div>
                    </div>
                  ) : popularEntities.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-3xl mb-2">{config.serviceEmoji}</div>
                      <p className="text-sm">아직 등록된 {config.serviceName}이(가) 없습니다</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5">
                      {popularEntities.map((entity, index) => (
                        <div
                          key={entity.entityIdx}
                          onClick={() => handleEntityClick(entity)}
                          className={`group p-1.5 rounded-lg border border-gray-200 hover:${colors.border} hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                            isRefreshing ? 'animate-pulse' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-1.5">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                              index < 3 ? `bg-gradient-to-r ${colors.gradient}` : 'bg-gradient-to-r from-gray-400 to-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold text-gray-900 group-hover:${colors.text} transition-colors duration-200 text-xs truncate`}>
                                {entity.name || `${config.serviceName} #${entity.entityIdx}`}
                              </h3>
                              <p className="text-xs text-gray-400 truncate">
                                👁️ {entity.viewCount || 0}
                              </p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                              <svg className={`w-2.5 h-2.5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>

            {/* Popular Reviews Section */}
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
                        : `${colors.bg} ${colors.text} hover:opacity-80`
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
                {boardsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className={`animate-spin rounded-full h-8 w-8 ${colors.border} border-b-2`}></div>
                  </div>
                ) : popularBoards.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">📝</div>
                    <p className="text-sm">아직 등록된 후기가 없습니다</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-1.5">
                    {popularBoards.map((board, index) => (
                      <div
                        key={board.boardIdx}
                        onClick={() => handleBoardClick(board)}
                        className={`group p-1.5 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                          isBoardRefreshing ? 'animate-pulse' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                            index < 3 ? `bg-gradient-to-r ${colors.gradient}` : 'bg-gradient-to-r from-gray-400 to-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-semibold text-gray-900 group-hover:${colors.text} transition-colors duration-200 text-xs truncate`}>
                              {board.boardTitle}
                            </h3>
                            {board.entityName && (
                              <p className="text-xs text-gray-500 truncate">📍 {board.entityName}</p>
                            )}
                            <p className="text-xs text-gray-400 truncate">
                              ❤️ {board.boardLike} · 👁️ {board.boardHits} · {formatTimeAgo(board.boardRegDate)}
                            </p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                            <svg className={`w-2.5 h-2.5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
        </div>
      </div>

      {/* Add Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{config.serviceName} 추가 요청</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">새로운 {config.serviceName} 정보를 요청해주세요.</p>
            </div>

            {/* Modal form */}
            <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
              {/* Request name */}
              <div>
                <label htmlFor="requestName" className="block text-sm font-medium text-gray-700 mb-2">
                  {config.serviceName} 이름 *
                </label>
                <input
                  type="text"
                  id="requestName"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:${colors.border} focus:border-transparent`}
                  placeholder={`${config.serviceName} 이름을 입력하세요`}
                  required
                />
              </div>

              {/* Request reason */}
              <div>
                <label htmlFor="requestReason" className="block text-sm font-medium text-gray-700 mb-2">
                  요청 사유 *
                </label>
                <textarea
                  id="requestReason"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:${colors.border} focus:border-transparent resize-none`}
                  placeholder="추가 요청 사유를 입력하세요"
                  required
                />
              </div>

              {/* Submit buttons */}
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
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors bg-gradient-to-r ${colors.gradient} ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
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
