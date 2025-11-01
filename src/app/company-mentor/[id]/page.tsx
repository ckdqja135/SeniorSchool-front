'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Company, CompanyBoard } from '@/types/Company';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = params.id as string;
  const compIdx = searchParams.get('compIdx');
  
  const [company, setCompany] = useState<Company | null>(null);
  const [boards, setBoards] = useState<CompanyBoard[]>([]);
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
    // 연봉 후기 전용 필드
    years: '',
    position: '',
    salary: ''
  });
  
  // 카카오맵 관련 상태
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [isKakaoMapLoaded, setIsKakaoMapLoaded] = useState(false);
  
  // 중복 호출 방지를 위한 ref
  const lastFetchedCompIdx = useRef<number | null>(null);
  const lastFetchedCompanyKey = useRef<string | null>(null);
  
  // 페이징 관련 상태
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // 정렬 관련 상태
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc: 최신순, asc: 오래된순

  // 검색 관련 상태
  const [searchType, setSearchType] = useState<'id' | 'title' | 'content'>('title');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 탭 관련 상태
  const [activeTab, setActiveTab] = useState<'company' | 'interview' | 'salary'>('company');

  // 정렬된 후기 목록 계산
  const sortedBoards = [...boards].sort((a, b) => {
    const dateA = new Date(a.boardRegDate).getTime();
    const dateB = new Date(b.boardRegDate).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // 탭별 필터링된 후기 목록 계산
  const tabFilteredBoards = sortedBoards.filter(board => {
    // boardType 필드가 있으면 그대로 사용, 없으면 기본값 'company'
    const boardType = board.boardType || 'company';
    return boardType === activeTab;
  });

  // 검색된 후기 목록 계산
  const filteredBoards = tabFilteredBoards.filter(board => {
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

  // 탭 변경 핸들러
  const handleTabChange = (tab: 'company' | 'interview' | 'salary') => {
    setActiveTab(tab);
    setCurrentPage(1); // 탭 변경 시 첫 페이지로 이동
  };

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

  // 회사 정보 가져오기
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      // 중복 호출 방지를 위한 키 생성
      const fetchKey = `${compIdx || ''}-${companyId}`;
      if (!companyId) return;
      
      // 이미 같은 키로 호출했다면 중복 호출 방지
      if (lastFetchedCompanyKey.current === fetchKey) {
        console.log('⏭️ 중복 호출 방지:', fetchKey);
        return;
      }
      
      lastFetchedCompanyKey.current = fetchKey;
      
      console.log('====== fetchCompanyInfo 시작 ======');
      console.log('companyId:', companyId);
      console.log('compIdx:', compIdx);
      console.log('compIdx type:', typeof compIdx);
      console.log('fetchKey:', fetchKey);
      
      try {
        setIsLoading(true);
        setError(null);

        const backendURL = 'https://api.reviewhub.life';
        let response;
        
        // compIdx 쿼리 파라미터가 있으면 우선 사용, 없으면 companyId 사용
        if (compIdx) {
          // compIdx로 검색 (정확한 회사 정보 조회)
          response = await fetch(`${backendURL}/search/comp/${compIdx}`);
        } else if (/^\d+$/.test(companyId)) {
          // companyId가 숫자인 경우 compIdx로 검색
          response = await fetch(`${backendURL}/search/comp/${companyId}`);
        } else {
          // compName으로 검색 (기존 방식 유지)
          response = await fetch(`${backendURL}/search/comp/?compName=${encodeURIComponent(companyId)}`);
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 200 && data.data) {
          // API 응답이 배열인 경우 첫 번째 요소 사용
          const companyData = Array.isArray(data.data) ? data.data[0] : data.data;
          setCompany(companyData);
        } else {
          throw new Error('회사 정보를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('회사 정보 로딩 오류:', error);
        setError('회사 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyInfo();
  }, [companyId, compIdx]);

  // 회사 게시판 목록 가져오기
  useEffect(() => {
    const fetchCompanyBoards = async () => {
      if (!company || !company.compIdx) return;
      
      // 이미 같은 compIdx로 호출했다면 중복 호출 방지
      if (lastFetchedCompIdx.current === company.compIdx) {
        return;
      }
      
      try {
        setIsBoardLoading(true);
        setBoardError(null);
        
        // 현재 compIdx를 기록
        lastFetchedCompIdx.current = company.compIdx;
        
        const backendURL = 'https://api.reviewhub.life';
        const response = await fetch(`${backendURL}/comp/board?compIdx=${company.compIdx}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
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

    if (company) {
      fetchCompanyBoards();
    }
  }, [company]);

  // 카카오맵 초기화
  const initializeKakaoMap = () => {
    if (!company || !company.compLateX || !company.compLateY || !mapRef.current || mapInstance.current) {
      return;
    }

    try {
      const container = mapRef.current;
      const options = {
        center: new window.kakao.maps.LatLng(company.compLateX, company.compLateY),
        level: 3
      };

      const map = new window.kakao.maps.Map(container, options);
      mapInstance.current = map;

      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(company.compLateX, company.compLateY);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition
      });
      marker.setMap(map);

      // 커스텀 오버레이 생성
      const overlayContent = `
        <div style="
          background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
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
            ">${company.compName}</div>
            <div style="
              font-size: 12px;
              opacity: 0.9;
              word-break: break-word;
              padding-right: 30px;
            ">${company.compType}</div>
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
                ">📍 ${company.compAddr || company.compLocate}</div>
                <div style="
                  margin-bottom: 12px;
                  color: #666;
                  font-size: 13px;
                  line-height: 1.3;
                  word-break: break-word;
                  overflow-wrap: break-word;
                  white-space: normal;
                  max-width: 100%;
                ">🏢 ${company.compLotAddr || ''}</div>
                ${company.compURL ? `
                <a href="${company.compURL}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   style="
                     display: inline-block;
                     background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
                     color: white;
                     text-decoration: none;
                     padding: 8px 16px;
                     border-radius: 6px;
                     font-size: 13px;
                     font-weight: 500;
                     transition: transform 0.2s, box-shadow 0.2s;
                     word-break: keep-all;
                   ">🌐 회사 홈페이지</a>
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
      if (company.compMapIMG) {
        const img = document.createElement('img');
        img.src = company.compMapIMG;
        img.alt = company.compName;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.addEventListener('error', () => {
          box.innerHTML = '🏢';
          box.style.fontSize = '24px';
          box.style.color = '#666';
        });
        box.appendChild(img);
      } else {
        box.innerHTML = '🏢';
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
    if (isKakaoMapLoaded && company && mapRef.current && !mapInstance.current) {
      // 간단한 방법: 1초 후에 직접 초기화 시도
      setTimeout(() => {
        initializeKakaoMap();
      }, 1000);
    }
  }, [isKakaoMapLoaded, company]);

  // 새 게시글 작성 핸들러
  const handleWriteBoard = () => {
    setShowWriteModal(true);
  };

  // 후기 작성 제출
  const handleWriteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 연봉 후기인 경우 다른 검증
    if (activeTab === 'salary') {
      if (!writeForm.years.trim() || !writeForm.position.trim() || !writeForm.salary.trim()) {
        alert('모든 필드를 입력해주세요.');
        return;
      }
    } else {
      if (!writeForm.boardTitle.trim() || !writeForm.boardContent.trim() || !writeForm.boardID.trim() || !writeForm.boardPw.trim()) {
        alert('모든 필드를 입력해주세요.');
        return;
      }
    }

    if (!company) {
      alert('회사 정보를 찾을 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      
      // 연봉 후기인 경우 다른 데이터 구조
      const requestData: any = {
        compIdx: company.compIdx,
        boardType: activeTab
      };

      if (activeTab === 'salary') {
        requestData.years = parseInt(writeForm.years);
        requestData.position = writeForm.position.trim();
        requestData.salary = parseInt(writeForm.salary);
        // 연봉 후기는 제목과 내용을 자동 생성
        requestData.boardTitle = `${writeForm.position} ${writeForm.years}년차`;
        requestData.boardContent = '';
      } else {
        requestData.boardID = writeForm.boardID.trim();
        requestData.boardPw = writeForm.boardPw.trim();
        requestData.boardTitle = writeForm.boardTitle.trim();
        requestData.boardContent = writeForm.boardContent.trim();
      }
      
      console.log('후기 작성 요청 데이터:', requestData);
      
      const response = await fetch(`${backendURL}/comp/board/insert`, {
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
          boardPw: '',
          years: '',
          position: '',
          salary: ''
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
      boardPw: '',
      years: '',
      position: '',
      salary: ''
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">회사 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-purple-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">회사 정보를 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">{error || '요청하신 회사가 존재하지 않습니다.'}</p>
          <Link
            href="/company-mentor"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            회사 오빠로 돌아가기
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
            <Link href="/company-mentor" className="text-2xl font-bold text-purple-400">
              회사 오빠
            </Link>
            <div className="text-gray-300">
              {company.compName}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 회사 제목 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {company.compName}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 좌측 컨텐츠 */}
          <div className="space-y-6">
            {/* 회사 정보 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 tracking-wide">회사 정보</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1 block">위치</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{company.compLocate}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">구분</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{company.compType}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1 block">설립</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">
                    {company.compEstablish ? `${company.compEstablish}년` : '정보 없음'}
                  </p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 hover:shadow-md transition-all duration-200">
                  <span className="text-xs text-orange-700 font-bold uppercase tracking-wider mb-1 block">CEO</span>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg font-semibold text-gray-900 leading-relaxed">{company.compCEO}</p>
                </div>
              </div>
              
              <div className="mt-8">
                {company.compURL && (
                  <a
                    href={company.compURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-base shadow-md hover:shadow-lg"
                  >
                    <i className="fa fa-external-link mr-3 text-lg"></i>
                    회사 홈페이지
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
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">지도를 불러오는 중...</p>
                    </div>
                  </div>
                )}
                {isKakaoMapLoaded && !mapInstance.current && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-600">지도 초기화 중...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 공유하기 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">회사 공유하기</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${company.compName} 회사 정보 - 회사 오빠`)}&url=${encodeURIComponent(window.location.href)}`)}
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

          {/* 우측 컨텐츠 - 회사 후기 */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* 탭 메뉴 */}
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => handleTabChange('company')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                    activeTab === 'company'
                      ? 'text-purple-600 border-purple-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  회사 후기
                </button>
                <button
                  onClick={() => handleTabChange('interview')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                    activeTab === 'interview'
                      ? 'text-purple-600 border-purple-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  면접 후기
                </button>
                <button
                  onClick={() => handleTabChange('salary')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                    activeTab === 'salary'
                      ? 'text-purple-600 border-purple-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  연봉 후기
                </button>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs sm:text-sm md:text-base lg:text-xl font-semibold text-gray-800">
                  {activeTab === 'company' ? '회사 후기' : activeTab === 'interview' ? '면접 후기' : '연봉 후기'}
                </h2>
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
                    className="px-1.5 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">게시판을 불러오는 중...</p>
                  </div>
                ) : boardError ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-purple-500">{boardError}</p>
                  </div>
                ) : paginatedBoards.length > 0 ? (
                  <>
                    {paginatedBoards.map((board) => (
                      <div
                        key={board.boardIdx}
                        className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                          activeTab === 'salary' ? '' : 'cursor-pointer'
                        }`}
                        onClick={() => {
                          if (activeTab !== 'salary') {
                            router.push(`/company-board/${board.boardIdx}`);
                          }
                        }}
                      >
                        {activeTab === 'salary' ? (
                          // 연봉 후기 표시 형식
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                  {board.position || '직군 정보 없음'}
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                  {board.years || 0}년차
                                </span>
                              </div>
                              <span className="text-lg font-bold text-gray-900">
                                {board.salary ? `${board.salary.toLocaleString()}만원` : '연봉 정보 없음'}
                              </span>
                            </div>
                            <div className="flex justify-end items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                              <span>{board.boardRegDate}</span>
                            </div>
                          </div>
                        ) : (
                          // 일반 후기 표시 형식
                          <>
                            <h3 className="font-semibold text-gray-900 mb-2">{board.boardTitle}</h3>
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                              <span>작성자: {board.boardID}</span>
                              <span>{board.boardRegDate}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-400">
                              <span>조회수: {board.boardHits}</span>
                              <span>좋아요: {board.boardLike}</span>
                            </div>
                          </>
                        )}
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
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
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
                  <div className="text-center py-8 text-gray-500 whitespace-pre-line">
                    {searchQuery ? (
                      '검색 결과가 없습니다'
                    ) : (
                      <>
                        {activeTab === 'company' && '아직 회사 후기가 없습니다.\n첫 번째 후기를 작성해보세요!'}
                        {activeTab === 'interview' && '아직 면접 후기가 없습니다.\n첫 번째 면접 후기를 작성해보세요!'}
                        {activeTab === 'salary' && '아직 연봉 후기가 없습니다.\n첫 번째 연봉 후기를 작성해보세요!'}
                      </>
                    )}
                  </div>
                )}

                {/* 검색창 - 항상 표시 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    {/* 검색 타입 선택 */}
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value as 'id' | 'title' | 'content')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(e as any)}
                    />
                    
                    {/* 검색 버튼 */}
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 min-w-[100px] justify-center"
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
              <h3 className="text-lg font-semibold">
                {company?.compName}의 {activeTab === 'company' ? '회사' : activeTab === 'interview' ? '면접' : '연봉'} 후기를 남겨주세요
              </h3>
              <button 
                onClick={handleCloseWriteModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleWriteSubmit} className="space-y-4">
              {activeTab === 'salary' ? (
                // 연봉 후기 폼
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">몇 년차</label>
                    <input 
                      type="number" 
                      value={writeForm.years}
                      onChange={(e) => setWriteForm({...writeForm, years: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                      min="0"
                      max="50"
                      placeholder="예: 3"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">직군</label>
                    <input 
                      type="text" 
                      value={writeForm.position}
                      onChange={(e) => setWriteForm({...writeForm, position: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                      placeholder="예: 개발자"
                      maxLength={20}
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">연봉 (만원)</label>
                    <input 
                      type="number" 
                      value={writeForm.salary}
                      onChange={(e) => setWriteForm({...writeForm, salary: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
                      min="0"
                      placeholder="예: 5000"
                      required 
                    />
                  </div>
                </div>
              ) : (
                // 일반 후기 폼 (회사 후기, 면접 후기)
                <>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                    <textarea 
                      value={writeForm.boardContent}
                      onChange={(e) => setWriteForm({...writeForm, boardContent: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500" 
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
                </>
              )}

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
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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