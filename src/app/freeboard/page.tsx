'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FreeBoardPost, FreeBoardApiResponse } from '@/types';
import ReviewWriteModal from '@/components/common/ReviewWriteModal';

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

  // 게시글 데이터 가져오기 (예시 데이터)
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 예시 데이터 - 후기 중심 (더 많은 데이터로 페이징 테스트)
        const mockData: FreeBoardPost[] = [
          {
            boardIdx: 1,
            boardTitle: "강남역 근처 카페 '모먼트' 후기 - 분위기 최고!",
            boardContent: "공부하기 좋은 카페를 찾다가 발견한 모먼트 카페 후기입니다. 2층 창가 자리가 특히 좋고, 조명도 은은해서 집중하기 좋아요. 아메리카노 가격은 5000원으로 조금 비싸지만 리필이 가능해서 오래 있기에는 괜찮습니다. 직원분들도 친절하시고 와이파이도 빠릅니다!",
            boardRegDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            boardLike: 24,
            boardHits: 156,
            boardID: "카페러버",
            category: "카페",
            tags: ["카페", "강남", "공부"]
          },
          {
            boardIdx: 2,
            boardTitle: "홍대 맛집 '파스타하우스' 진짜 맛있어요!",
            boardContent: "친구들이랑 방문한 홍대 파스타 맛집 후기! 크림 파스타가 진짜 맛있고 양도 푸짐해요. 가격은 1인당 15000원 정도인데 가성비 좋은 것 같아요. 주말에는 웨이팅이 있으니 평일 방문을 추천드려요!",
            boardRegDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            boardLike: 32,
            boardHits: 198,
            boardID: "맛집탐방러",
            category: "맛집",
            tags: ["맛집", "홍대", "파스타"]
          },
          {
            boardIdx: 3,
            boardTitle: "코엑스 영화관 IMAX 관람 후기",
            boardContent: "처음으로 IMAX로 영화를 봤는데 완전 감동이에요! 화면도 크고 음향도 정말 좋아서 몰입감이 장난 아니었습니다. 가격은 좀 비싸지만 특별한 날에 보기 좋을 것 같아요. 좌석은 중앙 뒷쪽이 베스트입니다!",
            boardRegDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 18,
            boardHits: 203,
            boardID: "영화매니아",
            category: "문화생활",
            tags: ["영화", "IMAX", "코엑스"]
          },
          {
            boardIdx: 4,
            boardTitle: "애플 스토어 방문 후기 - 직원분들 친절해요",
            boardContent: "맥북 구매 상담받으러 갔는데 직원분들이 정말 친절하게 설명해주셨어요. 강매도 전혀 없고 제 상황에 맞는 제품을 추천해주셔서 좋았습니다. 학생 할인도 받을 수 있어서 만족스러운 쇼핑이었어요!",
            boardRegDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 15,
            boardHits: 142,
            boardID: "테크러버",
            category: "쇼핑",
            tags: ["애플", "맥북", "쇼핑"]
          },
          {
            boardIdx: 5,
            boardTitle: "서울숲 산책 코스 추천 - 가을에 딱!",
            boardContent: "날씨 좋아서 서울숲 다녀왔는데 산책하기 정말 좋아요! 단풍도 예쁘고 사진 찍기도 좋은 곳이 많아요. 주말에는 사람이 많으니 평일 오후에 가는 걸 추천드려요. 근처에 카페도 많아서 데이트 코스로도 좋습니다!",
            boardRegDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 21,
            boardHits: 167,
            boardID: "산책러버",
            category: "여행",
            tags: ["서울숲", "산책", "데이트"]
          },
          {
            boardIdx: 6,
            boardTitle: "이태원 브런치 카페 '선데이모닝' 후기",
            boardContent: "이태원에 있는 브런치 카페에 다녀왔어요. 에그베네딕트가 정말 맛있고 커피도 맛있습니다. 인테리어도 예쁘고 사진 찍기 좋아요. 가격대는 좀 있지만 퀄리티가 좋아서 추천합니다!",
            boardRegDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 28,
            boardHits: 189,
            boardID: "브런치러버",
            category: "카페",
            tags: ["이태원", "브런치", "카페"]
          },
          {
            boardIdx: 7,
            boardTitle: "명동 쇼핑 후기 - 화장품 쇼핑하기 좋아요",
            boardContent: "명동에서 화장품 쇼핑했는데 가격도 저렴하고 종류도 다양해서 좋았어요. 면세점보다 저렴한 제품도 많고 테스터도 사용할 수 있어서 만족스러웠습니다!",
            boardRegDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 19,
            boardHits: 145,
            boardID: "화장품덕후",
            category: "쇼핑",
            tags: ["명동", "화장품", "쇼핑"]
          },
          {
            boardIdx: 8,
            boardTitle: "부산 여행 2박3일 코스 추천",
            boardContent: "부산 여행 다녀온 후기입니다. 해운대, 광안리, 감천문화마을 등 유명한 곳들 다 가봤는데 정말 좋았어요. 회도 맛있고 바다 보면서 산책하기도 좋았습니다!",
            boardRegDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 35,
            boardHits: 267,
            boardID: "여행러버",
            category: "여행",
            tags: ["부산", "여행", "추천"]
          },
          {
            boardIdx: 9,
            boardTitle: "성수동 핫플 카페 투어 후기",
            boardContent: "요즘 핫한 성수동 카페들 돌아다녔어요. 각자 개성 있고 분위기도 좋았습니다. 주말에는 웨이팅이 길으니 평일에 가는 걸 추천해요!",
            boardRegDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 26,
            boardHits: 178,
            boardID: "카페투어",
            category: "카페",
            tags: ["성수동", "카페", "핫플"]
          },
          {
            boardIdx: 10,
            boardTitle: "신촌 맛집 '돈까스 명가' 강력 추천!",
            boardContent: "신촌에서 20년 넘게 장사하신 돈까스 맛집! 가성비 좋고 양도 많아요. 학생들한테 정말 추천하는 맛집입니다. 점심시간에는 웨이팅 있으니 참고하세요!",
            boardRegDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 31,
            boardHits: 234,
            boardID: "신촌맛집러버",
            category: "맛집",
            tags: ["신촌", "돈까스", "가성비"]
          },
          {
            boardIdx: 11,
            boardTitle: "강남 스타벅스 리저브 후기 - 프리미엄 경험",
            boardContent: "강남 스타벅스 리저브 매장에 다녀왔어요. 일반 스타벅스와는 다른 프리미엄 경험을 할 수 있어서 좋았습니다. 바리스타가 직접 추출해주는 커피는 정말 맛있었어요!",
            boardRegDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 22,
            boardHits: 156,
            boardID: "커피매니아",
            category: "카페",
            tags: ["스타벅스", "강남", "리저브"]
          },
          {
            boardIdx: 12,
            boardTitle: "롯데월드 어드벤처 후기 - 재미있었어요!",
            boardContent: "친구들과 롯데월드에 갔는데 정말 재미있었어요! 놀이기구도 다양하고 분위기도 좋았습니다. 주말에는 사람이 많으니 평일에 가는 걸 추천해요!",
            boardRegDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 29,
            boardHits: 198,
            boardID: "놀이공원러버",
            category: "문화생활",
            tags: ["롯데월드", "놀이공원", "데이트"]
          },
          {
            boardIdx: 13,
            boardTitle: "동대문 DDP 전시회 관람 후기",
            boardContent: "동대문 DDP에서 열린 디자인 전시회를 봤어요. 정말 감동적이고 영감을 받을 수 있는 전시였습니다. 사진 찍기도 좋고 구경하기도 좋았어요!",
            boardRegDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 17,
            boardHits: 134,
            boardID: "전시회러버",
            category: "문화생활",
            tags: ["DDP", "전시회", "디자인"]
          },
          {
            boardIdx: 14,
            boardTitle: "마포 맛집 '치킨플러스' 후기",
            boardContent: "마포에 있는 치킨집인데 정말 맛있어요! 양념치킨이 특히 맛있고 가격도 저렴해서 자주 가는 맛집입니다. 배달도 빠르고 직원분들도 친절해요!",
            boardRegDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 33,
            boardHits: 245,
            boardID: "치킨러버",
            category: "맛집",
            tags: ["치킨", "마포", "가성비"]
          },
          {
            boardIdx: 15,
            boardTitle: "제주도 3박4일 여행 후기",
            boardContent: "제주도 여행 다녀왔는데 정말 좋았어요! 바다도 예쁘고 맛집도 많고 볼거리도 많았습니다. 렌터카로 돌아다니니까 더 편했어요. 다음에도 또 가고 싶어요!",
            boardRegDate: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 41,
            boardHits: 312,
            boardID: "제주여행러",
            category: "여행",
            tags: ["제주도", "여행", "바다"]
          },
          {
            boardIdx: 16,
            boardTitle: "압구정 쇼핑몰 '갤러리아' 쇼핑 후기",
            boardContent: "압구정 갤러리아에서 쇼핑했는데 브랜드도 다양하고 할인도 많이 해서 좋았어요. 주차도 편하고 직원분들도 친절했습니다. 다음에도 또 가고 싶어요!",
            boardRegDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 25,
            boardHits: 178,
            boardID: "쇼핑러버",
            category: "쇼핑",
            tags: ["압구정", "갤러리아", "쇼핑"]
          },
          {
            boardIdx: 17,
            boardTitle: "한강공원 피크닉 후기 - 날씨 좋았어요!",
            boardContent: "한강공원에서 피크닉했는데 정말 좋았어요! 날씨도 좋고 분위기도 좋았습니다. 치킨과 맥주 먹으면서 즐거운 시간 보냈어요. 다음에도 또 가고 싶어요!",
            boardRegDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 38,
            boardHits: 267,
            boardID: "피크닉러버",
            category: "여행",
            tags: ["한강", "피크닉", "데이트"]
          },
          {
            boardIdx: 18,
            boardTitle: "건대 맛집 '김치찌개집' 후기",
            boardContent: "건대에 있는 김치찌개집인데 정말 맛있어요! 김치찌개가 진짜 맛있고 가격도 저렴해서 자주 가는 맛집입니다. 직원분들도 친절하고 분위기도 좋아요!",
            boardRegDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 27,
            boardHits: 189,
            boardID: "김치찌개러버",
            category: "맛집",
            tags: ["김치찌개", "건대", "가성비"]
          },
          {
            boardIdx: 19,
            boardTitle: "코엑스 아쿠아리움 관람 후기",
            boardContent: "코엑스 아쿠아리움에 다녀왔는데 정말 신기하고 예뻤어요! 물고기들이 정말 다양하고 아름다웠습니다. 아이들과 함께 가기 좋은 곳이에요!",
            boardRegDate: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 31,
            boardHits: 223,
            boardID: "아쿠아리움러버",
            category: "문화생활",
            tags: ["아쿠아리움", "코엑스", "가족"]
          },
          {
            boardIdx: 20,
            boardTitle: "신세계백화점 쇼핑 후기",
            boardContent: "신세계백화점에서 쇼핑했는데 정말 좋았어요! 브랜드도 다양하고 할인도 많이 해서 만족스러웠습니다. 직원분들도 친절하고 서비스도 좋았어요!",
            boardRegDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 23,
            boardHits: 156,
            boardID: "백화점러버",
            category: "쇼핑",
            tags: ["신세계", "백화점", "쇼핑"]
          }
        ];
        
        // 검색 필터링 (제목, 내용, 카테고리, 태그 모두 검색)
        let filteredData = mockData;
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredData = mockData.filter(post => 
            post.boardTitle.toLowerCase().includes(query) ||
            post.boardContent.toLowerCase().includes(query) ||
            post.category.toLowerCase().includes(query) ||
            (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)))
          );
        }
        
        // 페이지네이션
        const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
        const endIndex = startIndex + POSTS_PER_PAGE;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        // 실제 API 호출 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setPosts(paginatedData);
        setTotalCount(filteredData.length);
        setTotalPages(Math.ceil(filteredData.length / POSTS_PER_PAGE));
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
      // 실제 API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 새 리뷰 데이터 생성
      const newReview: FreeBoardPost = {
        ...reviewData,
        boardIdx: Math.max(...posts.map(p => p.boardIdx)) + 1,
        boardRegDate: new Date().toISOString(),
        boardLike: 0,
        boardHits: 0,
      };
      
      // 게시글 목록에 추가
      setPosts(prev => [newReview, ...prev]);
      setTotalCount(prev => prev + 1);
      
      // 첫 페이지로 이동
      setCurrentPage(1);
      
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
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
                  <div className="col-span-1">번호</div>
                  <div className="col-span-1 whitespace-nowrap">카테고리</div>
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
          <div className="w-80 space-y-6">
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
