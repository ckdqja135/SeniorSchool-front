'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface MatzalAlBoard {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  boardID?: string;
  boardId?: string;
  writer?: string;
  writerId?: string;
  boardRegDate?: string;
  regDate?: string;
  boardHits?: number;
  hits?: number;
  boardLike?: number;
  like?: number;
  restaurantIdx: number;
  writerPw?: string;
  boardRating?: number | null;
  restaurant?: {
    restaurantName: string;
    restaurantLocation: string;
    restaurantType: string;
    restaurantAddr: string;
  };
  restaurantName?: string;
  restaurantLocation?: string;
  restaurantType?: string;
}

interface Comment {
  commentIdx: number;
  boardIdx: number;
  commentLike: number;
  commentDepth: number;
  writerId: string;
  commentParent: number;
  commentPerent?: number; // 오타 필드 (하위 호환성)
  commentContent: string;
  regDate?: string;
  modDate?: string;
  replies?: Comment[];
}

// 재귀적으로 댓글을 렌더링하는 컴포넌트
const CommentItem = ({ 
  comment, 
  level = 0,
  setReplyForm,
  setShowReplyInput,
  showReplyInput,
  setEditCommentForm,
  setShowEditCommentModal,
  setDeleteCommentData,
  setShowDeleteCommentModal,
  setActiveCommentMenu,
  activeCommentMenu,
  showEditCommentModal,
  showDeleteCommentModal,
  handleReplySubmit,
  replyForm
}: {
  comment: Comment;
  level: number;
  setReplyForm: any;
  setShowReplyInput: any;
  showReplyInput: number | null;
  setEditCommentForm: any;
  setShowEditCommentModal: any;
  setDeleteCommentData: any;
  setShowDeleteCommentModal: any;
  setActiveCommentMenu: any;
  activeCommentMenu: number | null;
  showEditCommentModal: boolean;
  showDeleteCommentModal: boolean;
  handleReplySubmit: any;
  replyForm: any;
}) => {
  // level을 1로 제한하여 모든 답글 레벨을 동일하게 표시
  const normalizedLevel = level > 0 ? 1 : 0;
  const bgColor = normalizedLevel === 0 ? 'bg-white' : 'bg-gray-50';
  
  return (
    <div className={`border border-gray-200 rounded-lg p-3 ${bgColor} hover:shadow-sm transition-shadow`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          {normalizedLevel > 0 && <span className="text-green-600 text-sm">↳</span>}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{comment.writerId}</span>
            {comment.regDate && (
              <span className="text-xs text-gray-500">
                {new Date(comment.regDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
                {new Date(comment.regDate).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            )}
          </div>
        </div>
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setActiveCommentMenu(activeCommentMenu === comment.commentIdx ? null : comment.commentIdx)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {activeCommentMenu === comment.commentIdx && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg z-50 border border-gray-200">
              <div className="py-1">
                <button
                  onClick={() => {
                    setEditCommentForm({
                      commentIdx: comment.commentIdx,
                      content: comment.commentContent,
                      password: '',
                      writerId: comment.writerId
                    });
                    setShowEditCommentModal(true);
                    setActiveCommentMenu(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  수정
                </button>
                <button
                  onClick={() => {
                    setDeleteCommentData({
                      commentIdx: comment.commentIdx,
                      password: ''
                    });
                    setShowDeleteCommentModal(true);
                    setActiveCommentMenu(null);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  삭제
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-gray-800 mb-3 whitespace-pre-wrap" style={{ wordBreak: 'break-all', overflowWrap: 'break-word', maxWidth: '100%' }}>
        {comment.commentContent}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-sm">{comment.commentLike}</span>
          </button>
          <button
            onClick={() => setShowReplyInput(showReplyInput === comment.commentIdx ? null : comment.commentIdx)}
            className="text-gray-500 hover:text-blue-500 transition-colors text-sm"
          >
            답글
          </button>
        </div>
      </div>
      
      {showReplyInput === comment.commentIdx && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <form onSubmit={(e) => handleReplySubmit(e, comment.commentIdx)} className="space-y-3">
            <textarea
              value={replyForm.content}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setReplyForm({...replyForm, content: e.target.value});
                }
              }}
              placeholder="답글을 입력하세요 (최대 200자)"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              maxLength={200}
              required
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {replyForm.content.length}/200
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={replyForm.writerId || ''}
                onChange={(e) => setReplyForm({...replyForm, writerId: e.target.value, writer: e.target.value})}
                placeholder="작성자"
                className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="password"
                value={replyForm.password || ''}
                onChange={(e) => setReplyForm({...replyForm, password: e.target.value})}
                placeholder="비밀번호"
                className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                답글 작성
              </button>
              <button
                type="button"
                onClick={() => setShowReplyInput(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}
      
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.commentIdx}
              comment={reply}
              level={level + 1}
              setReplyForm={setReplyForm}
              setShowReplyInput={setShowReplyInput}
              showReplyInput={showReplyInput}
              setEditCommentForm={setEditCommentForm}
              setShowEditCommentModal={setShowEditCommentModal}
              setDeleteCommentData={setDeleteCommentData}
              setShowDeleteCommentModal={setShowDeleteCommentModal}
              setActiveCommentMenu={setActiveCommentMenu}
              activeCommentMenu={activeCommentMenu}
              showEditCommentModal={showEditCommentModal}
              showDeleteCommentModal={showDeleteCommentModal}
              handleReplySubmit={handleReplySubmit}
              replyForm={replyForm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function MatzalAlBoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;
  
  const [boardPost, setBoardPost] = useState<MatzalAlBoard | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [commentForm, setCommentForm] = useState({
    content: '',
    writer: '',
    password: ''
  });
  
  const [editCommentForm, setEditCommentForm] = useState({
    commentIdx: 0,
    content: '',
    password: '',
    writerId: ''
  });
  
  const [replyForm, setReplyForm] = useState({
    content: '',
    writer: '',
    writerId: '',
    password: '',
    parentIdx: 0
  });
  
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [deleteCommentData, setDeleteCommentData] = useState({
    commentIdx: 0,
    password: ''
  });
  
  const [activeCommentMenu, setActiveCommentMenu] = useState<number | null>(null);
  const [showReplyInput, setShowReplyInput] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  
  // 신고 관련 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    reportReason: '',
    reporterId: ''
  });
  const [isReportLoading, setIsReportLoading] = useState(false);
  
  // 게시글 메뉴 상태
  const [showPostMenu, setShowPostMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [password, setPassword] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    rating: 0
  });
  const [editRating, setEditRating] = useState(0);
  const [hoveredEditRating, setHoveredEditRating] = useState<number | null>(null);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPostMenu) {
        const target = event.target as Element;
        // 메뉴 컨테이너나 그 자식 요소가 아닌 경우에만 닫기
        if (!target.closest('.post-menu-container')) {
          setShowPostMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPostMenu]);

  // 게시글 정보 가져오기
  useEffect(() => {
    const fetchBoardDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`https://api.reviewhub.life/restaurant/boards/detail/${boardId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API 응답 데이터:', data);
        
        // API 응답이 직접 객체인 경우
        let boardData = null;
        if (data.boardIdx) {
          boardData = data;
        } else if (data.status === 200 && data.data) {
          boardData = data.data;
        } else {
          throw new Error('게시글을 찾을 수 없습니다.');
        }
        
        // boardRating 문자열을 숫자로 변환
        if (boardData && boardData.boardRating) {
          boardData.boardRating = typeof boardData.boardRating === 'string' 
            ? parseFloat(boardData.boardRating) 
            : Number(boardData.boardRating);
        }
        
        setBoardPost(boardData);
      } catch (err) {
        console.error('게시글 로딩 오류:', err);
        setError('게시글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    if (boardId) {
      fetchBoardDetail();
    }
  }, [boardId]);

  // 댓글 가져오기
  const fetchComments = async () => {
    try {
      const response = await fetch(`https://api.reviewhub.life/restaurant/comment?boardIdx=${boardId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      let commentsData: Comment[] = [];
      if (Array.isArray(data)) {
        commentsData = data;
      } else if (data.RestaurantComments && Array.isArray(data.RestaurantComments)) {
        commentsData = data.RestaurantComments;
      } else if (data.data && Array.isArray(data.data)) {
        commentsData = data.data;
      }
      
      // 문자열로 온 숫자 필드를 숫자로 변환
      commentsData = commentsData.map(comment => {
        const parentId = (comment as any).commentParent !== undefined 
          ? (comment as any).commentParent 
          : (comment as any).commentPerent;
        
        return {
          ...comment,
          commentIdx: typeof comment.commentIdx === 'string' ? parseInt(comment.commentIdx, 10) : comment.commentIdx,
          boardIdx: typeof comment.boardIdx === 'string' ? parseInt(comment.boardIdx, 10) : (comment.boardIdx || parseInt(boardId)),
          commentLike: typeof comment.commentLike === 'string' ? parseInt(comment.commentLike, 10) : (comment.commentLike || 0),
          commentDepth: typeof comment.commentDepth === 'string' ? parseInt(comment.commentDepth, 10) : (comment.commentDepth || 0),
          commentParent: typeof parentId === 'string' ? parseInt(parentId, 10) : (typeof parentId === 'number' ? parentId : 0),
          commentPerent: typeof parentId === 'string' ? parseInt(parentId, 10) : (typeof parentId === 'number' ? parentId : 0),
        };
      });
      
      setComments(commentsData);
    } catch (err) {
      console.error('댓글 로딩 오류:', err);
    }
  };

  useEffect(() => {
    if (boardId) {
      fetchComments();
    }
  }, [boardId]);

  // 좋아요 상태 확인
  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const response = await fetch(`https://api.reviewhub.life/restaurant/like?boardIdx=${boardId}`);
        
        if (response.ok) {
          const data = await response.json();
          setIsLiked(data.isLiked || false);
        }
      } catch (err) {
        console.error('좋아요 상태 확인 오류:', err);
      }
    };

    if (boardId) {
      checkLikeStatus();
    }
  }, [boardId]);

  // 댓글 제출
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('https://api.reviewhub.life/restaurant/comment/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          writerId: commentForm.writer,
          writerPw: commentForm.password,
          commentContent: commentForm.content,
          commentDepth: 0
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        setCommentForm({ content: '', writer: '', password: '' });
        
        // API 응답이 배열이면 바로 사용, 아니면 댓글 목록 새로고침
        if (Array.isArray(responseData)) {
          // 문자열로 온 숫자 필드를 숫자로 변환
          const commentsData = responseData.map((comment: any) => ({
            ...comment,
            commentIdx: typeof comment.commentIdx === 'string' ? parseInt(comment.commentIdx, 10) : comment.commentIdx,
            boardIdx: typeof comment.boardIdx === 'string' ? parseInt(comment.boardIdx, 10) : comment.boardIdx,
            commentLike: typeof comment.commentLike === 'string' ? parseInt(comment.commentLike, 10) : comment.commentLike,
            commentDepth: typeof comment.commentDepth === 'string' ? parseInt(comment.commentDepth, 10) : comment.commentDepth,
            commentPerent: typeof comment.commentPerent === 'string' ? parseInt(comment.commentPerent, 10) : (comment.commentPerent || 0),
            commentParent: typeof comment.commentParent === 'string' ? parseInt(comment.commentParent, 10) : (comment.commentParent || 0),
          }));
          setComments(commentsData);
        } else {
          // 댓글 목록 새로고침
          await fetchComments();
        }
        alert('댓글이 작성되었습니다.');
      } else {
        alert('댓글 작성에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 작성 오류:', err);
      alert('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  // 답글 제출
  const handleReplySubmit = async (e: React.FormEvent, parentIdx: number) => {
    e.preventDefault();
    
    try {
      const response = await fetch('https://api.reviewhub.life/restaurant/comment/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          writerId: replyForm.writerId || replyForm.writer,
          writerPw: replyForm.password,
          commentContent: replyForm.content,
          commentParent: parentIdx,
          commentDepth: 1
        }),
      });

      if (response.ok) {
        setReplyForm({ content: '', writer: '', writerId: '', password: '', parentIdx: 0 });
        setShowReplyInput(null);
        
        // 댓글 목록 새로고침 (API 응답에 계층 구조 정보가 없을 수 있으므로)
        await fetchComments();
        alert('답글이 작성되었습니다.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || '답글 작성에 실패했습니다.');
      }
    } catch (err) {
      console.error('답글 작성 오류:', err);
      alert('답글 작성 중 오류가 발생했습니다.');
    }
  };

  // 좋아요 토글
  const handleLikeToggle = async () => {
    if (isLikeLoading) return;
    
    try {
      setIsLikeLoading(true);
      
      const response = await fetch('https://api.reviewhub.life/restaurant/like', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          isLike: !isLiked
        }),
      });

      if (response.ok) {
        setIsLiked(!isLiked);
        if (boardPost) {
          setBoardPost({
            ...boardPost,
            boardLike: isLiked ? (boardPost.boardLike || 0) - 1 : (boardPost.boardLike || 0) + 1
          });
        }
      }
    } catch (err) {
      console.error('좋아요 처리 오류:', err);
    } finally {
      setIsLikeLoading(false);
    }
  };

  // 신고 제출
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsReportLoading(true);
      
      const response = await fetch('https://api.reviewhub.life/admin/report/createReport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          reportReason: reportForm.reportReason,
          reporterId: reportForm.reporterId,
          reportType: 'restaurant' // 맛잘알 게시판 신고임을 명시
        }),
      });

      if (response.ok) {
        alert('신고가 접수되었습니다.');
        setShowReportModal(false);
        setReportForm({ reportReason: '', reporterId: '' });
      } else {
        alert('신고 접수에 실패했습니다.');
      }
    } catch (err) {
      console.error('신고 처리 오류:', err);
      alert('신고 처리 중 오류가 발생했습니다.');
    } finally {
      setIsReportLoading(false);
    }
  };

  // 댓글 수정
  const handleEditComment = (comment: Comment) => {
    setEditCommentForm({
      commentIdx: comment.commentIdx,
      content: comment.commentContent,
      password: '',
      writerId: comment.writerId
    });
    setShowEditCommentModal(true);
  };

  // 댓글 수정 제출
  const handleEditCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('https://api.reviewhub.life/restaurant/comment/modify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentIdx: editCommentForm.commentIdx,
          commentWriter: editCommentForm.writerId,
          commentContent: editCommentForm.content,
          commentPw: editCommentForm.password
        }),
      });

      if (response.ok) {
        alert('댓글이 수정되었습니다.');
        setShowEditCommentModal(false);
        setEditCommentForm({ commentIdx: 0, content: '', password: '', writerId: '' });
        // 댓글 목록 새로고침
        await fetchComments();
      } else {
        alert('댓글 수정에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 수정 오류:', err);
      alert('댓글 수정 중 오류가 발생했습니다.');
    }
  };

  // 댓글 삭제
  const handleDeleteComment = (comment: Comment) => {
    setDeleteCommentData({
      commentIdx: comment.commentIdx,
      password: ''
    });
    setShowDeleteCommentModal(true);
  };

  // 댓글 삭제 제출
  const handleDeleteCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('https://api.reviewhub.life/restaurant/comment/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentIdx: deleteCommentData.commentIdx,
          commentPw: deleteCommentData.password
        }),
      });

      if (response.ok) {
        alert('댓글이 삭제되었습니다.');
        setShowDeleteCommentModal(false);
        setDeleteCommentData({ commentIdx: 0, password: '' });
        // 댓글 목록 새로고침
        await fetchComments();
      } else {
        alert('댓글 삭제에 실패했습니다.');
      }
    } catch (err) {
      console.error('댓글 삭제 오류:', err);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 별점 정규화 함수
  const normalizeRating = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof parsed !== 'number' || Number.isNaN(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 5);
  };

  // 별점 렌더링 함수
  const renderStarRating = (score?: number | null, size: 'sm' | 'md' = 'md') => {
    // null이거나 0이면 빈 별 5개 표시
    const safeScore = score && score > 0 ? Math.max(0, Math.min(score, 5)) : 0;
    const sizeClasses = size === 'sm'
      ? { wrapper: 'w-4 h-4 text-xs', star: 'text-xs' }
      : { wrapper: 'w-6 h-6 text-lg', star: 'text-lg' };

    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, idx) => {
          const fillLevel = Math.min(Math.max(safeScore - idx, 0), 1);
          return (
            <div key={`star-${idx}`} className={`relative ${sizeClasses.wrapper}`}>
              <span className={`absolute inset-0 text-gray-300 select-none ${sizeClasses.star}`}>★</span>
              <span
                className={`absolute inset-0 text-yellow-400 overflow-hidden select-none ${sizeClasses.star}`}
                style={{ width: `${fillLevel * 100}%` }}
              >
                ★
              </span>
              <span className={`invisible ${sizeClasses.star}`}>★</span>
            </div>
          );
        })}
      </div>
    );
  };

  const currentBoardRating = normalizeRating((boardPost as any)?.boardRating ?? boardPost?.boardRating);
  const displayedEditRating = hoveredEditRating ?? editRating;

  // 게시글 수정
  const handleEditPost = () => {
    const currentRating = normalizeRating(boardPost?.boardRating) || 0;
    setEditForm({
      title: boardPost?.boardTitle || '',
      content: boardPost?.boardContent || '',
      rating: currentRating
    });
    setEditRating(currentRating);
    setShowEditModal(true);
    setShowPostMenu(false);
  };

  // 게시글 삭제
  const handleDeletePost = () => {
    setShowDeleteModal(true);
    setShowPostMenu(false);
  };

  // 게시글 수정 제출
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('https://api.reviewhub.life/restaurant/boards/correct', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          boardTitle: editForm.title,
          boardContent: editForm.content,
          boardPw: password,
          boardRating: editRating > 0 ? editRating : null
        }),
      });

      console.log('게시글 수정 API 응답 상태:', response.status);
      const responseData = await response.json();
      console.log('게시글 수정 API 응답 데이터:', responseData);

      if (response.ok) {
        if (responseData.success === true || responseData.status === 200) {
          alert('게시글이 수정되었습니다.');
          setShowEditModal(false);
          setPassword('');
          // 페이지 새로고침
          window.location.reload();
        } else {
          throw new Error(responseData.message || '게시글 수정에 실패했습니다.');
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('게시글 수정 오류:', error);
      alert('게시글 수정 중 오류가 발생했습니다. 비밀번호를 확인해주세요.');
    }
  };

  // 게시글 삭제 제출
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('https://api.reviewhub.life/restaurant/board/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          boardPw: password
        }),
      });

      console.log('게시글 삭제 API 응답 상태:', response.status);
      const responseData = await response.json();
      console.log('게시글 삭제 API 응답 데이터:', responseData);

      if (response.ok) {
        if (responseData.success === true || responseData.status === 200) {
          alert('게시글이 삭제되었습니다.');
          router.push('/matzal-al-mentor');
        } else {
          throw new Error(responseData.message || '게시글 삭제에 실패했습니다.');
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      alert('게시글 삭제 중 오류가 발생했습니다. 비밀번호를 확인해주세요.');
    }
  };

  // 댓글을 계층 구조로 변환
  const organizedComments = useMemo(() => {
    // 먼저 댓글을 regDate 기준으로 정렬 (최신순)
    const sortedComments = [...comments].sort((a, b) => {
      const dateA = new Date(a.regDate || 0).getTime();
      const dateB = new Date(b.regDate || 0).getTime();
      return dateB - dateA; // 최신순
    });

    const commentMap = new Map<number, Comment & { replies: Comment[] }>();
    const rootComments: (Comment & { replies: Comment[] })[] = [];

    // 모든 댓글을 맵에 추가
    sortedComments.forEach(comment => {
      commentMap.set(comment.commentIdx, { ...comment, replies: [] });
    });

    // 댓글을 계층 구조로 정리
    sortedComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.commentIdx)!;
      
      // commentParent 필드 사용 (commentDepth도 함께 확인)
      const parentId = comment.commentParent || 0;
      const depth = comment.commentDepth || 0;
      
      if (depth === 0) {
        // 최상위 댓글 (commentDepth가 0)
        rootComments.push(commentWithReplies);
      } else if (parentId > 0) {
        // 답글 (commentParent가 0이 아님)
        const parent = commentMap.get(parentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        } else {
          // 부모를 찾을 수 없으면 가장 최근의 최상위 댓글을 부모로 연결
          const latestRoot = rootComments[rootComments.length - 1];
          if (latestRoot) {
            latestRoot.replies.push(commentWithReplies);
          } else {
            // 루트 댓글이 없으면 루트로 처리
            rootComments.push(commentWithReplies);
          }
        }
      } else if (depth > 0 && parentId === 0) {
        // commentDepth가 1 이상인데 commentParent가 0인 경우
        // 가장 최근의 최상위 댓글을 부모로 연결
        const latestRoot = rootComments[rootComments.length - 1];
        if (latestRoot) {
          latestRoot.replies.push(commentWithReplies);
        } else {
          // 루트 댓글이 없으면 루트로 처리
          rootComments.push(commentWithReplies);
        }
      }
    });

    // 루트 댓글과 답글들을 regDate 기준으로 정렬
    rootComments.sort((a, b) => {
      const dateA = new Date(a.regDate || 0).getTime();
      const dateB = new Date(b.regDate || 0).getTime();
      return dateB - dateA; // 최신순
    });

    // 각 댓글의 답글들도 정렬
    const sortReplies = (comment: Comment & { replies: Comment[] }) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a, b) => {
          const dateA = new Date(a.regDate || 0).getTime();
          const dateB = new Date(b.regDate || 0).getTime();
          return dateB - dateA; // 최신순
        });
        comment.replies.forEach((reply) => {
          const replyWithReplies = commentMap.get(reply.commentIdx);
          if (replyWithReplies) {
            sortReplies(replyWithReplies);
          }
        });
      }
    };
    rootComments.forEach(sortReplies);

    return rootComments;
  }, [comments]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !boardPost) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-blue-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">오류 발생</h1>
          <p className="text-gray-600 mb-8">{error || '게시글을 찾을 수 없습니다.'}</p>
          <button 
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="w-full sm:max-w-7xl sm:mx-auto sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/matzal-al-mentor" className="text-2xl font-bold text-blue-400">
              맛잘알 오빠
            </Link>
            <div className="text-gray-300">
              {(boardPost as any)?.restaurant?.restaurantName 
                ? `${(boardPost as any).restaurant.restaurantName} 맛집 후기` 
                : boardPost?.restaurantName 
                  ? `${boardPost.restaurantName} 맛집 후기` 
                  : '맛집 후기'}
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full py-4 sm:max-w-4xl sm:mx-auto sm:px-6 lg:px-8 sm:py-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <button 
            onClick={() => {
              // sessionStorage에서 식당 이름 가져오기
              const previousMatzalAlName = sessionStorage.getItem('previousMatzalAlName');
              
              // boardPost에 restaurant 정보가 있으면 해당 페이지로 이동
              let targetName = null;
              
              // restaurant 객체에서 matzalAlName 확인 (타입에 정의되지 않은 필드일 수 있음)
              if (boardPost && 'restaurant' in boardPost) {
                const restaurant = boardPost.restaurant as any;
                if (restaurant?.matzalAlName) {
                  targetName = restaurant.matzalAlName;
                }
              }
              
              if (!targetName && boardPost?.restaurantName) {
                targetName = boardPost.restaurantName;
              }
              
              if (!targetName && previousMatzalAlName) {
                targetName = previousMatzalAlName;
              }
              
              if (targetName) {
                router.push(`/matzal-al-mentor/${encodeURIComponent(targetName)}`);
              } else {
                router.push('/matzal-al-mentor');
              }
              
              // sessionStorage 정리
              sessionStorage.removeItem('previousMatzalAlName');
            }}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            뒤로가기
          </button>
        </div>

        {/* 게시글 내용 */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-6">
          {/* 게시글 제목과 액션 버튼 */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{boardPost.boardTitle}</h1>
              {/* 별점 표시 - null이어도 빈 별 5개 표시 */}
              <div className="flex items-center space-x-2 mt-2">
                {renderStarRating(boardPost.boardRating, 'md')}
                <span className="text-sm text-gray-600">
                  {boardPost.boardRating && boardPost.boardRating > 0
                    ? `${boardPost.boardRating.toFixed(1)} / 5.0`
                    : '평점 없음'}
                </span>
              </div>
            </div>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => setShowReportModal(true)}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
              >
                ▲ 신고하기
              </button>
              <div className="relative post-menu-container">
                <button
                  onClick={() => setShowPostMenu(!showPostMenu)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showPostMenu && (
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <button
                      onClick={handleEditPost}
                      className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      수정
                    </button>
                    <button
                      onClick={handleDeletePost}
                      className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 게시글 메타데이터 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1 block">작성자</span>
              <p className="text-sm font-semibold text-gray-900">{boardPost.boardID || '익명'}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">작성일</span>
              <p className="text-sm font-semibold text-gray-900">
                {boardPost.boardRegDate ? boardPost.boardRegDate.split(' ')[0] : ''}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <span className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1 block">조회수</span>
              <p className="text-sm font-semibold text-gray-900">{boardPost.boardHits || 0}</p>
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
                    boardPost.boardLike || 0
                  )}
                </span>
              </button>
            </div>  
          </div>

          {/* 게시글 내용 */}
          <div className="border-t border-gray-200 pt-6">
            <div className="prose max-w-none">
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {boardPost.boardContent}
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">댓글</h2>
            
          {/* 댓글 목록 */}
          <div className="space-y-3 mb-6">
            {organizedComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <p>아직 댓글이 없습니다.</p>
                <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
              </div>
            ) : (
              organizedComments.map((comment) => (
                <CommentItem
                  key={comment.commentIdx}
                  comment={comment}
                  level={0}
                  setReplyForm={setReplyForm}
                  setShowReplyInput={setShowReplyInput}
                  showReplyInput={showReplyInput}
                  setEditCommentForm={setEditCommentForm}
                  setShowEditCommentModal={setShowEditCommentModal}
                  setDeleteCommentData={setDeleteCommentData}
                  setShowDeleteCommentModal={setShowDeleteCommentModal}
                  setActiveCommentMenu={setActiveCommentMenu}
                  activeCommentMenu={activeCommentMenu}
                  showEditCommentModal={showEditCommentModal}
                  showDeleteCommentModal={showDeleteCommentModal}
                  handleReplySubmit={handleReplySubmit}
                  replyForm={replyForm}
                />
              ))
            )}
          </div>

          {/* 댓글 작성 폼 */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm">
            <form onSubmit={handleCommentSubmit} className="space-y-4">
              <div>
                <textarea
                  value={commentForm.content}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setCommentForm({...commentForm, content: e.target.value});
                    }
                  }}
                  placeholder="댓글을 입력하세요... (최대 200자)"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  maxLength={200}
                  required
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {commentForm.content.length}/200
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex space-x-2 sm:space-x-3">
                  <input
                    type="text"
                    value={commentForm.writer}
                    onChange={(e) => setCommentForm({...commentForm, writer: e.target.value})}
                    placeholder="아이디"
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="password"
                    value={commentForm.password}
                    onChange={(e) => setCommentForm({...commentForm, password: e.target.value})}
                    placeholder="비밀번호"
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                  >
                    댓글 작성
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>
      </div>

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">게시글 신고</h2>
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">신고 사유</label>
                  <select
                    value={reportForm.reportReason}
                    onChange={(e) => setReportForm({...reportForm, reportReason: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">신고 사유를 선택하세요</option>
                    <option value="spam">스팸/광고</option>
                    <option value="inappropriate">부적절한 내용</option>
                    <option value="harassment">괴롭힘/욕설</option>
                    <option value="fake">허위 정보</option>
                    <option value="other">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">신고자 ID</label>
                  <input
                    type="text"
                    value={reportForm.reporterId}
                    onChange={(e) => setReportForm({...reportForm, reporterId: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="신고자 ID를 입력하세요"
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isReportLoading}
                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                      isReportLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {isReportLoading ? '신고 중...' : '신고하기'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 수정 모달 */}
      {showEditCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">댓글 수정</h2>
              <form onSubmit={handleEditCommentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">댓글 내용</label>
                  <textarea
                    value={editCommentForm.content}
                    onChange={(e) => {
                      if (e.target.value.length <= 200) {
                        setEditCommentForm({...editCommentForm, content: e.target.value});
                      }
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    maxLength={200}
                    required
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">
                    {editCommentForm.content.length}/200
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                  <input
                    type="password"
                    value={editCommentForm.password}
                    onChange={(e) => setEditCommentForm({...editCommentForm, password: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditCommentModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    수정하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 삭제 모달 */}
      {showDeleteCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">댓글 삭제</h2>
              <form onSubmit={handleDeleteCommentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                  <input
                    type="password"
                    value={deleteCommentData.password}
                    onChange={(e) => setDeleteCommentData({...deleteCommentData, password: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteCommentModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    삭제하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">게시글 수정</h3>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">제목</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={40}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editForm.title.length}/40
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                  maxLength={700}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editForm.content.length}/700
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">평점</label>
                <div
                  className="flex flex-col gap-2"
                  onMouseLeave={() => setHoveredEditRating(null)}
                >
                  <div className="flex items-center space-x-2">
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const fillLevel = Math.min(Math.max((displayedEditRating || 0) - idx, 0), 1);
                      return (
                        <div key={`edit-star-${idx}`} className="relative w-8 h-8 text-3xl leading-none cursor-pointer">
                          <span className="absolute inset-0 text-gray-300 select-none">★</span>
                          <span
                            className="absolute inset-0 text-yellow-400 overflow-hidden select-none"
                            style={{ width: `${fillLevel * 100}%` }}
                          >
                            ★
                          </span>
                          <span className="invisible">★</span>
                          <div className="absolute inset-0 flex">
                            <button
                              type="button"
                              className="w-1/2 h-full bg-transparent"
                              aria-label={`${(idx + 0.5).toFixed(1)}점 선택`}
                              onMouseEnter={() => setHoveredEditRating(idx + 0.5)}
                              onFocus={() => setHoveredEditRating(idx + 0.5)}
                              onClick={() => setEditRating(idx + 0.5)}
                            />
                            <button
                              type="button"
                              className="w-1/2 h-full bg-transparent"
                              aria-label={`${(idx + 1).toFixed(1)}점 선택`}
                              onMouseEnter={() => setHoveredEditRating(idx + 1)}
                              onFocus={() => setHoveredEditRating(idx + 1)}
                              onClick={() => setEditRating(idx + 1)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-sm text-gray-600">
                    {editRating >= 0.5 ? `${editRating.toFixed(1)} / 5.0` : '필수는 아니지만 0.5 단위로 선택 가능합니다.'}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  수정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 게시글 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                required
              />
              <div className="flex space-x-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPassword('');
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteSubmit}
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
