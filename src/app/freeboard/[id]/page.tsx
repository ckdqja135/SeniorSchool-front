'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FreeBoardPost, Comment } from '@/types';

interface FreeBoardDetailPageProps {
  params: {
    id: string;
  };
}

export default function FreeBoardDetailPage({ params }: FreeBoardDetailPageProps) {
  const router = useRouter();
  const [post, setPost] = useState<FreeBoardPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 예시 데이터
        const mockPosts: { [key: string]: FreeBoardPost } = {
          '1': {
            boardIdx: 1,
            boardTitle: "대학생활 첫 학기 후기 - 정말 힘들었지만 보람있었어요",
            boardContent: `대학생활 첫 학기를 마치고 나니 정말 많은 것을 배웠습니다. 고등학교와는 완전히 다른 환경에서 적응하는 것이 쉽지 않았지만, 새로운 친구들과 선배들을 만나면서 점점 익숙해져가고 있어요.

특히 동아리 활동을 통해 다양한 사람들을 만날 수 있어서 정말 좋았습니다. 처음에는 낯설고 어려웠지만, 선배들이 정말 친절하게 도와주셔서 금방 적응할 수 있었어요.

수업도 고등학교와는 완전히 달라서 처음에는 당황스러웠지만, 교수님들께서 열정적으로 가르쳐주시는 모습을 보면서 저도 더 열심히 공부하게 되었습니다.

다음 학기에는 더 많은 활동에 참여하고, 더 많은 사람들과 만나서 소중한 추억을 만들어가고 싶어요!`,
            boardRegDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            boardLike: 24,
            boardHits: 156,
            boardID: "신입생123",
            category: "후기",
            tags: ["대학생활", "신입생", "후기"]
          },
          '2': {
            boardIdx: 2,
            boardTitle: "교수님께 질문드릴 때 주의사항이 있나요?",
            boardContent: `교수님께 질문을 드릴 때 어떤 점들을 주의해야 할까요? 이메일로 보내는 것과 직접 찾아가서 말씀드리는 것 중에 어떤 게 더 좋을까요?

저는 지금 과제를 하다가 막히는 부분이 있어서 교수님께 도움을 요청하고 싶은데, 어떻게 접근하는 게 좋을지 모르겠어요.

혹시 경험 있으신 분들 조언 부탁드려요!`,
            boardRegDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            boardLike: 12,
            boardHits: 89,
            boardID: "궁금이",
            category: "질문",
            tags: ["교수", "질문", "에티켓"]
          },
          '3': {
            boardIdx: 3,
            boardTitle: "동아리 활동하면서 정말 많은 사람들을 만났어요",
            boardContent: `동아리 활동을 시작한 지 3개월이 되었는데, 정말 많은 사람들을 만나고 다양한 경험을 할 수 있어서 좋아요. 특히 프로젝트를 함께 진행하면서 팀워크의 중요성을 깨달았습니다.

처음에는 낯선 사람들과 함께 일하는 것이 부담스러웠지만, 시간이 지나면서 정말 좋은 친구들이 되었어요. 서로 다른 전공을 하는 친구들과 함께 프로젝트를 하면서 다양한 관점을 배울 수 있었습니다.

앞으로도 더 많은 활동에 참여해서 더 많은 사람들과 만나고 싶어요!`,
            boardRegDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            boardLike: 18,
            boardHits: 203,
            boardID: "동아리러버",
            category: "일상",
            tags: ["동아리", "친구", "활동"]
          }
        };
        
        // 실제 API 호출 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const postData = mockPosts[params.id];
        if (postData) {
          setPost(postData);
        } else {
          throw new Error('게시글을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('게시글 로딩 오류:', error);
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchPost();
    }
  }, [params.id]);

  // 댓글 데이터 가져오기 (예시 데이터)
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsCommentLoading(true);
        
        // 예시 댓글 데이터
        const mockComments: Comment[] = [
          {
            commentIdx: 1,
            boardIdx: parseInt(params.id),
            commentLike: 5,
            commentDepth: 0,
            writerId: "응원러",
            commentPerent: 0,
            commentContent: "정말 공감되는 글이에요! 저도 신입생 때 비슷한 경험을 했어요. 화이팅!",
            commentRegDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          },
          {
            commentIdx: 2,
            boardIdx: parseInt(params.id),
            commentLike: 3,
            commentDepth: 0,
            writerId: "선배123",
            commentPerent: 0,
            commentContent: "동아리 활동 정말 추천해요! 저도 2학년 때부터 시작했는데 정말 많은 도움이 되었어요.",
            commentRegDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            commentIdx: 3,
            boardIdx: parseInt(params.id),
            commentLike: 1,
            commentDepth: 1,
            writerId: "신입생456",
            commentPerent: 2,
            commentContent: "어떤 동아리 추천하시나요?",
            commentRegDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
          },
          {
            commentIdx: 4,
            boardIdx: parseInt(params.id),
            commentLike: 2,
            commentDepth: 0,
            writerId: "동기789",
            commentPerent: 0,
            commentContent: "저도 비슷한 느낌이에요. 시간이 지나면서 점점 익숙해지더라고요!",
            commentRegDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
          }
        ];
        
        // 실제 API 호출 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setComments(mockComments);
      } catch (error) {
        console.error('댓글 로딩 오류:', error);
      } finally {
        setIsCommentLoading(false);
      }
    };

    if (params.id) {
      fetchComments();
    }
  }, [params.id]);

  // 댓글 작성 (예시 데이터)
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !post) return;

    try {
      setIsSubmittingComment(true);
      
      // 실제 API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 새 댓글 추가
      const newCommentData: Comment = {
        commentIdx: comments.length + 1,
        boardIdx: parseInt(params.id),
        commentLike: 0,
        commentDepth: 0,
        writerId: '익명',
        commentPerent: 0,
        commentContent: newComment,
        commentRegDate: new Date().toISOString()
      };
      
      setComments(prev => [newCommentData, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('댓글 작성 오류:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 뒤로가기 처리
  const handleBackClick = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">게시글을 불러올 수 없습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleBackClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={handleBackClick}
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
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 게시글 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          {/* 게시글 헤더 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-sm font-medium text-gray-900">{post.boardID}</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">{formatTimeAgo(post.boardRegDate)}</span>
                  <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                    {post.category}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.boardTitle}</h1>
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  <span>{post.boardLike}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{post.boardHits}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 게시글 내용 */}
          <div className="p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                {post.boardContent}
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">댓글 {comments.length}개</h2>
          </div>

          {/* 댓글 작성 폼 */}
          <div className="p-6 border-b border-gray-200">
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 작성해주세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  rows={3}
                  disabled={isSubmittingComment}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmittingComment ? '작성 중...' : '댓글 작성'}
                </button>
              </div>
            </form>
          </div>

          {/* 댓글 목록 */}
          <div className="p-6">
            {isCommentLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">댓글을 불러오는 중...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.commentIdx} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{comment.writerId}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{formatTimeAgo(comment.commentRegDate || new Date().toISOString())}</span>
                        </div>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{comment.commentContent}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <button className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            <span>{comment.commentLike || 0}</span>
                          </button>
                          <button className="text-xs text-gray-500 hover:text-gray-700">답글</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
