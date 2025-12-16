'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FreeBoardPost, Comment } from '@/types';
import { fetchFreeboardDetail, likeFreeboardPost, createFreeboardComment, likeFreeboardComment, updateFreeboardComment, deleteFreeboardComment, updateFreeboardPost, deleteFreeboardPost } from '@/lib/freeboard/freeboardAPI';

interface FreeBoardDetailPageProps {
  params: {
    id: string;
  };
}

// 댓글 내용 표시 컴포넌트 (더보기 기능 포함)
const CommentContentDisplay = ({ content }: { content: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const MAX_LENGTH = 500;
  const LINE_BREAK_LENGTH = 80; // 한 줄에 표시할 최대 글자수
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
  
  return (
    <div className="overflow-hidden">
      <p className="text-sm text-gray-900 whitespace-pre-wrap" style={{ wordBreak: 'break-all', overflowWrap: 'break-word', maxWidth: '100%' }}>{displayContent}</p>
      {isLongContent && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {isExpanded ? '접기' : '더보기'}
        </button>
      )}
    </div>
  );
};

export default function FreeBoardDetailPage({ params }: FreeBoardDetailPageProps) {
  const router = useRouter();
  const [post, setPost] = useState<FreeBoardPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentWriter, setCommentWriter] = useState('');
  const [commentPassword, setCommentPassword] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [commentLikes, setCommentLikes] = useState<Set<number>>(new Set());
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [editCommentPassword, setEditCommentPassword] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [openMenuComment, setOpenMenuComment] = useState<number | null>(null);
  const [showBoardDeleteModal, setShowBoardDeleteModal] = useState(false);
  const [boardDeletePassword, setBoardDeletePassword] = useState('');
  const [boardDeleteId, setBoardDeleteId] = useState('');
  const [openBoardMenu, setOpenBoardMenu] = useState(false);
  const [showBoardEditModal, setShowBoardEditModal] = useState(false);
  const [editBoardTitle, setEditBoardTitle] = useState('');
  const [editBoardContent, setEditBoardContent] = useState('');
  const [editBoardCategory, setEditBoardCategory] = useState('');
  const [editBoardTags, setEditBoardTags] = useState<string[]>([]);
  const [editBoardPassword, setEditBoardPassword] = useState('');
  const [editBoardId, setEditBoardId] = useState('');
  const [newTag, setNewTag] = useState('');

  // 신고 관련 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    reportReason: '',
    reporterId: ''
  });
  const [isReportLoading, setIsReportLoading] = useState(false);

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

  // 게시글 데이터 가져오기 (실제 API 호출)
  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('게시글 상세 조회 시작:', params.id);
        const response = await fetchFreeboardDetail(params.id);
        console.log('API 응답:', response);
        
        if (response && response.data && response.data.post) {
          setPost(response.data.post);
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

  // 댓글 데이터 가져오기 (게시글과 함께 가져옴)
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsCommentLoading(true);
        
        const response = await fetchFreeboardDetail(params.id);
        console.log('댓글 API 응답:', response);
        
        if (response && response.data && response.data.comments) {
          setComments(response.data.comments);
        } else {
          setComments([]);
        }
      } catch (error) {
        console.error('댓글 로딩 오류:', error);
        setComments([]);
      } finally {
        setIsCommentLoading(false);
      }
    };

    if (params.id) {
      fetchComments();
    }
  }, [params.id]);

  // 댓글 작성
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !commentWriter.trim() || !commentPassword.trim() || !post) {
      alert('댓글 내용, 작성자명, 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setIsSubmittingComment(true);
      
      // 실제 API 호출
      const response = await createFreeboardComment(params.id, {
        commentContent: newComment,
        commentPassword: commentPassword,
        commentWriter: commentWriter
      });
      
      if (response && response.data) {
        // 댓글 작성 성공 후 댓글 목록 새로고침
        try {
          const commentsResponse = await fetchFreeboardDetail(params.id);
          if (commentsResponse && commentsResponse.data && commentsResponse.data.comments) {
            setComments(commentsResponse.data.comments);
          }
        } catch (refreshError) {
          console.error('댓글 목록 새로고침 오류:', refreshError);
          // 새로고침 실패 시 로컬에 추가
          const newCommentData: Comment = {
            commentIdx: Date.now(), // 임시 ID
            boardIdx: parseInt(params.id),
            commentLike: 0,
            commentDepth: 0,
            writerId: commentWriter,
            commentPerent: 0,
            commentContent: newComment,
            commentRegDate: new Date().toISOString()
          };
          setComments(prev => [...prev, newCommentData]);
        }
        
        setNewComment('');
        setCommentWriter('');
        setCommentPassword('');
        alert('댓글이 성공적으로 작성되었습니다!');
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 좋아요 처리
  const handleLike = async () => {
    if (!post || isLiking) return;

    try {
      setIsLiking(true);
      // 현재 상태의 반대를 서버에 전달 (토글)
      await likeFreeboardPost(params.id, !isLiked);
      
      // 로컬 상태 업데이트
      if (post) {
        // 문자열 연결 버그 방지: 숫자로 확실하게 변환
        const currentLikes = Number(post.boardLike) || 0;
        const newLikeCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
        setPost({
          ...post,
          boardLike: newLikeCount
        });
        setIsLiked(!isLiked);
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLiking(false);
    }
  };

  // 댓글 좋아요 처리 (토글)
  const handleCommentLike = async (commentIdx: number) => {
    try {
      const comment = comments.find(c => c.commentIdx === commentIdx);
      if (!comment) {
        alert('댓글을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
        return;
      }

      const isCurrentlyLiked = commentLikes.has(commentIdx);
      
      // API 호출 (좋아요/취소)
      await likeFreeboardComment(commentIdx);
      
      // 좋아요 성공 후 댓글 목록 새로고침
      try {
        const commentsResponse = await fetchFreeboardDetail(params.id);
        if (commentsResponse && commentsResponse.data && commentsResponse.data.comments) {
          setComments(commentsResponse.data.comments);
        }
      } catch (refreshError) {
        console.error('댓글 목록 새로고침 오류:', refreshError);
        // 새로고침 실패 시 로컬 상태만 업데이트
        setCommentLikes(prev => {
          const newSet = new Set(prev);
          if (isCurrentlyLiked) {
            newSet.delete(commentIdx);
          } else {
            newSet.add(commentIdx);
          }
          return newSet;
        });
        
        setComments(prev => prev.map(comment => 
          comment.commentIdx === commentIdx 
            ? { 
                ...comment, 
                commentLike: isCurrentlyLiked 
                  ? Math.max(0, (comment.commentLike || 0) - 1)
                  : (comment.commentLike || 0) + 1 
              }
            : comment
        ));
      }
    } catch (error) {
      console.error('댓글 좋아요 처리 오류:', error);
      alert('댓글 좋아요 처리 중 오류가 발생했습니다.');
    }
  };

  // 댓글 수정 시작
  const handleEditComment = (commentIdx: number) => {
    const comment = comments.find(c => c.commentIdx === commentIdx);
    if (comment) {
      setEditingComment(commentIdx);
      setEditCommentContent(comment.commentContent);
      setEditCommentPassword('');
    }
  };

  // 댓글 수정 취소
  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditCommentContent('');
    setEditCommentPassword('');
  };

  // 댓글 수정 저장
  const handleSaveEdit = async (commentIdx: number) => {
    if (!editCommentContent.trim() || !editCommentPassword.trim()) {
      alert('댓글 내용과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      const comment = comments.find(c => c.commentIdx === commentIdx);
      if (!comment) {
        alert('댓글을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
        return;
      }

      await updateFreeboardComment(commentIdx, {
        commentContent: editCommentContent,
        writerId: comment.writerId,
        writerPw: editCommentPassword
      });

      // 수정 성공 후 댓글 목록 새로고침
      try {
        const commentsResponse = await fetchFreeboardDetail(params.id);
        if (commentsResponse && commentsResponse.data && commentsResponse.data.comments) {
          setComments(commentsResponse.data.comments);
        }
      } catch (refreshError) {
        console.error('댓글 목록 새로고침 오류:', refreshError);
        // 새로고침 실패 시 로컬 상태만 업데이트
        setComments(prev => prev.map(comment => 
          comment.commentIdx === commentIdx 
            ? { ...comment, commentContent: editCommentContent }
            : comment
        ));
      }

      setEditingComment(null);
      setEditCommentContent('');
      setEditCommentPassword('');
      alert('댓글이 수정되었습니다.');
    } catch (error) {
      console.error('댓글 수정 오류:', error);
      alert('댓글 수정 중 오류가 발생했습니다. 비밀번호를 확인해주세요.');
    }
  };

  // 댓글 삭제 모달 열기
  const handleDeleteComment = (commentIdx: number) => {
    setShowDeleteModal(commentIdx);
    setDeletePassword('');
  };

  // 댓글 삭제 확인
  const handleConfirmDelete = async (commentIdx: number) => {
    if (!deletePassword.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const comment = comments.find(c => c.commentIdx === commentIdx);
      if (!comment) {
        alert('댓글을 찾을 수 없습니다. 페이지를 새로고침해주세요.');
        return;
      }

      await deleteFreeboardComment(commentIdx, {
        writerId: comment.writerId,
        writerPw: deletePassword
      });
      
      // 삭제 성공 후 댓글 목록 새로고침
      try {
        const commentsResponse = await fetchFreeboardDetail(params.id);
        if (commentsResponse && commentsResponse.data && commentsResponse.data.comments) {
          setComments(commentsResponse.data.comments);
        }
      } catch (refreshError) {
        console.error('댓글 목록 새로고침 오류:', refreshError);
        // 새로고침 실패 시 로컬에서 제거
        setComments(prev => prev.filter(comment => comment.commentIdx !== commentIdx));
      }
      
      setShowDeleteModal(null);
      setDeletePassword('');
      alert('댓글이 삭제되었습니다.');
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      alert('댓글 삭제 중 오류가 발생했습니다. 비밀번호를 확인해주세요.');
    }
  };

  // 댓글 삭제 취소
  const handleCancelDelete = () => {
    setShowDeleteModal(null);
    setDeletePassword('');
  };

  // 햄버거 메뉴 토글
  const toggleCommentMenu = (commentIdx: number) => {
    setOpenMenuComment(openMenuComment === commentIdx ? null : commentIdx);
  };

  // 메뉴 외부 클릭 시 닫기
  const handleMenuClose = () => {
    setOpenMenuComment(null);
  };

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.comment-menu')) {
        setOpenMenuComment(null);
      }
      if (!target.closest('.board-menu')) {
        setOpenBoardMenu(false);
      }
    };

    if (openMenuComment || openBoardMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuComment, openBoardMenu]);

  // 답글 처리
  const handleReply = (parentCommentIdx: number) => {
    // 답글 작성 모드로 전환 (간단한 구현)
    const parentComment = comments.find(c => c.commentIdx === parentCommentIdx);
    if (parentComment) {
      setNewComment(`@${parentComment.writerId} `);
      // 댓글 입력창으로 스크롤
      const commentForm = document.querySelector('textarea');
      if (commentForm) {
        commentForm.focus();
        commentForm.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // 게시글 햄버거 메뉴 토글
  const toggleBoardMenu = () => {
    setOpenBoardMenu(!openBoardMenu);
  };

  // 게시글 수정 모달 열기
  const handleBoardEdit = () => {
    if (!post) return;
    
    setEditBoardTitle(post.boardTitle);
    setEditBoardContent(post.boardContent);
    setEditBoardCategory(post.category);
    setEditBoardTags(post.tags || []);
    setEditBoardPassword('');
    setEditBoardId(post.boardID); // 조회된 작성자 ID 사용
    setShowBoardEditModal(true);
    setOpenBoardMenu(false);
  };

  // 게시글 수정 저장
  const handleSaveBoardEdit = async () => {
    if (!editBoardTitle.trim() || !editBoardContent.trim() || !editBoardCategory.trim() || !editBoardPassword.trim()) {
      alert('제목, 내용, 카테고리, 비밀번호를 입력해주세요.');
      return;
    }

    try {
      await updateFreeboardPost(params.id, {
        boardTitle: editBoardTitle,
        boardContent: editBoardContent,
        category: editBoardCategory,
        tags: editBoardTags,
        boardID: editBoardId,
        boardPW: editBoardPassword
      });

      // 수정 성공 후 게시글 새로고침
      const postResponse = await fetchFreeboardDetail(params.id);
      if (postResponse && postResponse.data && postResponse.data.post) {
        setPost(postResponse.data.post);
      }

      setShowBoardEditModal(false);
      setEditBoardTitle('');
      setEditBoardContent('');
      setEditBoardCategory('');
      setEditBoardTags([]);
      setEditBoardPassword('');
      setEditBoardId('');
      alert('게시글이 수정되었습니다.');
    } catch (error) {
      console.error('게시글 수정 오류:', error);
      alert('게시글 수정 중 오류가 발생했습니다. 작성자 ID와 비밀번호를 확인해주세요.');
    }
  };

  // 태그 추가
  const handleAddTag = () => {
    if (newTag.trim() && !editBoardTags.includes(newTag.trim())) {
      setEditBoardTags(prev => [...prev, newTag.trim()]);
      setNewTag('');
    }
  };

  // 태그 삭제
  const handleRemoveTag = (tagToRemove: string) => {
    setEditBoardTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  // 게시글 수정 취소
  const handleCancelBoardEdit = () => {
    setShowBoardEditModal(false);
    setEditBoardTitle('');
    setEditBoardContent('');
    setEditBoardCategory('');
    setEditBoardTags([]);
    setEditBoardPassword('');
    setEditBoardId('');
    setNewTag('');
  };

  // 게시글 삭제 모달 열기
  const handleBoardDelete = () => {
    if (!post) return;
    setShowBoardDeleteModal(true);
    setBoardDeletePassword('');
    setBoardDeleteId(post.boardID); // 조회된 작성자 ID 사용
    setOpenBoardMenu(false);
  };

  // 게시글 삭제 확인
  const handleConfirmBoardDelete = async () => {
    if (!boardDeletePassword.trim()) {
      alert('비밀번호를 입력해주세요.');
      return;
    }

    try {
      await deleteFreeboardPost(params.id, {
        boardID: boardDeleteId,
        boardPW: boardDeletePassword
      });
      
      alert('게시글이 삭제되었습니다.');
      router.push('/freeboard');
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      alert('게시글 삭제 중 오류가 발생했습니다. 작성자 ID와 비밀번호를 확인해주세요.');
    }
  };

  // 게시글 삭제 취소
  const handleCancelBoardDelete = () => {
    setShowBoardDeleteModal(false);
    setBoardDeletePassword('');
    setBoardDeleteId('');
  };

  // 뒤로가기 처리
  const handleBackClick = () => {
    router.push('/freeboard');
  };

  // 신고하기 핸들러
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!post || !reportForm.reportReason.trim() || !reportForm.reporterId.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }
    
    setIsReportLoading(true);
    try {
      const backendURL = process.env.NEXT_PUBLIC_BASE_URL || 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(params.id),
          reportReason: reportForm.reportReason.trim(),
          reporterId: reportForm.reporterId.trim(),
          serviceType: 'freeboard' // 자유게시판 신고임을 명시
        }),
      });
      
      if (response.ok) {
        alert('신고가 접수되었습니다.');
        setShowReportModal(false);
        setReportForm({ reportReason: '', reporterId: '' });
      } else {
        const errorData = await response.json();
        alert(errorData.message || '신고 접수에 실패했습니다.');
      }
    } catch (error) {
      console.error('신고 접수 오류:', error);
      alert('신고 접수 중 오류가 발생했습니다.');
    } finally {
      setIsReportLoading(false);
    }
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
              className="group flex items-center px-2 sm:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 -ml-2"
            >
              <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 bg-gray-100 group-hover:bg-gray-200 rounded-full transition-colors duration-200">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <span className="text-sm sm:text-base font-medium">뒤로가기</span>
            </button>
            <h1 className="ml-2 sm:ml-4 text-base sm:text-xl font-semibold text-gray-900">자유게시판</h1>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* 게시글 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
          {/* 게시글 헤더 */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              {/* 상단: 작성자 정보와 메뉴 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <span className="text-xs sm:text-sm font-medium text-gray-900">{post.boardID}</span>
                  <span className="text-xs sm:text-sm text-gray-500">•</span>
                  <span className="text-xs sm:text-sm text-gray-500">{formatTimeAgo(post.boardRegDate)}</span>
                </div>
                
                {/* 신고 버튼과 햄버거 메뉴 */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors font-medium"
                  >
                    <span className="hidden sm:inline">신고하기</span>
                    <span className="sm:hidden">신고</span>
                  </button>
                  <div className="relative board-menu">
                  <button
                    onClick={toggleBoardMenu}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  
                  {/* 드롭다운 메뉴 */}
                  {openBoardMenu && (
                    <div className="absolute right-0 top-8 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <button
                        onClick={handleBoardEdit}
                        className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2 rounded-t-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>수정</span>
                      </button>
                      <button
                        onClick={handleBoardDelete}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-b-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>삭제</span>
                      </button>
                    </div>
                  )}
                  </div>
                </div>
              </div>

              {/* 카테고리 */}
              <div>
                <span className="inline-block text-xs sm:text-sm text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full font-medium">
                  {post.category}
                </span>
              </div>

              {/* 제목 */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">{post.boardTitle}</h1>

              {/* 태그 */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {post.tags.map((tag, index) => (
                    <span key={index} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 조회수와 좋아요 */}
              <div className="flex items-center space-x-4 text-xs sm:text-sm text-gray-500 pt-2 border-t border-gray-100">
                <button
                  onClick={handleLike}
                  disabled={isLiking}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all ${
                    isLiked 
                      ? 'bg-red-50 text-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                  } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="좋아요"
                >
                  <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isLiked ? 0 : 2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="font-medium">{post.boardLike}</span>
                </button>
                <div className="flex items-center space-x-1.5">
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
          <div className="p-4 sm:p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-sm sm:text-base text-gray-900 leading-relaxed break-words">
                {post.boardContent}
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">댓글 {comments.length}개</h2>
          </div>

          {/* 댓글 목록 */}
          <div className="p-4 sm:p-6">
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
                {comments
                  .sort((a, b) => new Date(a.commentRegDate || 0).getTime() - new Date(b.commentRegDate || 0).getTime())
                  .map((comment) => (
                  <div key={comment.commentIdx} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate">{comment.writerId}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">•</span>
                            <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">{formatTimeAgo(comment.commentRegDate || new Date().toISOString())}</span>
                          </div>
                          {/* 햄버거 메뉴 */}
                          <div className="relative comment-menu flex-shrink-0">
                            <button
                              onClick={() => toggleCommentMenu(comment.commentIdx)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            
                            {/* 드롭다운 메뉴 */}
                            {openMenuComment === comment.commentIdx && (
                              <div className="absolute right-0 top-8 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                <button
                                  onClick={() => {
                                    handleEditComment(comment.commentIdx);
                                    setOpenMenuComment(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span>수정</span>
                                </button>
                                <button
                                  onClick={() => {
                                    handleDeleteComment(comment.commentIdx);
                                    setOpenMenuComment(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>삭제</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {editingComment === comment.commentIdx ? (
                          // 수정 모드
                          <div className="space-y-3">
                            <textarea
                              value={editCommentContent}
                              onChange={(e) => {
                                if (e.target.value.length <= 500) {
                                  setEditCommentContent(e.target.value);
                                }
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                              rows={3}
                              maxLength={500}
                            />
                            <div className="text-right text-xs text-gray-500 mt-1">
                              {editCommentContent.length}/500
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="password"
                                value={editCommentPassword}
                                onChange={(e) => setEditCommentPassword(e.target.value)}
                                placeholder="비밀번호"
                                className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                              />
                              <button
                                onClick={() => handleSaveEdit(comment.commentIdx)}
                                className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              >
                                저장
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          // 일반 모드
                          <>
                            <CommentContentDisplay content={comment.commentContent} />
                            <div className="flex items-center space-x-4 mt-2">
                              <button 
                                onClick={() => handleCommentLike(comment.commentIdx)}
                                className={`text-xs flex items-center space-x-1 transition-colors ${
                                  commentLikes.has(comment.commentIdx) 
                                    ? 'text-red-600 hover:text-red-700' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <svg 
                                  className="w-3 h-3" 
                                  fill={commentLikes.has(comment.commentIdx) ? 'currentColor' : 'none'} 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                </svg>
                                <span>{comment.commentLike || 0}</span>
                              </button>
                              <button 
                                onClick={() => handleReply(comment.commentIdx)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                답글
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 댓글 작성 폼 */}
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>ㅁㅁ
                </div>
                댓글 작성
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">의견을 공유해주세요</p>
            </div>
            
            <form onSubmit={handleSubmitComment} className="space-y-4 sm:space-y-6">
              {/* 댓글 내용 */}
              <div className="relative">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  댓글 내용 *
                </label>
                <div className="relative">
                  <textarea
                    value={newComment}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setNewComment(e.target.value);
                      }
                    }}
                    placeholder="댓글을 작성해주세요... (최대 500자)"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 shadow-sm hover:shadow-md"
                    rows={4}
                    maxLength={500}
                    disabled={isSubmittingComment}
                  />
                  <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-xs text-gray-400">
                    {newComment.length}/500
                  </div>
                </div>
              </div>

              {/* 작성자 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    작성자명 *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={commentWriter}
                      onChange={(e) => setCommentWriter(e.target.value)}
                      placeholder="닉네임을 입력해주세요"
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      maxLength={20}
                      disabled={isSubmittingComment}
                    />
                  </div>
                  <p className="text-xs text-gray-500 flex items-center">
                    <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    댓글에 표시될 이름입니다
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700">
                    비밀번호 *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={commentPassword}
                      onChange={(e) => setCommentPassword(e.target.value)}
                      placeholder="4~20자 비밀번호"
                      className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md"
                      minLength={4}
                      maxLength={20}
                      disabled={isSubmittingComment}
                    />
                  </div>
                  <p className="text-xs text-gray-500 flex items-center">
                    <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    댓글 수정/삭제 시 필요합니다
                  </p>
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end pt-2 sm:pt-4">
                <button
                  type="submit"
                  disabled={!newComment.trim() || !commentWriter.trim() || !commentPassword.trim() || isSubmittingComment}
                  className="group relative px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                >
                  <div className="flex items-center space-x-2">
                    {isSubmittingComment ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>작성 중...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>댓글 작성</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>
          </div>

        </div>
      </main>

      {/* 댓글 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">댓글 삭제</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              댓글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="space-y-3">
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={() => handleConfirmDelete(showDeleteModal)}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  삭제
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 수정 모달 */}
      {showBoardEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">게시글 수정</h3>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* 제목 */}
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">제목</label>
                <input
                  type="text"
                  value={editBoardTitle}
                  onChange={(e) => setEditBoardTitle(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="제목을 입력하세요"
                />
              </div>
              
              {/* 카테고리 */}
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">카테고리</label>
                <input
                  type="text"
                  value={editBoardCategory}
                  onChange={(e) => setEditBoardCategory(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="카테고리를 입력하세요 (예: 일반, 질문, 정보, 후기)"
                />
              </div>
              
              {/* 태그 */}
              <div className="space-y-2 sm:space-y-3">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">태그</label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  {editBoardTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-indigo-100 text-indigo-800"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1.5 sm:ml-2 text-indigo-600 hover:text-indigo-800"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="태그를 입력하고 Enter를 누르세요"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium whitespace-nowrap"
                  >
                    추가
                  </button>
                </div>
              </div>
              
              {/* 내용 */}
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">내용</label>
                <textarea
                  value={editBoardContent}
                  onChange={(e) => setEditBoardContent(e.target.value)}
                  rows={8}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="내용을 입력하세요"
                />
              </div>
              
              {/* 비밀번호 */}
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700">비밀번호</label>
                <input
                  type="password"
                  value={editBoardPassword}
                  onChange={(e) => setEditBoardPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              
              {/* 버튼 */}
              <div className="flex space-x-2 sm:space-x-3 pt-2 sm:pt-4">
                <button
                  onClick={handleSaveBoardEdit}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  수정 완료
                </button>
                <button
                  onClick={handleCancelBoardEdit}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-500 text-white font-semibold rounded-xl hover:bg-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 삭제 확인 모달 */}
      {showBoardDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">게시글 삭제</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="space-y-3">
              <input
                type="password"
                value={boardDeletePassword}
                onChange={(e) => setBoardDeletePassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
              <div className="flex space-x-2 sm:space-x-3">
                <button
                  onClick={handleConfirmBoardDelete}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  삭제
                </button>
                <button
                  onClick={handleCancelBoardDelete}
                  className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  취소
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
                  value={params.id}
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
    </div>
  );
}
