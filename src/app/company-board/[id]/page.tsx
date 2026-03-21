'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CompanyBoard, CompanyComment } from '@/types/Company';

const CommentItem = ({ comment, onEdit, onDelete, onReply, onMenuToggle, isActive, onMenuClick }: {
  comment: CompanyComment;
  onEdit: (comment: CompanyComment) => void;
  onDelete: (comment: CompanyComment) => void;
  onReply: (comment: CompanyComment) => void;
  onMenuToggle?: () => void;
  isActive: boolean;
  onMenuClick: (commentIdx: number) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const MAX_LENGTH = 500;
  const LINE_BREAK_LENGTH = 80; // 한 줄에 표시할 최대 글자수
  const content = comment.commentContent || '';
  const isLongContent = content.length > MAX_LENGTH;
  
  // 일정 글자수마다 줄바꿈을 삽입하는 함수
  const insertLineBreaks = (text: string, maxLength: number): string => {
    // 이미 줄바꿈이 있거나 띄어쓰기가 있는 경우는 그대로 유지
    if (text.includes('\n') || text.includes(' ')) {
      return text;
    }
    
    // 띄어쓰기 없이 긴 문자열인 경우만 처리
    if (text.length > maxLength) {
      const lines: string[] = [];
      for (let i = 0; i < text.length; i += maxLength) {
        lines.push(text.substring(i, i + maxLength));
      }
      return lines.join('\n');
    }
    
    return text;
  };
  
  // 표시할 내용 처리
  let displayContent = isExpanded || !isLongContent ? content : content.substring(0, MAX_LENGTH) + '...';
  displayContent = insertLineBreaks(displayContent, LINE_BREAK_LENGTH);

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const ampm = hour < 12 ? '오전' : '오후';
    const displayHour = hour % 12 || 12;
    
    return `${year}년 ${month}월 ${day}일${ampm} ${displayHour}:${minute.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm overflow-hidden ${comment.commentDepth > 0 ? 'ml-3 sm:ml-6' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            {/* 답글인 경우 화살표를 작성자 이름 앞에 표시 */}
            {comment.commentDepth > 0 && (
              <svg className="w-4 h-4 text-blue-500 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium text-gray-900 text-sm">{comment.writerId || comment.commentWriter}</span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-gray-500 text-xs">{formatDate(comment.regDate || comment.commentRegDate)}</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap" style={{ wordBreak: 'break-all', overflowWrap: 'break-word', maxWidth: '100%' }}>{displayContent}</p>
            {isLongContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {isExpanded ? '접기' : '더보기'}
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => {
              onMenuClick(comment.commentIdx);
              // 댓글 메뉴가 열릴 때 게시글 메뉴 닫기
              if (!isActive && onMenuToggle) {
                onMenuToggle();
              }
            }}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {isActive && (
            <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <button
                onClick={() => {
                  onEdit(comment);
                  onMenuClick(comment.commentIdx);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                수정
              </button>
              <button
                onClick={() => {
                  onDelete(comment);
                  onMenuClick(comment.commentIdx);
                }}
                className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-3 flex space-x-4">
        <button
          onClick={() => onReply(comment)}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          답글
        </button>
      </div>


    </div>
  );
};

export default function CompanyBoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardId = params.id as string;
  const companyName = searchParams.get('company');
  
  const [board, setBoard] = useState<CompanyBoard | null>(null);
  const [company, setCompany] = useState<any>(null);
  const [comments, setComments] = useState<CompanyComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [password, setPassword] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    content: ''
  });
  const [editRating, setEditRating] = useState<number>(0);
  const [hoveredEditRating, setHoveredEditRating] = useState<number | null>(null);
  
  const [commentForm, setCommentForm] = useState({
    content: '',
    writer: '',
    password: ''
  });
  
  const [editCommentForm, setEditCommentForm] = useState({
    commentIdx: 0,
    content: '',
    password: ''
  });
  
  const [replyForm, setReplyForm] = useState({
    content: '',
    writer: '',
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
  const [likeCount, setLikeCount] = useState(0);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // 신고 관련 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    reportReason: '',
    reporterId: ''
  });
  const [isReportLoading, setIsReportLoading] = useState(false);
  
  // 게시글 메뉴 상태
  const [showPostMenu, setShowPostMenu] = useState(false);

  // 댓글 페이지네이션 상태
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const [commentsPerLoad] = useState(5); // 5개씩 표시
  const [totalComments, setTotalComments] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allComments, setAllComments] = useState<CompanyComment[]>([]);
  const [visibleComments, setVisibleComments] = useState<CompanyComment[]>([]);

  // 중복 호출 방지를 위한 ref
  const hasFetchedBoard = useRef(false);
  const hasFetchedComments = useRef(false);
  const hasFetchedLikeStatus = useRef(false);

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

  // 댓글 햄버거 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 댓글 햄버거 메뉴 버튼인지 확인
      const isCommentMenuButton = target.closest('button[class*="hover:text-gray-600"][class*="p-1"]');
      // 댓글 드롭다운 메뉴인지 확인
      const isCommentDropdownMenu = target.closest('.absolute.right-0.mt-1');
      
      if (activeCommentMenu !== null && !isCommentMenuButton && !isCommentDropdownMenu) {
        setActiveCommentMenu(null);
      }
    };

    if (activeCommentMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeCommentMenu]);

  // 게시글 정보 가져오기
  useEffect(() => {
    const fetchBoardDetail = async () => {
      // 중복 호출 방지
      if (hasFetchedBoard.current || !boardId) return;
      hasFetchedBoard.current = true;

      try {
        setIsLoading(true);
        setError(null);

        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        const response = await fetch(`${backendURL}/comp/board/detail?boardIdx=${boardId}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // API가 직접 게시글 데이터를 반환하는 경우
        if (data && data.boardIdx) {
          setBoard(data);
          // 문자열 연결 버그 방지: 숫자로 확실하게 변환
          const parsedLikeCount = Number(data.boardLike) || 0;
          setLikeCount(parsedLikeCount);
          
          // 회사 정보 가져오기
          if (data.compIdx) {
            // 게시글에서 compIdx가 있으면 회사 정보 API 호출
            try {
              const compResponse = await fetch(`${backendURL}/search/comp/${data.compIdx}`);
              if (compResponse.ok) {
                const compData = await compResponse.json();
                if (compData.status === 200 && compData.data) {
                  const companyInfo = Array.isArray(compData.data) ? compData.data[0] : compData.data;
                  setCompany(companyInfo);
                } else if (companyName) {
                  setCompany({ compName: companyName, compIdx: data.compIdx });
                }
              } else if (companyName) {
                setCompany({ compName: companyName, compIdx: data.compIdx });
              }
            } catch (err) {
              console.error('회사 정보 로딩 실패:', err);
              if (companyName) {
                setCompany({ compName: companyName, compIdx: data.compIdx });
              }
            }
          } else if (companyName) {
            // compIdx가 없으면 companyName만 설정
            setCompany({ compName: companyName });
          }
        } else {
          throw new Error('게시글을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('게시글 로딩 오류:', error);
        setError(error instanceof Error ? error.message : '게시글을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoardDetail();
  }, [boardId]);

  // 댓글 목록 가져오기
  const fetchComments = useCallback(async (forceRefresh = false) => {
    if (!boardId) return;

    // 강제 새로고침이 아닌 경우 중복 호출 방지
    if (!forceRefresh && hasFetchedComments.current) {
      return;
    }

    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/comp/comment?boardIdx=${boardId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // API가 배열을 직접 반환하는 경우
      let commentsData: CompanyComment[] = [];
      if (Array.isArray(data)) {
        commentsData = data;
      } else if (data.status === 200 && data.data) {
        commentsData = data.data;
      }
      
      // 부모 댓글(depth:0)은 최신순, 대댓글(depth>0)은 부모 아래에 시간순 유지
      const parents = commentsData.filter(c => Number(c.commentDepth) === 0).reverse();
      const sorted: CompanyComment[] = [];
      for (const parent of parents) {
        sorted.push(parent);
        const replies = commentsData.filter(
          c => Number(c.commentDepth) > 0 && String(c.commentParent) === String(parent.commentIdx)
        );
        sorted.push(...replies);
      }

      setAllComments(sorted);
      setTotalComments(sorted.length);
      setVisibleComments(sorted.slice(0, commentsPerLoad));
      setHasMoreComments(sorted.length > commentsPerLoad);
    } catch (error) {
      console.error('댓글 로딩 오류:', error);
      setAllComments([]);
      setVisibleComments([]);
    }
  }, [boardId, commentsPerLoad]);

  // 댓글 더보기
  const loadMoreComments = async () => {
    if (isLoadingMore || !hasMoreComments) return;
    
    setIsLoadingMore(true);
    try {
      // 현재 표시된 댓글 수를 늘려서 더 많은 댓글을 표시
      const newVisibleCount = visibleComments.length + commentsPerLoad;
      setVisibleComments(allComments.slice(0, newVisibleCount));
      setHasMoreComments(newVisibleCount < totalComments);
      setIsLoadingMore(false);
    } catch (error) {
      console.error('댓글 더보기 오류:', error);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    // 중복 호출 방지
    if (hasFetchedComments.current || !boardId) return;
    
    fetchComments().then(() => {
      hasFetchedComments.current = true;
    });
  }, [boardId]); // commentsPerLoad, fetchComments 제거

  // 좋아요 상태 확인
  useEffect(() => {
    const fetchLikeStatus = async () => {
      // 중복 호출 방지
      if (hasFetchedLikeStatus.current || !boardId) return;
      hasFetchedLikeStatus.current = true;
      
      try {
        const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
        const response = await fetch(`${backendURL}/comp/board/like/${boardId}`);

        if (response.ok) {
          const data = await response.json();
          if (data.status === 200) {
            // API 응답 구조에 따라 다르게 처리
            const likeStatus = data.isLiked !== undefined ? data.isLiked : (data.data && data.data.isLiked);
            setIsLiked(likeStatus || false);
          }
        } else {
          // 실패 시 기본값으로 설정
          setIsLiked(false);
        }
      } catch (error) {
        console.error('좋아요 상태 확인 오류:', error);
        // 오류 시 기본값으로 설정
        setIsLiked(false);
      }
    };

    fetchLikeStatus();
  }, [boardId]);

  // 좋아요 토글
  const handleLikeToggle = async () => {
    if (isLikeLoading) return;
    
    setIsLikeLoading(true);
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const newLikeStatus = !isLiked; // 새로운 상태 미리 계산
      
      const requestBody = {
        boardIdx: parseInt(boardId),
        isLiked: newLikeStatus
      };
      
      const response = await fetch(`${backendURL}/comp/board/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        
        // HTTP 응답이 성공적이면 상태 업데이트
        setIsLiked(newLikeStatus);
        // 좋아요 수 업데이트 (문자열 연결 버그 방지: 숫자로 확실하게 변환)
        setLikeCount(prev => {
          const currentCount = Number(prev) || 0;
          const newCount = newLikeStatus ? currentCount + 1 : Math.max(0, currentCount - 1);
          return newCount;
        });
      } else {
        const errorText = await response.text();
        alert(`좋아요 처리 중 오류가 발생했습니다. (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('좋아요 토글 오류:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLikeLoading(false);
    }
  };

  // 댓글 작성 제출
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentForm.content.trim() || !commentForm.writer.trim() || !commentForm.password.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/comp/comment/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          commentContent: commentForm.content,
          commentWriter: commentForm.writer,
          commentPw: commentForm.password,
          commentParent: 0,
          commentDepth: 0,
          commentLike: 0
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // API 응답이 성공적이면 댓글 목록 새로고침
        if (data.success === true || data.status === 200 || response.status === 200) {
          alert('댓글이 작성되었습니다.');
          setCommentForm({
            content: '',
            writer: '',
            password: ''
          });
          // 댓글 목록 새로고침
          hasFetchedComments.current = false;
          await fetchComments(true);
        } else {
          throw new Error(data.message || '댓글 작성에 실패했습니다.');
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 답글 작성 제출
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!replyForm.content.trim() || !replyForm.writer.trim() || !replyForm.password.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setIsSubmittingReply(true);
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/comp/comment/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          commentContent: replyForm.content,
          commentWriter: replyForm.writer,
          commentPw: replyForm.password,
          commentParent: replyForm.parentIdx,
          commentDepth: 1,
          commentLike: 0
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // API 응답이 성공적이면 답글 목록 새로고침
        if (data.success === true || data.status === 200 || response.status === 200) {
          alert('답글이 작성되었습니다.');
          setReplyForm({
            content: '',
            writer: '',
            password: '',
            parentIdx: 0
          });
          setShowReplyInput(null);
          // 댓글 목록 새로고침
          hasFetchedComments.current = false;
          await fetchComments(true);
        } else {
          throw new Error(data.message || '답글 작성에 실패했습니다.');
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('답글 작성 오류:', error);
      alert('답글 작성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // 댓글 수정 제출
  const handleEditCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editCommentForm.content.trim() || !editCommentForm.password.trim()) {
      alert('내용과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/comp/comment/${editCommentForm.commentIdx}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentContent: editCommentForm.content,
          commentPw: editCommentForm.password
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success === true || data.status === 200 || response.status === 200) {
          alert('댓글이 수정되었습니다.');
          setShowEditCommentModal(false);
          setEditCommentForm({
            commentIdx: 0,
            content: '',
            password: ''
          });
          // 댓글 목록 새로고침
          hasFetchedComments.current = false;
          await fetchComments(true);
        } else {
          throw new Error(data.message || '댓글 수정에 실패했습니다.');
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('댓글 수정 오류:', error);
      alert('댓글 수정 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 댓글 삭제 제출
  const handleDeleteCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deleteCommentData.password.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/comp/comment/${deleteCommentData.commentIdx}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentPw: deleteCommentData.password
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success === true || data.status === 200 || response.status === 200) {
          alert('댓글이 삭제되었습니다.');
          setShowDeleteCommentModal(false);
          setDeleteCommentData({
            commentIdx: 0,
            password: ''
          });
          // 댓글 목록 새로고침
          hasFetchedComments.current = false;
          await fetchComments(true);
        } else {
          throw new Error(data.message || '댓글 삭제에 실패했습니다.');
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      alert('댓글 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 댓글 수정
  const handleEditComment = (comment: CompanyComment) => {
    setEditCommentForm({
      commentIdx: comment.commentIdx,
      content: comment.commentContent,
      password: ''
    });
    setShowEditCommentModal(true);
  };

  // 댓글 삭제
  const handleDeleteComment = (comment: CompanyComment) => {
    setDeleteCommentData({
      commentIdx: comment.commentIdx,
      password: ''
    });
    setShowDeleteCommentModal(true);
  };

  // 답글 작성
  const handleReply = (comment: CompanyComment) => {
    setReplyForm({
      content: '',
      writer: '',
      password: '',
      parentIdx: comment.commentIdx
    });
    setShowReplyInput(comment.commentIdx);
  };

  // 신고 처리
  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportForm.reportReason.trim() || !reportForm.reporterId.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setIsReportLoading(true);
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          reportReason: reportForm.reportReason,
          reporterId: reportForm.reporterId,
          serviceType: 'company' // 회사 게시판 신고임을 명시
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert('신고가 성공적으로 접수되었습니다.');
        setShowReportModal(false);
        setReportForm({ reportReason: '', reporterId: '' });
      } else {
        const errorData = await response.json();
        alert(`신고 접수에 실패했습니다: ${errorData.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('신고 처리 오류:', error);
      alert('신고 처리 중 오류가 발생했습니다.');
    } finally {
      setIsReportLoading(false);
    }
  };

  const normalizeRating = (value: any): number | null => {
    if (value === null || value === undefined) return null;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    if (typeof parsed !== 'number' || Number.isNaN(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 5);
  };

  const renderStarRating = (score?: number | null, size: 'sm' | 'md' = 'md') => {
    const safeScore = Math.max(0, Math.min(score || 0, 5));
    const sizeClasses = size === 'sm'
      ? { wrapper: 'w-4 h-4 text-xs', star: 'text-xs' }
      : { wrapper: 'w-6 h-6 text-lg', star: 'text-lg' };

    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, idx) => {
          const fillLevel = Math.min(Math.max(safeScore - idx, 0), 1);
          const fillPercent = Math.min(100, Math.max(0, fillLevel * 100 - 12));
          return (
            <div key={`star-${idx}`} className={`relative ${sizeClasses.wrapper}`}>
              <span className={`absolute inset-0 text-gray-300 select-none ${sizeClasses.star}`}>★</span>
              <span
                className={`absolute inset-0 text-yellow-400 overflow-hidden select-none ${sizeClasses.star}`}
                style={{ width: `${fillPercent}%` }}
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

  const currentBoardRating = normalizeRating(board?.boardRating ?? (board as any)?.boardScore);
  const displayedEditRating = hoveredEditRating ?? editRating;

  // 게시글 수정
  const handleEditPost = () => {
    setEditForm({
      title: board?.boardTitle || '',
      content: board?.boardContent || ''
    });
    setEditRating(currentBoardRating || 0);
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
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/comp/board/correct`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          boardTitle: editForm.title,
          boardContent: editForm.content,
          boardPw: password,
          boardRating: editRating || null
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // API 응답이 성공적이면 상태 업데이트
        if (data.success === true) {
          alert('게시글이 수정되었습니다.');
          setShowEditModal(false);
          setPassword('');
          // 페이지 새로고침
          window.location.reload();
        } else {
          throw new Error(data.message || '게시글 수정에 실패했습니다.');
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
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await fetch(`${backendURL}/comp/board/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          boardPw: password
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // API 응답이 성공적이면 상태 업데이트
        if (data.success === true) {
          alert('게시글이 삭제되었습니다.');
          router.push('/company-mentor');
        } else {
          throw new Error(data.message || '게시글 삭제에 실패했습니다.');
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      alert('게시글 삭제 중 오류가 발생했습니다. 비밀번호를 확인해주세요.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-purple-600 text-6xl mb-4">⚠️</div>
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
            <Link href="/company-mentor" className="text-2xl font-bold text-purple-400">
              회사 오빠
            </Link>
            <div className="text-gray-300">
              {company?.compName ? `${company.compName} 입사 후기` : '입사 후기'}
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full py-4 sm:max-w-4xl sm:mx-auto sm:px-6 lg:px-8 sm:py-8">
        {/* 뒤로가기 버튼 */}
        <div className="mb-6">
          <button 
            onClick={() => {
              if (companyName && company?.compIdx) {
                router.push(`/company-mentor/${encodeURIComponent(companyName)}?compIdx=${company.compIdx}`);
              } else if (company?.compName && company?.compIdx) {
                router.push(`/company-mentor/${encodeURIComponent(company.compName)}?compIdx=${company.compIdx}`);
              } else if (companyName) {
                router.push(`/company-mentor/${encodeURIComponent(companyName)}`);
              } else if (company?.compName) {
                router.push(`/company-mentor/${encodeURIComponent(company.compName)}`);
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

        {/* 게시글 내용 */}
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-6">
          {/* 게시글 제목과 액션 버튼 */}
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex-1">{board.boardTitle}</h1>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => setShowReportModal(true)}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  {/* 모서리가 둥근 삼각형 */}
                  <path d="M12 3.5 C12 3.5, 13 4, 14 6 L21 20 C21.5 21, 21.5 21.5, 21 21.5 L3 21.5 C2.5 21.5, 2.5 21, 3 20 L10 6 C11 4, 12 3.5, 12 3.5 Z" 
                        fill="white" stroke="#EF4444" strokeWidth="2" strokeLinejoin="round"/>
                  {/* 빨간색 느낌표 */}
                  <g fill="#EF4444">
                    <rect x="11" y="10" width="2" height="6" rx="1"/>
                    <rect x="11" y="18" width="2" height="2" rx="1"/>
                  </g>
                </svg>
                신고하기
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
              <p className="text-sm font-semibold text-gray-900">{board.boardID}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">작성일</span>
              <p className="text-sm font-semibold text-gray-900">
                {board.boardRegDate ? board.boardRegDate.split(' ')[0] : ''}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <span className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1 block">조회수</span>
              <p className="text-sm font-semibold text-gray-900">{board.boardHits}</p>
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

        <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-yellow-700 font-bold uppercase tracking-widest mb-2">회사 평점</p>
            {currentBoardRating ? (
              <div className="flex items-center space-x-3">
                {renderStarRating(currentBoardRating, 'md')}
                <span className="text-base font-semibold text-gray-900 leading-none pt-2">
                  {currentBoardRating.toFixed(1)} / 5.0
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">평점이 아직 등록되지 않았습니다.</p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            평점은 회사 후기를 작성한 사용자 기준입니다.
          </p>
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
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">댓글</h2>
          
          {/* 댓글 목록 */}
          <div className="space-y-3 mb-6">
            {/* 댓글 더보기 버튼 - 5개 이상일 때만 표시 */}
            {hasMoreComments && totalComments > 5 && (
              <div className="text-center mb-4">
                <button 
                  onClick={loadMoreComments}
                  disabled={isLoadingMore}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMore ? '로딩 중...' : `댓글 ${totalComments - visibleComments.length}개 더보기`}
                </button>
              </div>
            )}
            
            {visibleComments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">💬</div>
                <p>아직 댓글이 없습니다.</p>
                <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
              </div>
            ) : (
              (() => {
                // 모든 댓글을 순서대로 렌더링 (뎁스에 따라 들여쓰기)
                return visibleComments.map((comment) => {
                  const isReply = comment.commentDepth > 0;
                  
                  return (
                    <div key={comment.commentIdx} className="space-y-3">
                      <CommentItem
                        comment={comment}
                        onEdit={handleEditComment}
                        onDelete={handleDeleteComment}
                        onReply={handleReply}
                        onMenuToggle={() => setShowPostMenu(false)}
                        isActive={activeCommentMenu === comment.commentIdx}
                        onMenuClick={(commentIdx) => {
                          setActiveCommentMenu(activeCommentMenu === commentIdx ? null : commentIdx);
                        }}
                      />
                      
                      {/* 답글 작성 폼 - 각 댓글에 답글 작성할 때 */}
                      {showReplyInput === comment.commentIdx && (
                        <div className={`${isReply ? 'ml-6 sm:ml-12' : 'ml-3 sm:ml-6'} mt-3 bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm`}>
                          <form onSubmit={handleReplySubmit} className="space-y-3">
                            <textarea
                              value={replyForm.content}
                              onChange={(e) => {
                                if (e.target.value.length <= 200) {
                                  setReplyForm({...replyForm, content: e.target.value});
                                }
                              }}
                              placeholder="답글을 입력하세요... (최대 200자)"
                              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                              rows={3}
                              maxLength={200}
                              required
                            />
                            <div className="text-right text-xs text-gray-500 mt-1">
                              {replyForm.content.length}/200
                            </div>
                            <div className="space-y-3">
                              <div className="flex space-x-1 sm:space-x-2">
                                <input
                                  type="text"
                                  value={replyForm.writer}
                                  onChange={(e) => setReplyForm({...replyForm, writer: e.target.value})}
                                  placeholder="작성자"
                                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                  required
                                />
                                <input
                                  type="password"
                                  value={replyForm.password}
                                  onChange={(e) => setReplyForm({...replyForm, password: e.target.value})}
                                  placeholder="비밀번호"
                                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                  required
                                />
                              </div>
                              <div className="flex space-x-1 sm:space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setShowReplyInput(null)}
                                  className="flex-1 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                  취소
                                </button>
                                <button
                                  type="submit"
                                  disabled={isSubmittingReply}
                                  className="flex-1 px-3 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                >
                                  {isSubmittingReply ? '작성 중...' : '답글 작성'}
                                </button>
                              </div>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                });
              })()
            )}
            
            {/* 총 댓글 수 */}
            {totalComments > 0 && (
              <div className="text-center text-gray-500 text-sm mt-4">
                총 {totalComments}개의 댓글
              </div>
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
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                  <input
                    type="password"
                    value={commentForm.password}
                    onChange={(e) => setCommentForm({...commentForm, password: e.target.value})}
                    placeholder="비밀번호"
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors w-full sm:w-auto"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="text-red-600 text-6xl mb-4">🚨</div>
              <h3 className="text-xl font-bold text-gray-800">후기 신고하기</h3>
              <p className="text-gray-600 mt-2">부적절한 내용을 신고해주세요</p>
            </div>
            <form onSubmit={handleReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">후기 고유 ID</label>
                <input
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  type="text"
                  value={boardId}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  신고 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reportForm.reportReason}
                  onChange={(e) => setReportForm({...reportForm, reportReason: e.target.value})}
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
                  onChange={(e) => setReportForm({...reportForm, reporterId: e.target.value})}
                  placeholder="신고자 ID를 입력하세요"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  maxLength={20}
                  required
                />
              </div>
              <div className="flex space-x-3 justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
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

      {/* 게시글 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">게시글 수정</h3>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
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

      {/* 댓글 수정 모달 */}
      {showEditCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">댓글 수정</h3>
            </div>
            <form onSubmit={handleEditCommentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                <textarea
                  value={editCommentForm.content}
                  onChange={(e) => setEditCommentForm({...editCommentForm, content: e.target.value})}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input
                  type="password"
                  value={editCommentForm.password}
                  onChange={(e) => setEditCommentForm({...editCommentForm, password: e.target.value})}
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
                    setEditCommentForm({
                      commentIdx: 0,
                      content: '',
                      password: ''
                    });
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

      {/* 댓글 삭제 모달 */}
      {showDeleteCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">댓글 삭제</h3>
              <p className="text-gray-600 mt-2">정말로 이 댓글을 삭제하시겠습니까?</p>
            </div>
            <form onSubmit={handleDeleteCommentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input
                  type="password"
                  value={deleteCommentData.password}
                  onChange={(e) => setDeleteCommentData({...deleteCommentData, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>
              <div className="flex space-x-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteCommentModal(false);
                    setDeleteCommentData({
                      commentIdx: 0,
                      password: ''
                    });
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
