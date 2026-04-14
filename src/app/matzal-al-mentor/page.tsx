'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRestaurantCommentsTop } from '@/hooks/MatzalAl/useMatzalAl';
import { requestMatzalAl } from '@/lib/matzalAl/matzalAlAPI';

// 주요 카테고리 목록 (이외는 "기타"로 합산)
const MAIN_CATEGORIES = [
  '한식', '중식', '일식', '양식', '카페', '분식',
  '패스트푸드', '치킨', '피자', '디저트', '아시안',
  '고기', '해산물', '술집',
];

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
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [requestForm, setRequestForm] = useState({
    matzalAlName: '',
    matzalAlAddr: '',
    matzalAlType: '맛집',
    requesterId: ''
  });

  // 카테고리 필터 상태
  const [categories, setCategories] = useState<{ restaurantType: string; count: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);

  // 랜덤 룰렛 상태
  const [rouletteResult, setRouletteResult] = useState<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showRouletteResult, setShowRouletteResult] = useState(false);

  // 탭 상태 (오늘의 추천 / 지도)
  const [viewTab, setViewTab] = useState<'grid' | 'map'>('grid');
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapRestaurants, setMapRestaurants] = useState<any[]>([]);
  const [mapRadius, setMapRadius] = useState<number>(0); // 0 = 전체
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const clustererRef = useRef<any>(null);
  const hasFetchedMapRestaurants = useRef(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 중복 호출 방지를 위한 ref
  const hasFetchedPopularMatzalAl = useRef(false);
  const hasFetchedPopularBoards = useRef(false);

  // 새로운 식당 후기 API 훅
  const { topComments, loading: topCommentsLoading, error: topCommentsError, refetch: refetchTopComments } = useRestaurantCommentsTop(10);

  // 카테고리 목록 로드 (주요 카테고리만 표시, 나머지는 "기타"로 합산)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        const response = await fetch(`${backendURL}/restaurant/types`);
        if (response.ok) {
          const data: { restaurantType: string; count: number }[] = await response.json();
          const mainTypes = MAIN_CATEGORIES;
          const main: typeof data = [];
          let etcCount = 0;

          for (const cat of data) {
            if (mainTypes.some(t => cat.restaurantType.includes(t))) {
              main.push(cat);
            } else {
              etcCount += Number(cat.count);
            }
          }

          if (etcCount > 0) {
            main.push({ restaurantType: '기타', count: etcCount });
          }

          setCategories(main);
        }
      } catch (err) {
        console.error('카테고리 로드 오류:', err);
      }
    };
    fetchCategories();
  }, []);

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
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/restaurant/auto?keyword=${encodeURIComponent(keyword)}`);

      const data = await response.json();

      // API 응답 데이터 매핑 (restaurantName -> matzalAlName 등)
      const mapItem = (item: any) => ({
        restaurantName: item.restaurantName,
        restaurantAddr: item.restaurantAddr,
        restaurantOwner: item.restaurantOwner,
        restaurantType: item.restaurantType,
        matzalAlName: item.restaurantName,
        matzalAlLocation: item.restaurantAddr,
        matzalAlType: item.restaurantType,
        restaurantIdx: item.restaurantIdx || null
      });

      let mappedData: any[] = [];
      if (Array.isArray(data)) {
        mappedData = data.map(mapItem);
      } else if (data.data !== undefined && Array.isArray(data.data)) {
        mappedData = data.data.map(mapItem);
      } else if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSuggestions(mappedData);
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
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/restaurant/top-viewed`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 이미지 URL 헬퍼 함수
      const getImageUrl = (imagePath: string | undefined | null): string | null => {
        if (!imagePath) return null;
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
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
      const mapItem = (item: any) => ({
        matzalAlIdx: item.restaurantIdx || item.matzalAlIdx,
        matzalAlName: item.restaurantName || item.matzalAlName || '맛집명 없음',
        matzalAlLocation: item.restaurantAddr || item.matzalAlLocation || '위치 정보 없음',
        matzalAlType: item.restaurantType || item.matzalAlType || '맛집',
        viewCount: item.restaurantViewCount || item.boardHits || item.viewCount || 0,
        restaurantImage: item.restaurantImage || null,
        restaurantLatX: item.restaurantLatX || null,
        restaurantLatY: item.restaurantLatY || null,
        restaurantIdx: item.restaurantIdx || null,
        restaurantAddr: item.restaurantAddr || null,
        averageRating: item.averageRating !== null && item.averageRating !== undefined
          ? (typeof item.averageRating === 'string' ? parseFloat(item.averageRating) : Number(item.averageRating))
          : null,
        ratingCount: item.ratingCount || 0,
      });

      if (Array.isArray(data)) {
        const restaurants = data
          .map(mapItem)
          .filter((item: any) => item.matzalAlIdx && item.matzalAlName);

        setPopularMatzalAl(restaurants.slice(0, 10));
      } else if (data.data && Array.isArray(data.data)) {
        const restaurants = data.data
          .map(mapItem)
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
          const fillPercent = Math.min(100, Math.max(0, fillLevel * 100 - 12));
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

  // 카테고리 선택 시 필터링
  useEffect(() => {
    if (selectedCategory === '전체') {
      setFilteredRestaurants(popularMatzalAl);
    } else if (selectedCategory === '기타') {
      const mainTypes = MAIN_CATEGORIES;
      setFilteredRestaurants(
        popularMatzalAl.filter((r: any) =>
          !mainTypes.some(t => (r.matzalAlType || '').includes(t))
        )
      );
    } else {
      setFilteredRestaurants(
        popularMatzalAl.filter((r: any) =>
          (r.matzalAlType || '').includes(selectedCategory)
        )
      );
    }
  }, [selectedCategory, popularMatzalAl]);

  // 카카오맵 SDK 로드
  useEffect(() => {
    if (viewTab !== 'map') return;

    if (window.kakao && window.kakao.maps && window.kakao.maps.Map) {
      setIsKakaoMapLoaded(true);
      return;
    }
    if ((window as any).kakaoMapLoading) {
      const check = setInterval(() => {
        if (window.kakao?.maps?.Map) {
          setIsKakaoMapLoaded(true);
          clearInterval(check);
        }
      }, 200);
      return () => clearInterval(check);
    }

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer`;
    script.async = true;
    (window as any).kakaoMapLoading = true;

    script.onload = () => {
      if (window.kakao?.maps?.load) {
        window.kakao.maps.load(() => {
          setIsKakaoMapLoaded(true);
          (window as any).kakaoMapLoading = false;
        });
      }
    };
    script.onerror = () => { (window as any).kakaoMapLoading = false; };
    document.head.appendChild(script);
  }, [viewTab]);

  // 현재 위치 가져오기 (지도 탭 선택 시)
  useEffect(() => {
    if (viewTab !== 'map' || userLocation) return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        // 위치 권한 거부 시 서울 시청 기본값
        setUserLocation({ lat: 37.5665, lng: 126.978 });
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, [viewTab, userLocation]);

  // 탭 전환 시 지도 인스턴스 리셋 (DOM이 재생성되므로)
  useEffect(() => {
    if (viewTab !== 'map') {
      mapInstanceRef.current = null;
    }
  }, [viewTab]);

  // 지도 뷰 전환 시 전체 식당 조회
  useEffect(() => {
    if (viewTab !== 'map' || hasFetchedMapRestaurants.current) return;
    hasFetchedMapRestaurants.current = true;

    const fetchAllRestaurants = async () => {
      try {
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        const res = await fetch(`${backendURL}/restaurant`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const mapped = (Array.isArray(data) ? data : data.data || []).map((item: any) => ({
          matzalAlIdx: item.restaurantIdx,
          matzalAlName: item.restaurantName || '맛집명 없음',
          matzalAlLocation: item.restaurantAddr || '위치 정보 없음',
          matzalAlType: item.restaurantType || '맛집',
          viewCount: item.restaurantViewCount || 0,
          restaurantImage: item.restaurantImage || null,
          restaurantLatX: item.restaurantLatX || null,
          restaurantLatY: item.restaurantLatY || null,
          restaurantIdx: item.restaurantIdx || null,
          restaurantAddr: item.restaurantAddr || null,
          averageRating: item.averageRating != null ? parseFloat(Number(item.averageRating).toFixed(1)) : null,
          ratingCount: item.ratingCount || 0,
        }));
        setMapRestaurants(mapped);
      } catch (err) {
        console.error('식당 목록 조회 실패:', err);
      }
    };
    fetchAllRestaurants();
  }, [viewTab]);

  // 카카오맵 초기화 및 마커 표시
  useEffect(() => {
    if (viewTab !== 'map' || !isKakaoMapLoaded || !mapContainerRef.current) return;

    // 지도용 데이터: 전체 식당, 카테고리 필터 적용
    const allMapData = mapRestaurants.length > 0 ? mapRestaurants : popularMatzalAl;
    const restaurants = selectedCategory === '전체'
      ? allMapData
      : allMapData.filter((r: any) => {
          const type = r.matzalAlType || '';
          return type.includes(selectedCategory);
        });
    if (restaurants.length === 0) return;

    // 기존 클러스터러·오버레이·마커 정리
    if (clustererRef.current) {
      clustererRef.current.clear();
      clustererRef.current = null;
    }
    overlaysRef.current.forEach((o: any) => o.setMap(null));
    overlaysRef.current = [];
    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    // 거리 계산 함수
    const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // 유효 좌표가 있는 식당만 필터 + 반경 필터
    const withCoords = restaurants.filter((r: any) => {
      if (!r.restaurantLatX || !r.restaurantLatY) return false;
      if (mapRadius > 0 && userLocation) {
        const dist = getDistance(userLocation.lat, userLocation.lng, r.restaurantLatX, r.restaurantLatY);
        return dist <= mapRadius;
      }
      return true;
    });
    if (withCoords.length === 0) return;

    // 초기 지도 중심: 사용자 위치 또는 첫 식당 좌표
    const initLat = userLocation?.lat || withCoords[0].restaurantLatX;
    const initLng = userLocation?.lng || withCoords[0].restaurantLatY;
    const center = new window.kakao.maps.LatLng(initLat, initLng);

    mapInstanceRef.current = new window.kakao.maps.Map(mapContainerRef.current, { center, level: 7 });
    const zoomControl = new window.kakao.maps.ZoomControl();
    mapInstanceRef.current.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    const map = mapInstanceRef.current;

    // 현재 위치 마커 (파란 원) — 위치 있을 때만
    if (userLocation) {
      const myPos = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
      new window.kakao.maps.CustomOverlay({
        content: `<div style="width:16px;height:16px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 6px rgba(59,130,246,0.5);"></div>`,
        position: myPos,
        yAnchor: 0.5,
        zIndex: 10,
        map,
      });
    }

    const bounds = new window.kakao.maps.LatLngBounds();
    if (userLocation) {
      bounds.extend(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng));
    }

    // 마커 생성 (map에 직접 추가하지 않음 — 클러스터러가 관리)
    const markers = withCoords.map((r: any) => {
      const pos = new window.kakao.maps.LatLng(r.restaurantLatX, r.restaurantLatY);
      bounds.extend(pos);

      const marker = new window.kakao.maps.Marker({ position: pos });

      const distText = userLocation
        ? (() => {
            const dist = getDistance(userLocation.lat, userLocation.lng, r.restaurantLatX, r.restaurantLatY);
            return `<div style="color:#3B82F6;font-size:11px;margin-top:2px;">${dist < 1 ? Math.round(dist * 1000) + 'm' : dist.toFixed(1) + 'km'}</div>`;
          })()
        : '';

      const overlayContent = `
        <div style="padding:8px 12px;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);border:1px solid #e5e7eb;font-size:13px;max-width:220px;cursor:pointer;">
          <div style="font-weight:700;color:#111;margin-bottom:2px;">${r.matzalAlName}</div>
          <div style="color:#6b7280;font-size:11px;">${r.matzalAlType || '맛집'}${r.averageRating > 0 ? ' · ⭐ ' + r.averageRating.toFixed(1) : ''}</div>
          ${distText}
        </div>`;

      const overlay = new window.kakao.maps.CustomOverlay({
        content: overlayContent,
        position: pos,
        yAnchor: 1.3,
        map: null,
      });
      overlaysRef.current.push(overlay);

      window.kakao.maps.event.addListener(marker, 'mouseover', () => overlay.setMap(map));
      window.kakao.maps.event.addListener(marker, 'mouseout', () => overlay.setMap(null));
      window.kakao.maps.event.addListener(marker, 'click', () => {
        const params = new URLSearchParams();
        if (r.restaurantIdx) params.append('restaurantIdx', r.restaurantIdx);
        if (r.restaurantAddr) params.append('restaurantAddr', r.restaurantAddr);
        router.push(`/matzal-al-mentor/${encodeURIComponent(r.matzalAlName)}?${params.toString()}`);
      });

      return marker;
    });

    markersRef.current = markers;

    // MarkerClusterer로 마커 관리 (가까운 마커끼리 묶어 표시)
    clustererRef.current = new window.kakao.maps.MarkerClusterer({
      map,
      markers,
      gridSize: 60,
      averageCenter: true,
      minLevel: 4,
      minClusterSize: 2,
      styles: [{
        width: '40px', height: '40px',
        background: 'rgba(99,102,241,0.85)',
        borderRadius: '50%',
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        lineHeight: '40px',
        fontSize: '14px',
      }, {
        width: '50px', height: '50px',
        background: 'rgba(79,70,229,0.85)',
        borderRadius: '50%',
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        lineHeight: '50px',
        fontSize: '15px',
      }, {
        width: '60px', height: '60px',
        background: 'rgba(67,56,202,0.9)',
        borderRadius: '50%',
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
        lineHeight: '60px',
        fontSize: '16px',
      }],
    });

    // 모든 마커가 보이도록 자동 줌 맞춤
    map.setBounds(bounds, 50);
  }, [viewTab, isKakaoMapLoaded, userLocation, mapRestaurants, popularMatzalAl, filteredRestaurants, selectedCategory, mapRadius, router]);

  // 랜덤 룰렛 실행
  const handleRoulette = useCallback(async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowRouletteResult(false);

    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const typeParam = selectedCategory !== '전체' ? `?type=${encodeURIComponent(selectedCategory)}` : '';
      const response = await fetch(`${backendURL}/restaurant/random${typeParam}`);

      if (response.ok) {
        const data = await response.json();
        // 슬롯머신 효과를 위해 딜레이
        setTimeout(() => {
          setRouletteResult(data);
          setShowRouletteResult(true);
          setIsSpinning(false);
        }, 1500);
      } else {
        setIsSpinning(false);
      }
    } catch (err) {
      console.error('랜덤 추천 오류:', err);
      setIsSpinning(false);
    }
  }, [isSpinning, selectedCategory]);

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
    const restaurantName = suggestion.restaurantName || suggestion.matzalAlName;
    const restaurantAddr = suggestion.restaurantAddr || suggestion.matzalAlLocation;
    setSearchTerm(restaurantName);
    setShowSuggestions(false);
    setError(null);
    addToRecentSearches(restaurantName);
    // 자동완성 선택 시에는 식당명과 주소로 상세 페이지로 이동
    const params = new URLSearchParams();
    if (suggestion.restaurantIdx) {
      params.append('restaurantIdx', suggestion.restaurantIdx);
    }
    if (restaurantAddr) {
      params.append('restaurantAddr', restaurantAddr);
    }
    router.push(`/matzal-al-mentor/${encodeURIComponent(restaurantName)}?${params.toString()}`);
  };

  // 검색 수행 및 결과에 따른 라우팅
  const performSearchAndNavigate = async (searchTerm: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      
      // 자동완성 API를 사용해서 결과 개수 확인
      const autoResponse = await fetch(`${backendURL}/restaurant/auto?keyword=${encodeURIComponent(searchTerm)}`);
      
      if (!autoResponse.ok) {
        throw new Error(`HTTP error! status: ${autoResponse.status}`);
      }

      const autoData = await autoResponse.json();
      
      const results = Array.isArray(autoData) ? autoData : (autoData.data || []);

      // 자동완성 결과가 배열인지 확인
      if (Array.isArray(results) && results.length > 0) {
        if (results.length === 1) {
          // 정확히 1개 결과가 있으면 식당명과 주소로 바로 상세 페이지로 이동
          const result = results[0];
          const restaurantName = result.restaurantName || result.matzalAlName;
          const restaurantAddr = result.restaurantAddr || result.matzalAlLocation;
          const params = new URLSearchParams();
          if (result.restaurantIdx) {
            params.append('restaurantIdx', result.restaurantIdx);
          }
          if (restaurantAddr) {
            params.append('restaurantAddr', restaurantAddr);
          }
          router.push(`/matzal-al-mentor/${encodeURIComponent(restaurantName)}?${params.toString()}`);
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
                    className="px-3 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm sm:text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 flex items-center space-x-1 sm:space-x-2 whitespace-nowrap min-w-[70px] sm:min-w-[80px]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="whitespace-nowrap">검색</span>
                  </button>
                </div>

                {/* 자동완성 드롭다운 */}
                {showSuggestions && (suggestions.length > 0 || isLoading || error || searchTerm.trim()) && (
                  <div className="absolute top-full left-2 right-2 sm:left-0 sm:right-0 mt-3 bg-white/95 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl z-10 max-h-80 overflow-y-auto">
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
                            <div className="font-semibold text-gray-900">
                              {suggestion.restaurantName || suggestion.matzalAlName}
                            </div>
                            <div className="text-sm text-gray-500">
                              📍 {suggestion.restaurantAddr || suggestion.matzalAlLocation}
                            </div>
                            <div className="text-xs text-gray-400">
                              {suggestion.restaurantType || suggestion.matzalAlType}
                            </div>
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

      {/* 맛잘알 추가 요청 CTA 배너 - 검색창 바로 아래 */}
      <div className="bg-blue-500 py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                숨겨져 있는 나만의 맛집을 알고 계신가요?
              </h3>
              <p className="text-blue-50 text-sm md:text-base">
                지금 요청하고 더 많은 맛집 정보를 공유해보세요
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-blue-50 transition-all duration-300 hover:scale-105 hover:shadow-xl whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>맛잘알 추가 요청</span>
            </button>
          </div>
        </div>
      </div>

      {/* 카테고리 필터 + 랜덤 룰렛 섹션 */}
      <div className="bg-gray-50 py-6 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 카테고리 이모지 필터 */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">카테고리</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('전체')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === '전체'
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                전체
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.restaurantType}
                  onClick={() => setSelectedCategory(cat.restaurantType)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategory === cat.restaurantType
                      ? 'bg-blue-600 text-white shadow-md scale-105'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {cat.restaurantType} <span className="text-xs opacity-60">({cat.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* 오늘 뭐 먹지? 랜덤 룰렛 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  오늘 뭐 먹지?
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedCategory !== '전체' ? `${selectedCategory} 중에서` : '전체 맛집 중에서'} 랜덤 추천!
                </p>
              </div>
              <button
                onClick={handleRoulette}
                disabled={isSpinning}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 ${
                  isSpinning
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 hover:scale-105 hover:shadow-lg'
                }`}
              >
                <span>{isSpinning ? '추천 중...' : '랜덤 추천!'}</span>
              </button>
            </div>

            {/* 룰렛 결과 */}
            <AnimatePresence>
              {showRouletteResult && rouletteResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">
                      {rouletteResult.restaurantType || '맛집'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-600 font-semibold mb-0.5">오늘의 추천</p>
                      <h4 className="text-lg font-bold text-gray-900 truncate">{rouletteResult.restaurantName}</h4>
                      <p className="text-sm text-gray-500 truncate">📍 {rouletteResult.restaurantAddr || rouletteResult.restaurantLocation}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-600">{rouletteResult.restaurantType}</span>
                        {rouletteResult.averageRating > 0 && (
                          <span className="text-xs text-yellow-600">⭐ {rouletteResult.averageRating.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const params = new URLSearchParams();
                        if (rouletteResult.restaurantIdx) params.append('restaurantIdx', rouletteResult.restaurantIdx);
                        if (rouletteResult.restaurantAddr) params.append('restaurantAddr', rouletteResult.restaurantAddr);
                        router.push(`/matzal-al-mentor/${encodeURIComponent(rouletteResult.restaurantName)}?${params.toString()}`);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors flex-shrink-0"
                    >
                      상세보기
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* 검색창 밑 컨텐츠 */}
      <div className="bg-white py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* 탭 헤더 + 맛집 카드/지도 섹션 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {viewTab === 'map'
                    ? (selectedCategory === '전체'
                        ? (mapRadius > 0 ? `내 주변 ${mapRadius}km 맛집` : '전체 맛집')
                        : (mapRadius > 0 ? `내 주변 ${mapRadius}km ${selectedCategory} 맛집` : `전체 ${selectedCategory} 맛집`))
                    : (selectedCategory === '전체' ? '오늘의 맛잘알 추천' : `${selectedCategory} 맛집`)}
                </h2>
                {viewTab === 'map' && (
                  <select
                    value={mapRadius}
                    onChange={(e) => setMapRadius(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={3}>3km</option>
                    <option value={5}>5km</option>
                    <option value={10}>10km</option>
                    <option value={0}>전체</option>
                  </select>
                )}
              </div>
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewTab('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewTab === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  카드
                </button>
                <button
                  onClick={() => setViewTab('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    viewTab === 'map'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  지도
                </button>
              </div>
            </div>

            {/* 카드 뷰 */}
            {viewTab === 'grid' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedCategory === '전체' ? popularMatzalAl : filteredRestaurants).slice(0, 9).map((matzalAl, index) => (
                  <div
                    key={matzalAl.matzalAlIdx}
                    onClick={() => handlePopularMatzalAlClick(matzalAl)}
                    className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden"
                  >
                    <div className="relative w-full h-40 bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 overflow-hidden">
                      {(() => {
                        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
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
                        const hasError = imageErrors.has(matzalAl.matzalAlIdx);

                        return imageUrl && !hasError ? (
                          <img
                            src={imageUrl}
                            alt={matzalAl.matzalAlName}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors(prev => new Set(prev).add(matzalAl.matzalAlIdx));
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
                            <svg className="w-20 h-20 text-orange-400 mb-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.20-1.10-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                            </svg>
                            <span className="text-xs text-orange-600 font-medium">맛잘알 오빠</span>
                          </div>
                        );
                      })()}
                      {(matzalAl as any).averageRating !== null && (matzalAl as any).averageRating !== undefined && (matzalAl as any).averageRating > 0 ? (
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
                          <span className="text-xs font-semibold text-gray-700">
                            {((matzalAl as any).averageRating as number).toFixed(1)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {matzalAl.matzalAlName}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                        {matzalAl.matzalAlLocation}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {matzalAl.matzalAlType || '맛집'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 지도 뷰 */}
            {viewTab === 'map' && (
              <div className="rounded-xl border border-gray-200 overflow-hidden relative" style={{ height: '500px' }}>
                <div
                  ref={mapContainerRef}
                  className="w-full h-full"
                />
                {!isKakaoMapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
                      <p className="text-sm text-gray-500">지도를 불러오는 중...</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 인기 식당 TOP 10 및 인기 후기 TOP 10 섹션 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 인기 맛잘알 섹션 */}
            <div className="relative">
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
                                <p className="text-xs text-gray-400 truncate">{matzalAl.matzalAlType} • 조회 {matzalAl.viewCount || 0}</p>
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
                            <p className="text-xs text-gray-500 truncate">{board.restaurant?.restaurantName || board.restaurantName || '맛집명 없음'}</p>
                            <p className="text-xs text-gray-400 truncate">좋아요 {board.boardLike} • 조회 {board.boardHits}</p>
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
