'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getOutsourceBoardList } from '@/lib/outsource/outsourceAPI';
import { OutsourceBoard } from '@/types/Outsource';

// 카카오맵 타입 선언
declare global {
  interface Window {
    kakao: any;
  }
}

export default function OutsourceDetailByNamePage() {
  const router = useRouter();
  const params = useParams();
  const param = params.name as string;
  
  // idx인지 name인지 판단
  const isIdx = /^\d+$/.test(param);
  const outsourceIdx = isIdx ? parseInt(param) : null;
  const outsourceName = isIdx ? null : decodeURIComponent(param);

  const [outsource, setOutsource] = useState<any>(null);
  const [boards, setBoards] = useState<OutsourceBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 카카오맵 관련 상태
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  
  // 글쓰기 모달 관련 상태
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [writeForm, setWriteForm] = useState({
    boardTitle: '',
    boardContent: '',
    boardID: '',
    boardPw: ''
  });

  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 정렬 관련 상태
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc: 최신순, asc: 오래된순

  // 검색 관련 상태
  const [searchType, setSearchType] = useState<'id' | 'title' | 'content'>('title');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 정렬된 후기 목록 계산
  const sortedBoards = [...boards].sort((a, b) => {
    const dateA = new Date(a.boardRegDate).getTime();
    const dateB = new Date(b.boardRegDate).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // 검색된 후기 목록 계산
  const filteredBoards = sortedBoards.filter((board) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    
    switch (searchType) {
      case 'id':
        return board.boardID.toLowerCase().includes(query);
      case 'title':
        return board.boardTitle.toLowerCase().includes(query);
      case 'content':
        return board.boardContent.toLowerCase().includes(query);
      default:
        return true;
    }
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredBoards.length / itemsPerPage);
  const paginatedBoards = filteredBoards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setCurrentPage(1);
    setTimeout(() => setIsSearching(false), 300);
  };

  // 글쓰기 핸들러
  const handleWriteBoard = () => {
    if (!outsource) {
      alert('외주업체 정보를 불러오는 중입니다.');
      return;
    }
    setShowWriteModal(true);
  };

  // 카카오맵 API 동적 로딩
  useEffect(() => {
    // 전역 상태로 카카오맵 로딩 상태 관리
    if ((window as any).kakaoMapLoading) {
      return;
    }
    
    const loadKakaoMap = () => {
      // 이미 로드되어 있다면 스킵
      if (window.kakao && window.kakao.maps && 
          window.kakao.maps.Map && window.kakao.maps.services) {
        setIsKakaoMapLoaded(true);
        return;
      }
      
      // 카카오맵 API 로드
      const script = document.createElement('script');
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer`;
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
    if (!outsource || !outsource.outsourceLatX || !outsource.outsourceLatY || !mapRef.current || mapInstance.current) {
      return;
    }

    try {
      const container = mapRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(outsource.outsourceLatX, outsource.outsourceLatY),
        level: 3
      };

      const map = new window.kakao.maps.Map(container, options);
      mapInstance.current = map;

      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(outsource.outsourceLatX, outsource.outsourceLatY);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition
      });
      marker.setMap(map);

      // 커스텀 오버레이 생성
      const overlayContent = `
        <div style="padding: 10px; background: white; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <div style="font-weight: bold; margin-bottom: 5px;">${outsource.outsourceName}</div>
          <div style="font-size: 12px; color: #666;">${outsource.outsourceAddr}</div>
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

  // 외주업체 정보가 로드되고 카카오맵이 준비되면 지도 초기화
  useEffect(() => {
    if (isKakaoMapLoaded && outsource && outsource.outsourceLatX && outsource.outsourceLatY) {
      initializeKakaoMap();
    }
  }, [isKakaoMapLoaded, outsource]);

  // 글쓰기 폼 핸들러
  const handleWriteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWriteForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 글쓰기 제출
  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outsource) return;

    try {
      setIsSubmitting(true);
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      
      const response = await fetch(`${backendURL}/outsource/boards/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardTitle: writeForm.boardTitle,
          boardContent: writeForm.boardContent,
          boardID: writeForm.boardID,
          boardPw: writeForm.boardPw,
          outsourceIdx: outsource.outsourceIdx
        })
      });

      if (response.ok) {
        alert('후기가 성공적으로 등록되었습니다.');
        setShowWriteModal(false);
        setWriteForm({ boardTitle: '', boardContent: '', boardID: '', boardPw: '' });
        // 후기 목록 새로고침
        window.location.reload();
      } else {
        throw new Error('후기 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('후기 등록 오류:', error);
      alert('후기 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 외주업체 정보 가져오기
  useEffect(() => {
    const fetchOutsourceInfo = async () => {
      if (!outsourceName && !outsourceIdx) return;

      try {
        setLoading(true);
        setError(null);

        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        let response;

        if (outsourceIdx) {
          // idx로 조회할 때는 먼저 목록에서 해당 외주업체를 찾아야 함
          response = await fetch(`${backendURL}/outsource?limit=1000`);
        } else {
          // 이름으로 상세 조회 API 사용
          response = await fetch(`${backendURL}/outsource/outsource?outsourceName=${encodeURIComponent(outsourceName!)}`);
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (outsourceIdx) {
          // idx로 조회한 경우 - 목록에서 해당 외주업체 찾기
          let searchResults = [];
          
          if (Array.isArray(data)) {
            searchResults = data;
          } else if (data.data && Array.isArray(data.data)) {
            searchResults = data.data;
          }

          const exactMatch = searchResults.find((item: any) => item.outsourceIdx === outsourceIdx);
          
          if (exactMatch) {
            setOutsource(exactMatch);
          } else {
            setError('해당 외주업체를 찾을 수 없습니다.');
          }
        } else {
          // 이름으로 조회한 경우 - 상세 조회 API 응답 직접 사용
          if (data && data.outsourceName) {
            setOutsource(data);
          } else {
            setError('해당 외주업체를 찾을 수 없습니다.');
          }
        }
      } catch (error) {
        console.error('외주업체 정보 로딩 오류:', error);
        setError('외주업체 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchOutsourceInfo();
  }, [outsourceName, outsourceIdx]);

  // 후기 목록 가져오기
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        setBoardsLoading(true);
        // outsourceIdx가 있을 때만 해당 외주업체의 후기 목록을 가져옴
        const response = await getOutsourceBoardList({ 
          outsourceIdx: outsource?.outsourceIdx,
          limit: 10 
        });
        console.log('외주업체 후기 API 응답:', response);
        
        // API 응답 구조에 따라 데이터 추출
        let boardsData: OutsourceBoard[] = [];
        if (Array.isArray(response)) {
          // 응답이 직접 배열인 경우
          boardsData = response as OutsourceBoard[];
        } else if (response.data && Array.isArray(response.data)) {
          // 응답이 {data: [...]} 형태인 경우
          boardsData = response.data as OutsourceBoard[];
        } else if (response.data) {
          // 응답이 {data: {...}} 형태인 경우 (단일 객체를 배열로 변환)
          boardsData = [response.data as OutsourceBoard];
        }
        
        console.log('추출된 boards 데이터:', boardsData);
        console.log('boards 배열 길이:', boardsData.length);
        setBoards(boardsData);
      } catch (error) {
        console.error('후기 목록 로딩 오류:', error);
      } finally {
        setBoardsLoading(false);
      }
    };

    if (outsource) {
      fetchBoards();
    }
  }, [outsource, outsourceName, outsourceIdx]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-gray-800 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/outsource-mentor" className="text-2xl font-bold text-yellow-400">
                외주 오빠
              </Link>
              <div className="text-gray-300">외주업체 상세정보</div>
            </div>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">오류가 발생했습니다</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Link
              href="/outsource-mentor"
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              외주 오빠로 돌아가기
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
            <Link href="/outsource-mentor" className="text-2xl font-bold text-yellow-400">
              외주 오빠
            </Link>
            <div className="text-gray-300">
              {outsource?.outsourceName}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 외주업체 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {outsource?.outsourceName}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 좌측 컨텐츠 */}
          <div className="space-y-6">
            {/* 외주업체 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">외주업체 정보</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-yellow-300 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">위치</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{outsource?.outsourceAddr || '정보 없음'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-yellow-300 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">업종</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{outsource?.outsourceType || '정보 없음'}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-yellow-300 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">대표자</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{outsource?.outsourceCEO || '정보 없음'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-yellow-300 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">상태</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">운영중</span>
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
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">지도를 불러오는 중...</p>
                    </div>
                  </div>
                )}
                {isKakaoMapLoaded && !mapInstance.current && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">지도 초기화 중...</p>
                    </div>
                  </div>
                )}
                {!outsource?.outsourceLatX || !outsource?.outsourceLatY ? (
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
              <h3 className="text-lg font-semibold text-gray-800 mb-4">외주업체 공유하기</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${outsource?.outsourceName} 외주업체 정보 - 외주 오빠`)}&url=${encodeURIComponent(window.location.href)}`)}
                  className="w-12 h-12 bg-blue-400 text-white rounded-full hover:bg-blue-500 transition-colors flex items-center justify-center"
                  title="트위터에 공유"
                >
                  <i className="fa fa-twitter text-xl"></i>
                </button>
                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}
                  className="w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title="페이스북에 공유"
                >
                  <i className="fa fa-facebook text-xl"></i>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      alert('링크가 클립보드에 복사되었습니다!');
                    } catch (error) {
                      console.error('링크 복사 실패:', error);
                    }
                  }}
                  className="w-12 h-12 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
                  title="링크 복사"
                >
                  <i className="fa fa-link text-xl"></i>
                </button>
              </div>
            </div>
          </div>

          {/* 우측 컨텐츠 */}
          <div className="space-y-6">
            {/* 외주업체 후기 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs sm:text-sm md:text-base lg:text-xl font-semibold text-gray-800">외주업체 후기</h2>
                <div className="flex items-center gap-2 sm:gap-2 md:gap-3">
                  {/* 정렬 필터 버튼 - 단일 토글 */}
                  <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="px-2 py-1.5 sm:p-1 md:p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center gap-1 sm:space-x-1 md:space-x-2"
                    title={sortOrder === 'desc' ? '최신순 (클릭시 오래된순으로 변경)' : '오래된순 (클릭시 최신순으로 변경)'}
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {sortOrder === 'desc' ? (
                        // 최신순일 때: 위쪽 화살표
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14l5-5 5 5" />
                      ) : (
                        // 오래된순일 때: 아래쪽 화살표
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      )}
                    </svg>
                    <span className="text-xs sm:text-sm font-semibold text-gray-600">
                      {sortOrder === 'desc' ? '최신순' : '오래된순'}
                    </span>
                  </button>

                  <button
                    onClick={handleWriteBoard}
                    className="px-3 py-1.5 sm:px-3 md:px-6 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-1 sm:space-x-1 md:space-x-2"
                  >
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs sm:text-sm font-semibold">글쓰기</span>
                  </button>
                </div>
              </div>

              {/* 후기 목록 */}
              <div className="space-y-4">
                {boardsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">게시판을 불러오는 중...</p>
                  </div>
                ) : paginatedBoards.length > 0 ? (
                  <>
                    {paginatedBoards.map((board) => (
                      <div
                        key={board.boardIdx}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/outsource-board/${board.boardIdx}`)}
                      >
                        <h3 className="font-semibold text-gray-900 mb-2">{board.boardTitle}</h3>
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                          <span>작성자: {board.boardID}</span>
                          <span>{board.boardRegDate}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>조회수: {board.boardHits}</span>
                          <span>좋아요: {board.boardLike}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* 페이징 */}
                    {totalPages > 1 && (
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
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              currentPage === page
                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg transform scale-105'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
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
                    {searchQuery ? '검색 결과가 없습니다' : '아직 외주업체 후기가 없습니다.\n첫 번째 후기를 작성해보세요!'}
                  </div>
                )}

                {/* 검색창 - 항상 표시 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    {/* 검색 타입 선택 */}
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value as 'id' | 'title' | 'content')}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white text-sm"
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
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                    />
                    
                    {/* 검색 버튼 */}
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>{isSearching ? '검색 중...' : '검색'}</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 글쓰기 모달 */}
      {showWriteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">외주업체 후기</h2>
                <button
                  onClick={() => setShowWriteModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleWriteSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    제목
                  </label>
                  <input
                    type="text"
                    name="boardTitle"
                    value={writeForm.boardTitle}
                    onChange={handleWriteFormChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="후기 제목을 입력해주세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    내용
                  </label>
                  <textarea
                    name="boardContent"
                    value={writeForm.boardContent}
                    onChange={handleWriteFormChange}
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-y"
                    placeholder="외주업체에 대한 후기를 작성해주세요"
                  />
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  다른 사람의 인격권을 침해하거나 명예를 훼손하게 하는 글은 삭제될 수 있습니다.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      작성자
                    </label>
                    <input
                      type="text"
                      name="boardID"
                      value={writeForm.boardID}
                      onChange={handleWriteFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="작성자 ID를 입력해주세요"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      비밀번호
                    </label>
                    <input
                      type="password"
                      name="boardPw"
                      value={writeForm.boardPw}
                      onChange={handleWriteFormChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="비밀번호를 입력해주세요"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWriteModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    닫기
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? '등록 중...' : '글쓰기'}
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