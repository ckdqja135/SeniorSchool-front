'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Restaurant {
  restaurantName: string;
  restaurantAddr: string;
  restaurantOwner: string;
  restaurantType: string;
  restaurantIdx?: number;
  restaurantLocation?: string;
  restaurantEstablished?: string;
  restaurantStatus?: number;
  restaurantViewCount?: number;
}

function MatzalAlSearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchName = searchParams.get('name') || '';

  const [searchResults, setSearchResults] = useState<Restaurant[]>([]);
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
        const response = await fetch(`${backendURL}/restaurant/auto?keyword=${encodeURIComponent(searchName)}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setSearchResults(data);
        } else if (data.data && Array.isArray(data.data)) {
          setSearchResults(data.data);
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

  // 식당 클릭 핸들러
  const handleRestaurantClick = (restaurant: Restaurant) => {
    const params = new URLSearchParams();
    if (restaurant.restaurantIdx) {
      params.append('restaurantIdx', restaurant.restaurantIdx.toString());
    }
    if (restaurant.restaurantAddr) {
      params.append('restaurantAddr', restaurant.restaurantAddr);
    }
    router.push(`/matzal-al-mentor/${encodeURIComponent(restaurant.restaurantName)}?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
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
            <Link href="/matzal-al-mentor" className="text-2xl font-bold text-blue-400">
              맛잘알 오빠
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
            {searchResults.length}개의 식당을 찾았습니다.
          </p>
        </div>

        {/* 검색 결과 목록 */}
        <div className="space-y-6">
          {error ? (
            <div className="text-center py-8">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">오류 발생</h2>
              <p className="text-gray-600 mb-8">{error}</p>
              <Link href="/matzal-al-mentor" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors">
                맛잘알 오빠로 돌아가기
              </Link>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">검색 결과가 없습니다</h2>
              <p className="text-gray-600 mb-8">다른 검색어로 시도해보세요.</p>
              <Link href="/matzal-al-mentor" className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors">
                맛잘알 오빠로 돌아가기
              </Link>
            </div>
          ) : (
            searchResults.map((restaurant, index) => (
              <div
                key={restaurant.restaurantIdx || `restaurant-${index}`}
                onClick={() => handleRestaurantClick(restaurant)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-blue-300"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{restaurant.restaurantName}</h3>
                    <p className="text-sm text-gray-500 mt-1">📍 {restaurant.restaurantAddr || restaurant.restaurantLocation}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>업종:</span>
                        <span className="font-medium">{restaurant.restaurantType}</span>
                      </div>
                      {restaurant.restaurantOwner && (
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>대표자:</span>
                          <span className="font-medium">{restaurant.restaurantOwner}</span>
                        </div>
                      )}
                      {restaurant.restaurantEstablished && (
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>설립년도:</span>
                          <span className="font-medium">{restaurant.restaurantEstablished}년</span>
                        </div>
                      )}
                      {restaurant.restaurantViewCount !== undefined && (
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>조회수:</span>
                          <span className="font-medium">{restaurant.restaurantViewCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-blue-400 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function MatzalAlSearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="text-lg">로딩 중...</div></div>}>
      <MatzalAlSearchContent />
    </Suspense>
  );
}

