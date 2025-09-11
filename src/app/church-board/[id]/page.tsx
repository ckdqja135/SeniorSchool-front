'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChurchBoard, ChurchComment, ApiResponse } from '@/types/Church';

export default function ChurchBoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardIdx = parseInt(params.id as string);
  
  const [board, setBoard] = useState<ChurchBoard | null>(null);
  const [comments, setComments] = useState<ChurchComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCommentLoading, setIsCommentLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // 게시글 상세 정보 가져오기
  useEffect(() => {
    const fetchBoardDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const backendURL = 'https://api.reviewhub.life';
        const response = await fetch(`${backendURL}/church/board/detail?boardIdx=${boardIdx}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ApiResponse<ChurchBoard> = await response.json();
        
        if (data.status === 200 && data.data) {
          setBoard(data.data);
        } else {
          throw new Error('게시글을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('게시글 로딩 오류:', error);
        setError('게시글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (boardIdx) {
      fetchBoardDetail();
    }
  }, [boardIdx]);

  // 댓글 목록 가져오기
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsCommentLoading(true);
        setCommentError(null);
        
        const backendURL = 'https://api.reviewhub.life';
        const response = await fetch(`${backendURL}/church/comment?boardIdx=${boardIdx}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: ApiResponse<ChurchComment[]> = await response.json();
        
        if (data.status === 200 && data.data) {
          setComments(data.data);
        } else {
          throw new Error('댓글을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('댓글 로딩 오류:', error);
        setCommentError('댓글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsCommentLoading(false);
      }
    };

    if (boardIdx) {
      fetchComments();
    }
  }, [boardIdx]);

  // 댓글 작성 핸들러
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      alert('댓글 내용을 입력해주세요.');
      return;
    }

    setIsSubmittingComment(true);
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/church/comment/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: boardIdx,
          commentContent: newComment.trim(),
          commentID: '익명' // 실제로는 로그인한 사용자 ID를 사용해야 함
        }),
      });

      if (response.ok) {
        setNewComment('');
        // 댓글 목록 새로고침
        window.location.reload();
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 좋아요 토글 핸들러
  const handleLikeToggle = async () => {
    if (!board) return;
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/church/board/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: board.boardIdx,
          userID: '익명' // 실제로는 로그인한 사용자 ID를 사용해야 함
        }),
      });

      if (response.ok) {
        // 좋아요 상태 업데이트 (실제로는 서버에서 업데이트된 값을 받아와야 함)
        setBoard(prev => prev ? { ...prev, boardLike: prev.boardLike + 1 } : null);
      }
    } catch (error) {
      console.error('좋아요 토글 오류:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">게시글을 찾을 수 없습니다</h1>
          <p className="text-gray-600 mb-6">{error || '요청하신 게시글이 존재하지 않습니다.'}</p>
          <Link
            href="/church-mentor"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            교회 오빠로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href={`/church-mentor/${encodeURIComponent(board.church.churchName)}`}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">{board.church.churchName}</span>
              </Link>
              <div className="text-gray-300">|</div>
              <h1 className="text-xl font-bold text-gray-900">게시글</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 게시글 카드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{board.boardTitle}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{board.boardID}</span>
                  <span>•</span>
                  <span>{board.boardRegDate}</span>
                  <span>•</span>
                  <span>📍 {board.church.churchName}</span>
                </div>
              </div>
              <button
                onClick={handleLikeToggle}
                className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <span>{board.boardLike}</span>
              </button>
            </div>
            
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{board.boardContent}</p>
            </div>
            
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>조회 {board.boardHits}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  <span>좋아요 {board.boardLike}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-900">댓글</h2>
          </div>
          
          {/* 댓글 작성 폼 */}
          <div className="p-6 border-b border-gray-200">
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="댓글을 작성해주세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isSubmittingComment
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">댓글을 불러오는 중...</p>
              </div>
            ) : commentError ? (
              <div className="text-center py-8">
                <p className="text-sm text-red-500">{commentError}</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-3">💬</div>
                <p className="text-sm text-gray-500">아직 댓글이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">첫 번째 댓글을 작성해보세요!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.commentIdx} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">{comment.commentID}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500">{comment.commentRegDate}</span>
                        </div>
                        <p className="text-gray-700">{comment.commentContent}</p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button className="flex items-center space-x-1 text-gray-400 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          <span className="text-sm">{comment.commentLike}</span>
                        </button>
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
