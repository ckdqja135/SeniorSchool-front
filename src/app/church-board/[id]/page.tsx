'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChurchBoard, ChurchComment, ApiResponse } from '@/types/Church';

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
  comment: ChurchComment;
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
          {normalizedLevel > 0 && <span className="text-blue-600 text-sm">↳</span>}
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
        {comment.modDate && comment.modDate !== comment.regDate && (
          <div className="text-xs text-gray-400 italic">
            수정됨 {new Date(comment.modDate).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric'
            })}
          </div>
        )}
      </div>
      <p className={`text-gray-700 leading-relaxed mb-3 ${normalizedLevel > 0 ? 'ml-6' : ''}`} style={{ wordBreak: 'break-all', overflowWrap: 'break-word', maxWidth: '100%' }}>
        {comment.commentContent}
      </p>
      
      {/* 댓글 액션 버튼들 */}
      <div className={`flex items-center justify-between ${normalizedLevel > 0 ? 'ml-6' : ''}`}>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => {
              setReplyForm({ ...replyForm, parentIdx: comment.commentIdx });
              setShowReplyInput(showReplyInput === comment.commentIdx ? null : comment.commentIdx);
            }}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            답글
          </button>
        </div>
        
        {/* 햄버거 메뉴 */}
        <div className="relative">
          <button
            onClick={() => {
              if (showEditCommentModal || showDeleteCommentModal) {
                setShowEditCommentModal(false);
                setShowDeleteCommentModal(false);
              }
              setActiveCommentMenu(activeCommentMenu === comment.commentIdx ? null : comment.commentIdx);
            }}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          
          {/* 드롭다운 메뉴 */}
          {activeCommentMenu === comment.commentIdx && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {                 
                  setEditCommentForm({ 
                    commentIdx: comment.commentIdx, 
                    content: comment.commentContent, 
                    password: '' 
                  });
                  setShowEditCommentModal(true);  
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100 first:rounded-t-lg last:rounded-b-lg last:border-b-0"
              >
                ✏️ 수정
              </button>
              <button
                onClick={() => {
                  setDeleteCommentData({ 
                    commentIdx: comment.commentIdx, 
                    password: '' 
                  });
                  setShowDeleteCommentModal(true);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 border-b border-gray-100 first:rounded-t-lg last:rounded-b-lg last:border-b-0"
              >
                🗑️ 삭제
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 답글 입력창 */}
      {showReplyInput === comment.commentIdx && (
        <div className="mt-3 pl-4 border-l-2 border-blue-200">
          <form onSubmit={(e) => { e.preventDefault(); handleReplySubmit(comment.commentIdx); }} className="space-y-3">
            <textarea
              value={replyForm.content}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setReplyForm({ ...replyForm, content: e.target.value });
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              rows={2}
              maxLength={200}
              placeholder="답글을 입력하세요... (최대 200자)"
              required
            />
            
            {/* 아이디, 비밀번호, 버튼들을 한 줄에 배치 */}
            <div className="flex items-center gap-0.5">
              <input
                type="text"
                value={replyForm.writer}
                onChange={(e) => setReplyForm({ ...replyForm, writer: e.target.value })}
                className="w-12 md:w-20 px-1 md:px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="아이디"
                maxLength={10}
                required
              />
              <input
                type="password"
                value={replyForm.password}
                onChange={(e) => setReplyForm({ ...replyForm, password: e.target.value })}
                className="w-12 md:w-20 px-1 md:px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="비밀번호"
                maxLength={8}
                required
              />
              <button
                type="submit"
                className="px-1 md:px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs md:text-sm font-medium whitespace-nowrap"
              >
                답글 작성
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReplyInput(null);
                  setReplyForm({ content: '', writer: '', password: '', parentIdx: 0 });
                }}
                className="px-1 md:px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-xs md:text-sm whitespace-nowrap"
              >
                취소
              </button>
            </div>
            
            <p className="text-xs text-gray-500 text-right">
              {replyForm.content.length}/200
            </p>
          </form>
        </div>
      )}

             {/* 재귀적으로 대댓글들 렌더링 */}
       {comment.replies && comment.replies.length > 0 && (
         <div className="space-y-3 mt-3">
           {comment.replies.map((reply) => (
             <CommentItem 
               key={reply.commentIdx}
               comment={reply}
               level={1}
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

export default function ChurchBoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardIdx = parseInt(params.id as string);

  // 게시글 상태
  const [board, setBoard] = useState<ChurchBoard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 댓글 상태
  const [comments, setComments] = useState<ChurchComment[]>([]);
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentForm, setCommentForm] = useState({
    content: '',
    writer: '',
    password: ''
  });
  const [replyForm, setReplyForm] = useState({
    content: '',
    writer: '',
    password: ''
  });
  const [showReplyInput, setShowReplyInput] = useState<number | null>(null);

  // 댓글 페이지네이션 상태 (학교 오빠와 동일)
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const [commentsPerLoad] = useState(2);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);

  // 좋아요 상태
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  // 모달 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [password, setPassword] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    content: ''
  });
  
  const [editCommentForm, setEditCommentForm] = useState({
    commentIdx: 0,
    content: '',
    password: ''
  });
  
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [deleteCommentData, setDeleteCommentData] = useState({
    commentIdx: 0,
    password: ''
  });
  
  const [activeCommentMenu, setActiveCommentMenu] = useState<number | null>(null);
  
  // 신고 관련 상태
  const [reportForm, setReportForm] = useState({
    reportReason: '',
    reporterId: ''
  });
  const [isReportLoading, setIsReportLoading] = useState(false);

  // 신고 모달 토글 함수
  const toggleReportModal = () => {
    try {
      setShowReportModal(prev => !prev);
    } catch (error) {
      console.error('toggleReportModal 오류:', error);
    }
  };
  
  // 햄버거 메뉴 외부 클릭 시 닫기 (댓글)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const isMenuButton = target.closest('button[class*="hover:bg-gray-100"]');
      const isDropdownMenu = target.closest('.absolute.right-0.top-full');
      
      if (activeCommentMenu !== null && !isMenuButton && !isDropdownMenu) {
        setActiveCommentMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeCommentMenu]);

  // 게시글 드롭다운 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 게시글 드롭다운 버튼인지 확인
      const isBoardMenuButton = target.closest('button[class*="hover:bg-gray-100"][class*="p-2"]');
      // 게시글 드롭다운 메뉴인지 확인
      const isBoardDropdownMenu = target.closest('.absolute.right-0.mt-2');
      
      if (showPasswordModal && !isBoardMenuButton && !isBoardDropdownMenu) {
        setShowPasswordModal(false);
      }
    };

    if (showPasswordModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPasswordModal]);

  // 게시글 상세 정보 가져오기
  useEffect(() => {
    const fetchBoardDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
        const response = await fetch(`${backendURL}/church/boards/detail?boardIdx=${boardIdx}`);
        
        if (!response.ok) {
          throw new Error('게시글을 찾을 수 없습니다.');
        }
        
        const data = await response.json();
        
        // API 응답 구조 확인
        let boardData: ChurchBoard | null = null;
        
        // Case 1: { status: 200, data: {...} } 형태
        if (data.status === 200 && data.data) {
          boardData = data.data;
        }
        // Case 2: 직접 ChurchBoard 객체
        else if (data.boardIdx) {
          boardData = data;
        }
        // Case 3: 배열의 첫 번째 요소
        else if (Array.isArray(data) && data.length > 0) {
          boardData = data[0];
        }
        
        if (boardData) {
          setBoard(boardData);
          setLikeCount(boardData.boardLike || 0);
          setEditForm({
            title: boardData.boardTitle,
            content: boardData.boardContent
          });
        } else {
          console.error('API 응답에서 게시글 데이터를 찾을 수 없음:', data);
          throw new Error('게시글을 불러올 수 없습니다.');
        }
      } catch (error) {
        console.error('게시글 로딩 오류:', error);
        setError(error instanceof Error ? error.message : '게시글을 불러오는 중 오류가 발생했습니다.');
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
        
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
        const response = await fetch(`${backendURL}/church/comment?boardIdx=${boardIdx}`);
        
        if (!response.ok) {
          throw new Error('댓글을 불러올 수 없습니다.');
        }
        
        const data = await response.json();
        let commentsData: ChurchComment[] = [];
        
        // API 응답 형태에 따라 처리
        if (Array.isArray(data)) {
          commentsData = data;
        } else if (data.data && Array.isArray(data.data)) {
          commentsData = data.data;
        } else if (data.status === 200 && data.data && Array.isArray(data.data)) {
          commentsData = data.data;
        }
        
        // 문자열로 온 숫자 필드를 숫자로 변환
        commentsData = commentsData.map(comment => {
          // commentPerent (오타) 필드도 처리
          const parentValue = (comment as any).commentPerent !== undefined 
            ? (comment as any).commentPerent 
            : comment.commentParent;
          
          return {
            ...comment,
            commentIdx: typeof comment.commentIdx === 'string' ? parseInt(comment.commentIdx, 10) : comment.commentIdx,
            boardIdx: typeof comment.boardIdx === 'string' ? parseInt(comment.boardIdx, 10) : comment.boardIdx,
            commentLike: typeof comment.commentLike === 'string' ? parseInt(comment.commentLike, 10) : comment.commentLike,
            commentDepth: typeof comment.commentDepth === 'string' ? parseInt(comment.commentDepth, 10) : comment.commentDepth,
            commentParent: typeof parentValue === 'string' ? parseInt(parentValue, 10) : (typeof parentValue === 'number' ? parentValue : 0),
          };
        });
        
        // 계층 구조로 정리 (정렬은 나중에)
        const organizedComments = organizeComments(commentsData);
        setComments(organizedComments);
        setTotalComments(commentsData.length);
        
        // 계층 구조로 정리된 모든 댓글을 평탄화 (최상위 + 대댓글 모두 포함)
        const allFlattenedComments = organizedComments.flatMap(comment => [
          comment,
          ...(comment.replies || [])
        ]);
        
        // 모든 댓글을 regDate 기준으로 최신순 정렬 (최신 댓글이 위, 오래된 댓글이 아래)
        allFlattenedComments.sort((a, b) => {
          const dateA = new Date(a.regDate || 0).getTime();
          const dateB = new Date(b.regDate || 0).getTime();
          return dateB - dateA; // 최신순 (내림차순)
        });
        
        // 초기 댓글 로드 - 최신 댓글부터 보이도록 (최신순 정렬된 상태에서 처음 N개)
        const initialIds = new Set(allFlattenedComments.slice(0, commentsPerLoad).map(comment => comment.commentIdx));
        setVisibleIds(initialIds);
        setHasMoreComments(allFlattenedComments.length > commentsPerLoad);
        
      } catch (error) {
        console.error('댓글 로딩 오류:', error);
        setCommentError(error instanceof Error ? error.message : '댓글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsCommentLoading(false);
      }
    };

    if (boardIdx) {
      fetchComments();
    }
  }, [boardIdx, commentsPerLoad]);

  // 댓글을 계층 구조로 정리하는 함수 (학교 오빠와 동일)
  const organizeComments = (comments: ChurchComment[]): ChurchComment[] => {
    const commentMap = new Map<number, ChurchComment & { replies: ChurchComment[] }>();
    const rootComments: (ChurchComment & { replies: ChurchComment[] })[] = [];

    // 모든 댓글을 맵에 저장하고 replies 배열 초기화
    comments.forEach(comment => {
      commentMap.set(comment.commentIdx, { ...comment, replies: [] });
    });

    // 댓글들을 계층 구조로 정리
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.commentIdx)!;
      
      if (comment.commentParent === 0) {
        // 최상위 댓글
        rootComments.push(commentWithReplies);
      } else {
        // 답글
        const parent = commentMap.get(comment.commentParent);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      }
    });

    // 최상위 댓글들을 regDate 기준으로 최신순 정렬 (표시 순서는 나중에 결정)
    rootComments.sort((a, b) => {
      const dateA = new Date(a.regDate || 0).getTime();
      const dateB = new Date(b.regDate || 0).getTime();
      return dateB - dateA; // 최신순 (내림차순)
    });

    // 각 댓글의 replies도 regDate 기준으로 최신순 정렬 (표시 순서는 나중에 결정)
    const sortReplies = (comment: ChurchComment & { replies: ChurchComment[] }) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a, b) => {
          const dateA = new Date(a.regDate || 0).getTime();
          const dateB = new Date(b.regDate || 0).getTime();
          return dateB - dateA; // 최신순 (내림차순)
        });
        comment.replies.forEach((reply) => {
          const replyWithReplies = reply as ChurchComment & { replies: ChurchComment[] };
          sortReplies(replyWithReplies);
        });
      }
    };
    rootComments.forEach(sortReplies);

    return rootComments;
  };

  // 댓글 목록 새로고침 함수 (학교 오빠와 동일)
  const refreshComments = async () => {
    try {
      setIsCommentLoading(true);
      setCommentError(null);
      
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
      const response = await fetch(`${backendURL}/church/comment?boardIdx=${boardIdx}`);
      
      if (!response.ok) {
        throw new Error('댓글을 불러올 수 없습니다.');
      }
      
      const data = await response.json();
      let commentsData: ChurchComment[] = [];
      
      // API 응답 형태에 따라 처리
      if (Array.isArray(data)) {
        commentsData = data;
      } else if (data.data && Array.isArray(data.data)) {
        commentsData = data.data;
      } else if (data.status === 200 && data.data && Array.isArray(data.data)) {
        commentsData = data.data;
      }
      
      // 문자열로 온 숫자 필드를 숫자로 변환
      commentsData = commentsData.map(comment => {
        // commentPerent (오타) 필드도 처리
        const parentValue = (comment as any).commentPerent !== undefined 
          ? (comment as any).commentPerent 
          : comment.commentParent;
        
        return {
          ...comment,
          commentIdx: typeof comment.commentIdx === 'string' ? parseInt(comment.commentIdx, 10) : comment.commentIdx,
          boardIdx: typeof comment.boardIdx === 'string' ? parseInt(comment.boardIdx, 10) : comment.boardIdx,
          commentLike: typeof comment.commentLike === 'string' ? parseInt(comment.commentLike, 10) : comment.commentLike,
          commentDepth: typeof comment.commentDepth === 'string' ? parseInt(comment.commentDepth, 10) : comment.commentDepth,
          commentParent: typeof parentValue === 'string' ? parseInt(parentValue, 10) : (typeof parentValue === 'number' ? parentValue : 0),
        };
      });
      
      // 계층 구조로 정리 (정렬은 나중에)
      const organizedComments = organizeComments(commentsData);
      setComments(organizedComments);
      setTotalComments(commentsData.length);
      
      // 계층 구조로 정리된 모든 댓글을 평탄화 (최상위 + 대댓글 모두 포함)
      const allFlattenedComments = organizedComments.flatMap(comment => [
        comment,
        ...(comment.replies || [])
      ]);
      
      // 모든 댓글을 regDate 기준으로 최신순 정렬 (최신 댓글이 위, 오래된 댓글이 아래)
      allFlattenedComments.sort((a, b) => {
        const dateA = new Date(a.regDate || 0).getTime();
        const dateB = new Date(b.regDate || 0).getTime();
        return dateB - dateA; // 최신순 (내림차순)
      });
      
      // 초기 댓글 로드 - 최신 댓글부터 보이도록 (최신순 정렬된 상태에서 처음 N개)
      const initialIds = new Set(allFlattenedComments.slice(0, commentsPerLoad).map(comment => comment.commentIdx));
      setVisibleIds(initialIds);
      setHasMoreComments(allFlattenedComments.length > commentsPerLoad);
      
    } catch (error) {
      console.error('댓글 새로고침 오류:', error);
      setCommentError(error instanceof Error ? error.message : '댓글을 새로고침하는 중 오류가 발생했습니다.');
    } finally {
      setIsCommentLoading(false);
    }
  };

  // 댓글 작성 핸들러
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentForm.content.trim() || !commentForm.writer.trim() || !commentForm.password.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
      const response = await fetch(`${backendURL}/church/comment/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: boardIdx,
          commentContent: commentForm.content,
          commentWriter: commentForm.writer,
          commentPw: commentForm.password,
          commentParent: 0,
          commentDepth: 0
        }),
      });
      
      if (response.ok) {
        setCommentForm({ content: '', writer: '', password: '' });
        refreshComments();
      } else {
        const errorData = await response.json();
        alert(errorData.message || '댓글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  // 답글 작성 핸들러
  const handleReplySubmit = async (parentCommentIdx: number) => {
    if (!replyForm.content.trim() || !replyForm.writer.trim() || !replyForm.password.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
      const response = await fetch(`${backendURL}/church/comment/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: boardIdx,
          commentContent: replyForm.content,
          commentWriter: replyForm.writer,
          commentPw: replyForm.password,
          commentParent: parentCommentIdx,
          commentDepth: 1
        }),
      });
      
      if (response.ok) {
        setReplyForm({ content: '', writer: '', password: '' });
        setShowReplyInput(null);
        refreshComments();
      } else {
        const errorData = await response.json();
        alert(errorData.message || '답글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('답글 작성 오류:', error);
      alert('답글 작성 중 오류가 발생했습니다.');
    }
  };

  // 좋아요 토글 핸들러
  const handleLikeToggle = async () => {
    if (!board || isLikeLoading) return;
    
    try {
      setIsLikeLoading(true);
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
      const response = await fetch(`${backendURL}/church/boards/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: board.boardIdx,
          isLiked: !isLiked
        }),
      });
      
      if (response.ok) {
        setIsLiked(!isLiked);
        setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
      } else {
        const errorData = await response.json();
        alert(errorData.message || '좋아요 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('좋아요 토글 오류:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLikeLoading(false);
    }
  };

  // 댓글 수정
  const handleEditComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
      const editData = {
        commentIdx: editCommentForm.commentIdx,
        commentContent: editCommentForm.content.trim(),
        commentPw: editCommentForm.password.trim(),
        modDate: new Date().toISOString()
      };

      const response = await fetch(`${backendURL}/church/comments/modify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        setShowEditCommentModal(false);
        setEditCommentForm({ commentIdx: 0, content: '', password: '' });
        setActiveCommentMenu(null);
        refreshComments();
        alert('댓글이 성공적으로 수정되었습니다!');
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
    } catch (error) {
      console.error('댓글 수정 오류:', error);
      alert('댓글 수정 중 오류가 발생했습니다.');
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async () => {
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
      const deleteData = {
        commentIdx: deleteCommentData.commentIdx,
        commentPw: deleteCommentData.password.trim()
      };

      const response = await fetch(`${backendURL}/church/comment/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteData),
      });

      if (response.ok) {
        setShowDeleteCommentModal(false);
        setDeleteCommentData({ commentIdx: 0, password: '' });
        setActiveCommentMenu(null);
        refreshComments();
        alert('댓글이 성공적으로 삭제되었습니다!');
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };


  // 신고하기 핸들러
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!board) return;
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
      const response = await fetch(`${backendURL}/church/boards/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: board.boardIdx,
          reportReason: '부적절한 내용'
        }),
      });
      
      if (response.ok) {
        alert('신고가 접수되었습니다.');
        setShowReportModal(false);
      } else {
        const errorData = await response.json();
        alert(errorData.message || '신고 접수에 실패했습니다.');
      }
    } catch (error) {
      console.error('신고 접수 오류:', error);
      alert('신고 접수 중 오류가 발생했습니다.');
    }
  };

  // 수정하기 핸들러
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!board) return;
    
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
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
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      if (!backendURL) {
        throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
      }
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

  const loadMoreComments = () => {
    const allComments = comments.flatMap(comment => [
      comment,
      ...(comment.replies || [])
    ]);
    
    // 모든 댓글을 regDate 기준으로 오래된 순 정렬 (더보기 시 오래된 댓글부터 추가)
    const sortedByOldest = [...allComments].sort((a, b) => {
      const dateA = new Date(a.regDate || 0).getTime();
      const dateB = new Date(b.regDate || 0).getTime();
      return dateA - dateB; // 오래된 순 (오름차순)
    });
    
    // 아직 보이지 않은 댓글 중에서 오래된 순으로 N개 선택
    const notVisibleComments = sortedByOldest.filter(comment => !visibleIds.has(comment.commentIdx));
    const nextComments = notVisibleComments.slice(0, commentsPerLoad);
    const nextIds = nextComments.map(comment => comment.commentIdx);
    
    const newVisibleIds = new Set([...visibleIds, ...nextIds]);
    setVisibleIds(newVisibleIds);
    setHasMoreComments(newVisibleIds.size < allComments.length);
  };

  const getVisibleCommentCount = (): number => {
    return visibleIds.size;
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
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <nav className="bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/church-mentor" className="text-2xl font-bold text-red-400">
              교회 오빠
            </Link>
            <div className="text-gray-300">
              {board.church?.churchName ? `${board.church.churchName} 후기` : '교회 후기'}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 뒤로가기 버튼 - 상단에 배치 */}
        <div className="mb-6">
          <button 
            onClick={() => {
              // 교회 이름이 있으면 교회 멘토 페이지로, 없으면 뒤로가기
              if (board.church?.churchName) {
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
                onClick={() => {
                  toggleReportModal();
                }}
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
                      setShowDeleteConfirmModal(true);
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
                  likeCount
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">댓글</h2>
          
          {/* 더보기 버튼 */}
          {hasMoreComments && (
            <div className="flex justify-center mb-4">
              <button
                onClick={loadMoreComments}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                댓글 {totalComments - getVisibleCommentCount()}개 더보기
              </button>
            </div>
          )}
          
          {/* 댓글 목록 */}
          {isCommentLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">댓글을 불러오는 중...</p>
            </div>
          ) : commentError ? (
            <div className="text-center py-4 text-red-600">
              <p>댓글을 불러올 수 없습니다: {commentError}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments
                .filter(comment => visibleIds.has(comment.commentIdx))
                .map(comment => (
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
                ))}
            </div>
          )}
          
          {/* 총 댓글 수 */}
          <div className="mt-4 text-sm text-gray-500 text-center">
            총 {totalComments}개의 댓글
          </div>
        </div>

        {/* 댓글 작성 폼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">댓글 작성</h3>
          <form onSubmit={handleSubmitComment}>
            <div className="space-y-4">
              <textarea
                value={commentForm.content}
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setCommentForm(prev => ({ ...prev, content: e.target.value }));
                  }
                }}
                placeholder="댓글을 입력하세요... (최대 200자)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                maxLength={200}
                required
              />
              <div className="text-right text-xs text-gray-500 mt-1">
                {commentForm.content.length}/200
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={commentForm.writer}
                  onChange={(e) => setCommentForm(prev => ({ ...prev, writer: e.target.value }))}
                  placeholder="작성자"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="password"
                  value={commentForm.password}
                  onChange={(e) => setCommentForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="비밀번호"
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  댓글 작성
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">게시글 신고</h3>
            <form onSubmit={handleReportSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 사유
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="spam">스팸</option>
                  <option value="inappropriate">부적절한 내용</option>
                  <option value="harassment">괴롭힘</option>
                  <option value="other">기타</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">게시글 수정</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  수정하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">게시글 삭제</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeletePost}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 수정 모달 */}
      {showEditCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">댓글 수정</h3>
            </div>
            <form onSubmit={handleEditComment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  댓글 내용
                </label>
                <textarea
                  value={editCommentForm.content}
                  onChange={(e) => {
                    if (e.target.value.length <= 200) {
                      setEditCommentForm({ ...editCommentForm, content: e.target.value });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {editCommentForm.content.length}/200
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={editCommentForm.password}
                  onChange={(e) => setEditCommentForm({ ...editCommentForm, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              <div className="flex space-x-3 justify-center pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditCommentModal(false);
                    setActiveCommentMenu(null);
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

       
       {/* 댓글 삭제 확인 모달 */}
       {showDeleteCommentModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
             <div className="text-center">
               <div className="text-red-600 text-6xl mb-4">🗑️</div>
               <h3 className="text-xl font-bold text-gray-800 mb-4">댓글 삭제 확인</h3>
               <p className="text-gray-600 mb-4">이 댓글을 정말로 삭제하시겠습니까?</p>
               <input
                 type="password"
                 value={deleteCommentData.password}
                 onChange={(e) => setDeleteCommentData({ ...deleteCommentData, password: e.target.value })}
                 placeholder="비밀번호를 입력하세요"
                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
               />
               <div className="flex space-x-3 justify-center">
                 <button 
                   onClick={() => {
                     setShowDeleteCommentModal(false);
                     setActiveCommentMenu(null);
                   }}
                   className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                 >
                   취소
                 </button>
                 <button 
                   onClick={handleDeleteComment}
                   className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                 >
                   삭제
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* 신고 모달 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
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
                  disabled={isReportLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReportLoading ? '신고 중...' : '신고하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirmModal && (
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
                    setShowDeleteConfirmModal(false);
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
