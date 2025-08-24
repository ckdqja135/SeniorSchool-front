'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  // 게시글 클릭 시 해당 학교의 게시판 상세보기 페이지로 이동
  const handlePostClick = (post: BoardPost) => {
    router.push(`/board/${post.boardIdx}`);
  };

  // 서비스 제목 클릭 시 해당 서비스 페이지로 이동
  const handleServiceClick = () => {
    router.push('/school'); // 학교 오빠는 /school 페이지로
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
        <div className="max-w-4xl mx-auto">
          {/* 학교 오빠 섹션 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* 학교 오빠 헤더 */}
            <div className="p-6 border-b border-gray-200">
                             <div 
                 onClick={handleServiceClick}
                 className="cursor-pointer"
               >
                <h2 className="text-2xl font-bold text-gray-900">학교 오빠</h2>
              </div>
            </div>
            
                         {/* 최근 게시글 목록 */}
             <div className="divide-y divide-gray-100">
               {isLoading ? (
                 <div className="p-8 text-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                   <p className="text-gray-500">게시글을 불러오는 중...</p>
                 </div>
               ) : error ? (
                 <div className="p-8 text-center">
                   <p className="text-red-500">{error}</p>
                 </div>
               ) : recentPosts.length === 0 ? (
                 <div className="p-8 text-center">
                   <p className="text-gray-500">최근 게시글이 없습니다.</p>
                 </div>
               ) : (
                 recentPosts.map((post) => (
                   <div
                     key={post.boardIdx}
                     onClick={() => handlePostClick(post)}
                     className="p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                   >
                     <div className="flex items-start space-x-3">
                       <div className="flex-shrink-0">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                         <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                       </div>
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center space-x-2 mb-1">
                           <span className="text-sm font-medium text-gray-900">{post.boardID}</span>
                           <span className="text-sm text-gray-500">•</span>
                           <span className="text-sm text-gray-500">{post.boardRegDate}</span>
                         </div>
                         <p className="text-sm text-gray-900 line-clamp-2">{post.boardTitle}</p>
                         <div className="flex items-center space-x-4 mt-2">
                           <div className="flex items-center space-x-1">
                             <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                             </svg>
                             <span className="text-sm text-gray-500">{post.boardLike}</span>
                           </div>
                                                    <div className="flex items-center space-x-1">
                           <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                           </svg>
                           <span className="text-sm text-gray-500">{post.boardHits}</span>
                         </div>
                           <div className="text-sm text-gray-500">
                             {post.university.univName} • {post.university.univLocate}
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </div>


        </div>
      </main>
    </div>
  );
}