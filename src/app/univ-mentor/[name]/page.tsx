'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface University {
  univName: string;
  univLocate: string;
  univType: string;
  univEstablish: string;
  univPresident: string;
  univAddr: string;
  univLotAddr: string;
  univURL: string;
  univLateX: number;
  univLateY: number;
  univMapIMG: string;
  univIdx: number; // 추가: 대학교 인덱스
}

interface Review {
  boardIdx: number;
  boardTitle: string;
  boardID: string;
  boardRegDate: string;
  boardHits: number;
  boardLike: number;
}

export default function SchoolPage() {
  const params = useParams();
  const schoolName = decodeURIComponent(params.name as string);
  
  const [university, setUniversity] = useState<University | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({
    title: '',
    content: '',
    author: '',
    password: ''
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const router = useRouter();
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
      
      // ChatGPT 제안 방법: autoload=false + kakao.maps.load() 사용
      const script = document.createElement('script');
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer`;
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

  // 대학교 정보 가져오기
  useEffect(() => {
    fetchUniversityData();
  }, [schoolName]);

  // 카카오맵 초기화
  useEffect(() => {

    if (isKakaoMapLoaded && university && mapRef.current && !mapInstance.current) {
      
      // 간단한 방법: 1초 후에 직접 초기화 시도
      setTimeout(() => {
        initializeKakaoMap();
      }, 1000);
    }
  }, [isKakaoMapLoaded, university]);

  // 대학교 정보가 로드되면 게시판 조회
  useEffect(() => {
    if (university && university.univIdx) {
      fetchReviews();
    }
  }, [university]);

  // 정렬된 후기 목록 계산
  const sortedReviews = [...reviews].sort((a, b) => {
    const dateA = new Date(a.boardRegDate);
    const dateB = new Date(b.boardRegDate);
    return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
  });

  // totalPages 계산
  const totalPages = Math.ceil(sortedReviews.length / itemsPerPage);

  // reviews나 정렬 순서가 변경될 때 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [reviews, sortOrder]);

  const fetchUniversityData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 백엔드 API 서버
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      
      const response = await fetch(`${backendURL}/search/school?univName=${encodeURIComponent(schoolName)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      
      setUniversity(data);
    } catch (error) {
      console.error('대학교 정보 조회 오류:', error);
      setError('대학교 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!university?.univIdx) return;
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/board/?univIdx=${university.univIdx}`);
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('입학 후기 조회 오류:', error);
    }
  };

  const initializeKakaoMap = () => {

    try {
      // 더 엄격한 체크: 모든 필요한 클래스가 함수로 존재하는지 확인
      if (!window.kakao || !window.kakao.maps || !university || !mapRef.current ||
          typeof window.kakao.maps.LatLng !== 'function' ||
          typeof window.kakao.maps.Map !== 'function' ||
          typeof window.kakao.maps.Marker !== 'function') {
        return;
      }


       // 좌표 순서 수정: (위도, 경도) = (univLateX, univLateY)
       const mapOption = { 
         center: new window.kakao.maps.LatLng(university.univLateX, university.univLateY), // (위도, 경도)
         level: 3 // 지도의 확대 레벨 (더 자세하게)
       };

      const map = new window.kakao.maps.Map(mapRef.current, mapOption); // 지도를 생성합니다
      mapInstance.current = map;

      // 일반 지도와 스카이뷰로 지도 타입을 전환할 수 있는 지도타입 컨트롤을 생성합니다
      const mapTypeControl = new window.kakao.maps.MapTypeControl();
      map.addControl(mapTypeControl, window.kakao.maps.ControlPosition.TOPRIGHT);

      // 지도 확대 축소를 제어할 수 있는 줌 컨트롤을 생성합니다
      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

             // 지도에 마커를 표시합니다 (좌표 순서 수정됨)
       const marker = new window.kakao.maps.Marker({
         map: map, 
         position: new window.kakao.maps.LatLng(university.univLateX, university.univLateY), // (위도, 경도)
         // 마커 스타일 개선
         zIndex: 1
       });
       
       // 마커에 호버 효과 추가
       window.kakao.maps.event.addListener(marker, 'mouseover', function() {
         marker.setZIndex(2);
         // 마커에 호버 시 커서 변경 효과
        //  marker.getElement().style.cursor = 'pointer';
       });
       
       window.kakao.maps.event.addListener(marker, 'mouseout', function() {
         marker.setZIndex(1);
        //  marker.getElement().style.cursor = 'default';
       });
       
       // 마커 클릭 이벤트에 더 명확한 로깅 추가
       window.kakao.maps.event.addListener(marker, 'click', function() {

       });
       

      // 커스텀 오버레이에 표시할 컨텐츠를 DOM 노드로 생성
       const makeOverlayContent = (university: any) => {
         const wrap = document.createElement('div');
         wrap.style.cssText = `
           background: white;
           border: 1px solid #ccc;
           border-radius: 8px;
           box-shadow: 0 2px 10px rgba(0,0,0,0.1);
           padding: 0;
           min-width: 300px;
           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         `;

         wrap.innerHTML = `
           <div style="
             background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
             color: white;
             padding: 15px 20px;
             border-radius: 8px 8px 0 0;
             position: relative;
             font-weight: 600;
             font-size: 16px;
           ">
             ${university.univName}
             <div data-close
                  style="
                    position: absolute;
                    right: 15px;
                    top: 50%;
                    transform: translateY(-50%);
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
                 ">📍 ${university.univAddr}</div>
                 <div style="
                   margin-bottom: 12px;
                   color: #666;
                   font-size: 13px;
                   line-height: 1.3;
                 ">🏢 ${university.univLotAddr}</div>
                 <a href="${university.univURL}" 
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
                    ">🌐 학교 홈페이지</a>
               </div>
             </div>
           </div>
         `;

         // 이미지 삽입 + 에러 처리 (인라인 onerror 금지)
         const box = wrap.querySelector('[data-imgbox]') as HTMLDivElement;
         const img = document.createElement('img');
         img.src = university.univMapIMG;
         img.alt = university.univName;
         img.style.width = '100%';
         img.style.height = '100%';
         img.style.objectFit = 'cover';
         img.addEventListener('error', () => {
           box.innerHTML = '🏫';
           box.style.fontSize = '24px';
           box.style.color = '#666';
         });
         box.appendChild(img);

         // 닫기 버튼 이벤트 (오버레이 인스턴스를 외부에서 주입)
         const closeBtn = wrap.querySelector('[data-close]') as HTMLDivElement;
         closeBtn.addEventListener('click', () => {
           if ((wrap as any)['_overlay']) {
             ((wrap as any)['_overlay'] as any).setMap(null);
           }
         });

         // 호버 효과 추가
         closeBtn.addEventListener('mouseover', () => {
           closeBtn.style.background = 'rgba(255,255,255,0.5)';
         });
         closeBtn.addEventListener('mouseout', () => {
           closeBtn.style.background = 'rgba(255,255,255,0.3)';
         });

         return wrap;
       };

       const content = makeOverlayContent(university);

        // 마커 위에 커스텀오버레이를 생성합니다
         const overlay = new window.kakao.maps.CustomOverlay({
           content: content, // DOM 노드 전달
           map: null, // 초기에는 지도에 표시하지 않음
           position: marker.getPosition(), // 마커 위치 기준
           // 오버레이 위치 조정 - 마커 위에 표시
           yAnchor: 1.2,
           xAnchor: 0.5
         });

       // 오버레이 인스턴스를 DOM 노드에 주입 (닫기 버튼에서 접근하기 위해)
       (content as any)['_overlay'] = overlay;

       // 페이지 로드 시 기본적으로 오버레이를 표시합니다
       overlay.setMap(map);
       
       // 마커를 클릭했을 때 커스텀 오버레이를 토글합니다
       window.kakao.maps.event.addListener(marker, 'click', function() {
         if (overlay.getMap()) {
           overlay.setMap(null);
         } else {
           overlay.setMap(map);
         }
       });
      
       
       // 지도 컨테이너가 숨김 상태에서 생성되었을 경우를 대비해 relayout 호출
       setTimeout(() => {
         if (map && typeof map.relayout === 'function') {
           map.relayout();
         }
         
                   // 지도가 정확한 위치에 표시되었는지 확인
          const currentCenter = map.getCenter();
          
          // 필요시 정확한 위치로 재설정
          if (Math.abs(currentCenter.getLat() - university.univLateX) > 0.001 || 
              Math.abs(currentCenter.getLng() - university.univLateY) > 0.001) {
            map.setCenter(new window.kakao.maps.LatLng(university.univLateX, university.univLateY)); // 좌표 순서 수정
          }
       }, 100);
     } catch (error) {
       console.error('카카오맵 초기화 오류:', error);
       console.error('에러 상세:', error);
     }
   };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      
      // 오늘 날짜 포맷
      const date = new Date();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      const dateFormat = `${year}-${month}-${day}`;

      const boardData = {
        univIdx: university?.univIdx,
        boardTitle: reviewForm.title.trim(),
        boardContent: reviewForm.content.trim(),
        boardReg: dateFormat,
        boardLike: 0,
        boardHits: 0,
        boardId: reviewForm.author.trim(),
        boardPw: reviewForm.password.trim(), // 실제로는 SHA256 해시 처리 필요
      };

      const response = await fetch(`${backendURL}/board/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardData),
      });

      if (response.ok) {
        setShowReviewModal(false);
        setReviewForm({ title: '', content: '', author: '', password: '' });
        // 후기 목록 새로고침
        fetchReviews();
      }
    } catch (error) {
      console.error('후기 작성 오류:', error);
    }
  };

  const shareTwitter = () => {
    const text = `${university?.univName} 대학교 정보를 확인해보세요!`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
  };

  const shareFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
  };

  const shareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('링크가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('링크 복사 실패:', error);
    }
  };

  // 검색 함수
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!university) return;
    
    setIsSearching(true);
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const url = searchQuery.trim() 
        ? `${backendURL}/board?univIdx=${university.univIdx}&${searchType}=${encodeURIComponent(searchQuery.trim())}`
        : `${backendURL}/board?univIdx=${university.univIdx}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
        setCurrentPage(1); // 검색 시 첫 페이지로 이동
      } else {
        console.error('검색 API 오류:', response.status);
        alert('검색 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('검색 오류:', error);
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 초기화 함수
  const handleSearchReset = async () => {
    if (!university) return;
    
    setSearchQuery('');
    setSearchType('title');
    setIsSearching(true);
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/board?univIdx=${university.univIdx}`);
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('검색 초기화 오류:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 검색어가 변경될 때마다 API 호출 - 제거됨
  // useEffect(() => {
  //   if (!university) return;
    
  //   const fetchReviews = async () => {
  //     setIsSearching(true);
  //     try {
  //       const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
  //       const url = searchQuery.trim() 
  //         ? `${backendURL}/board?univIdx=${university.univIdx}&searchQuery=${encodeURIComponent(searchQuery.trim())}`
  //         : `${backendURL}/board?univIdx=${university.univIdx}`;
        
  //       const response = await fetch(url);
        
  //       if (response.ok) {
  //         const data = await response.json();
  //         setReviews(data);
  //         setCurrentPage(1);
  //       } else {
  //         console.error('후기 조회 API 오류:', response.status);
  //         setError('후기를 불러오는 중 오류가 발생했습니다.');
  //       }
  //     } catch (error) {
  //       console.error('후기 조회 오류:', error);
  //       setError('후기를 불러오는 중 오류가 발생했습니다.');
  //     } finally {
  //       setIsSearching(false);
  //     }
  //   };

  //   // 디바운싱 적용 (300ms)
  //   const timer = setTimeout(fetchReviews, 300);
  //   return () => clearTimeout(timer);
  // }, [university, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">대학교 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !university) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">오류 발생</h1>
          <p className="text-gray-600 mb-8">{error || '대학교 정보를 찾을 수 없습니다.'}</p>
          <Link href="/" className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 transition-colors">
            홈으로 돌아가기
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
            <Link href="/univ-mentor" className="text-2xl font-bold text-green-400">
              대학 오빠
            </Link>
            <div className="text-gray-300">
              {university.univName}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 대학교 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {university.univName}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 좌측 컨텐츠 */}
          <div className="space-y-6">
            {/* 대학교 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-5">대학교 정보</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-green-200 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">위치</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{university.univLocate}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-green-200 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">구분</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{university.univType}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-green-200 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">설립</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {university.univEstablish ? `${university.univEstablish}년` : '정보 없음'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-green-200 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">총장</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{university.univPresident}</span>
                </div>
              </div>

              {university.univURL && (
                <a
                  href={university.univURL.match(/^https?:\/\//) ? university.univURL : `https://${university.univURL}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  학교 홈페이지
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
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
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
              <h3 className="text-lg font-semibold text-gray-800 mb-4">대학교 공유하기</h3>
              <div className="flex space-x-4">
                <button
                  onClick={shareTwitter}
                  className="w-12 h-12 bg-blue-400 text-white rounded-full hover:bg-blue-500 transition-colors flex items-center justify-center"
                  title="트위터에 공유"
                >
                  <i className="fa fa-twitter text-xl"></i>
                </button>
                <button
                  onClick={shareFacebook}
                  className="w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center"
                  title="페이스북에 공유"
                >
                  <i className="fa fa-facebook text-xl"></i>
                </button>
                <button
                  onClick={shareLink}
                  className="w-12 h-12 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors flex items-center justify-center"
                  title="링크 복사"
                >
                  <i className="fa fa-link text-xl"></i>
                </button>
              </div>
            </div>
          </div>

          {/* 우측 컨텐츠 - 입학 후기 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs sm:text-sm md:text-base lg:text-xl font-semibold text-gray-800">대학교 입학 후기</h2>
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
                     onClick={() => setShowReviewModal(true)}
                     className="px-1.5 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
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
                 {sortedReviews.length > 0 ? (
                   <>
                     {sortedReviews.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((review) => (
                      <div 
                        key={review.boardIdx} 
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/univ-board/${review.boardIdx}`)}
                      >
                        <h3 className="font-semibold text-gray-900 mb-2">{review.boardTitle}</h3>
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                          <span>작성자: {review.boardID}</span>
                          <span>{review.boardRegDate}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>조회수: {review.boardHits}</span>
                          <span>좋아요: {review.boardLike}</span>
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
                                 ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
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
                     {searchQuery ? '빈 입학 후기' : '아직 입학 후기가 없습니다.\n첫 번째 후기를 작성해보세요!'}
                   </div>
                 )}

                 {/* 검색창 - 항상 표시 */}
                 <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                   <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                     {/* 검색 타입 선택 */}
                     <select
                       value={searchType}
                       onChange={(e) => setSearchType(e.target.value as 'id' | 'title' | 'content')}
                       className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
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
                       className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                       onKeyPress={(e) => e.key === 'Enter' && handleSearch(e as any)}
                     />
                     
                     {/* 검색 버튼 */}
                     <button
                       type="submit"
                       disabled={isSearching}
                       className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 min-w-[100px] justify-center"
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
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">대학교 입학 후기</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제목
                </label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  maxLength={40}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  내용
                </label>
                <textarea
                  value={reviewForm.content}
                  onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={4}
                  maxLength={700}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  다른 사람의 인격권을 침해하거나 명예를 훼손하게 하는 글은 삭제될 수 있습니다.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    작성자
                  </label>
                  <input
                    type="text"
                    value={reviewForm.author}
                    onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={reviewForm.password}
                    onChange={(e) => setReviewForm({ ...reviewForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

                             <div className="flex justify-end space-x-3 pt-6">
                 <button
                   type="button"
                   onClick={() => setShowReviewModal(false)}
                   className="px-6 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium"
                 >
                   닫기
                 </button>
                 <button
                   type="submit"
                   className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium"
                 >
                   글쓰기
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

           </div>
   );
 }
