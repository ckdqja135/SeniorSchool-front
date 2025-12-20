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
        
        const response = await fetch('https://api.reviewhub.life/board/recent');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ApiResponse = await response.json();
        
        if (result.status === 200 && result.data) {
          setRecentPosts(result.data);
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
        
        const response = await fetch('https://api.reviewhub.life/church/boards/recent');
        
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
        
        const response = await fetch('https://api.reviewhub.life/comp/board/recent');
        
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )
        };
      default:
        return {
          label: '기타',
          color: 'gray',
          icon: (
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Ori 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div 
              onClick={handleBackClick}
              className="cursor-pointer"
            >
              <div className="flex items-center space-x-3">
              <img 
                alt="Ori Duck" 
                src="/images/duck.png" 
                width="40" 
                height="40" 
                className="w-10 h-10"
              />
              <h1 className="text-2xl font-bold text-gray-900">Ori</h1>
            </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 후기 베스트 섹션 */}
        <div className="mb-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* 검색바 */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="관심있는 내용을 검색해보세요!"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* 베스트 후기 헤더 */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">후기 베스트</h3>
            </div>

            {/* 베스트 후기 목록 */}
            <div className="p-3 sm:p-4">
              {isBestPostsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">베스트 후기를 불러오는 중...</p>
                </div>
              ) : bestPostsError ? (
                <div className="text-center py-4">
                  <p className="text-sm text-red-500">{bestPostsError}</p>
                </div>
              ) : bestPosts.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">베스트 후기가 없습니다.</p>
                </div>
              ) : (() => {
                const filteredPosts = bestPosts.filter(post => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return post.boardTitle.toLowerCase().includes(query) || 
                         post.boardContent.toLowerCase().includes(query);
                });

                if (filteredPosts.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">'{searchQuery}' 검색 결과가 없습니다.</p>
                    </div>
                  );
                }

                return (
                <div className="space-y-2">
                    {filteredPosts.slice(0, 10).map((post, index) => {
                    const style = getBoardTypeStyle(post.boardType);
                    const colorClasses = {
                      green: 'bg-green-100 text-green-600',
                      purple: 'bg-purple-100 text-purple-600',
                      red: 'bg-red-100 text-red-600',
                      blue: 'bg-blue-100 text-blue-600',
                      orange: 'bg-orange-100 text-orange-600',
                      yellow: 'bg-yellow-100 text-yellow-600',
                      indigo: 'bg-indigo-100 text-indigo-600',
                      gray: 'bg-gray-100 text-gray-600'
                    };
                    
                    return (
                      <div
                        key={`${post.boardType}-${post.boardIdx}`}
                        onClick={() => handleBestPostClick(post)}
                        className="p-2 sm:p-3 hover:bg-gray-50 rounded-lg cursor-pointer group"
                      >
                        <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                          {/* 아이콘 */}
                          <div className="flex-shrink-0">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 ${colorClasses[style.color as keyof typeof colorClasses].split(' ')[0]} rounded-full flex items-center justify-center`}>
                              {style.icon}
                            </div>
                          </div>
                          
                          {/* 콘텐츠 영역 */}
                          <div className="flex-1 min-w-0">
                            {/* 배지와 제목 - 모바일에서 세로 정렬 */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <span className={`text-xs font-medium ${colorClasses[style.color as keyof typeof colorClasses]} px-2 py-0.5 rounded-full whitespace-nowrap w-fit`}>
                                {style.label}
                              </span>
                              <p className="text-sm sm:text-base text-gray-900 font-medium line-clamp-2 sm:line-clamp-1 group-hover:text-indigo-700 transition-colors duration-200">
                                {post.boardTitle}
                              </p>
                            </div>
                          </div>
                          
                          {/* 통계 정보 */}
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 text-xs text-gray-400 flex-shrink-0">
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                              </svg>
                              <span>{post.boardLike}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span>{post.boardHits}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 자유게시판 섹션 - 상단 독립 영역 (컴팩트 버전) */}
        <div className="mb-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
            <div 
              onClick={() => router.push('/freeboard')}
              className="p-3 border-b border-gray-200 cursor-pointer group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">자유게시판</h2>
                  <p className="text-xs text-gray-500">다양한 경험을 공유해보세요</p>
                </div>
              </div>
            </div>
            
            {/* 자유게시판 내용 - 간소화 */}
            <div className="p-3">
              {isFreeBoardLoading ? (
                <div className="text-center py-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p className="text-xs text-gray-500">로딩 중...</p>
                </div>
              ) : freeBoardError ? (
                <div className="text-center py-3">
                  <p className="text-xs text-red-500">{freeBoardError}</p>
                </div>
              ) : recentFreeBoardPosts.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-xs text-gray-500">최근 게시글이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentFreeBoardPosts.slice(0, 5).map((post, index) => (
                    <div
                      key={post.boardIdx}
                      onClick={() => handleFreeBoardPostClick(post)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors duration-200 p-2 rounded group"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {post.category}
                        </span>
                        <p className="text-sm text-gray-900 font-medium line-clamp-1 group-hover:text-indigo-700 transition-colors duration-200 flex-1">
                          {post.boardTitle}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            <span>{post.boardLike}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>{post.boardHits}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 기존 3개 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* 왼쪽 컬럼 */}
          <div className="space-y-6">
            {/* 대학 선배 섹션 - 제일 앞에 배치 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div 
                  onClick={handleServiceClick}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-300">대학 오빠</h2>
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:animate-pulse group-hover:bg-green-200 transition-all duration-300">
                      <svg className="w-5 h-5 text-green-600 group-hover:text-green-700 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 최근 게시글 목록 */}
              <div className="p-4">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">로딩 중...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-500">{error}</p>
                  </div>
                ) : recentPosts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">최근 게시글이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentPosts.slice(0, 5).map((post) => (
                      <div
                        key={post.boardIdx}
                        onClick={() => handlePostClick(post)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 p-2 rounded"
                      >
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-900">{post.boardID}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">{post.boardRegDate}</span>
                            </div>
                            <p className="text-xs text-gray-900 line-clamp-1">{post.boardTitle}</p>
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span className="text-xs text-gray-500">{post.boardLike}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-xs text-gray-500">{post.boardHits}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {post.university.univName}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 교회 선배 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div 
                  onClick={() => router.push('/church-mentor')}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-300">교회 오빠</h2>
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center group-hover:animate-pulse group-hover:bg-red-200 transition-all duration-300">
                      <svg className="w-5 h-5 text-red-600 group-hover:text-red-700 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 교회 선배 내용 */}
              <div className="p-4">
                {isChurchLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">교회 후기를 불러오는 중...</p>
                  </div>
                ) : churchError ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-500">{churchError}</p>
                  </div>
                ) : recentChurchPosts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">최근 교회 후기가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentChurchPosts.slice(0, 5).map((post) => (
                      <div
                        key={post.boardIdx}
                        onClick={() => handleChurchPostClick(post)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 p-2 rounded"
                      >
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-900">{post.boardID}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">{post.boardRegDate}</span>
                            </div>
                            <p className="text-xs text-gray-900 line-clamp-1">{post.boardTitle}</p>
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span className="text-xs text-gray-500">{post.boardLike}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-xs text-gray-500">{post.boardHits}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {post.church.churchName}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 오른쪽 컬럼 */}
          <div className="space-y-6">
            {/* 회사 선배 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div 
                  onClick={() => router.push('/company-mentor')}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-300">회사 오빠</h2>
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:animate-pulse group-hover:bg-purple-200 transition-all duration-300">
                      <svg className="w-5 h-5 text-purple-600 group-hover:text-purple-700 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 회사 내용 */}
              <div className="p-4">
                {isCompanyLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">로딩 중...</p>
                  </div>
                ) : recentCompanyPosts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">최근 회사 후기가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentCompanyPosts.slice(0, 5).map((post) => (
                      <div
                        key={post.boardIdx}
                        onClick={() => handleCompanyPostClick(post)}
                        className="cursor-pointer hover:bg-gray-50 transition-colors duration-150 p-2 rounded"
                      >
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-900">{post.boardID}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">{post.boardRegDate}</span>
                            </div>
                            <p className="text-xs text-gray-900 line-clamp-1">{post.boardTitle}</p>
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span className="text-xs text-gray-500">{post.boardLike}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-xs text-gray-500">{post.boardHits}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {post.company.compName}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 외주 오빠 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div 
                  onClick={() => router.push('/outsource-mentor')}
                  className="cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-yellow-600 transition-colors duration-300">외주 오빠</h2>
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:animate-pulse group-hover:bg-yellow-200 transition-all duration-300">
                      <svg className="w-5 h-5 text-yellow-600 group-hover:text-yellow-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 외주 오빠 내용 */}
              <div className="p-4">
                {isOutsourceLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="p-2 rounded animate-pulse">
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex-shrink-0"></div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="h-3 bg-gray-200 rounded w-16"></div>
                              <div className="h-3 bg-gray-200 rounded w-20"></div>
                            </div>
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                            <div className="flex items-center space-x-3">
                              <div className="h-3 bg-gray-200 rounded w-8"></div>
                              <div className="h-3 bg-gray-200 rounded w-8"></div>
                              <div className="h-3 bg-gray-200 rounded w-12"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : outsourceError ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">외주 오빠 후기를 불러오는데 실패했습니다.</p>
                    <p className="text-xs text-gray-400 mt-1">{outsourceError}</p>
                  </div>
                ) : !recentOutsourceBoards || recentOutsourceBoards.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">아직 등록된 외주 오빠 후기가 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOutsourceBoards?.slice(0, 5).map((board) => (
                      <div 
                        key={board.boardIdx} 
                        className="p-2 rounded hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          // 외주업체 정보를 sessionStorage에 저장 (뒤로가기 시 사용)
                          if ((board as any).outsourceName) {
                            sessionStorage.setItem('previousOutsourceName', (board as any).outsourceName);
                          }
                          if ((board as any).outsource?.outsourceName) {
                            sessionStorage.setItem('previousOutsourceName', (board as any).outsource.outsourceName);
                          }
                          router.push(`/outsource-board/${board.boardIdx}`);
                        }}
                      >
                        <div className="flex items-start space-x-2">
                          <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-medium text-gray-900">{board.boardID}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">{board.boardRegDate ? board.boardRegDate.split(' ')[0] : ''}</span>
                            </div>
                            <p className="text-xs text-gray-900 line-clamp-1">{board.boardTitle}</p>
                            {board.outsourceName && (
                              <p className="text-xs text-gray-600 line-clamp-1 mt-1">📍 {board.outsourceName}</p>
                            )}
                            <div className="flex items-center space-x-3 mt-1">
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span className="text-xs text-gray-500">{board.boardLike || 0}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span className="text-xs text-gray-500">{board.boardHits || 0}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                외주 오빠
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 맛잘알 오빠 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <Link href="/matzal-al-mentor" className="flex items-center justify-between group">
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">맛잘알 오빠</h2>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-200">
                    <svg className="w-5 h-5 text-blue-600 group-hover:text-blue-700 transition-colors duration-200" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      {/* 포크 */}
                      <path d="M7 2c.55 0 1 .45 1 1v6.2c0 .66.54 1.2 1.2 1.2H10v10.6c0 .55-.45 1-1 1s-1-.45-1-1V10.4H6.8c-.66 0-1.2-.54-1.2-1.2V3c0-.55.45-1 1-1s1 .45 1 1v3h.8V3c0-.55.45-1 1-1s1 .45 1 1v3h.8V3c0-.55.45-1 1-1s1 .45 1 1v6.2c0 1.77-1.43 3.2-3.2 3.2H11v8.8c0 .55-.45 1-1 1s-1-.45-1-1V12.4H9.2c-1.77 0-3.2-1.43-3.2-3.2V3c0-.55.45-1 1-1z" />
                      {/* 숟가락 */}
                      <path d="M17.5 2c1.93 0 3.5 1.57 3.5 3.5c0 1.7-1.2 3.12-2.8 3.43V21c0 .55-.45 1-1 1s-1-.45-1-1V8.93C14.7 8.62 13.5 7.2 13.5 5.5C13.5 3.57 15.07 2 17 2h.5zm-.5 2c-.83 0-1.5.67-1.5 1.5S16.17 7 17 7s1.5-.67 1.5-1.5S17.83 4 17 4z" />
                    </svg>
                  </div>
                </Link>
              </div>
              
              {/* 맛잘알 내용 */}
              <div className="p-4">
              <div className="space-y-3">
                {isMatzalAlLoading ? (
                  // 로딩 상태
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-2 rounded animate-pulse">
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-3 bg-gray-200 rounded mb-1"></div>
                          <div className="h-2 bg-gray-200 rounded w-3/4 mb-1"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : matzalAlError ? (
                  // 에러 상태
                  <p className="text-sm text-gray-500">맛잘알 데이터를 불러오는 중 오류가 발생했습니다.</p>
                ) : recentMatzalAlBoards.length > 0 ? (
                  // 실제 데이터
                  (() => {
                    return recentMatzalAlBoards.map((board: MatzalAlBoard, i: number) => (
                    <div 
                      key={board.boardIdx} 
                      onClick={(e) => {
                        e.preventDefault();
                        handleMatzalAlBoardClick(board);
                      }} 
                      className="p-2 rounded hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    >
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-blue-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            {/* 포크 */}
                            <path d="M7 2c.55 0 1 .45 1 1v6.2c0 .66.54 1.2 1.2 1.2H10v10.6c0 .55-.45 1-1 1s-1-.45-1-1V10.4H6.8c-.66 0-1.2-.54-1.2-1.2V3c0-.55.45-1 1-1s1 .45 1 1v3h.8V3c0-.55.45-1 1-1s1 .45 1 1v3h.8V3c0-.55.45-1 1-1s1 .45 1 1v6.2c0 1.77-1.43 3.2-3.2 3.2H11v8.8c0 .55-.45 1-1 1s-1-.45-1-1V12.4H9.2c-1.77 0-3.2-1.43-3.2-3.2V3c0-.55.45-1 1-1z" />
                            {/* 숟가락 */}
                            <path d="M17.5 2c1.93 0 3.5 1.57 3.5 3.5c0 1.7-1.2 3.12-2.8 3.43V21c0 .55-.45 1-1 1s-1-.45-1-1V8.93C14.7 8.62 13.5 7.2 13.5 5.5C13.5 3.57 15.07 2 17 2h.5zm-.5 2c-.83 0-1.5.67-1.5 1.5S16.17 7 17 7s1.5-.67 1.5-1.5S17.83 4 17 4z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-gray-900">{board.boardID || '익명'}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">{board.boardRegDate ? board.boardRegDate.split(' ')[0] : ''}</span>
                          </div>
                          <p className="text-xs text-gray-900 line-clamp-1">
                            {board.boardTitle}
                          </p>
                          <div className="flex items-center space-x-3 mt-1">
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              <span className="text-xs text-gray-500">{board.boardLike}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="text-xs text-gray-500">{board.boardHits}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {(board as any).restaurantName || (board as any).restaurant?.restaurantName || '맛잘알 카테고리'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ));
                  })()
                ) : (
                  // 데이터가 없을 때
                  <p className="text-sm text-gray-500">아직 등록된 맛잘알 후기가 없습니다.</p>
                )}
              </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
