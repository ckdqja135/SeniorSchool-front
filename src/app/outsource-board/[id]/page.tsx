'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getOutsourceBoardDetail } from '@/lib/outsource/outsourceAPI';
import { OutsourceBoard } from '@/types/Outsource';

interface Comment {
  commentIdx: number;
  boardIdx: number;
  commentLike: number;
  commentDepth: number;
  writerId: string;
  commentPerent?: number;
  commentParent?: number;
  commentContent: string;
  regDate?: string;
  modDate?: string;
  replies?: Comment[];
  originalIndex?: number;
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
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {normalizedLevel > 0 && <span className="text-yellow-600 text-sm flex-shrink-0">↳</span>}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-gray-900 truncate">{comment.writerId}</span>
            {comment.regDate && (
              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                {new Date(comment.regDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })} {new Date(comment.regDate).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            )}
          </div>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setActiveCommentMenu(activeCommentMenu === comment.commentIdx ? null : comment.commentIdx)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          
          {activeCommentMenu === comment.commentIdx && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[80px]">
              <button
                onClick={() => {
                  setEditCommentForm({
                    commentIdx: comment.commentIdx,
                    content: comment.commentContent,
                    writerId: comment.writerId
                  });
                  setShowEditCommentModal(true);
                  setActiveCommentMenu(null);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
              >
                수정
              </button>
              <button
                onClick={() => {
                  setDeleteCommentData({
                    commentIdx: comment.commentIdx,
                    writerId: comment.writerId
                  });
                  setShowDeleteCommentModal(true);
                  setActiveCommentMenu(null);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 whitespace-nowrap"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-gray-800 mb-3 whitespace-pre-wrap break-words">
        {comment.commentContent}
      </div>
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowReplyInput(showReplyInput === comment.commentIdx ? null : comment.commentIdx)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-yellow-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          답글
        </button>
      </div>

      {showReplyInput === comment.commentIdx && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-yellow-200">
          <div className="space-y-3">
            <textarea
              value={replyForm.content}
              onChange={(e) => {
                if (e.target.value.length <= 200) {
                  setReplyForm({...replyForm, content: e.target.value});
                }
              }}
              placeholder="답글을 입력하세요... (최대 200자)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              rows={3}
              maxLength={200}
            />
            <div className="text-right text-xs text-gray-500">
              {replyForm.content.length}/200
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={replyForm.writerId}
                onChange={(e) => setReplyForm({...replyForm, writerId: e.target.value})}
                placeholder="아이디"
                className="flex-1 p-2 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
              />
              <input
                type="password"
                value={replyForm.password}
                onChange={(e) => setReplyForm({...replyForm, password: e.target.value})}
                placeholder="비밀번호"
                className="flex-1 p-2 border border-gray-300 rounded focus:ring-yellow-500 focus:border-yellow-500"
              />
              <button
                onClick={() => handleReplySubmit(comment.commentIdx)}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors whitespace-nowrap"
              >
                작성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function OutsourceBoardDetailPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;

  const [board, setBoard] = useState<OutsourceBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outsourceInfo, setOutsourceInfo] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentForm, setCommentForm] = useState({
    content: '',
    writerId: '',
    password: ''
  });
  const [replyForm, setReplyForm] = useState({
    content: '',
    writerId: '',
    password: '',
    parentCommentIdx: 0
  });
  const [showReplyInput, setShowReplyInput] = useState<number | null>(null);
  const [activeCommentMenu, setActiveCommentMenu] = useState<number | null>(null);
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);
  const [editCommentForm, setEditCommentForm] = useState({
    commentIdx: 0,
    content: '',
    writerId: '',
    password: ''
  });
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [deleteCommentData, setDeleteCommentData] = useState({
    commentIdx: 0,
    writerId: '',
    password: ''
  });
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content: ''
  });
  const [isLiked, setIsLiked] = useState(false);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  
  // 신고 관련 상태
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    reportReason: '',
    reporterId: ''
  });
  const [isReportLoading, setIsReportLoading] = useState(false);

  // 시간 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 댓글 구조화 함수
  const organizeComments = (comments: Comment[]) => {
  
    const commentMap = new Map();
    const rootComments: Comment[] = [];
    const orphanComments: { orphan: Comment; deletedParentId: number; originalIndex: number }[] = [];
    
    // 원본 배열의 인덱스를 저장하기 위한 맵
    const originalIndexMap = new Map<number, number>();
    comments.forEach((comment, index) => {
      originalIndexMap.set(comment.commentIdx, index);
    });

    // 1단계: 모든 댓글을 맵에 저장 (원본 인덱스 포함)
    comments.forEach((comment, index) => {
      commentMap.set(comment.commentIdx, { 
        ...comment, 
        replies: [],
        originalIndex: index 
      });
    });

    // 2단계: 댓글 구조 생성 (원본 순서대로 처리)
    comments.forEach((comment, index) => {
      // commentParent가 0이거나 commentPerent가 0인 경우, 또는 둘 다 없는 경우 루트 댓글로 처리
      if ((comment.commentParent === 0) || 
          (comment.commentPerent === 0) || 
          (!comment.commentParent && !comment.commentPerent)) {
        console.log('루트 댓글 추가:', comment.commentIdx);
        rootComments.push(commentMap.get(comment.commentIdx));
      } else {
        const parentId = comment.commentParent || comment.commentPerent;
        const parent = commentMap.get(parentId);
        if (parent) {
          console.log('답글 추가:', comment.commentIdx, '부모:', parentId);
          parent.replies.push(commentMap.get(comment.commentIdx));
        } else {
          // 부모를 찾을 수 없는 경우 일단 보류
          console.log('부모를 찾을 수 없는 댓글:', comment.commentIdx, '부모 ID:', parentId);
          if (parentId) {
            orphanComments.push({ orphan: comment, deletedParentId: parentId, originalIndex: index });
          }
        }
      }
    });
    
    // 댓글들을 원본 순서대로 정렬
    rootComments.sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0));
    
    // 각 댓글의 replies도 원본 순서대로 정렬
    const sortReplies = (comment: Comment) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0));
        comment.replies.forEach(sortReplies);
      }
    };
    rootComments.forEach(sortReplies);

    // 3단계: 고아 댓글 처리
    // 문제: 삭제된 부모의 부모를 알 수 없으므로, 휴리스틱 방법 사용
    
    // 먼저 삭제된 부모 ID별로 그룹화 (원본 순서 정보 포함)
    const orphansByParent = new Map<number, { orphan: Comment; originalIndex: number }[]>();
    orphanComments.forEach(({ orphan, deletedParentId, originalIndex }) => {
      if (!orphansByParent.has(deletedParentId)) {
        orphansByParent.set(deletedParentId, []);
      }
      orphansByParent.get(deletedParentId)!.push({ orphan, originalIndex });
    });
    
    // 각 그룹 내에서 원본 순서대로 정렬
    orphansByParent.forEach((orphanGroup) => {
      orphanGroup.sort((a, b) => a.originalIndex - b.originalIndex);
    });

    console.log('삭제된 부모별 고아 그룹:', Array.from(orphansByParent.entries()).map(([k, v]) => [k, v.map(c => c.orphan.commentIdx)]));

    // 각 그룹별로 처리
    orphansByParent.forEach((orphanGroup, deletedParentId) => {
      console.log(`고아 그룹 처리 시작 - 삭제된 부모 ID: ${deletedParentId}, 고아 수: ${orphanGroup.length}`);
      
      let groupAttached = false;
      let targetComment: Comment | null = null;

      // 방법 1: 이 삭제된 부모를 부모로 가진 댓글이 이미 배치되어 있는지 찾기
      const findLocationByDeletedParentId = (commentsList: Comment[], parent: Comment | null = null): boolean => {
        for (const comment of commentsList) {
          // 현재 댓글이 삭제된 부모를 가리키고 있는지 확인
          const commentParentId = comment.commentParent || comment.commentPerent;
          if (commentParentId === deletedParentId) {
            // 이 댓글과 같은 레벨에 배치해야 함
            targetComment = parent; // parent가 할아버지
            console.log(`  → 형제 발견: commentIdx ${comment.commentIdx}, 할아버지: ${parent?.commentIdx || 'ROOT'}`);
            return true;
          }

          // 재귀적으로 replies 탐색
          if (comment.replies && comment.replies.length > 0) {
            if (findLocationByDeletedParentId(comment.replies, comment)) {
              return true;
            }
          }
        }
        return false;
      };

      groupAttached = findLocationByDeletedParentId(rootComments, null);

      // 고아들을 적절한 위치에 배치 (원본 순서대로)
      orphanGroup.forEach(({ orphan, originalIndex }) => {
        const orphanNode = commentMap.get(orphan.commentIdx);
        
        if (groupAttached && targetComment) {
          // 할아버지를 찾았으므로 그 아래에 추가
          console.log(`  → commentIdx ${orphan.commentIdx}를 할아버지 ${targetComment.commentIdx}의 replies에 추가`);
          if (!targetComment.replies) {
            targetComment.replies = [];
          }
          targetComment.replies.push(orphanNode);
        } else if (groupAttached && targetComment === null) {
          // 할아버지가 ROOT인 경우
          console.log(`  → commentIdx ${orphan.commentIdx}를 ROOT에 추가`);
          rootComments.push(orphanNode);
        } else {
          // 방법 2: 삭제된 부모가 루트 댓글이었다고 가정
          // (즉, 고아는 원래 대댓글이었고, 이제 루트가 되어야 함)
          console.log(`  → commentIdx ${orphan.commentIdx}를 ROOT로 처리 (형제를 찾지 못함)`);
          rootComments.push(orphanNode);
        }
      });
    });

    // 고아 댓글 추가 후 다시 정렬
    rootComments.sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0));
    rootComments.forEach(sortReplies);
    
    return rootComments;
  };

  // 구조화된 댓글들
  const organizedComments = useMemo(() => {
    return organizeComments(comments);
  }, [comments]);

  // 댓글 렌더링 함수
  const renderComments = (comments: Comment[], level = 0) => {
    return comments.map(comment => (
      <div key={comment.commentIdx}>
        <CommentItem
          comment={comment}
          level={level}
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
        {comment.replies && comment.replies.length > 0 && (
          <div className={`mt-2 ${level === 0 ? 'ml-4' : 'ml-0'}`}>
            {/* 대댓글의 레벨을 1로 고정하여 대댓글-대댓글 뎁스를 동일하게 표시 */}
            {renderComments(comment.replies, 1)}
          </div>
        )}
      </div>
    ));
  };

  // 댓글 작성 핸들러
  const handleCommentSubmit = async () => {
    if (!commentForm.content.trim() || !commentForm.writerId.trim() || !commentForm.password.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('https://api.reviewhub.life/outsource/comment/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          commentContent: commentForm.content,
          writerId: commentForm.writerId,
          writerPw: commentForm.password,
          commentParent: 0,
          commentPerent: 0,
          commentDepth: 0
        }),
      });

      if (response.ok) {
        setCommentForm({ content: '', writerId: '', password: '' });
        // 댓글 목록 새로고침
        await fetchComments();
        alert('댓글이 성공적으로 작성되었습니다!');
      } else {
        alert('댓글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  // 답글 작성 핸들러
  const handleReplySubmit = async (parentCommentIdx: number) => {
    if (!replyForm.content.trim() || !replyForm.writerId.trim() || !replyForm.password.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('https://api.reviewhub.life/outsource/comment/insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: parseInt(boardId),
          commentContent: replyForm.content,
          writerId: replyForm.writerId,
          writerPw: replyForm.password,
          commentParent: parentCommentIdx,
          commentPerent: parentCommentIdx,
          commentDepth: 1
        }),
      });

      if (response.ok) {
        setReplyForm({ content: '', writerId: '', password: '', parentCommentIdx: 0 });
        setShowReplyInput(null);
        // 댓글 목록 새로고침
        await fetchComments();
        alert('답글이 성공적으로 작성되었습니다!');
      } else {
        alert('답글 작성에 실패했습니다.');
      }
    } catch (error) {
      console.error('답글 작성 오류:', error);
      alert('답글 작성 중 오류가 발생했습니다.');
    }
  };

  // 댓글 목록 조회
  const fetchComments = async () => {
    try {
      const response = await fetch(`https://api.reviewhub.life/outsource/comment?boardIdx=${boardId}`);
      if (response.ok) {
        const data = await response.json();
        
        // API 응답 구조에 따라 데이터 추출
        let commentsData: Comment[] = [];
        if (Array.isArray(data)) {
          // 응답이 직접 배열인 경우
          commentsData = data;
        } else if (data.data && Array.isArray(data.data)) {
          // 응답이 {data: [...]} 형태인 경우
          commentsData = data.data;
        }
        
        // 문자열로 온 숫자 필드를 숫자로 변환
        commentsData = commentsData.map((comment, index) => ({
          ...comment,
          commentIdx: typeof comment.commentIdx === 'string' ? parseInt(comment.commentIdx, 10) : comment.commentIdx,
          boardIdx: typeof comment.boardIdx === 'string' ? parseInt(comment.boardIdx, 10) : comment.boardIdx,
          commentLike: typeof comment.commentLike === 'string' ? parseInt(comment.commentLike, 10) : comment.commentLike,
          commentDepth: typeof comment.commentDepth === 'string' ? parseInt(comment.commentDepth, 10) : comment.commentDepth,
          commentParent: typeof comment.commentParent === 'string' ? parseInt(comment.commentParent, 10) : comment.commentParent,
          commentPerent: typeof comment.commentPerent === 'string' ? parseInt(comment.commentPerent, 10) : comment.commentPerent,
          originalIndex: index
        }));
        
        setComments(commentsData);
      }
    } catch (error) {
      console.error('댓글 조회 오류:', error);
    }
  };

  // 외주업체 정보 조회
  const fetchOutsourceInfo = async (outsourceIdx: number) => {
    try {
      const response = await fetch(`https://api.reviewhub.life/outsource?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        const outsource = data.data?.find((item: any) => item.outsourceIdx === outsourceIdx);
        if (outsource) {
          setOutsourceInfo(outsource);
        }
      }
    } catch (error) {
      console.error('외주업체 정보 조회 오류:', error);
    }
  };

  // 좋아요 토글
  const handleLike = async () => {
    // 이미 로딩 중이거나 좋아요 처리 중이면 무시
    if (isLikeLoading) {
      return;
    }

    // boardId 유효성 검사
    if (!boardId || isNaN(parseInt(boardId))) {
      console.error('유효하지 않은 boardId:', boardId);
      return;
    }

    try {
      setIsLikeLoading(true); // 로딩 시작
      
      const backendURL = 'https://api.reviewhub.life';
      const parsedBoardId = parseInt(boardId);
      const requestBody = { 
        boardIdx: parsedBoardId,
        isLiked: !isLiked // 현재 상태의 반대값을 전송 (토글)
      };
      
      const response = await fetch(`${backendURL}/outsource/boards/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('좋아요 처리 성공:', data);
        
        // 상태 업데이트
        setIsLiked(!isLiked);
        
        // 게시글의 좋아요 수 업데이트
        setBoard(prev => {
          if (!prev) return null;
          return {
            ...prev,
            boardLike: data.likeCount !== undefined ? data.likeCount : (prev.boardLike || 0) + (isLiked ? -1 : 1)
          };
        });
        
      } else {
        const errorData = await response.json();
        console.error('좋아요 처리 실패:', response.status, errorData);
        alert('좋아요 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      alert('좋아요 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLikeLoading(false); // 로딩 종료
    }
  };

  // 게시글 수정
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!board) return;
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/outsource/boards/correct`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: board.boardIdx,
          boardTitle: editForm.title,
          boardContent: editForm.content,
          writerPw: password
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

  // 게시글 삭제
  const handleDeletePost = async () => {
    if (!board) return;
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/outsource/boards/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardIdx: board.boardIdx,
          writerPw: password
        }),
      });

      if (response.ok) {
        alert('게시글이 삭제되었습니다.');
        // 외주업체 이름이 있으면 해당 상세 페이지로, 없으면 뒤로가기
        if (outsourceInfo?.outsourceName) {
          router.push(`/outsource-mentor/${encodeURIComponent(outsourceInfo.outsourceName)}`);
        } else {
          router.back();
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || '게시글 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      alert('게시글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 신고 제출 핸들러
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!board) return;
    
    try {
      setIsReportLoading(true);
      
      const backendURL = 'https://api.reviewhub.life';
      const reportData = {
        boardIdx: board.boardIdx,
        reportReason: reportForm.reportReason.trim(),
        reporterId: reportForm.reporterId.trim(),
        reportType: 'outsource' // 외주 게시판 신고임을 명시
      };

      const response = await fetch(`${backendURL}/report`, {
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
    } finally {
      setIsReportLoading(false);
    }
  };

  // 댓글 수정
  const handleEditComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const editData = {
        commentIdx: editCommentForm.commentIdx,
        commentWriter: editCommentForm.writerId.trim(),
        commentContent: editCommentForm.content.trim(),
        commentPw: editCommentForm.password.trim(),
        modDate: new Date().toISOString()
      };

      console.log('댓글 수정 요청 데이터:', editData);

      const response = await fetch(`${backendURL}/outsource/comment/modify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        setShowEditCommentModal(false);
        setEditCommentForm({ commentIdx: 0, content: '', writerId: '', password: '' });
        setActiveCommentMenu(null);
        fetchComments();
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
      const backendURL = 'https://api.reviewhub.life';
      const deleteData = {
        commentIdx: deleteCommentData.commentIdx,
        commentWriter: deleteCommentData.writerId.trim(),
        commentPw: deleteCommentData.password.trim()
      };

      console.log('댓글 삭제 요청 데이터:', deleteData);

      const response = await fetch(`${backendURL}/outsource/comment/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteData),
      });

      if (response.ok) {
        setShowDeleteCommentModal(false);
        setDeleteCommentData({ commentIdx: 0, writerId: '', password: '' });
        setActiveCommentMenu(null);
        fetchComments();
        alert('댓글이 성공적으로 삭제되었습니다!');
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      alert('댓글 삭제 중 오류가 발생했습니다.');
    }
  };

  // 댓글 햄버거 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // 댓글 햄버거 메뉴 버튼인지 확인
      const isCommentMenuButton = target.closest('button[class*="hover:bg-gray-100"][class*="p-1"]');
      // 댓글 드롭다운 메뉴인지 확인
      const isCommentDropdownMenu = target.closest('.absolute.right-0.top-8');
      
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

  useEffect(() => {
    const fetchBoardDetail = async () => {
      if (!boardId || isNaN(parseInt(boardId))) return;
      
      setLoading(true);
      setError(null);

      try {
        console.log('게시판 상세 API 호출 시작:', boardId);
        const response = await getOutsourceBoardDetail(parseInt(boardId));
        console.log('게시판 상세 API 응답:', response);
        
        // API 응답 구조에 따라 데이터 추출
        let boardData: OutsourceBoard | null = null;
        if (response.data) {
          boardData = response.data;
        } else if ((response as any).boardIdx) {
          // 응답이 직접 게시판 객체인 경우
          boardData = response as unknown as OutsourceBoard;
        }
        
        console.log('추출된 게시판 데이터:', boardData);
        setBoard(boardData);
        
        // 외주업체 정보 조회
        if (boardData?.outsourceIdx) {
          await fetchOutsourceInfo(boardData.outsourceIdx);
        }
        
        // 댓글 목록도 함께 조회
        await fetchComments();
      } catch (err) {
        console.error('게시판 상세 조회 오류:', err);
        setError(err instanceof Error ? err.message : '게시글을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchBoardDetail();
  }, [boardId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">게시글을 찾을 수 없습니다</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/outsource-mentor')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              돌아가기
            </button>
          </div>
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
            <button 
              onClick={() => router.push('/outsource-mentor')}
              className="text-2xl font-bold text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer"
            >
              외주 오빠
            </button>
            <div className="text-gray-300">
              {(board as any)?.outsource?.outsourceName 
                ? `${(board as any).outsource.outsourceName} 외주 후기` 
                : outsourceInfo?.outsourceName 
                  ? `${outsourceInfo.outsourceName} 외주 후기` 
                  : '외주 후기'}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 뒤로가기 버튼 - 상단에 배치 */}
        <div className="mb-6">
          <button
            onClick={() => {
              if (board?.outsourceIdx) {
                router.push(`/outsource-mentor/${board.outsourceIdx}`);
              } else if (board?.outsourceName) {
                router.push(`/outsource-mentor/${encodeURIComponent(board.outsourceName)}`);
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
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">작성자</span>
              <p className="text-sm font-semibold text-gray-900">
                {board.boardID || '작성자 정보 없음'}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">작성일</span>
              <p className="text-sm font-semibold text-gray-900">
                {board.boardRegDate ? new Date(board.boardRegDate).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit'
                }).replace(/\./g, '').replace(/\s+/g, '-') : '날짜 정보 없음'}
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
                onClick={handleLike} 
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
                  {board.boardLike || 0}
                </span>
              </button>
            </div>
          </div>

          {/* 게시글 내용 */}
          <div className="text-gray-800 leading-relaxed">
            {board.boardContent}
          </div>
        </div>

        {/* 댓글 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">댓글</h3>
          
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">아직 댓글이 없습니다.</p>
              <p className="text-sm mt-2">첫 번째 댓글을 작성해보세요!</p>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {renderComments(organizedComments)}
            </div>
          )}

          {/* 댓글 작성 폼 */}
          <div className="border-t border-gray-200 pt-6">
            <div className="space-y-4">
              <textarea
                value={commentForm.content}
                onChange={(e) => setCommentForm({...commentForm, content: e.target.value})}
                placeholder="댓글을 입력하세요..."
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 resize-none"
                rows={4}
                maxLength={200}
              />
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
                <div className="flex-1">
                  <input
                    type="text"
                    value={commentForm.writerId}
                    onChange={(e) => setCommentForm({...commentForm, writerId: e.target.value})}
                    placeholder="아이디"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="password"
                    value={commentForm.password}
                    onChange={(e) => setCommentForm({...commentForm, password: e.target.value})}
                    placeholder="비밀번호"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <button
                  onClick={handleCommentSubmit}
                  className="w-full sm:w-auto px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                >
                  작성
                </button>
              </div>
              <div className="text-right text-sm text-gray-500">
                {commentForm.content.length}/200
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 댓글 수정 모달 */}
      {showEditCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">댓글 수정</h3>
            <textarea
              value={editCommentForm.content}
              onChange={(e) => setEditCommentForm({...editCommentForm, content: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 resize-none"
              rows={4}
            />
            <input
              type="password"
              value={editCommentForm.password}
              onChange={(e) => setEditCommentForm({...editCommentForm, password: e.target.value})}
              placeholder="댓글 작성 시 사용한 비밀번호"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
              required
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowEditCommentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleEditComment}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 댓글 삭제 모달 */}
      {showDeleteCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">댓글 삭제</h3>
            <p className="text-gray-600 mb-6">정말로 이 댓글을 삭제하시겠습니까?</p>
            <input
              type="password"
              value={deleteCommentData.password || ''}
              onChange={(e) => setDeleteCommentData({...deleteCommentData, password: e.target.value})}
              placeholder="댓글 작성 시 사용한 비밀번호"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 mb-4"
              required
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteCommentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteComment}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 게시글 수정 모달 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500 h-40 resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="게시글 작성 시 사용한 비밀번호"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  수정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 게시글 삭제 확인 모달 */}
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="게시글 작성 시 사용한 비밀번호"
                required
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleDeletePost}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
    </div>
  );
}
