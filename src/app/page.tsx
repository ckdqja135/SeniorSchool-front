'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRecentOutsourceBoards } from '@/hooks/Outsource/useOutsource';
import { useRecentMatzalAlBoards } from '@/hooks/MatzalAl/useMatzalAl';
import { MatzalAlBoard } from '@/types/MatzalAl';
import { FreeBoardPost, FreeBoardApiResponse, BestPost, BestPostApiResponse } from '@/types';
import ReviewWriteModal from '@/components/common/ReviewWriteModal';
import { fetchRecentFreeboardPosts, fetchBestPosts } from '@/lib/freeboard/freeboardAPI';
import { useActiveServices } from '@/hooks/Services/useServiceConfig';
import { useRecentDynamicBoards } from '@/hooks/Services/useDynamicBoard';
import { ServiceConfig, DynamicBoard } from '@/types/Services';

interface University {
  univName: string;
  univLocate: string;
  univType: string;
  univCampos: string;
}

interface BoardPost {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  univIdx: number;
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  university: University;
}

interface Church {
  churchName: string;
  churchLocation: string;
  churchType: string;
  churchPastor: string;
}

interface ChurchBoardPost {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  churchIdx: number;
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  church: Church;
}

interface CompanyBoardPost {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  compIdx: number;
  boardRegDate: string;
  boardLike: number;
  boardHits: number;
  boardID: string;
  company: {
    compIdx: number;
    compName: string;
    compLocation: string;
    compType: string;
    compIndustry: string;
  };
}

interface ApiResponse {
  status: number;
  data: BoardPost[];
  totalCount: number;
  currentCount: number;
}

