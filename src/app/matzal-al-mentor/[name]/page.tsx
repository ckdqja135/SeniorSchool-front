'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Restaurant, MatzalAlBoard } from '@/types/MatzalAl';
import { getRestaurantDetail, getRestaurantBoards, createRestaurantBoard } from '@/lib/matzalAl/matzalAlAPI';

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantName = params.name as string;
  const restaurantIdx = searchParams.get('restaurantIdx');
  const restaurantAddr = searchParams.get('restaurantAddr'); // 주소 파라미터 추가
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [boards, setBoards] = useState<MatzalAlBoard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBoardLoading, setIsBoardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  
  // 후기 작성 모달 관련 상태
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [writeForm, setWriteForm] = useState({
    boardTitle: '',
    boardContent: '',
    boardID: '',
    boardPw: '',
    boardRating: 0
  });
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  
  // 카카오맵 관련 상태
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  
  // 중복 호출 방지를 위한 ref
  const lastFetchedRestaurantIdx = useRef<number | null>(null);
  const lastFetchedRestaurantKey = useRef<string | null>(null);
  const lastFetchedBoardsParams = useRef<string | null>(null);
  
  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // 정렬 관련 상태
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc: 최신순, asc: 오래된순

  // 검색 관련 상태
  const [searchType, setSearchType] = useState<'id' | 'title' | 'content'>('title');
  const [searchQuery, setSearchQuery] = useState('');

  // 식당 상세 정보 로드
  const fetchRestaurantDetail = async () => {
    if (!restaurantName) return;
    
    const restaurantKey = `${restaurantName}-${restaurantAddr || ''}`;
    
    // 중복 호출 방지
    if (lastFetchedRestaurantKey.current === restaurantKey) return;
    lastFetchedRestaurantKey.current = restaurantKey;

    try {
      setIsLoading(true);
      setError(null);
      
      // 주소가 있으면 함께 전달
      const restaurantData = await getRestaurantDetail(
        decodeURIComponent(restaurantName),
        restaurantAddr ? decodeURIComponent(restaurantAddr) : undefined
      );
      
      if (restaurantData) {
        setRestaurant(restaurantData);
        // 식당 정보가 로드되면 후기도 함께 로드 (useEffect에서 처리하므로 여기서는 호출하지 않음)
      } else {
        setError('식당 정보를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error('식당 상세 정보 로딩 오류:', err);
      setError('식당 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 식당 후기 목록 로드
  const fetchRestaurantBoards = async (idx: number, forceRefresh = false) => {
    const searchParams: any = { restaurantIdx: idx };
    
    // 검색 조건 추가
    if (searchQuery.trim()) {
      if (searchType === 'id') {
        searchParams.id = searchQuery.trim();
      } else if (searchType === 'title') {
        searchParams.title = searchQuery.trim();
      } else if (searchType === 'content') {
        searchParams.content = searchQuery.trim();
      }
    }
    
    // 중복 호출 방지: 파라미터를 문자열로 변환하여 비교
    const paramsKey = JSON.stringify({ idx, searchQuery, searchType, sortOrder });
    if (!forceRefresh && lastFetchedBoardsParams.current === paramsKey) {
      return;
    }
    lastFetchedBoardsParams.current = paramsKey;

    try {
      setIsBoardLoading(true);
      setBoardError(null);
      
      const boardData = await getRestaurantBoards(searchParams);
      
      if (Array.isArray(boardData)) {
        // boardRating 문자열을 숫자로 변환
        const mappedBoards = boardData.map((board: any) => {
          // boardRating이 존재하고 null이 아닌 경우에만 변환
          if (board.boardRating !== null && board.boardRating !== undefined && board.boardRating !== '') {
            board.boardRating = typeof board.boardRating === 'string' 
              ? parseFloat(board.boardRating) 
              : Number(board.boardRating);
            // NaN 체크
            if (isNaN(board.boardRating)) {
              board.boardRating = null;
            }
          } else {
            board.boardRating = null;
          }
          return board;
        });
        
        // 정렬 적용
        const sortedBoards = [...mappedBoards].sort((a, b) => {
          const dateA = new Date(a.boardRegDate).getTime();
          const dateB = new Date(b.boardRegDate).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        
        setBoards(sortedBoards);
      } else {
        setBoards([]);
      }
    } catch (err) {
      console.error('식당 후기 로딩 오류:', err);
      setBoardError('후기를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsBoardLoading(false);
    }
  };

  // 식당 정보 로드
  useEffect(() => {
    fetchRestaurantDetail();
  }, [restaurantName, restaurantAddr]);

  // 후기 목록 재로드 (식당 정보 로드 시 또는 검색어/정렬 변경 시)
  useEffect(() => {
    if (restaurant?.restaurantIdx) {
      fetchRestaurantBoards(restaurant.restaurantIdx);
    }
  }, [restaurant?.restaurantIdx, searchQuery, searchType, sortOrder]);

  // 카카오맵 로드
  useEffect(() => {
    const loadKakaoMap = () => {
      // 이미 로드되어 있는지 확인
      if (window.kakao && window.kakao.maps && 
          window.kakao.maps.Map && window.kakao.maps.services) {
        setIsKakaoMapLoaded(true);
        return;
      }

      if ((window as any).kakaoMapLoading) {
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=80d6fac198542c9021cd4229a30df6b2&autoload=false&libraries=services';
      script.async = true;
      
      script.onload = () => {
        try {
          // 공식 콜백 사용: kakao.maps.load()
          if (window.kakao?.maps?.load) {
            window.kakao.maps.load(() => {
              setIsKakaoMapLoaded(true);
              (window as any).kakaoMapLoading = false;
            });
          } else {
            console.error('kakao.maps.load 함수를 찾을 수 없음');
            (window as any).kakaoMapLoading = false;
          }
        } catch (error) {
          console.error('카카오맵 로드 오류:', error);
          (window as any).kakaoMapLoading = false;
        }
      };
      
      script.onerror = () => {
        console.error('카카오맵 스크립트 로드 실패');
        (window as any).kakaoMapLoading = false;
      };
      
      (window as any).kakaoMapLoading = true;
      document.head.appendChild(script);
    };

    loadKakaoMap();
  }, []);

  // 카카오맵 초기화
  const initializeKakaoMap = () => {
    if (!restaurant || !restaurant.restaurantLatX || !restaurant.restaurantLatY || !mapRef.current || mapInstance.current) {
      return;
    }

    try {
      const container = mapRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(restaurant.restaurantLatX, restaurant.restaurantLatY),
        level: 3
      };

      const map = new window.kakao.maps.Map(container, options);
      mapInstance.current = map;

      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(restaurant.restaurantLatX, restaurant.restaurantLatY);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition
      });
      marker.setMap(map);

      // 커스텀 오버레이 생성
      const overlayContent = `
        <div style="padding: 10px; background: white; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <div style="font-weight: bold; margin-bottom: 5px;">${restaurant.restaurantName}</div>
          <div style="font-size: 12px; color: #666;">${restaurant.restaurantAddr}</div>
        </div>
      `;
      
      const overlay = new window.kakao.maps.CustomOverlay({
        position: markerPosition,
        content: overlayContent,
        yAnchor: 1.2
      });
      overlay.setMap(map);
    } catch (error) {
      console.error('카카오맵 초기화 오류:', error);
    }
  };

  // 식당 정보가 로드되고 카카오맵이 준비되면 지도 초기화
  useEffect(() => {
    if (isKakaoMapLoaded && restaurant && restaurant.restaurantLatX && restaurant.restaurantLatY) {
      initializeKakaoMap();
    }
  }, [isKakaoMapLoaded, restaurant]);

  // 후기 작성 제출
  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!restaurant?.restaurantIdx) {
      alert('식당 정보가 없습니다.');
      return;
    }

    if (!writeForm.boardTitle.trim() || !writeForm.boardContent.trim() || !writeForm.boardID.trim() || !writeForm.boardPw.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (!writeForm.boardRating || writeForm.boardRating < 0.5) {
      alert('별점을 선택해주세요. (0.5점 이상)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await createRestaurantBoard({
        boardTitle: writeForm.boardTitle,
        boardContent: writeForm.boardContent,
        restaurantIdx: restaurant.restaurantIdx,
        boardID: writeForm.boardID,
        boardPW: writeForm.boardPw,
        boardRating: writeForm.boardRating > 0 ? writeForm.boardRating : null
      });

      if (success) {
        alert('후기가 성공적으로 등록되었습니다.');
        setShowWriteModal(false);
        setWriteForm({
          boardTitle: '',
          boardContent: '',
          boardID: '',
          boardPw: '',
          boardRating: 0
        });
        setHoveredRating(null);
        
        // 후기 목록 새로고침
        fetchRestaurantBoards(restaurant.restaurantIdx, true);
      } else {
        alert('후기 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('후기 작성 오류:', error);
      alert('후기 작성 중 오류가 발생했습니다.');
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

  // 날짜 포맷팅 함수 (YYYY-MM-DD HH:mm:ss)
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // 별점 렌더링 함수
  const renderStarRating = (score?: number | null, size: 'sm' | 'md' | 'lg' = 'sm') => {
    // null이거나 0이면 빈 별 5개 표시
    const safeScore = score && score > 0 ? Math.max(0, Math.min(score, 5)) : 0;
    const sizeClasses = size === 'sm'
      ? { wrapper: 'w-4 h-4 text-xs', star: 'text-sm' }
      : size === 'md'
      ? { wrapper: 'w-5 h-5 text-base', star: 'text-base' }
      : { wrapper: 'w-6 h-6 text-lg', star: 'text-lg' };

    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, idx) => {
          const fillLevel = Math.min(Math.max(safeScore - idx, 0), 1);
          const fillPercent = Math.min(100, Math.max(0, fillLevel * 100 - 2));
          return (
            <div key={`star-${idx}`} className={`relative ${sizeClasses.wrapper}`}>
              <span className={`absolute inset-0 text-gray-300 select-none ${sizeClasses.star}`}>★</span>
              <span
                className={`absolute inset-0 text-yellow-400 overflow-hidden select-none ${sizeClasses.star}`}
                style={{ width: `${fillPercent}%` }}
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
  
  // 페이지네이션된 후기 목록
  const paginatedBoards = boards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-gray-800 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/matzal-al-mentor" className="text-2xl font-bold text-blue-400">
                맛잘알 오빠
              </Link>
              <div className="text-gray-300">식당 상세정보</div>
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link
              href="/matzal-al-mentor"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              맛잘알 오빠로 돌아가기
            </Link>
          </div>
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
              {restaurant.restaurantName}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 식당 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {restaurant.restaurantName}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 좌측 컨텐츠 */}
          <div className="space-y-6">
            {/* 식당 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 tracking-wide">식당 정보</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1 block">위치</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{restaurant.restaurantAddr || '정보 없음'}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">업종</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{restaurant.restaurantType || '정보 없음'}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1 block">대표자</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{restaurant.restaurantOwner || '정보 없음'}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-orange-700 font-bold uppercase tracking-wider mb-1 block">상태</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">운영중</p>
                </div>
                {/* 평균 평점 */}
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 hover:shadow-md transition-all duration-200 col-span-2">
                  <span className="text-xs text-yellow-700 font-bold uppercase tracking-wider mb-1 block">평균 평점</span>
                  <div className="flex items-center gap-3">
                    {restaurant.averageRating !== null && restaurant.averageRating !== undefined && restaurant.averageRating > 0 ? (
                      <>
                        {renderStarRating(restaurant.averageRating, 'lg')}
                        <span className="text-lg font-bold text-gray-900">
                          {restaurant.averageRating.toFixed(1)} / 5.0
                        </span>
                        <span className="text-sm text-gray-600 font-medium ml-auto">
                          {restaurant.ratingCount || 0}개의 후기
                        </span>
                      </>
                    ) : (
                      <>
                        {renderStarRating(null, 'lg')}
                        <span className="text-lg font-bold text-gray-900">평점 없음</span>
                        <span className="text-sm text-gray-600 font-medium ml-auto">
                          {restaurant.ratingCount || 0}개의 후기
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 지도 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">위치</h3>
              <div 
                ref={mapRef}
                className="w-full h-80 rounded-lg border border-gray-300 relative"
                style={{ 
                  width: "100%", 
                  height: "320px",
                  minHeight: "320px",
                  backgroundColor: "#f8f9fa"
                }}
              >
                {!isKakaoMapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">지도를 불러오는 중...</p>
                    </div>
                  </div>
                )}
                {isKakaoMapLoaded && !mapInstance.current && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">지도 초기화 중...</p>
                    </div>
                  </div>
                )}
                {!restaurant?.restaurantLatX || !restaurant?.restaurantLatY ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="text-gray-400 text-4xl mb-2">📍</div>
                      <p className="text-sm text-gray-600">위치 정보가 없습니다</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 공유하기 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">식당 공유하기</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${restaurant?.restaurantName} 식당 정보 - 맛잘알 오빠`)}&url=${encodeURIComponent(window.location.href)}`)}
                  className="w-12 h-12 bg-blue-400 text-white rounded-full hover:bg-blue-500 transition-colors flex items-center justify-center"
                  title="트위터에 공유"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </button>
                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}
                  className="w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title="페이스북에 공유"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </button>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      alert('링크가 클립보드에 복사되었습니다.');
                    }
                  }}
                  className="w-12 h-12 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
                  title="링크 복사"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

          </div>

          {/* 우측 컨텐츠 - 후기 목록 */}
          <div className="space-y-6">
            {/* 외주업체 후기 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 tracking-wide">식당 후기</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="px-1.5 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-sky-400 to-sky-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
                  >
                    <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'desc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                    </svg>
                    <span className="text-xs sm:text-sm font-semibold">최신순</span>
                  </button>
                  
                  <button
                    onClick={() => setShowWriteModal(true)}
                    className="px-1.5 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
                  >
                    <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs sm:text-sm font-semibold">글쓰기</span>
                  </button>
                </div>
              </div>

              {/* 후기 목록 */}
              <div className="space-y-4">
                {isBoardLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">게시판을 불러오는 중...</p>
                  </div>
                ) : paginatedBoards.length > 0 ? (
                  <>
                    {paginatedBoards.map((board) => (
                      <div
                        key={board.boardIdx}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          // 식당 정보를 sessionStorage에 저장 (뒤로가기 시 사용)
                          if (restaurant?.restaurantName) {
                            sessionStorage.setItem('previousMatzalAlName', restaurant.restaurantName);
                          }
                          router.push(`/matzal-al-board/${board.boardIdx}`);
                        }}
                      >
                        {/* 별점 표시 - null이어도 빈 별 5개 표시 */}
                        <div className="flex items-center mb-2">
                          <div className="flex items-center space-x-2">
                            {renderStarRating(board.boardRating, 'sm')}
                            <span className="text-xs font-semibold text-gray-600">
                              {board.boardRating && board.boardRating > 0 
                                ? `${Number(board.boardRating).toFixed(1)} / 5.0`
                                : '평점 없음'}
                            </span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">{board.boardTitle}</h3>
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                          <span>작성자: {board.boardID || '익명'}</span>
                          <span>{formatDateTime(board.boardRegDate)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>조회수: {board.boardHits}</span>
                          <span>좋아요: {board.boardLike}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* 페이징 */}
                    {Math.ceil(boards.length / itemsPerPage) > 1 && (
                      <div className="flex justify-center items-center space-x-2 mt-8">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <span>이전</span>
                        </button>
                        
                        {Array.from({ length: Math.ceil(boards.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg transform scale-105'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(boards.length / itemsPerPage)))}
                          disabled={currentPage === Math.ceil(boards.length / itemsPerPage)}
                          className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-1"
                        >
                          <span>다음</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? '검색 결과가 없습니다' : '아직 식당 후기가 없습니다.\n첫 번째 후기를 작성해보세요!'}
                  </div>
                )}

                {/* 검색창 - 항상 표시 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <form onSubmit={(e) => { e.preventDefault(); }} className="flex flex-col sm:flex-row gap-3">
                    {/* 검색 타입 선택 */}
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value as 'id' | 'title' | 'content')}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white text-sm"
                    >
                      <option value="title">제목</option>
                      <option value="id">작성자</option>
                      <option value="content">내용</option>
                    </select>
                    
                    {/* 검색어 입력 */}
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="검색어를 입력하세요"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
                    />
                    
                    {/* 검색 버튼 */}
                    <button
                      type="submit"
                      className="px-1.5 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-500 hover:to-sky-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
                    >
                      <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="text-xs sm:text-sm font-semibold">검색</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 후기 작성 모달 */}
      {showWriteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {restaurant?.restaurantName || '식당'}의 후기를 남겨주세요
              </h3>
              <button
                onClick={() => setShowWriteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleWriteSubmit} className="space-y-4">
              {/* 평점 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  회사 평점 <span className="text-red-500">*</span>
                </label>
                <div
                  className="flex flex-col gap-2"
                  onMouseLeave={() => setHoveredRating(null)}
                >
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const displayRating = hoveredRating !== null ? hoveredRating : writeForm.boardRating;
                      const fillLevel = Math.min(Math.max((displayRating || 0) - idx, 0), 1);
                      return (
                        <div key={`star-${idx}`} className="relative w-8 h-8 text-3xl leading-none cursor-pointer">
                          <span className="absolute inset-0 text-gray-300 select-none">★</span>
                          <span
                            className="absolute inset-0 text-yellow-400 overflow-hidden select-none"
                            style={{ width: `${fillLevel * 100}%` }}
                          >
                            ★
                          </span>
                          <span className="invisible">★</span>
                          <div className="absolute inset-0 flex">
                            <button
                              type="button"
                              className="w-1/2 h-full bg-transparent"
                              aria-label={`${(idx + 0.5).toFixed(1)}점 선택`}
                              onMouseEnter={() => setHoveredRating(idx + 0.5)}
                              onFocus={() => setHoveredRating(idx + 0.5)}
                              onClick={() => setWriteForm({...writeForm, boardRating: idx + 0.5})}
                            />
                            <button
                              type="button"
                              className="w-1/2 h-full bg-transparent"
                              aria-label={`${(idx + 1).toFixed(1)}점 선택`}
                              onMouseEnter={() => setHoveredRating(idx + 1)}
                              onFocus={() => setHoveredRating(idx + 1)}
                              onClick={() => setWriteForm({...writeForm, boardRating: idx + 1})}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm text-gray-600">
                    {writeForm.boardRating >= 0.5 ? `${writeForm.boardRating.toFixed(1)} / 5.0` : '0.5 단위로 평점을 선택해주세요.'}
                  </p>
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={writeForm.boardTitle}
                  onChange={(e) => setWriteForm({...writeForm, boardTitle: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  maxLength={40}
                  required
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea
                  value={writeForm.boardContent}
                  onChange={(e) => setWriteForm({...writeForm, boardContent: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={4}
                  maxLength={700}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  다른 사람의 인격권을 침해하거나 명예를 훼손하게 하는 글은 삭제될 수 있습니다.
                </p>
              </div>

              {/* 작성자, 비밀번호 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">작성자</label>
                  <input
                    type="text"
                    value={writeForm.boardID}
                    onChange={(e) => setWriteForm({...writeForm, boardID: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={writeForm.boardPw}
                    onChange={(e) => setWriteForm({...writeForm, boardPw: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowWriteModal(false)}
                  className="px-6 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? '등록 중...' : '글쓰기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
