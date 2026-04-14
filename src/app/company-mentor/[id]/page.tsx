'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Company, CompanyBoard } from '@/types/Company';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = params.id as string;
  const compIdx = searchParams.get('compIdx');
  
  const [company, setCompany] = useState<Company | null>(null);
  const [boards, setBoards] = useState<CompanyBoard[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]); // 면접 후기 목록
  const [salaries, setSalaries] = useState<any[]>([]); // 연봉 후기 목록
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
    boardRating: 0,
    // 연봉 후기 전용 필드
    years: '',
    position: '',
    salary: '',
    joinDate: '' // 입사년월 (yyyy-mm)
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
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [remoteRating, setRemoteRating] = useState<{ average: number | null; count: number }>({
    average: null,
    count: 0
  });

  const normalizeRating = (value: any): number | null => {
    if (value === undefined || value === null) return null;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof parsed !== 'number' || Number.isNaN(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 5);
  };

  const getBoardRating = (board: any) => normalizeRating(board?.boardRating ?? board?.boardScore);

  const renderStarRating = (score?: number | null, size: 'sm' | 'md' | 'lg' = 'md') => {
    const safeScore = Math.max(0, Math.min(score || 0, 5));
    const sizeClasses = {
      sm: { wrapper: 'w-4 h-4 text-xs', star: 'text-sm' },
      md: { wrapper: 'w-5 h-5 text-base', star: 'text-base' },
      lg: { wrapper: 'w-6 h-6 text-lg', star: 'text-lg' }
    }[size];

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

  // 회사 정보 탭 관련 상태 (직원정보, 채무정보, 매출정보)
  const [companyInfoTab, setCompanyInfoTab] = useState<'employee' | 'debt' | 'revenue'>('employee');

  // URL에 프로토콜이 없으면 https:// 추가
  const ensureProtocol = (url: string): string => {
    if (!/^https?:\/\//i.test(url)) return `https://${url}`;
    return url;
  };

  // 금액을 한국어 단위(조/억)로 포맷
  const formatKoreanMoney = (value: number): string => {
    const eok = Math.round(value / 100000000);
    const absEok = Math.abs(eok);
    const sign = eok < 0 ? '-' : '';
    if (absEok >= 10000) {
      const jo = Math.floor(absEok / 10000);
      const remainEok = absEok % 10000;
      if (remainEok === 0) {
        return `${sign}${jo.toLocaleString()}조원`;
      }
      return `${sign}${jo.toLocaleString()}조 ${remainEok.toLocaleString()}억원`;
    }
    return `${eok.toLocaleString()}억원`;
  };

  // 정렬된 후기 목록 계산
  const sortedBoards = [...boards].sort((a, b) => {
    const dateA = new Date(a.boardRegDate).getTime();
    const dateB = new Date(b.boardRegDate).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // 탭별 필터링된 후기 목록 계산
  const getTabFilteredBoards = () => {
    if (activeTab === 'interview') {
      // 면접 후기는 interviews 배열 사용
      return [...interviews].sort((a, b) => {
        const dateA = new Date(a.interviewRegDate || a.regDate || a.createdAt).getTime();
        const dateB = new Date(b.interviewRegDate || b.regDate || b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    } else if (activeTab === 'salary') {
      // 연봉 후기는 salaries 배열 사용
      return [...salaries].sort((a, b) => {
        const dateA = new Date(a.regDate || a.salaryRegDate || a.createdAt || a.joinDate).getTime();
        const dateB = new Date(b.regDate || b.salaryRegDate || b.createdAt || b.joinDate).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    } else {
      // 회사 후기는 boards 배열 사용
      return sortedBoards;
    }
  };

  const tabFilteredBoards = getTabFilteredBoards();

  // 검색된 후기 목록 계산
  const filteredBoards = tabFilteredBoards.filter(board => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    if (activeTab === 'interview') {
      const interview = board as any;
      switch (searchType) {
        case 'title':
          return (interview.interviewTitle || interview.title || '').toLowerCase().includes(query);
        case 'content':
          return (interview.interviewContent || interview.content || '').toLowerCase().includes(query);
        case 'id':
          return (interview.interviewID || interview.writerId || interview.id || '').toLowerCase().includes(query);
        default:
          return true;
      }
    } else if (activeTab === 'salary') {
      const salary = board as any;
      switch (searchType) {
        case 'title':
          // 연봉 후기는 직군이나 연봉으로 검색
          return ((salary.department || salary.position || '')).toLowerCase().includes(query) || 
                 (salary.salary ? String(salary.salary) : '').includes(query);
        case 'content':
          // 연봉 후기는 내용이 없을 수 있음
          return false;
        case 'id':
          // 연봉 후기는 작성자가 없을 수 있음
          return false;
        default:
          return true;
      }
    } else {
      switch (searchType) {
        case 'title':
          return (board as any).boardTitle?.toLowerCase().includes(query);
        case 'content':
          return (board as any).boardContent?.toLowerCase().includes(query);
        case 'id':
          return (board as any).boardID?.toLowerCase().includes(query);
        default:
          return true;
      }
    }
  });

  // 페이징 계산
  const totalPages = Math.ceil(filteredBoards.length / itemsPerPage);
  const paginatedBoards = filteredBoards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const localRatingStats = useMemo(() => {
    const scores = boards
      .map(board => getBoardRating(board as any))
      .filter((score): score is number => typeof score === 'number');
    if (!scores.length) {
      return { average: null as number | null, count: 0 };
    }
    const sum = scores.reduce((acc, cur) => acc + cur, 0);
    return { average: sum / scores.length, count: scores.length };
  }, [boards]);

  const averageRating = remoteRating.average ?? localRatingStats.average;
  const ratingCount = remoteRating.average !== null ? remoteRating.count : localRatingStats.count;
  const displayedRating = hoveredRating ?? writeForm.boardRating;

  // 탭 변경 핸들러
  const handleTabChange = (tab: 'company' | 'interview' | 'salary') => {
    setActiveTab(tab);
    setCurrentPage(1); // 탭 변경 시 첫 페이지로 이동
  };

  const handleRatingSelect = (value: number) => {
    setWriteForm(prev => ({ ...prev, boardRating: value }));
    setHoveredRating(null);
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

        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
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

  // 회사 평점 정보 가져오기
  useEffect(() => {
    const fetchCompanyRating = async () => {
      if (!company?.compIdx) return;

      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      try {
        const response = await fetch(`${backendURL}/comp/companies/${company.compIdx}/rating`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const ratingData = data?.data ?? data;

        const average =
          normalizeRating(
            ratingData?.averageRating ??
            ratingData?.avgRating ??
            ratingData?.average ??
            ratingData?.rating ??
            ratingData?.boardRating
          ) ?? null;

        const rawCount =
          ratingData?.reviewCount ??
          ratingData?.count ??
          ratingData?.totalReviews ??
          ratingData?.ratingCount ??
          ratingData?.boardCount ??
          ratingData?.total;

        const count =
          typeof rawCount === 'number'
            ? rawCount
            : typeof rawCount === 'string'
            ? parseInt(rawCount, 10) || 0
            : 0;

        setRemoteRating({
          average,
          count
        });
      } catch (error) {
        console.error('회사 평점 로딩 오류:', error);
        setRemoteRating({
          average: null,
          count: 0
        });
      }
    };

    fetchCompanyRating();
  }, [company?.compIdx]);

  // 회사 게시판 목록 가져오기 (회사 후기만)
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
        
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        const response = await fetch(`${backendURL}/comp/board?compIdx=${company.compIdx}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // API 응답이 직접 배열인 경우
        if (Array.isArray(data)) {
          // boardType이 'company'이거나 없는 것만 필터링 (연봉 후기는 제외)
          setBoards(data.filter((board: any) => !board.boardType || board.boardType === 'company'));
        } 
        // API 응답이 객체이고 status가 있는 경우
        else if (data && typeof data === 'object' && data.status === 200) {
          if (data.data && Array.isArray(data.data)) {
            setBoards(data.data.filter((board: any) => !board.boardType || board.boardType === 'company'));
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

  // 면접 후기 목록 가져오기
  useEffect(() => {
    const fetchInterviews = async () => {
      if (!company || !company.compIdx) return;
      
      try {
        setIsBoardLoading(true);
        setBoardError(null);
        
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        const response = await fetch(`${backendURL}/comp/interviews?compIdx=${company.compIdx}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // API 응답이 직접 배열인 경우
        if (Array.isArray(data)) {
          setInterviews(data);
        } 
        // API 응답이 객체이고 status가 있는 경우
        else if (data && typeof data === 'object' && data.status === 200) {
          if (data.data && Array.isArray(data.data)) {
            setInterviews(data.data);
          } else {
            setInterviews([]);
          }
        } 
        // 기타 경우
        else {
          setInterviews([]);
        }
      } catch (error) {
        console.error('면접 후기 로딩 오류:', error);
        setBoardError('면접 후기를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsBoardLoading(false);
      }
    };

    if (company) {
      fetchInterviews();
    }
  }, [company]);

  // 연봉 후기 목록 가져오기
  useEffect(() => {
    const fetchSalaries = async () => {
      if (!company || !company.compIdx) return;
      
      try {
        setIsBoardLoading(true);
        setBoardError(null);
        
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        const response = await fetch(`${backendURL}/comp/salaries?compIdx=${company.compIdx}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // API 응답이 직접 배열인 경우
        if (Array.isArray(data)) {
          setSalaries(data);
        } 
        // API 응답이 객체이고 status가 있는 경우
        else if (data && typeof data === 'object' && data.status === 200) {
          if (data.data && Array.isArray(data.data)) {
            setSalaries(data.data);
          } else {
            setSalaries([]);
          }
        } 
        // 기타 경우
        else {
          setSalaries([]);
        }
      } catch (error) {
        console.error('연봉 후기 로딩 오류:', error);
        setBoardError('연봉 후기를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsBoardLoading(false);
      }
    };

    if (company) {
      fetchSalaries();
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
                <a href="${ensureProtocol(company.compURL)}"
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
      if (!writeForm.years.trim() || !writeForm.position.trim() || !writeForm.salary.trim() || !writeForm.joinDate.trim()) {
        alert('모든 필드를 입력해주세요.');
        return;
      }
      // yyyy-mm 형식 검증
      if (!/^\d{4}-\d{2}$/.test(writeForm.joinDate)) {
        alert('입사년월은 YYYY-MM 형식으로 입력해주세요.');
        return;
      }
    } else {
      if (!writeForm.boardTitle.trim() || !writeForm.boardContent.trim() || !writeForm.boardID.trim() || !writeForm.boardPw.trim()) {
        alert('모든 필드를 입력해주세요.');
        return;
      }
      if (activeTab === 'company' && writeForm.boardRating < 0.5) {
        alert('평점을 선택해주세요. (0.5 ~ 5.0)');
        return;
      }
    }

    if (!company) {
      alert('회사 정보를 찾을 수 없습니다.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      
      let requestData: any;
      let apiEndpoint: string;

      if (activeTab === 'interview') {
        // 면접 후기 작성
        apiEndpoint = `${backendURL}/comp/interviews`;
        requestData = {
          compIdx: company.compIdx,
          interviewTitle: writeForm.boardTitle.trim(),
          interviewContent: writeForm.boardContent.trim(),
          writerId: writeForm.boardID.trim(),
          writerPw: writeForm.boardPw.trim()
        };
      } else if (activeTab === 'salary') {
        // 연봉 후기 작성
        apiEndpoint = `${backendURL}/comp/salaries`;
        requestData = {
          compIdx: company.compIdx,
          salary: parseInt(writeForm.salary),
          workYear: parseInt(writeForm.years),
          department: writeForm.position.trim(),
          joinDate: writeForm.joinDate.trim()
        };
      } else {
        // 회사 후기 작성
        apiEndpoint = `${backendURL}/comp/board/insert`;
        requestData = {
          compIdx: company.compIdx,
          boardType: 'company',
          boardID: writeForm.boardID.trim(),
          boardPw: writeForm.boardPw.trim(),
          boardTitle: writeForm.boardTitle.trim(),
          boardContent: writeForm.boardContent.trim(),
          boardRating: writeForm.boardRating
        };
      }
      
      console.log('후기 작성 요청 데이터:', requestData);
      console.log('API 엔드포인트:', apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
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
          boardRating: 0,
          years: '',
          position: '',
          salary: '',
          joinDate: ''
        });
        setHoveredRating(null);
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
      boardRating: 0,
      years: '',
      position: '',
      salary: '',
      joinDate: ''
    });
    setHoveredRating(null);
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
    <div className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* 헤더 */}
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/company-mentor" className="text-xl sm:text-2xl font-bold text-purple-400">
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
              <h2 className="text-lg font-bold text-gray-800 mb-5">회사 정보</h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">위치</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{company.compLocate}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">구분</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{company.compType}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">설립</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {company.compEstablish ? `${company.compEstablish}년` : '정보 없음'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">CEO</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{company.compCEO}</span>
                </div>
              </div>

              {/* 평균 평점 */}
              <div className="mt-5 p-4 bg-gray-50 rounded-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">평균 평점</p>
                    {averageRating ? (
                      <div className="flex items-center gap-3">
                        {renderStarRating(averageRating, 'lg')}
                        <span className="text-lg font-bold text-gray-900 leading-none pt-2">{averageRating.toFixed(1)} / 5.0</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">아직 평점이 없습니다.</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 font-medium">
                    {ratingCount > 0 ? `${ratingCount.toLocaleString()}개의 회사 후기` : '후기 0개'}
                  </span>
                </div>
              </div>

              {/* 홈페이지 버튼 */}
              {company.compURL && (
                <a
                  href={ensureProtocol(company.compURL)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  회사 홈페이지
                </a>
              )}
            </div>

            {/* 회사 상세 정보 (직원/채무/매출) 탭 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center border-b border-gray-200 mb-6">
                <button
                  onClick={() => setCompanyInfoTab('employee')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                    companyInfoTab === 'employee'
                      ? 'text-purple-600 border-purple-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  직원 정보
                </button>
                <button
                  onClick={() => setCompanyInfoTab('debt')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                    companyInfoTab === 'debt'
                      ? 'text-purple-600 border-purple-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  채무 정보
                </button>
                <button
                  onClick={() => setCompanyInfoTab('revenue')}
                  className={`px-4 py-2 text-sm font-semibold transition-all duration-200 border-b-2 ${
                    companyInfoTab === 'revenue'
                      ? 'text-purple-600 border-purple-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  매출 정보
                </button>
                <div className="relative ml-auto mb-1 group">
                  <svg className="w-5 h-5 text-gray-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    금융감독원 전자공시시스템(OpenDart)의 사업보고서 기반 데이터이며, 비상장 기업은 제공되지 않을 수 있습니다.
                    <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                  </div>
                </div>
              </div>

              {/* 직원 정보 탭 */}
              {companyInfoTab === 'employee' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">총 직원 수</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {(company.totalEmployees || company.compEmployeeCount)
                        ? `${(company.totalEmployees || company.compEmployeeCount)!.toLocaleString()}명`
                        : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">평균 연봉</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {company.compAvgSalary
                        ? `${Math.round(company.compAvgSalary / 10000).toLocaleString()}만원`
                        : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">신규 입사</span>
                      </div>
                      <span className="text-base font-bold text-gray-900">
                        {company.newHires !== null && company.newHires !== undefined
                          ? `${company.newHires.toLocaleString()}명`
                          : <span className="text-xs text-gray-400 font-normal">없음</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">퇴사자</span>
                      </div>
                      <span className="text-base font-bold text-gray-900">
                        {company.resignations !== null && company.resignations !== undefined
                          ? `${company.resignations.toLocaleString()}명`
                          : <span className="text-xs text-gray-400 font-normal">없음</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">평균 근속 연수</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {company.compAvgTenure !== null && company.compAvgTenure !== undefined
                        ? `${company.compAvgTenure}년`
                        : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                    </span>
                  </div>
                </div>
              )}

              {/* 채무 정보 탭 */}
              {companyInfoTab === 'debt' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">자본금</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {company.compCapital
                        ? formatKoreanMoney(company.compCapital)
                        : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">자산 총계</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {company.compTotalAssets
                        ? formatKoreanMoney(company.compTotalAssets)
                        : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">부채 총계</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">
                      {company.compTotalLiabilities
                        ? formatKoreanMoney(company.compTotalLiabilities)
                        : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">자본 총계</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {company.compTotalEquity
                        ? formatKoreanMoney(company.compTotalEquity)
                        : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                    </span>
                  </div>
                </div>
              )}

              {/* 매출 정보 탭 */}
              {companyInfoTab === 'revenue' && (
                <div className="space-y-3">
                  <div className="p-5 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl text-white">
                    <span className="text-xs font-medium text-purple-200 uppercase tracking-wider">매출액</span>
                    <p className="text-2xl font-bold mt-1">
                      {company.compSales
                        ? formatKoreanMoney(company.compSales)
                        : '정보 없음'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">영업 이익</span>
                      </div>
                      <span className="text-base font-bold text-gray-900">
                        {company.compOperatingProfit
                          ? formatKoreanMoney(company.compOperatingProfit)
                          : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                      </span>
                    </div>

                    <div className="flex flex-col p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 transition-all duration-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">당기 순이익</span>
                      </div>
                      <span className="text-base font-bold text-gray-900">
                        {company.compNetIncome
                          ? formatKoreanMoney(company.compNetIncome)
                          : <span className="text-sm text-gray-400 font-normal">정보 없음</span>}
                      </span>
                    </div>
                  </div>
                </div>
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
                    className="px-1.5 sm:px-3 md:px-6 py-1 sm:py-1.5 md:py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-0.5 sm:space-x-1 md:space-x-2"
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
                        key={activeTab === 'interview' 
                          ? ((board as any).interviewIdx || (board as any).interview_id || (board as any).id || Math.random())
                          : activeTab === 'salary'
                          ? ((board as any).salaryIdx || (board as any).salary_id || (board as any).id || Math.random())
                          : board.boardIdx}
                        className={`border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                          activeTab === 'salary' ? '' : 'cursor-pointer'
                        }`}
                        onClick={() => {
                          if (activeTab === 'interview') {
                            // 면접 후기 상세 페이지로 이동
                            const interviewIdx = (board as any).interviewIdx || (board as any).interview_id || (board as any).id;
                            if (interviewIdx) {
                              const params = new URLSearchParams();
                              if (company?.compName) params.set('company', company.compName);
                              if (company?.compIdx) params.set('compIdx', company.compIdx.toString());
                              const queryString = params.toString();
                              router.push(`/comp/interviews/${interviewIdx}${queryString ? `?${queryString}` : ''}`);
                            }
                          } else if (activeTab !== 'salary') {
                            // 회사 후기 상세 페이지로 이동
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
                                  {(board as any).department || (board as any).position || '직군 정보 없음'}
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                  경력 {(board as any).workYear || (board as any).years || 0}년
                                </span>
                              </div>
                              <span className="text-lg font-bold text-gray-900">
                                {(board as any).salary ? `${(board as any).salary.toLocaleString()}만원` : '연봉 정보 없음'}
                              </span>
                            </div>
                            <div className="flex justify-end items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                              <span>{(board as any).regDate || (board as any).boardRegDate || (board as any).createdAt}</span>
                            </div>
                          </div>
                        ) : activeTab === 'interview' ? (
                          // 면접 후기 표시 형식
                          <>
                            <h3 className="font-semibold text-gray-900 mb-2">
                              {(board as any).interviewTitle || (board as any).title || '제목 없음'}
                            </h3>
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                              <span>작성자: {(board as any).interviewID || (board as any).writerId || '익명'}</span>
                              <span>{(board as any).interviewRegDate || (board as any).regDate || (board as any).createdAt}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-400">
                              <span>조회수: {(board as any).interviewHits || (board as any).hits || 0}</span>
                              <span>좋아요: {(board as any).interviewLike || (board as any).likes || 0}</span>
                            </div>
                          </>
                        ) : (
                          // 일반 후기 표시 형식
                          <>
                          <div className="flex items-center mb-2">
                            {(() => {
                              const ratingValue = getBoardRating(board as any);
                              return ratingValue ? (
                                <div className="flex items-center space-x-2">
                                  {renderStarRating(ratingValue, 'sm')}
                                  <span className="text-xs font-semibold text-gray-600 leading-none pt-2">
                                    {ratingValue.toFixed(1)} / 5.0
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">평점 없음</span>
                              );
                            })()}
                          </div>
                            <h3 className="font-semibold text-gray-900 mb-2">{(board as any).boardTitle}</h3>
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                              <span>작성자: {(board as any).boardID}</span>
                              <span>{(board as any).boardRegDate}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-gray-400">
                              <span>조회수: {(board as any).boardHits}</span>
                              <span>좋아요: {(board as any).boardLike}</span>
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
                      className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 min-w-[100px] justify-center text-white rounded-lg"
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
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">경력</label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">입사년월</label>
                    <DatePicker
                      selected={writeForm.joinDate ? new Date(writeForm.joinDate + '-01') : null}
                      onChange={(date: Date | null) => {
                        if (date) {
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          setWriteForm({...writeForm, joinDate: `${year}-${month}`});
                        } else {
                          setWriteForm({...writeForm, joinDate: ''});
                        }
                      }}
                      dateFormat="yyyy-MM"
                      showMonthYearPicker
                      placeholderText="YYYY-MM 선택"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                      required
                      maxDate={new Date()}
                      minDate={new Date('1970-01-01')}
                      isClearable
                      wrapperClassName="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">달력을 클릭하여 입사년월을 선택하세요</p>
                  </div>
                </div>
              ) : (
                // 일반 후기 폼 (회사 후기, 면접 후기)
                <>
                  {activeTab === 'company' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">회사 평점 <span className="text-red-500">*</span></label>
                      <div
                        className="flex flex-col gap-2"
                        onMouseLeave={() => setHoveredRating(null)}
                      >
                        <div className="flex items-center space-x-2">
                          {Array.from({ length: 5 }).map((_, idx) => {
                            const fillLevel = Math.min(Math.max((displayedRating || 0) - idx, 0), 1);
                            return (
                              <div key={`interactive-star-${idx}`} className="relative w-8 h-8 text-3xl leading-none cursor-pointer">
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
                                    onClick={() => handleRatingSelect(idx + 0.5)}
                                  />
                                  <button
                                    type="button"
                                    className="w-1/2 h-full bg-transparent"
                                    aria-label={`${(idx + 1).toFixed(1)}점 선택`}
                                    onMouseEnter={() => setHoveredRating(idx + 1)}
                                    onFocus={() => setHoveredRating(idx + 1)}
                                    onClick={() => handleRatingSelect(idx + 1)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-sm text-gray-600">
                          {writeForm.boardRating >= 0.5
                            ? `${writeForm.boardRating.toFixed(1)} / 5.0`
                            : '0.5 단위로 평점을 선택해주세요.'}
                        </p>
                      </div>
                    </div>
                  )}
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
