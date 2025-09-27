'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRecentOutsourceBoards } from '@/hooks/Outsource/useOutsource';

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

  // 게시글 클릭 시 해당 학교의 게시판 상세보기 페이지로 이동
  const handlePostClick = (post: BoardPost) => {
    router.push(`/board/${post.boardIdx}`);
  };

  // 교회 후기 클릭 시 해당 교회의 게시판 상세보기 페이지로 이동
  const handleChurchPostClick = (post: ChurchBoardPost) => {
    router.push(`/church-board/${post.boardIdx}`);
  };

  // 회사 후기 클릭 시 해당 회사의 게시판 상세보기 페이지로 이동
  const handleCompanyPostClick = (post: CompanyBoardPost) => {
    router.push(`/company-board/${post.boardIdx}`);
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
              <h1 className="text-2xl font-bold text-gray-900">Ori</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
                              <span className="text-xs text-gray-500">{formatTimeAgo(board.boardRegDate)}</span>
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

            {/* 맛잘알 선배 섹션 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">맛잘알 선배</h2>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* 맛잘알 내용 */}
              <div className="p-4">
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-2 rounded hover:bg-gray-50 transition-colors duration-150">
                      <div className="flex items-start space-x-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-gray-900">질문자{i}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">약 {i}시간 전</span>
                          </div>
                          <p className="text-xs text-gray-900 line-clamp-1">맛잘알 질문 제목 {i}</p>
                          <div className="flex items-center space-x-3 mt-1">
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              <span className="text-xs text-gray-500">{i * 5}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="text-xs text-gray-500">{i * 2}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              맛잘알 카테고리
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}