'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Church, ChurchBoard, ApiResponse } from '@/types/Church';

export default function ChurchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const churchName = decodeURIComponent(params.name as string);
  
  const [church, setChurch] = useState<Church | null>(null);
  const [boards, setBoards] = useState<ChurchBoard[]>([]);
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
    writerPw: ''
  });
  
  // 카카오맵 관련 상태
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  
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
  const filteredBoards = sortedBoards.filter(board => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    switch (searchType) {
      case 'title':
        return board.boardTitle.toLowerCase().includes(query);
      case 'content':
        return board.boardContent.toLowerCase().includes(query);
      case 'id':
        return board.boardID.toLowerCase().includes(query);
      default:
        return true;
    }
  });

  // 페이징 계산
  const totalPages = Math.ceil(filteredBoards.length / itemsPerPage);
  const paginatedBoards = filteredBoards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
    
    // 검색 시뮬레이션 (실제로는 API 호출)
    setTimeout(() => {
      setIsSearching(false);
    }, 500);
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
          typeof window.kakao.maps.LatLng === 'function' && 
          typeof window.kakao.maps.Map === 'function' &&
          typeof window.kakao.maps.Marker === 'function') {
        setIsKakaoMapLoaded(true);
        return;
      }

      // 카카오맵 스크립트가 이미 있는지 확인
      const existingScript = document.querySelector('script[src*="kakao"]');
      if (existingScript) {
        // 기존 스크립트가 있으면 바로 kakao.maps.load() 사용
        if (window.kakao?.maps?.load) {
          window.kakao.maps.load(() => {
            setIsKakaoMapLoaded(true);
            (window as any).kakaoMapLoading = false;
          });
        } else {
          console.log('기존 스크립트에서 kakao.maps.load 함수를 찾을 수 없음');
        }
        return;
      }

      // 전역 상태 설정
      (window as any).kakaoMapLoading = true;

      // 카카오맵 스크립트 동적 로딩
      const script = document.createElement('script');
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services`;
      script.async = true;
      
      script.onload = () => {
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
      };
      
      script.onerror = () => {
        console.error('카카오맵 스크립트 로드 실패');
        (window as any).kakaoMapLoading = false;
      };
      
      document.head.appendChild(script);
    };

    loadKakaoMap();
  }, []);

  // 교회 정보 가져오기
  useEffect(() => {
    const fetchChurchInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const backendURL = 'https://api.reviewhub.life';
        const response = await fetch(`${backendURL}/church`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: Church[] = await response.json();
        
        if (Array.isArray(data)) {
          // 교회 이름으로 필터링하여 해당 교회 찾기
          const foundChurch = data.find(church => 
            church.churchName === churchName
          );
          
          if (foundChurch) {
            setChurch(foundChurch);
          } else {
            throw new Error('교회 정보를 찾을 수 없습니다.');
          }
        } else {
          throw new Error('교회 정보를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('교회 정보 로딩 오류:', error);
        setError('교회 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (churchName) {
      fetchChurchInfo();
    }
  }, [churchName]);

  // 교회 게시판 목록 가져오기
  useEffect(() => {
    const fetchChurchBoards = async () => {
      if (!church) return;
      
      try {
        setIsBoardLoading(true);
        setBoardError(null);
        
        const backendURL = 'https://api.reviewhub.life';
        const response = await fetch(`${backendURL}/church/board?churchIdx=${church.churchIdx}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // API 응답 구조 확인을 위한 로그
        console.log('교회 후기 API 응답:', data);
        
        // API 응답이 직접 배열인 경우
        if (Array.isArray(data)) {
          setBoards(data);
        } 
        // API 응답이 객체이고 status가 있는 경우
        else if (data && typeof data === 'object' && data.status === 200) {
          if (data.data && Array.isArray(data.data)) {
            setBoards(data.data);
          } else {
            setBoards([]);
          }
        } 
        // 기타 경우
        else {
          setBoards([]);
        }
      } catch (error) {
        console.error('게시판 로딩 오류:', error);
        setBoardError('게시판을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsBoardLoading(false);
      }
    };

    if (church) {
      fetchChurchBoards();
    }
  }, [church]);

  // 카카오맵 초기화
  const initializeKakaoMap = () => {
    if (!church || !church.churchLatX || !church.churchLatY || !mapRef.current || mapInstance.current) {
      return;
    }

    try {
      const container = mapRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(church.churchLatX, church.churchLatY),
        level: 3
      };

      const map = new window.kakao.maps.Map(container, options);
      mapInstance.current = map;

      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(church.churchLatX, church.churchLatY);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition
      });
      marker.setMap(map);

      // 커스텀 오버레이 생성
      const overlayContent = `
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          min-width: 250px;
          max-width: 350px;
          width: 350px;
        ">
          <div style="
            padding: 12px 16px 8px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
            position: relative;
          ">
            <div style="
              font-weight: bold;
              font-size: 14px;
              margin-bottom: 4px;
              word-break: break-word;
              padding-right: 30px;
            ">${church.churchName}</div>
            <div style="
              font-size: 12px;
              opacity: 0.9;
              word-break: break-word;
              padding-right: 30px;
            ">${church.churchType}</div>
            <div data-close style="
              position: absolute;
              top: 8px;
              right: 8px;
              cursor: pointer;
              width: 20px;
              height: 20px;
              background: rgba(255,255,255,0.3);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              color: white;
              user-select: none;
              transition: background 0.2s;
            ">×</div>
          </div>
          <div style="
            padding: 20px;
            background: white;
            border-radius: 0 0 8px 8px;
          ">
            <div style="
              display: flex;
              gap: 15px;
              align-items: flex-start;
            ">
              <div data-imgbox style="
                flex-shrink: 0;
                width: 80px;
                height: 80px;
                border-radius: 8px;
                overflow: hidden;
                background: #f8f9fa;
                display: flex;
                align-items: center;
                justify-content: center;
              "></div>
              <div style="flex: 1; min-width: 0; overflow: hidden;">
                <div style="
                  margin-bottom: 8px;
                  color: #333;
                  font-size: 14px;
                  line-height: 1.4;
                  word-break: break-word;
                  overflow-wrap: break-word;
                  white-space: normal;
                  max-width: 100%;
                ">📍 ${church.churchAddr || church.churchLocation}</div>
                <div style="
                  margin-bottom: 12px;
                  color: #666;
                  font-size: 13px;
                  line-height: 1.3;
                  word-break: break-word;
                  overflow-wrap: break-word;
                  white-space: normal;
                  max-width: 100%;
                ">🏢 ${church.churchLotAddr || ''}</div>
                ${church.churchURL ? `
                <a href="${church.churchURL}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style="
                     display: inline-block;
                     background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                     color: white;
                     text-decoration: none;
                     padding: 8px 16px;
                     border-radius: 6px;
                     font-size: 13px;
                     font-weight: 500;
                     transition: transform 0.2s, box-shadow 0.2s;
                     word-break: keep-all;
                   ">🌐 교회 홈페이지</a>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `;

      const wrap = document.createElement('div');
      wrap.innerHTML = overlayContent;

      const overlay = new window.kakao.maps.CustomOverlay({
        content: wrap,
        position: markerPosition,
        yAnchor: 1
      });

      // 오버레이를 외부에서 접근할 수 있도록 저장
      (wrap as any)['_overlay'] = overlay;

      // 이미지 삽입 + 에러 처리
      const box = wrap.querySelector('[data-imgbox]') as HTMLDivElement;
      if (church.churchMapIMG) {
        const img = document.createElement('img');
        img.src = church.churchMapIMG;
        img.alt = church.churchName;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.addEventListener('error', () => {
          box.innerHTML = '⛪';
          box.style.fontSize = '24px';
          box.style.color = '#666';
        });
        box.appendChild(img);
      } else {
        box.innerHTML = '⛪';
        box.style.fontSize = '24px';
        box.style.color = '#666';
      }

      // 닫기 버튼 이벤트
      const closeBtn = wrap.querySelector('[data-close]') as HTMLDivElement;
      closeBtn.addEventListener('click', () => {
        overlay.setMap(null);
      });

      // 호버 효과 추가
      closeBtn.addEventListener('mouseover', () => {
        closeBtn.style.background = 'rgba(255,255,255,0.5)';
      });
      closeBtn.addEventListener('mouseout', () => {
        closeBtn.style.background = 'rgba(255,255,255,0.3)';
      });

      overlay.setMap(map);

    } catch (error) {
      console.error('카카오맵 초기화 오류:', error);
    }
  };

  // 카카오맵 초기화
  useEffect(() => {
    if (isKakaoMapLoaded && church && mapRef.current && !mapInstance.current) {
      // 간단한 방법: 1초 후에 직접 초기화 시도
      setTimeout(() => {
        initializeKakaoMap();
      }, 1000);
    }
  }, [isKakaoMapLoaded, church]);

  // 게시글 클릭 핸들러

  // 새 게시글 작성 핸들러
  const handleWriteBoard = () => {
    setShowWriteModal(true);
  };

  // 후기 작성 제출
  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!writeForm.boardTitle.trim() || !writeForm.boardContent.trim() || !writeForm.boardID.trim() || !writeForm.writerPw.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    if (!church) {
      alert('교회 정보를 찾을 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      
      // 오늘 날짜 포맷
      const date = new Date();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      const dateFormat = `${year}-${month}-${day}`;

      const requestData = {
        churchIdx: church.churchIdx,
        boardTitle: writeForm.boardTitle.trim(),
        boardContent: writeForm.boardContent.trim(),
        boardReg: dateFormat,
        boardLike: 0,
        boardHits: 0,
        boardId: writeForm.boardID.trim(),
        boardPw: writeForm.writerPw.trim()
      };
      
      console.log('후기 작성 요청 데이터:', requestData);
      
      const response = await fetch(`${backendURL}/church/board/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('후기 작성 응답 상태:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('후기 작성 성공 응답:', result);
        alert('후기가 성공적으로 작성되었습니다.');
        setShowWriteModal(false);
        setWriteForm({
          boardTitle: '',
          boardContent: '',
          boardID: '',
          writerPw: ''
        });
        // 후기 목록 새로고침
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('후기 작성 에러 응답:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('후기 작성 오류:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`후기 작성 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기
  const handleCloseWriteModal = () => {
    setShowWriteModal(false);
    setWriteForm({
      boardTitle: '',
      boardContent: '',
      boardID: '',
      writerPw: ''
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">교회 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !church) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">교회 정보를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">{error || '요청하신 교회가 존재하지 않습니다.'}</p>
          <Link
            href="/church-mentor"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            교회 오빠로 돌아가기
          </Link>
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
            <Link href="/church-mentor" className="text-2xl font-bold text-red-400">
              교회 오빠
            </Link>
            <div className="text-gray-300">
              {church.churchName}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 교회 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {church.churchName}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 좌측 컨텐츠 */}
          <div className="space-y-6">
            {/* 교회 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">교회 정보</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-red-200 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">위치</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{church.churchLocation}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-red-200 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">구분</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{church.churchType}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-red-200 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">설립</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {church.churchEstablished ? `${church.churchEstablished}` : '정보 없음'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-red-200 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">담임목사</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{church.churchPastor}</span>
                </div>
              </div>

              {church.churchURL && (
                <a
                  href={church.churchURL.match(/^https?:\/\//) ? church.churchURL : `https://${church.churchURL}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  교회 홈페이지
                </a>
              )}
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
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">지도 초기화 중...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 공유하기 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">교회 공유하기</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${church.churchName} 교회 정보 - 교회 오빠`)}&url=${encodeURIComponent(window.location.href)}`)}
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

          {/* 우측 컨텐츠 - 교회 후기 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs sm:text-sm md:text-base lg:text-xl font-semibold text-gray-800">교회 후기</h2>
                <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3">
                  {/* 정렬 필터 버튼 - 단일 토글 */}
                  <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="p-0.5 sm:p-1 md:p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
                    title={sortOrder === 'desc' ? '최신순 (클릭시 오래된순으로 변경)' : '오래된순 (클릭시 최신순으로 변경)'}
                  >
                    <svg className="w-2.5 h-2.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="px-1.5 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">게시판을 불러오는 중...</p>
                  </div>
                ) : boardError ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-red-500">{boardError}</p>
                  </div>
                ) : paginatedBoards.length > 0 ? (
                  <>
                    {paginatedBoards.map((board) => (
                      <div
                        key={board.boardIdx}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/church-board/${board.boardIdx}`)}
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
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg transform scale-105'
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
                    {searchQuery ? '검색 결과가 없습니다' : '아직 교회 후기가 없습니다.\n첫 번째 후기를 작성해보세요!'}
                  </div>
                )}

                {/* 검색창 - 항상 표시 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    {/* 검색 타입 선택 */}
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value as 'id' | 'title' | 'content')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                    >
                      <option value="title">제목</option>
                      <option value="content">내용</option>
                      <option value="id">작성자</option>
                    </select>
                    
                    {/* 검색어 입력 */}
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="검색어를 입력하세요"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(e as any)}
                    />
                    
                    {/* 검색 버튼 */}
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 min-w-[100px] justify-center text-white rounded-lg"
                    >
                      {isSearching ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>검색중...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>검색</span>
                        </>
                      )}
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
              <h3 className="text-lg font-semibold">{church?.churchName}의 후기를 남겨주세요</h3>
              <button 
                onClick={handleCloseWriteModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleWriteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input 
                  type="text" 
                  value={writeForm.boardTitle}
                  onChange={(e) => setWriteForm({...writeForm, boardTitle: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  maxLength={40} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                <textarea 
                  value={writeForm.boardContent}
                  onChange={(e) => setWriteForm({...writeForm, boardContent: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  rows={4} 
                  maxLength={700} 
                  required
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">다른 사람의 인격권을 침해하거나 명예를 훼손하게 하는 글은 삭제될 수 있습니다.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">작성자</label>
                  <input 
                    type="text" 
                    value={writeForm.boardID}
                    onChange={(e) => setWriteForm({...writeForm, boardID: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                  <input 
                    type="password" 
                    value={writeForm.writerPw}
                    onChange={(e) => setWriteForm({...writeForm, writerPw: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button 
                  type="button" 
                  onClick={handleCloseWriteModal}
                  className="px-6 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium"
                >
                  닫기
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isSubmitting ? '작성 중...' : '글쓰기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
