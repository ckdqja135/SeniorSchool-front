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
  const [commentForm, setCommentForm] = useState({
    content: '',
    writer: '',
    password: ''
  });
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    content: ''
  });
  const [reportForm, setReportForm] = useState({
    reportReason: '',
    reporterId: ''
  });

  // 게시글 상세 정보 가져오기
  useEffect(() => {
    const fetchBoardDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const backendURL = 'https://api.reviewhub.life';
        const response = await fetch(`${backendURL}/church/boards/detail?boardIdx=${boardIdx}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // API 응답이 직접 객체인 경우
        if (data && data.boardIdx) {
          setBoard(data);
        } 
        // API 응답이 객체이고 status가 있는 경우
        else if (data && typeof data === 'object' && data.status === 200 && data.data) {
          setBoard(data.data);
        } 
        // 기타 경우
        else {
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
        
        const data = await response.json();
        
        // API 응답이 직접 배열인 경우
        if (Array.isArray(data)) {
          setComments(data);
        } 
        // API 응답이 객체이고 status가 있는 경우
        else if (data && typeof data === 'object' && data.status === 200) {
          if (data.data && Array.isArray(data.data)) {
          setComments(data.data);
        } else {
            setComments([]);
          }
        } 
        // 기타 경우
        else {
          setComments([]);
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
    
    if (!commentForm.content.trim() || !commentForm.writer.trim() || !commentForm.password.trim()) {
      alert('모든 필드를 입력해주세요.');
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
          commentContent: commentForm.content.trim(),
          commentID: commentForm.writer.trim(),
          commentPw: commentForm.password.trim()
        }),
      });

      if (response.ok) {
        setCommentForm({ content: '', writer: '', password: '' });
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
    if (!board || isLikeLoading) return;
    
    try {
      setIsLikeLoading(true);
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/church/boards/like`, {
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
        // 좋아요 상태 토글
        setIsLiked(!isLiked);
        // 좋아요 수 업데이트
        setBoard(prev => prev ? { 
          ...prev, 
          boardLike: isLiked ? prev.boardLike - 1 : prev.boardLike + 1 
        } : null);
      }
    } catch (error) {
      console.error('좋아요 토글 오류:', error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  // 신고하기 핸들러
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!board) return;
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const reportData = {
        boardIdx: board.boardIdx,
        serviceType: 'church',
        reportReason: reportForm.reportReason.trim(),
        reporterId: reportForm.reporterId.trim()
      };

      const response = await fetch(`${backendURL}/admin/report/createReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (response.ok) {
        alert('신고가 성공적으로 등록되었습니다.');
        setShowReportModal(false);
        setReportForm({ reportReason: '', reporterId: '' });
      } else {
        const errorData = await response.json();
        alert(errorData.message || '신고 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('신고 등록 오류:', error);
      alert('신고 등록 중 오류가 발생했습니다.');
    }
  };

  // 수정하기 핸들러
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!board) return;
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/church/boards/correct`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: board.boardIdx,
          boardTitle: editForm.title,
          boardContent: editForm.content,
          boardPw: password
        }),
      });

      if (response.ok) {
        alert('게시글이 수정되었습니다.');
        setShowEditModal(false);
        setPassword('');
        // 게시글 다시 불러오기
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(errorData.message || '게시글 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 수정 오류:', error);
      alert('게시글 수정 중 오류가 발생했습니다.');
    }
  };

  // 삭제하기 핸들러
  const handleDeletePost = async () => {
    if (!board) return;
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/church/boards/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: board.boardIdx,
          boardPw: password
        }),
      });

      if (response.ok) {
        alert('게시글이 삭제되었습니다.');
        router.back();
      } else {
        const errorData = await response.json();
        alert(errorData.message || '게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      alert('게시글 삭제 중 오류가 발생했습니다.');
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
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/church-mentor" className="text-2xl font-bold text-red-400">
              교회 오빠
              </Link>
            <div className="text-gray-300">
              {board.church.churchName ? `${board.church.churchName} 후기` : '교회 후기'}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 뒤로가기 버튼 - 상단에 배치 */}
        <div className="mb-6">
          <button 
            onClick={() => {
              // 교회 이름이 있으면 교회 오빠 페이지로, 없으면 뒤로가기
              if (board.church.churchName) {
                router.push(`/church-mentor/${encodeURIComponent(board.church.churchName)}`);
              } else {
                router.back();
              }
            }}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            뒤로가기
          </button>
        </div>
        {/* 게시글 헤더 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{board.boardTitle}</h1>
            
            {/* 액션 버튼들 */}
            <div className="flex items-center space-x-2">
              {/* 신고 버튼 */}
              <button
                onClick={() => setShowReportModal(true)}
                className="px-2 sm:px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors text-xs sm:text-sm font-medium cursor-pointer"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="hidden sm:inline">신고하기</span>
                <span className="sm:hidden">신고</span>
              </button>
              
              {/* 설정 드롭다운 */}
              <div className="relative">
                <button
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                
                {/* 드롭다운 메뉴 */}
                {showPasswordModal && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <button
                      onClick={() => {
                        if (!board) return;
                        setShowPasswordModal(false);
                        setPassword('');
                        setEditForm({ title: board.boardTitle, content: board.boardContent });
                        setShowEditModal(true);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      수정하기
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordModal(false);
                        setShowDeleteModal(true);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      삭제하기
                    </button>
                </div>
                )}
              </div>
            </div>
          </div>

          {/* 게시글 메타 정보 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1 block">작성자</span>
              <p className="text-sm font-semibold text-gray-900">
                {board.boardID || '작성자 정보 없음'}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">작성일</span>
              <p className="text-sm font-semibold text-gray-900">
                {board.boardRegDate || '날짜 정보 없음'}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <span className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1 block">조회수</span>
              <p className="text-sm font-semibold text-gray-900">
                {board.boardHits || 0}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
              <span className="text-xs text-orange-700 font-bold uppercase tracking-wider mb-1 block">좋아요</span>
              <button
                onClick={handleLikeToggle}
                disabled={isLikeLoading}
                className={`text-sm font-semibold transition-colors flex items-center space-x-1 ${
                  isLiked 
                    ? 'text-red-500' 
                    : 'text-gray-900 hover:text-red-500'
                } ${isLikeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className={`w-4 h-4 ${isLiked ? 'fill-current' : 'fill-none stroke-current'}`} viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                <span>
                  {isLikeLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    board.boardLike || 0
                  )}
                </span>
              </button>
            </div>
            </div>
            
          {/* 게시글 내용 */}
          <div className="border-t border-gray-200 pt-6">
            <div className="prose max-w-none">
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {board.boardContent}
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">댓글</h2>
          
          {/* 댓글 작성 폼 - 반응형 */}
          <div className="border-t border-gray-200 pt-4">
            {/* 모바일: 2줄 레이아웃, PC: 1줄 레이아웃 */}
            <form onSubmit={handleSubmitComment} className="flex flex-col md:flex-row md:items-center gap-3">
              {/* 댓글 입력창 */}
                <textarea
                className="w-full md:flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
                rows={2}
                maxLength={100}
                placeholder="댓글을 입력하세요..."
                value={commentForm.content}
                onChange={(e) => setCommentForm({...commentForm, content: e.target.value})}
                required
              />
              
              {/* 아이디, 비밀번호, 작성 버튼 */}
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  className="w-28 sm:w-32 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  placeholder="아이디"
                  maxLength={10}
                  value={commentForm.writer}
                  onChange={(e) => setCommentForm({...commentForm, writer: e.target.value})}
                  required
                />
              
                <input 
                  type="password" 
                  className="w-28 sm:w-32 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  placeholder="비밀번호"
                  maxLength={8}
                  value={commentForm.password}
                  onChange={(e) => setCommentForm({...commentForm, password: e.target.value})}
                  required
                />
              
                <button
                  type="submit"
                  disabled={isSubmittingComment}
                  className="px-4 sm:px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-medium shadow-md transform hover:scale-105 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingComment ? '작성 중...' : '작성'}
                </button>
              </div>
            </form>
            <p className="text-xs text-gray-500 mt-1 text-right">
              {commentForm.content.length}/100
            </p>
          </div>
          
          {/* 댓글 목록 */}
          <div className="mt-6">
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
                  <div key={comment.commentIdx} className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{comment.commentID}</span>
                          {comment.commentRegDate && (
                            <span className="text-xs text-gray-500">
                              {new Date(comment.commentRegDate).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                              {new Date(comment.commentRegDate).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed mb-3">
                      {comment.commentContent}
                    </p>
                    
                    {/* 댓글 액션 버튼들 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <button className="text-red-600 hover:text-red-800 transition-colors">
                          답글
                        </button>
                      </div>
                      
                      <div className="flex items-center space-x-2">
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
      </div>

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="text-red-600 text-6xl mb-4">🚨</div>
              <h3 className="text-xl font-bold text-gray-800">후기 신고하기</h3>
              <p className="text-gray-600 mt-2">부적절한 내용을 신고해주세요</p>
            </div>
            
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  후기 고유 ID
                </label>
                <input
                  type="text"
                  value={board?.boardIdx || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reportForm.reportReason}
                  onChange={(e) => setReportForm({ ...reportForm, reportReason: e.target.value })}
                  placeholder="신고 사유를 입력해주세요..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {reportForm.reportReason.length}/200
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고자 ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reportForm.reporterId}
                  onChange={(e) => setReportForm({ ...reportForm, reporterId: e.target.value })}
                  placeholder="신고자 ID를 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  maxLength={20}
                  required
                />
              </div>
              
              <div className="flex space-x-3 justify-center pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowReportModal(false);
                    setReportForm({ reportReason: '', reporterId: '' });
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  신고하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">게시글 수정</h3>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  maxLength={40}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editForm.title.length}/40
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  내용
                </label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={6}
                  maxLength={700}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editForm.content.length}/700
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              <div className="flex space-x-3 justify-center pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setPassword('');
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  수정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">게시글 삭제</h3>
              <p className="text-gray-600 mt-2">정말로 이 게시글을 삭제하시겠습니까?</p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <div className="flex space-x-3 justify-center">
                <button 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPassword('');
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleDeletePost}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
