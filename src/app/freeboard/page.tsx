'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FreeBoardPost, FreeBoardApiResponse } from '@/types';
import ReviewWriteModal from '@/components/common/ReviewWriteModal';
import { createFreeboardPost, fetchFreeboardList } from '@/lib/freeboard/freeboardAPI';

export default function FreeBoardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<FreeBoardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTopCategories, setShowTopCategories] = useState(false);
  const [showTopTags, setShowTopTags] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const POSTS_PER_PAGE = 10;

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

  // 게시글 데이터 가져오기 (API 연동)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res: any = await fetchFreeboardList({
          page: currentPage,
          limit: POSTS_PER_PAGE,
          search: searchQuery || undefined,
        });
        setPosts(res.data || []);
        setTotalCount(res.totalCount || 0);
        const totalPages = (res?.pagination?.totalPages ?? Math.ceil((res.totalCount || 0) / POSTS_PER_PAGE)) || 1;
        setTotalPages(totalPages);
      } catch (error) {
        console.error('게시글 로딩 오류:', error);
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage, searchQuery]);

  // 게시글 클릭 핸들러
  const handlePostClick = (post: FreeBoardPost) => {
    router.push(`/freeboard/${post.boardIdx}`);
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 리뷰 작성 핸들러
  const handleReviewSubmit = async (reviewData: Omit<FreeBoardPost, 'boardIdx' | 'boardRegDate' | 'boardLike' | 'boardHits'>) => {
    try {
      await createFreeboardPost({
        boardTitle: reviewData.boardTitle,
        boardContent: reviewData.boardContent,
        category: reviewData.category,
        boardID: reviewData.boardID,
        tags: reviewData.tags,
        boardPassword: (reviewData as any).boardPassword || '',
      });

      // 첫 페이지로 이동하여 목록 새로고침 트리거
      setCurrentPage(1);
      // 즉시 재조회 강제 (캐시 무시)
      setIsLoading(true);
      try {
        const res: any = await fetchFreeboardList({ page: 1, limit: POSTS_PER_PAGE, search: searchQuery || undefined });
        setPosts(res.data || []);
        setTotalCount(res.totalCount || 0);
        const totalPagesCalc = (res?.pagination?.totalPages ?? Math.ceil((res.totalCount || 0) / POSTS_PER_PAGE)) || 1;
        setTotalPages(totalPagesCalc);
      } finally {
        setIsLoading(false);
      }
      alert('리뷰가 성공적으로 작성되었습니다!');
    } catch (error) {
      console.error('리뷰 작성 오류:', error);
      alert('리뷰 작성 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="group flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 -ml-2"
            >
              <div className="flex items-center justify-center w-8 h-8 mr-3 bg-gray-100 group-hover:bg-gray-200 rounded-full transition-colors duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="font-medium">뒤로가기</span>
            </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-900">자유게시판</h1>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>리뷰 작성</span>
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6">
            {/* 왼쪽: 게시글 목록 */}
            <div className="flex-1">
              {/* 검색 */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="제목, 내용, 카테고리, 태그로 검색..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors"
                >
                  검색
                </button>
              </form>
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-600">
                  '{searchQuery}' 검색 결과: {totalCount}개
                </div>
              )}
            </div>

            {/* 카테고리 안내 */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-900">
                    많이 나온 카테고리를 선정하여 오늘의 리뷰 후기 카테고리 항목을 만듭니다
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">
                    다양한 경험을 공유하고 카테고리별로 정리된 리뷰를 확인해보세요
                  </p>
                </div>
              </div>
            </div>

        {/* 게시글 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">게시글을 불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">오류가 발생했습니다</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">게시글이 없습니다</h2>
              <p className="text-gray-600">아직 작성된 게시글이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* 게시글 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-12 gap-6 text-sm font-medium text-gray-500" style={{gridTemplateColumns: '35px 1fr 1fr 60px 35px 35px 80px'}}>
                  <div className="whitespace-nowrap">번호</div>
                  <div className="whitespace-nowrap">카테고리</div>
                  <div className="whitespace-nowrap">제목</div>
                  <div className="whitespace-nowrap">작성자</div>
                  <div className="whitespace-nowrap">조회</div>
                  <div className="whitespace-nowrap">좋아요</div>
                  <div className="whitespace-nowrap">날짜</div>
                </div>
              </div>

              {/* 게시글 목록 */}
              <div className="divide-y divide-gray-200">
                {posts.map((post, index) => (
                  <div
                    key={post.boardIdx}
                    onClick={() => handlePostClick(post)}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="grid grid-cols-12 gap-6 items-center text-sm" style={{gridTemplateColumns: '35px 3fr 60px 35px 35px 80px'}}>
                      <div className="text-gray-500 truncate">
                        {(currentPage - 1) * 10 + index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2 min-w-0 justify-end">
                          {/* 카테고리 배지 */}
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                            {post.category}
                          </span>
                          {/* 제목 - 더 많은 공간 할당 */}
                          <span className="text-gray-900 font-medium truncate flex-1 min-w-0 text-right" style={{minWidth: '200px'}}>
                            {post.boardTitle}
                          </span>
                          {/* 태그들 - 최대 1개만 표시하고 더 작게 */}
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex space-x-1 flex-shrink-0">
                              {post.tags.slice(0, 1).map((tag, tagIndex) => (
                                <span key={tagIndex} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-500 truncate">{post.boardID || '익명'}</div>
                      <div className="text-gray-500 truncate">{post.boardHits}</div>
                      <div className="text-gray-500 truncate">{post.boardLike}</div>
                      <div className="text-gray-500 whitespace-nowrap">{formatTimeAgo(post.boardRegDate)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      처음
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    
                    {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                      let page;
                      if (totalPages <= 10) {
                        page = i + 1;
                      } else {
                        const start = Math.max(1, Math.min(currentPage - 5, totalPages - 9));
                        page = start + i;
                      }
                      
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 text-sm rounded ${
                            currentPage === page
                              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      마지막
                    </button>
                  </div>
                  <div className="text-center mt-2 text-sm text-gray-600">
                    {currentPage} / {totalPages} 페이지
                  </div>
                </div>
              )}
            </>
          )}
        </div>
          </div>

          {/* 오른쪽: Top10 섹션 */}
          <div className="w-80 shrink-0 space-y-6">
            {/* Top10 카테고리 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Top10 카테고리
              </h3>
              <div className="space-y-2">
                {[
                  { name: '맛집', count: 145 },
                  { name: '카페', count: 123 },
                  { name: '여행', count: 98 },
                  { name: '쇼핑', count: 87 },
                  { name: '문화생활', count: 76 },
                  { name: '숙소', count: 54 },
                  { name: '액티비티', count: 43 },
                  { name: '뷰티', count: 32 },
                  { name: '헬스', count: 28 },
                  { name: '기타', count: 21 }
                ].slice(0, showTopCategories ? 10 : 5).map((category, index) => (
                  <button
                    key={category.name}
                    onClick={() => {
                      setSearchQuery(category.name);
                      setCurrentPage(1);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-indigo-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-indigo-600">#{index + 1}</span>
                      <span className="text-sm text-gray-900 group-hover:text-indigo-600">{category.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{category.count}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTopCategories(!showTopCategories)}
                className="w-full mt-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center space-x-1"
              >
                <span>{showTopCategories ? '접기' : '더보기'}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showTopCategories ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Top10 태그 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Top10 태그
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: '가성비', count: 234 },
                  { name: '데이트', count: 198 },
                  { name: '혼밥', count: 176 },
                  { name: '분위기', count: 154 },
                  { name: '추천', count: 143 },
                  { name: '맛있어요', count: 132 },
                  { name: '친절', count: 121 },
                  { name: '청결', count: 98 },
                  { name: '재방문', count: 87 },
                  { name: '주차', count: 76 }
                ].slice(0, showTopTags ? 10 : 5).map((tag, index) => (
                  <button
                    key={tag.name}
                    onClick={() => {
                      setSearchQuery(tag.name);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1.5 bg-purple-50 text-purple-600 text-sm rounded-full hover:bg-purple-100 transition-colors flex items-center space-x-1"
                  >
                    <span>#{tag.name}</span>
                    <span className="text-xs text-purple-400">({tag.count})</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowTopTags(!showTopTags)}
                className="w-full mt-3 py-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center space-x-1"
              >
                <span>{showTopTags ? '접기' : '더보기'}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showTopTags ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* 리뷰 작성 모달 */}
      <ReviewWriteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}
