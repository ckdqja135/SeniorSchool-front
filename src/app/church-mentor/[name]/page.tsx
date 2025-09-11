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
  
  // 카카오맵 관련 상태
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);

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
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=80d6fac198542c9021cd4229a30df6b2&autoload=false&libraries=services';
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
        
        const data: ApiResponse<ChurchBoard[]> = await response.json();
        
        if (data.status === 200 && data.data) {
          setBoards(data.data);
        } else {
          throw new Error('게시판 정보를 찾을 수 없습니다.');
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
          min-width: 200px;
          max-width: 300px;
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
            ">${church.churchName}</div>
            <div style="
              font-size: 12px;
              opacity: 0.9;
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
              <div style="flex: 1; min-width: 0;">
                <div style="
                  margin-bottom: 8px;
                  color: #333;
                  font-size: 14px;
                  line-height: 1.4;
                  word-break: break-word;
                ">📍 ${church.churchAddr || church.churchLocation}</div>
                <div style="
                  margin-bottom: 12px;
                  color: #666;
                  font-size: 13px;
                  line-height: 1.3;
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
  const handleBoardClick = (board: ChurchBoard) => {
    router.push(`/church-board/${board.boardIdx}`);
  };

  // 새 게시글 작성 핸들러
  const handleWriteBoard = () => {
    if (church) {
      router.push(`/church-board/write?churchIdx=${church.churchIdx}`);
    }
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
              <h2 className="text-2xl font-bold text-gray-800 mb-6 tracking-wide">교회 정보</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1 block">위치</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{church.churchLocation}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">종류</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{church.churchType}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1 block">설립</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">
                    {church.churchEstablished ? church.churchEstablished : '정보 없음'}
                  </p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-orange-700 font-bold uppercase tracking-wider mb-1 block">담임목사</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{church.churchPastor}</p>
                </div>
              </div>
              
              <div className="mt-8">
                {church.churchURL && (
                  <a
                    href={church.churchURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-base shadow-md hover:shadow-lg"
                  >
                    <i className="fa fa-external-link mr-3 text-lg"></i>
                    교회 홈페이지
                  </a>
                )}
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
                  <button
                    onClick={handleWriteBoard}
                    className="px-1.5 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
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
                ) : boards.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-4xl mb-3">📝</div>
                    <p className="text-sm text-gray-500">아직 게시글이 없습니다.</p>
                    <p className="text-xs text-gray-400 mt-1">첫 번째 게시글을 작성해보세요!</p>
                  </div>
                ) : (
                  boards.map((board) => (
                    <div 
                      key={board.boardIdx} 
                      onClick={() => handleBoardClick(board)}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base md:text-lg line-clamp-2">{board.boardTitle}</h3>
                        <div className="flex items-center space-x-2 ml-2">
                          <span className="text-xs text-gray-500">{board.boardRegDate}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2">{board.boardContent}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {board.boardID}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            {board.boardLike}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {board.boardHits}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
