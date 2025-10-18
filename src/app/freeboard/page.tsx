'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FreeBoardPost, FreeBoardApiResponse } from '@/types';

export default function FreeBoardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<FreeBoardPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['전체', '일상', '질문', '정보', '후기', '잡담'];

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

  // 게시글 데이터 가져오기 (예시 데이터)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 예시 데이터
        const mockData: FreeBoardPost[] = [
          {
            boardIdx: 1,
            boardTitle: "대학생활 첫 학기 후기 - 정말 힘들었지만 보람있었어요",
            boardContent: "대학생활 첫 학기를 마치고 나니 정말 많은 것을 배웠습니다. 고등학교와는 완전히 다른 환경에서 적응하는 것이 쉽지 않았지만, 새로운 친구들과 선배들을 만나면서 점점 익숙해져가고 있어요. 특히 동아리 활동을 통해 다양한 사람들을 만날 수 있어서 정말 좋았습니다.",
            boardRegDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            boardLike: 24,
            boardHits: 156,
            boardID: "신입생123",
            category: "후기",
            tags: ["대학생활", "신입생", "후기"]
          },
          {
            boardIdx: 2,
            boardTitle: "교수님께 질문드릴 때 주의사항이 있나요?",
            boardContent: "교수님께 질문을 드릴 때 어떤 점들을 주의해야 할까요? 이메일로 보내는 것과 직접 찾아가서 말씀드리는 것 중에 어떤 게 더 좋을까요?",
            boardRegDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            boardLike: 12,
            boardHits: 89,
            boardID: "궁금이",
            category: "질문",
            tags: ["교수", "질문", "에티켓"]
          },
          {
            boardIdx: 3,
            boardTitle: "동아리 활동하면서 정말 많은 사람들을 만났어요",
            boardContent: "동아리 활동을 시작한 지 3개월이 되었는데, 정말 많은 사람들을 만나고 다양한 경험을 할 수 있어서 좋아요. 특히 프로젝트를 함께 진행하면서 팀워크의 중요성을 깨달았습니다.",
            boardRegDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 18,
            boardHits: 203,
            boardID: "동아리러버",
            category: "일상",
            tags: ["동아리", "친구", "활동"]
          },
          {
            boardIdx: 4,
            boardTitle: "학점 관리 꿀팁 공유합니다",
            boardContent: "학점 관리를 위한 제 개인적인 팁들을 공유해드릴게요. 1. 출석체크는 필수 2. 과제는 미리미리 3. 시험 전 일주일은 집중적으로 4. 교수님과의 관계도 중요해요!",
            boardRegDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 45,
            boardHits: 312,
            boardID: "학점왕",
            category: "정보",
            tags: ["학점", "공부법", "팁"]
          },
          {
            boardIdx: 5,
            boardTitle: "오늘은 정말 힘든 하루였어요...",
            boardContent: "시험 준비하면서 정말 스트레스 받고 있어요. 공부는 해도해도 끝이 없고, 다른 친구들은 다 잘하는 것 같은데 저만 뒤처지는 느낌이에요. 힘내세요 여러분...",
            boardRegDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 8,
            boardHits: 67,
            boardID: "스트레스맨",
            category: "잡담",
            tags: ["스트레스", "시험", "힘듦"]
          },
          {
            boardIdx: 6,
            boardTitle: "인턴십 경험담 공유해요",
            boardContent: "여름방학 동안 대기업에서 인턴십을 했는데, 정말 많은 것을 배웠어요. 업무 프로세스부터 회사 문화까지 모든 것이 새로웠습니다.",
            boardRegDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 32,
            boardHits: 245,
            boardID: "인턴생",
            category: "후기",
            tags: ["인턴십", "경험", "취업준비"]
          },
          {
            boardIdx: 7,
            boardTitle: "토익 공부 방법 추천해주세요",
            boardContent: "토익 점수가 계속 안 오르고 있어요. 어떤 방법으로 공부하시는지 조언 부탁드려요!",
            boardRegDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 15,
            boardHits: 98,
            boardID: "토익초보",
            category: "질문",
            tags: ["토익", "영어", "공부법"]
          },
          {
            boardIdx: 8,
            boardTitle: "대학 근처 맛집 추천해주세요!",
            boardContent: "학교 근처에서 가성비 좋은 맛집들을 찾고 있어요. 특히 혼밥하기 좋은 곳들 알려주세요!",
            boardRegDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 28,
            boardHits: 178,
            boardID: "맛집러버",
            category: "정보",
            tags: ["맛집", "혼밥", "추천"]
          },
          {
            boardIdx: 9,
            boardTitle: "오늘 날씨가 정말 좋네요",
            boardContent: "오늘 날씨가 정말 좋아서 학교 운동장에서 친구들과 축구를 했어요. 운동하고 나니까 스트레스도 풀리고 기분도 좋아졌어요!",
            boardRegDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 6,
            boardHits: 45,
            boardID: "운동러",
            category: "일상",
            tags: ["날씨", "운동", "친구"]
          },
          {
            boardIdx: 10,
            boardTitle: "시험 기간 스트레스 관리법",
            boardContent: "시험 기간에 스트레스를 어떻게 관리하시나요? 저는 음악 듣고 산책하는 게 도움이 되더라고요.",
            boardRegDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 22,
            boardHits: 134,
            boardID: "스트레스관리왕",
            category: "정보",
            tags: ["스트레스", "시험", "관리법"]
          }
        ];
        
        // 카테고리 필터링
        let filteredData = mockData;
        if (selectedCategory !== '전체') {
          filteredData = mockData.filter(post => post.category === selectedCategory);
        }
        
        // 검색 필터링
        if (searchQuery) {
          filteredData = filteredData.filter(post => 
            post.boardTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            post.boardContent.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // 페이지네이션
        const startIndex = (currentPage - 1) * 10;
        const endIndex = startIndex + 10;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        // 실제 API 호출 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setPosts(paginatedData);
        setTotalPages(Math.ceil(filteredData.length / 10));
      } catch (error) {
        console.error('게시글 로딩 오류:', error);
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage, selectedCategory, searchQuery]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </button>
            <h1 className="ml-4 text-xl font-semibold text-gray-900">자유게시판</h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 필터 및 검색 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    selectedCategory === category
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* 검색 */}
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제목, 내용으로 검색..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                검색
              </button>
            </form>
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
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
                  <div className="col-span-1">번호</div>
                  <div className="col-span-1">카테고리</div>
                  <div className="col-span-5">제목</div>
                  <div className="col-span-2">작성자</div>
                  <div className="col-span-1">조회</div>
                  <div className="col-span-1">좋아요</div>
                  <div className="col-span-1">날짜</div>
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
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-1 text-gray-500">
                        {(currentPage - 1) * 10 + index + 1}
                      </div>
                      <div className="col-span-1">
                        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                          {post.category}
                        </span>
                      </div>
                      <div className="col-span-5">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900 font-medium truncate">{post.boardTitle}</span>
                          {post.tags && post.tags.length > 0 && (
                            <div className="flex space-x-1">
                              {post.tags.slice(0, 2).map((tag, tagIndex) => (
                                <span key={tagIndex} className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2 text-gray-600">{post.boardID}</div>
                      <div className="col-span-1 text-gray-500">{post.boardHits}</div>
                      <div className="col-span-1 text-gray-500">{post.boardLike}</div>
                      <div className="col-span-1 text-gray-500">{formatTimeAgo(post.boardRegDate)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-2 text-sm rounded ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
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
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