export default function HomePage() {
  const router = useRouter();
  const [recentPosts, setRecentPosts] = useState<BoardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 교회 후기 관련 상태
  const [recentChurchPosts, setRecentChurchPosts] = useState<ChurchBoardPost[]>([]);
  const [isChurchLoading, setIsChurchLoading] = useState(true);
  const [churchError, setChurchError] = useState<string | null>(null);
  
  // 회사 후기 관련 상태
  const [recentCompanyPosts, setRecentCompanyPosts] = useState<CompanyBoardPost[]>([]);
  const [isCompanyLoading, setIsCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);
  
  // 외주 후기 관련 상태 (훅 사용)
  const { boards: recentOutsourceBoards, loading: isOutsourceLoading, error: outsourceError } = useRecentOutsourceBoards();
  
  // 맛잘알 후기 관련 상태 (훅 사용)
  const MATZAL_AL_LIMIT = 5;
  const { boards: recentMatzalAlBoards, loading: isMatzalAlLoading, error: matzalAlError } = useRecentMatzalAlBoards(MATZAL_AL_LIMIT);

  // 동적 서비스 관련 상태
  const { services: dynamicServices } = useActiveServices();

  // 자유게시판 관련 상태
  const [recentFreeBoardPosts, setRecentFreeBoardPosts] = useState<FreeBoardPost[]>([]);
  const [isFreeBoardLoading, setIsFreeBoardLoading] = useState(true);
  const [freeBoardError, setFreeBoardError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 베스트 포스트 관련 상태
  const [bestPosts, setBestPosts] = useState<BestPost[]>([]);
  const [isBestPostsLoading, setIsBestPostsLoading] = useState(true);
  const [bestPostsError, setBestPostsError] = useState<string | null>(null);

  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState('');


  // 최근 게시글 데이터 가져오기
  useEffect(() => {
    const fetchRecentPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/board/recent`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.status === 200 && result.data) {
          // API 응답 구조에 맞게 데이터 변환 (university 객체 생성)
          const transformedData: BoardPost[] = result.data.map((item: any) => ({
            ...item,
            boardIdx: typeof item.boardIdx === 'string' ? parseInt(item.boardIdx) : item.boardIdx,
            univIdx: typeof item.univIdx === 'string' ? parseInt(item.univIdx) : item.univIdx,
            boardLike: typeof item.boardLike === 'string' ? parseInt(item.boardLike) : item.boardLike,
            boardHits: typeof item.boardHits === 'string' ? parseInt(item.boardHits) : item.boardHits,
            university: {
              univName: item.univName || '',
              univLocate: item.univLocate || '',
              univType: item.univType || '',
              univCampos: item.univCampos || ''
            }
          }));
          setRecentPosts(transformedData);
        } else {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }
      } catch (error) {
        console.error('최근 게시글 로딩 오류:', error);
        setError('최근 게시글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentPosts();
  }, []);

  // 최근 교회 후기 데이터 가져오기
  useEffect(() => {
    const fetchRecentChurchPosts = async () => {
      try {
        setIsChurchLoading(true);
        setChurchError(null);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/church/boards/recent`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 200 && data.data) {
          setRecentChurchPosts(data.data);
        } else {
          throw new Error('교회 후기 데이터를 불러올 수 없습니다.');
        }
      } catch (error) {
        console.error('최근 교회 후기 로딩 오류:', error);
        setChurchError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsChurchLoading(false);
      }
    };

    fetchRecentChurchPosts();
  }, []);

  // 최근 회사 후기 데이터 가져오기
  useEffect(() => {
    const fetchRecentCompanyPosts = async () => {
      try {
        setIsCompanyLoading(true);
        setCompanyError(null);
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/comp/board/recent`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 200 && data.data) {
          setRecentCompanyPosts(data.data);
        } else {
          throw new Error('회사 후기 데이터를 불러올 수 없습니다.');
        }
      } catch (error) {
        console.error('최근 회사 후기 로딩 오류:', error);
        // 에러가 발생해도 사용자에게 에러 메시지를 보여주지 않고 빈 상태로 처리
        setCompanyError(null);
        setRecentCompanyPosts([]);
      } finally {
        setIsCompanyLoading(false);
      }
    };

    fetchRecentCompanyPosts();
  }, []);

  // 최근 자유게시판 데이터 가져오기 (실제 API 호출)
  useEffect(() => {
    const fetchRecentFreeBoardPosts = async () => {
      try {
        setIsFreeBoardLoading(true);
        setFreeBoardError(null);
        
        const response = await fetchRecentFreeboardPosts();
        
        if (response && response.data) {
          setRecentFreeBoardPosts(response.data);
        } else {
          setRecentFreeBoardPosts([]);
        }
      } catch (error) {
        console.error('최근 자유게시판 로딩 오류:', error);
        setFreeBoardError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
        setRecentFreeBoardPosts([]);
      } finally {
        setIsFreeBoardLoading(false);
      }
    };

    fetchRecentFreeBoardPosts();
  }, []);

  // 베스트 포스트 데이터 가져오기
  useEffect(() => {
    const fetchBestPostsData = async () => {
      try {
        setIsBestPostsLoading(true);
        setBestPostsError(null);
        
        const response = await fetchBestPosts();
        
        if (response && response.data) {
          // 중복 제거: boardType과 boardIdx로 유니크하게 필터링
          const uniquePosts = response.data.filter((post: BestPost, index: number, self: BestPost[]) => 
            index === self.findIndex((p: BestPost) => 
              p.boardType === post.boardType && p.boardIdx === post.boardIdx
            )
          );
          setBestPosts(uniquePosts);
        } else {
          setBestPosts([]);
        }
      } catch (error) {
        console.error('베스트 포스트 로딩 오류:', error);
        setBestPostsError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
        setBestPosts([]);
      } finally {
        setIsBestPostsLoading(false);
      }
    };

    fetchBestPostsData();
  }, []);

  // 게시글 클릭 시 해당 학교의 게시판 상세보기 페이지로 이동
  const handlePostClick = (post: BoardPost) => {
    router.push(`/univ-board/${post.boardIdx}`);
  };

  // 교회 후기 클릭 시 해당 교회의 게시판 상세보기 페이지로 이동
  const handleChurchPostClick = (post: ChurchBoardPost) => {
    router.push(`/church-board/${post.boardIdx}`);
  };

  // 회사 후기 클릭 시 해당 회사의 게시판 상세보기 페이지로 이동
  const handleCompanyPostClick = (post: CompanyBoardPost) => {
    router.push(`/company-board/${post.boardIdx}`);
  };

  // 자유게시판 클릭 시 자유게시판 상세보기 페이지로 이동
  const handleFreeBoardPostClick = (post: FreeBoardPost) => {
    router.push(`/freeboard/${post.boardIdx}`);
  };

  // 검색어 입력 핸들러
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 베스트 포스트 클릭 시 해당 게시판 상세보기 페이지로 이동
  const handleBestPostClick = (post: BestPost) => {
    // 게시판 타입에 따라 다른 경로로 이동
    switch (post.boardType) {
      case 'freeboard':
        router.push(`/freeboard/${post.boardIdx}`);
        break;
      case 'church':
        router.push(`/church-board/${post.boardIdx}`);
        break;
      case 'company':
        router.push(`/company-board/${post.boardIdx}`);
        break;
      case 'outsource':
        // 외주업체 정보를 sessionStorage에 저장 (뒤로가기 시 사용)
        if ((post as any).outsourceName) {
          sessionStorage.setItem('previousOutsourceName', (post as any).outsourceName);
        }
        if ((post as any).outsource?.outsourceName) {
          sessionStorage.setItem('previousOutsourceName', (post as any).outsource.outsourceName);
        }
        router.push(`/outsource-board/${post.boardIdx}`);
        break;
      case 'restaurant':
        router.push(`/restaurant-board/${post.boardIdx}`);
        break;
      case 'university':
        router.push(`/univ-board/${post.boardIdx}`);
        break;
      default:
        router.push(`/freeboard/${post.boardIdx}`);
    }
  };

  // 맛잘알 후기 클릭 핸들러
  const handleMatzalAlBoardClick = (board: any) => {
    // 식당 정보를 sessionStorage에 저장 (뒤로가기 시 사용)
    if ((board as any).restaurantName) {
      sessionStorage.setItem('previousMatzalAlName', (board as any).restaurantName);
    }
    if ((board as any).restaurant?.matzalAlName) {
      sessionStorage.setItem('previousMatzalAlName', (board as any).restaurant.matzalAlName);
    }
    router.push(`/matzal-al-board/${board.boardIdx}`);
  };

  // 게시판 타입별 스타일 정보 반환
  const getBoardTypeStyle = (boardType: string) => {
    switch (boardType) {
      case 'university':
        return {
          label: '대학 오빠',
          color: 'green',
          icon: (
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )
        };
      case 'company':
        return {
          label: '회사 오빠',
          color: 'purple',
          icon: (
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          )
        };
      case 'church':
        return {
          label: '교회 오빠',
          color: 'red',
          icon: (
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 2v20M5 8h14" />
            </svg>
          )
        };
      case 'restaurant':
        return {
          label: '맛잘알 오빠',
          color: 'blue',
          icon: (
            <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {/* 포크 */}
              <path d="M7 2c.55 0 1 .45 1 1v6.2c0 .66.54 1.2 1.2 1.2H10v10.6c0 .55-.45 1-1 1s-1-.45-1-1V10.4H6.8c-.66 0-1.2-.54-1.2-1.2V3c0-.55.45-1 1-1s1 .45 1 1v3h.8V3c0-.55.45-1 1-1s1 .45 1 1v3h.8V3c0-.55.45-1 1-1s1 .45 1 1v6.2c0 1.77-1.43 3.2-3.2 3.2H11v8.8c0 .55-.45 1-1 1s-1-.45-1-1V12.4H9.2c-1.77 0-3.2-1.43-3.2-3.2V3c0-.55.45-1 1-1z" />
              {/* 숟가락 */}
              <path d="M17.5 2c1.93 0 3.5 1.57 3.5 3.5c0 1.7-1.2 3.12-2.8 3.43V21c0 .55-.45 1-1 1s-1-.45-1-1V8.93C14.7 8.62 13.5 7.2 13.5 5.5C13.5 3.57 15.07 2 17 2h.5zm-.5 2c-.83 0-1.5.67-1.5 1.5S16.17 7 17 7s1.5-.67 1.5-1.5S17.83 4 17 4z" />
            </svg>
          )
        };
      case 'outsource':
        return {
          label: '외주 오빠',
          color: 'yellow',
          icon: (
            <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          )
        };
      case 'freeboard':
        return {
          label: '자유게시판',
          color: 'indigo',
          icon: (
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )
        };
      default:
        return {
          label: '기타',
          color: 'gray',
          icon: (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )
        };
    }
  };

  // 리뷰 작성 핸들러
  const handleReviewSubmit = async (reviewData: Omit<FreeBoardPost, 'boardIdx' | 'boardRegDate' | 'boardLike' | 'boardHits'>) => {
    try {
      // 실제 API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 새 리뷰 데이터 생성
      const newReview: FreeBoardPost = {
        ...reviewData,
        boardIdx: Math.max(...recentFreeBoardPosts.map(p => p.boardIdx)) + 1,
        boardRegDate: new Date().toISOString(),
        boardLike: 0,
        boardHits: 0,
      };
      
      // 게시글 목록에 추가
      setRecentFreeBoardPosts(prev => [newReview, ...prev.slice(0, 4)]);
      
      alert('리뷰가 성공적으로 작성되었습니다!');
    } catch (error) {
      console.error('리뷰 작성 오류:', error);
      alert('리뷰 작성 중 오류가 발생했습니다.');
    }
  };

  // 서비스 제목 클릭 시 해당 서비스 페이지로 이동
  const handleServiceClick = () => {
    router.push('/univ-mentor'); // 학교 오빠는 /univ-mentor 페이지로
  };

  // 뒤로가기 처리
  const handleBackClick = () => {
    // sessionStorage에서 이전 페이지 정보 확인
    const previousPage = sessionStorage.getItem('previousPage');

    if (previousPage && previousPage !== '/') {
      // 이전 페이지가 있고 Ori 메인 페이지가 아니면 해당 페이지로 이동
      router.push(previousPage);
    } else {
      // 이전 페이지가 없거나 Ori 메인 페이지면 메인페이지로 이동
      router.push('/');
    }
  };

  // 검색 제출 핸들러
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Ori 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div onClick={handleBackClick} className="cursor-pointer">
              <div className="flex items-center space-x-3">
                <img alt="Ori Duck" src="/images/duck.png" width="40" height="40" className="w-10 h-10" />
                <h1 className="text-2xl font-bold text-gray-900">Ori</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-0 pb-28">

        {/* Hero Search Section */}
        <section className="max-w-5xl mx-auto px-6 py-14 text-center">
          <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900 tracking-tight mb-8">
            가장 솔직한 후기를 경험해보세요!
          </h1>
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="리뷰, 게시판, 오빠 시리즈 검색..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-14 pr-32 py-5 bg-white border border-gray-300 rounded-full shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base placeholder:text-gray-400 outline-none"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-8 bg-indigo-600 text-white rounded-full font-bold shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
            >
              검색
            </button>
          </form>
        </section>

        <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">

          {/* 후기 베스트 - Full Width */}
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">후기 베스트</h2>
              </div>
              <button className="text-sm text-indigo-600 font-bold hover:underline flex items-center gap-1">
                더보기
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-6">실시간으로 가장 인기 있는 최고의 리뷰들을 확인하세요</p>

            {isBestPostsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">베스트 후기를 불러오는 중...</p>
              </div>
            ) : bestPostsError ? (
              <div className="text-center py-8">
                <p className="text-sm text-red-500">{bestPostsError}</p>
              </div>
            ) : (() => {
              const filteredPosts = bestPosts.filter(post => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return post.boardTitle.toLowerCase().includes(query) || post.boardContent.toLowerCase().includes(query);
              });

              if (filteredPosts.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">
                      {searchQuery ? `'${searchQuery}' 검색 결과가 없습니다.` : '베스트 후기가 없습니다.'}
                    </p>
                  </div>
                );
              }

              return (
                <ul className="flex flex-col">
                  {filteredPosts.slice(0, 10).map((post, index) => {
                    const style = getBoardTypeStyle(post.boardType);
                    const colorBgMap: Record<string, string> = {
                      green: 'bg-green-100', purple: 'bg-purple-100', red: 'bg-red-100',
                      blue: 'bg-blue-100', yellow: 'bg-yellow-100', indigo: 'bg-indigo-100', gray: 'bg-gray-100',
                    };
                    return (
                      <li
                        key={`${post.boardType}-${post.boardIdx}`}
                        onClick={() => handleBestPostClick(post)}
                        className="flex items-center gap-4 py-3 group cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <span className={`w-6 text-center text-lg italic font-bold ${index < 3 ? 'text-indigo-600' : 'text-gray-400'}`}>{index + 1}</span>
                        <div className={`w-8 h-8 ${colorBgMap[style.color] || 'bg-gray-100'} rounded-full flex items-center justify-center flex-shrink-0`}>
                          {style.icon}
                        </div>
                        <span className="flex-grow text-sm font-semibold truncate group-hover:text-indigo-600 transition-colors">{post.boardTitle}</span>
                        <div className="flex items-center gap-3 text-xs text-gray-400 ml-2 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {post.boardHits}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {post.boardLike}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </div>

          {/* 3-Column Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* 자유게시판 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                  <h3 className="font-bold text-lg">자유게시판</h3>
                </div>
                <Link href="/freeboard" className="text-xs text-indigo-600 font-bold hover:underline">더보기</Link>
              </div>
              <p className="text-xs text-gray-400 mb-4">다양한 주제로 소통하고 정보를 나누는 공간입니다.</p>
              <ul className="space-y-3 flex-grow">
                {isFreeBoardLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="animate-pulse flex items-center gap-2">
                        <div className="h-3 bg-gray-200 rounded flex-grow"></div>
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                      </li>
                    ))
                  : recentFreeBoardPosts.length === 0
                  ? <li className="text-sm text-gray-400 py-4 text-center">첫 번째 글을 남겨보세요!</li>
                  : recentFreeBoardPosts.slice(0, 5).map((post) => (
                      <li key={post.boardIdx} onClick={() => handleFreeBoardPostClick(post)} className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm truncate text-gray-600 group-hover:text-indigo-600 transition-colors">{post.boardTitle}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400 ml-2 whitespace-nowrap flex-shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {post.boardLike}
                        </div>
                      </li>
                    ))
                }
              </ul>
            </div>

            {/* 대학 오빠 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="font-bold text-lg">대학 오빠</h3>
                </div>
                <Link href="/univ-mentor" className="text-xs text-indigo-600 font-bold hover:underline">더보기</Link>
              </div>
              <p className="text-xs text-gray-400 mb-4">캠퍼스 라이프와 전공 꿀팁 리뷰를 확인하세요.</p>
              <ul className="space-y-3 flex-grow">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="animate-pulse flex items-center gap-2">
                        <div className="h-3 bg-gray-200 rounded flex-grow"></div>
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                      </li>
                    ))
                  : recentPosts.length === 0
                  ? <li className="text-sm text-gray-400 py-4 text-center">첫 번째 대학 후기를 남겨보세요!</li>
                  : recentPosts.slice(0, 5).map((post) => (
                      <li key={post.boardIdx} onClick={() => handlePostClick(post)} className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm truncate text-gray-600 group-hover:text-indigo-600 transition-colors">{post.boardTitle}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400 ml-2 whitespace-nowrap flex-shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {post.boardLike}
                        </div>
                      </li>
                    ))
                }
              </ul>
            </div>

            {/* 회사 오빠 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="font-bold text-lg">회사 오빠</h3>
                </div>
                <Link href="/company-mentor" className="text-xs text-indigo-600 font-bold hover:underline">더보기</Link>
              </div>
              <p className="text-xs text-gray-400 mb-4">직장 생활 노하우와 커리어 리뷰를 담았습니다.</p>
              <ul className="space-y-3 flex-grow">
                {isCompanyLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="animate-pulse flex items-center gap-2">
                        <div className="h-3 bg-gray-200 rounded flex-grow"></div>
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                      </li>
                    ))
                  : recentCompanyPosts.length === 0
                  ? <li className="text-sm text-gray-400 py-4 text-center">첫 번째 회사 후기를 남겨보세요!</li>
                  : recentCompanyPosts.slice(0, 5).map((post) => (
                      <li key={post.boardIdx} onClick={() => handleCompanyPostClick(post)} className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm truncate text-gray-600 group-hover:text-indigo-600 transition-colors">{post.boardTitle}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400 ml-2 whitespace-nowrap flex-shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {post.boardLike}
                        </div>
                      </li>
                    ))
                }
              </ul>
            </div>

            {/* 교회 오빠 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 2v20M5 8h14" />
                  </svg>
                  <h3 className="font-bold text-lg">교회 오빠</h3>
                </div>
                <Link href="/church-mentor" className="text-xs text-indigo-600 font-bold hover:underline">더보기</Link>
              </div>
              <p className="text-xs text-gray-400 mb-4">다양한 커뮤니티와 소통을 위한 공간입니다.</p>
              <ul className="space-y-3 flex-grow">
                {isChurchLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="animate-pulse flex items-center gap-2">
                        <div className="h-3 bg-gray-200 rounded flex-grow"></div>
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                      </li>
                    ))
                  : recentChurchPosts.length === 0
                  ? <li className="text-sm text-gray-400 py-4 text-center">첫 번째 교회 후기를 남겨보세요!</li>
                  : recentChurchPosts.slice(0, 5).map((post) => (
                      <li key={post.boardIdx} onClick={() => handleChurchPostClick(post)} className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm truncate text-gray-600 group-hover:text-indigo-600 transition-colors">{post.boardTitle}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400 ml-2 whitespace-nowrap flex-shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {post.boardLike}
                        </div>
                      </li>
                    ))
                }
              </ul>
            </div>

            {/* 외주 오빠 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="font-bold text-lg">외주 오빠</h3>
                </div>
                <Link href="/outsource-mentor" className="text-xs text-indigo-600 font-bold hover:underline">더보기</Link>
              </div>
              <p className="text-xs text-gray-400 mb-4">실전 프로젝트 경험과 외주 후기 리스트.</p>
              <ul className="space-y-3 flex-grow">
                {isOutsourceLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="animate-pulse flex items-center gap-2">
                        <div className="h-3 bg-gray-200 rounded flex-grow"></div>
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                      </li>
                    ))
                  : !recentOutsourceBoards || recentOutsourceBoards.length === 0
                  ? <li className="text-sm text-gray-400 py-4 text-center">첫 번째 외주 후기를 남겨보세요!</li>
                  : recentOutsourceBoards.slice(0, 5).map((board) => (
                      <li
                        key={board.boardIdx}
                        onClick={() => {
                          if ((board as any).outsourceName) sessionStorage.setItem('previousOutsourceName', (board as any).outsourceName);
                          if ((board as any).outsource?.outsourceName) sessionStorage.setItem('previousOutsourceName', (board as any).outsource.outsourceName);
                          router.push(`/outsource-board/${board.boardIdx}`);
                        }}
                        className="flex items-center justify-between group cursor-pointer"
                      >
                        <span className="text-sm truncate text-gray-600 group-hover:text-indigo-600 transition-colors">{board.boardTitle}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400 ml-2 whitespace-nowrap flex-shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {board.boardLike || 0}
                        </div>
                      </li>
                    ))
                }
              </ul>
            </div>

            {/* 맛잘알 오빠 */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-full">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-rose-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 2c.55 0 1 .45 1 1v6.2c0 .66.54 1.2 1.2 1.2H10v10.6c0 .55-.45 1-1 1s-1-.45-1-1V10.4H6.8c-.66 0-1.2-.54-1.2-1.2V3c0-.55.45-1 1-1s1 .45 1 1v3h.8V3c0-.55.45-1 1-1s1 .45 1 1v3h.8V3c0-.55.45-1 1-1s1 .45 1 1v6.2c0 1.77-1.43 3.2-3.2 3.2H11v8.8c0 .55-.45 1-1 1s-1-.45-1-1V12.4H9.2c-1.77 0-3.2-1.43-3.2-3.2V3c0-.55.45-1 1-1z" />
                    <path d="M17.5 2c1.93 0 3.5 1.57 3.5 3.5c0 1.7-1.2 3.12-2.8 3.43V21c0 .55-.45 1-1 1s-1-.45-1-1V8.93C14.7 8.62 13.5 7.2 13.5 5.5C13.5 3.57 15.07 2 17 2h.5zm-.5 2c-.83 0-1.5.67-1.5 1.5S16.17 7 17 7s1.5-.67 1.5-1.5S17.83 4 17 4z" />
                  </svg>
                  <h3 className="font-bold text-lg">맛잘알 오빠</h3>
                </div>
                <Link href="/matzal-al-mentor" className="text-xs text-indigo-600 font-bold hover:underline">더보기</Link>
              </div>
              <p className="text-xs text-gray-400 mb-4">검증된 맛집 탐방과 미식 리뷰를 즐겨보세요.</p>
              <ul className="space-y-3 flex-grow">
                {isMatzalAlLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="animate-pulse flex items-center gap-2">
                        <div className="h-3 bg-gray-200 rounded flex-grow"></div>
                        <div className="h-3 bg-gray-200 rounded w-8"></div>
                      </li>
                    ))
                  : recentMatzalAlBoards.length === 0
                  ? <li className="text-sm text-gray-400 py-4 text-center">첫 번째 맛집 후기를 남겨보세요!</li>
                  : recentMatzalAlBoards.slice(0, 5).map((board: MatzalAlBoard) => (
                      <li key={board.boardIdx} onClick={() => handleMatzalAlBoardClick(board)} className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm truncate text-gray-600 group-hover:text-indigo-600 transition-colors">{board.boardTitle}</span>
                        <div className="flex items-center gap-1 text-xs text-gray-400 ml-2 whitespace-nowrap flex-shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {board.boardLike}
                        </div>
                      </li>
                    ))
                }
              </ul>
            </div>

            {/* 동적 서비스 섹션 */}
            {dynamicServices.map((service) => (
              <DynamicServiceSection key={service.serviceSlug} service={service} />
            ))}

          </div>
        </div>
      </main>

      {/* Floating Write Button (Mobile) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-40 lg:hidden"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-2 pb-4 bg-white border-t border-gray-200 z-50">
        <a href="/" className="flex flex-col items-center justify-center text-indigo-600 px-3 py-1.5">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
          <span className="text-[10px] font-bold mt-0.5">홈</span>
        </a>
        <a href="/" className="flex flex-col items-center justify-center text-gray-400 px-3 py-1.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <span className="text-[10px] font-medium mt-0.5">베스트</span>
        </a>
        <button onClick={() => setIsModalOpen(true)} className="flex flex-col items-center justify-center text-gray-400 px-3 py-1.5">
          <svg className="w-8 h-8 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
        </button>
        <Link href="/freeboard" className="flex flex-col items-center justify-center text-gray-400 px-3 py-1.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-[10px] font-medium mt-0.5">커뮤니티</span>
        </Link>
        <button className="flex flex-col items-center justify-center text-gray-400 px-3 py-1.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[10px] font-medium mt-0.5">내정보</span>
        </button>
      </nav>

      {/* Footer */}
      <footer className="w-full py-12 px-6 mt-20 bg-slate-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
          <div className="flex items-center gap-2">
            <img src="/images/duck.png" alt="Ori" width="28" height="28" className="w-7 h-7 opacity-70" />
            <span className="text-xl font-black text-indigo-900">Ori</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">이용약관</a>
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">개인정보처리방침</a>
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">고객센터</a>
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors">광고문의</a>
          </div>
          <p className="text-xs text-gray-400 text-center">
            © 2024 Ori Platform. The Modern Oracle of Reviews.
          </p>
        </div>
      </footer>

      {/* Review Write Modal */}
      <ReviewWriteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}

// 동적 서비스 최근 후기 컴포넌트
function DynamicServiceSection({ service }: { service: ServiceConfig }) {
  const router = useRouter();
  const { boards, loading, error } = useRecentDynamicBoards(service.serviceSlug, 5);

  const colorMap: Record<string, { bg: string; text: string; hoverBg: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', hoverBg: 'hover:bg-blue-200' },
    red: { bg: 'bg-red-100', text: 'text-red-600', hoverBg: 'hover:bg-red-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', hoverBg: 'hover:bg-green-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', hoverBg: 'hover:bg-purple-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', hoverBg: 'hover:bg-orange-200' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600', hoverBg: 'hover:bg-teal-200' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', hoverBg: 'hover:bg-indigo-200' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', hoverBg: 'hover:bg-pink-200' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', hoverBg: 'hover:bg-yellow-200' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', hoverBg: 'hover:bg-cyan-200' },
  };

  const colors = colorMap[service.serviceColor] || colorMap.blue;

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xl ${colors.text}`}>{service.serviceEmoji}</span>
          <h3 className="font-bold text-lg">{service.serviceDisplay}</h3>
        </div>
        <button
          onClick={() => router.push(`/s/${service.serviceSlug}/mentor`)}
          className="text-xs text-indigo-600 font-bold hover:underline"
        >
          더보기
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">{service.serviceDisplay} 관련 최근 후기들을 확인하세요.</p>

      <ul className="space-y-3 flex-grow">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="animate-pulse flex items-center gap-2">
                <div className="h-3 bg-gray-200 rounded flex-grow"></div>
                <div className="h-3 bg-gray-200 rounded w-8"></div>
              </li>
            ))
          : !boards || boards.length === 0
          ? <li className="text-sm text-gray-400 py-2">아직 등록된 후기가 없습니다.</li>
          : boards.slice(0, 5).map((board) => (
              <li
                key={board.boardIdx}
                onClick={() => router.push(`/s/${service.serviceSlug}/board/${board.boardIdx}`)}
                className="flex items-center justify-between group cursor-pointer"
              >
                <span className="text-sm truncate text-gray-600 group-hover:text-indigo-600 transition-colors">{board.boardTitle}</span>
                <div className="flex items-center gap-1 text-xs text-gray-400 ml-2 whitespace-nowrap flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {board.boardLike || 0}
                </div>
              </li>
            ))
        }
      </ul>
    </div>
  );
}
