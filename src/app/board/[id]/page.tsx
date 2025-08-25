'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BoardPost {
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
  univIdx: number;
  university?: {
    univName: string;
    univLocate: string;
    univType: string;
    univCampos: string;
  };
}

interface Comment {
  commentIdx: number;
  boardIdx: number;
  commentLike: number;
  commentDepth: number;
  writerId: string;
  commentPerent: number;
  commentContent: string;
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
        <div className="flex items-center gap-2">
          {normalizedLevel > 0 && <span className="text-blue-600 text-sm">↳</span>}
          <span className="font-semibold text-gray-900">{comment.writerId}</span>
        </div>
      </div>
      <p className={`text-gray-700 leading-relaxed mb-3 ${normalizedLevel > 0 ? 'ml-6' : ''}`}>
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
                  setActiveCommentMenu(null);
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
                  setActiveCommentMenu(null);
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
        <div className={`mt-3 ${normalizedLevel > 0 ? 'ml-6' : ''} pl-4 border-l-2 border-blue-200`}>
          <form onSubmit={handleReplySubmit} className="space-y-3">
            <textarea
              value={replyForm.content}
              onChange={(e) => setReplyForm({ ...replyForm, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              rows={2}
              maxLength={100}
              placeholder="답글을 입력하세요..."
              required
            />
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replyForm.writer}
                onChange={(e) => setReplyForm({ ...replyForm, writer: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="아이디"
                maxLength={10}
                required
              />
              <input
                type="password"
                value={replyForm.password}
                onChange={(e) => setReplyForm({ ...replyForm, password: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="비밀번호"
                maxLength={8}
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                답글 작성
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReplyInput(null);
                  setReplyForm({ content: '', writer: '', password: '', parentIdx: 0 });
                }}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
              >
                취소
              </button>
            </div>
            <p className="text-xs text-gray-500 text-right">
              {replyForm.content.length}/100
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

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.id as string;
  
  const [boardPost, setBoardPost] = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    content: ''
  });
  
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
  const [isLiked, setIsLiked] = useState(false); // 좋아요 상태
  const [isLikeLoading, setIsLikeLoading] = useState(false); // 좋아요 로딩 상태
  
  // ID 기반 더보기 방식 페이징 관련 상태
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const [commentsPerLoad] = useState(2); // 한 번에 로드할 댓글 수
  const [totalComments, setTotalComments] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);

  // 햄버거 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeCommentMenu !== null) {
        setActiveCommentMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeCommentMenu]);

  const fetchBoardPost = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/board/detail?boardIdx=${boardId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('게시글 API 응답:', data); // 디버깅용 로그
      setBoardPost(data);
    } catch (error) {
      console.error('게시글 조회 오류:', error);
      setError('게시글을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/comment?boardIdx=${boardId}`);
      
      if (response.ok) {
        const data = await response.json();
        // console.log('댓글 API 응답 데이터:', data);
        
        // 데이터가 배열인지 확인하고 안전하게 설정
        if (Array.isArray(data)) {
          setComments(data);
          setTotalComments(data.length);
          
          if (data.length > 0) {
            // 초기 댓글 ID 설정 (최신순으로 2개)
            const initialIds = pickNextIdsFromList(data, new Set(), commentsPerLoad);
            console.log('초기 댓글 ID:', Array.from(initialIds));
            setVisibleIds(initialIds);
            setHasMoreComments(data.length > commentsPerLoad);
          } else {
            setVisibleIds(new Set());
            setHasMoreComments(false);
          }
        } else if (data && typeof data === 'object') {
          // 객체인 경우 배열로 변환 시도
          console.log('댓글 데이터가 배열이 아님, 객체 구조:', data);
          setComments([]);
          setVisibleIds(new Set());
          setTotalComments(0);
          setHasMoreComments(false);
        } else {
          console.log('댓글 데이터가 예상과 다른 형태:', typeof data, data);
          setComments([]);
          setVisibleIds(new Set());
          setTotalComments(0);
          setHasMoreComments(false);
        }
      } else {
        console.error('댓글 API 오류:', response.status, response.statusText);
        setComments([]);
        setVisibleIds(new Set());
        setTotalComments(0);
        setHasMoreComments(false);
      }
    } catch (error) {
      console.error('댓글 조회 오류:', error);
      setComments([]);
      setVisibleIds(new Set());
      setTotalComments(0);
      setHasMoreComments(false);
    }
  };

  // 게시글 정보 가져오기
  useEffect(() => {
    console.log('useEffect 실행 - boardId:', boardId, '타입:', typeof boardId);
    
    if (boardId) {
      fetchBoardPost();
      fetchComments();
      fetchLikeCount(); // 좋아요 수도 함께 가져오기
    } else {
      console.error('boardId가 없습니다:', boardId);
    }
  }, [boardId]);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const commentData = {
        commentWriter: commentForm.writer.trim(),
        commentPw: commentForm.password.trim(),
        commentContent: commentForm.content.trim(),
        boardIdx: parseInt(boardId),
        parentIdx: 0, // 최상위 댓글
        depth: 0, // 최상위 댓글
        commentLike: 0 // 초기 좋아요 수
      };

      const response = await fetch(`${backendURL}/comment/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (response.ok) {
        setCommentForm({ content: '', writer: '', password: '' });
        fetchComments(); // 댓글 새로고침
        alert('댓글이 성공적으로 작성되었습니다!');
      } else {
        console.error('댓글 작성 API 오류:', response.status, response.statusText);
        alert('댓글 작성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const editData = {
        boardIdx: parseInt(boardId),
        boardTitle: editForm.title.trim(),
        boardContent: editForm.content.trim(),
        boardPassword: password
      };

      const response = await fetch(`${backendURL}/board/correct`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        setShowEditModal(false);
        setShowPasswordModal(false);
        setPassword('');
        setEditForm({ title: '', content: '' });
        fetchBoardPost();
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
    } catch (error) {
      console.error('게시글 수정 오류:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const backendURL = 'https://api.reviewhub.life';
      const deleteData = {
        boardIdx: parseInt(boardId),
        boardPassword: password
      };

      const response = await fetch(`${backendURL}/board/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteData),
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setPassword('');
        router.back();
      } else {
        alert('비밀번호가 일치하지 않습니다.');
      }
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
    }
  };

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
      
      console.log('좋아요 요청 데이터:', {
        boardId,
        boardIdType: typeof boardId,
        parsedBoardId,
        parsedBoardIdType: typeof parsedBoardId,
        currentIsLiked: isLiked,
        requestBody,
        requestBodyString: JSON.stringify(requestBody)
      });
      
      const response = await fetch(`${backendURL}/board/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('좋아요 API 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        // 좋아요 상태 토글
        setIsLiked(!isLiked);
        console.log('좋아요 상태 변경:', !isLiked);
        // 백엔드에서 최신 상태를 가져와서 동기화
        await fetchLikeCount();
      } else {
        // 400 에러 시 응답 내용도 확인
        if (response.status === 400) {
          try {
            const errorData = await response.json();
            console.error('400 에러 상세:', errorData);
          } catch (e) {
            console.error('400 에러 응답 파싱 실패:', e);
          }
        }
        console.error('좋아요 API 오류:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('좋아요 오류:', error);
    } finally {
      setIsLikeLoading(false); // 로딩 완료
    }
  };

  // 좋아요 수 조회
  const fetchLikeCount = async () => {
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/board/like/${boardId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('좋아요 API 응답:', data); // 디버깅용 로그
        
        // 좋아요 수만 업데이트
        if (boardPost) {
          setBoardPost({
            ...boardPost,
            boardLike: data.likeCount || data.count || 0
          });
        }
      }
    } catch (error) {
      console.error('좋아요 수 조회 오류:', error);
    }
  };

  // 댓글 수정
  const handleEditComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const editData = {
        commentIdx: editCommentForm.commentIdx,
        commentContent: editCommentForm.content.trim(),
        commentPw: editCommentForm.password.trim()
      };

      const response = await fetch(`${backendURL}/comment/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        setShowEditCommentModal(false);
        setEditCommentForm({ commentIdx: 0, content: '', password: '' });
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
        commentPw: deleteCommentData.password.trim()
      };

      const response = await fetch(`${backendURL}/comment/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteData),
      });

      if (response.ok) {
        setShowDeleteCommentModal(false);
        setDeleteCommentData({ commentIdx: 0, password: '' });
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

  // 댓글을 계층 구조로 정리하는 함수 (commentDepth 무시, commentPerent만 사용)
  const organizeComments = (list: Comment[], allowedIds?: Set<number>) => {
    const byId = new Map<number, Comment>();
    list.forEach(c => {
      const { replies, ...rest } = c as any;
      byId.set(c.commentIdx, { ...rest, replies: [] });
    });

    const roots: Comment[] = [];
    list.forEach(c => {
      if (allowedIds && !allowedIds.has(c.commentIdx)) return;

      const node = byId.get(c.commentIdx)!;
      const pid = c.commentPerent;
      if (pid && allowedIds?.has(pid)) {
        const parent = byId.get(pid);
        parent?.replies?.push(node);   // ✅ 항상 맵의 노드만 사용
      } else {
        roots.push(node);
      }
    });

    // 정렬(선택)
    const sortTree = (arr: Comment[]) => {
      arr.sort((a, b) => a.commentIdx - b.commentIdx);
      arr.forEach(n => n.replies && sortTree(n.replies));
    };
    sortTree(roots);

    return roots;
  };

  // ID 기반 "더보기" (중복 없이 최신순 N개 추가)
  const pickNextIds = (currentIds: Set<number>, addCount: number) => {
    const sorted = [...comments].sort((a, b) => b.commentIdx - a.commentIdx); // 최신순
    const next = new Set(currentIds);
    console.log('pickNextIds 호출:', { currentIds: Array.from(currentIds), addCount, sorted: sorted.map(c => c.commentIdx) });
    
    for (const c of sorted) {
      if (next.size - currentIds.size >= addCount) break;
      if (!next.has(c.commentIdx)) {
        next.add(c.commentIdx);
        console.log('댓글 추가:', c.commentIdx);
      }
    }
    
    console.log('결과:', Array.from(next));
    return next;
  };

  // 보조 유틸: 리스트에서 직접 ID 선택
  const pickNextIdsFromList = (list: Comment[], currentIds: Set<number>, addCount: number) => {
    const sorted = [...list].sort((a, b) => a.commentIdx - b.commentIdx); // commentIdx 순서대로 정렬
    const next = new Set(currentIds);
    for (const c of sorted) {
      if (next.size - currentIds.size >= addCount) break;
      if (!next.has(c.commentIdx)) next.add(c.commentIdx);
    }
    return next;
  };

  // 더보기 방식 페이징 함수
  const loadMoreComments = () => {
    const next = pickNextIdsFromList(comments, visibleIds, commentsPerLoad);
    setVisibleIds(next);
    setHasMoreComments(next.size < comments.length);
  };

  // 실제 표시되는 댓글 수 계산 (댓글 + 대댓글 포함)
  const getVisibleCommentCount = () => {
    const treeForCount = organizeComments(comments, visibleIds);
    let count = 0;
    const walk = (arr: Comment[]) => {
      arr.forEach(n => { count++; if (n.replies?.length) walk(n.replies); });
    };
    walk(treeForCount);
    return count;
  };

  // 대댓글 작성
  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const replyData = {
        commentWriter: replyForm.writer.trim(),
        commentPw: replyForm.password.trim(),
        commentContent: replyForm.content.trim(),
        boardIdx: parseInt(boardId),
        parentIdx: replyForm.parentIdx,
        depth: 1, // 대댓글
        commentLike: 0
      };

      const response = await fetch(`${backendURL}/comment/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyData),
      });

          if (response.ok) {
          setShowReplyInput(null);
          setReplyForm({ content: '', writer: '', password: '', parentIdx: 0 });
          fetchComments(); // 댓글 새로고침
          alert('대댓글이 성공적으로 작성되었습니다!');
        } else {
        console.error('대댓글 작성 API 오류:', response.status, response.statusText);
        alert('대댓글 작성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('대댓글 작성 오류:', error);
      alert('대댓글 작성 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !boardPost) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
                         <Link href="/univ-mentor" className="text-2xl font-bold text-green-400">
               대학 오빠
             </Link>
            <div className="text-gray-300">
              {boardPost.university?.univName ? `${boardPost.university.univName} 입학 후기` : '입학 후기'}
            </div>
          </div>
        </div>
      </nav>

             <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
         {/* 뒤로가기 버튼 - 상단에 배치 */}
                   <div className="mb-6">
            <button 
              onClick={() => {
                // 대학교 이름이 있으면 검색 페이지로, 없으면 뒤로가기
                if (boardPost.university?.univName) {
                  router.push(`/search?name=${encodeURIComponent(boardPost.university.univName)}`);
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
            <h1 className="text-3xl font-bold text-gray-900">{boardPost.boardTitle}</h1>
            
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
            </div>
        </div>

          {/* 게시글 메타 정보 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <span className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1 block">작성자</span>
                             <p className="text-sm font-semibold text-gray-900">
                 {(() => {
                   const author = boardPost.boardID || boardPost.boardId || boardPost.writer || boardPost.writerId;
                   return author || '작성자 정보 없음';
                 })()}
               </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-100">
              <span className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1 block">작성일</span>
              <p className="text-sm font-semibold text-gray-900">
                {boardPost.boardRegDate || boardPost.regDate || '날짜 정보 없음'}
              </p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
              <span className="text-xs text-purple-700 font-bold uppercase tracking-wider mb-1 block">조회수</span>
              <p className="text-sm font-semibold text-gray-900">
                {boardPost.boardHits || boardPost.hits || 0}
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
                  {isLikeLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    boardPost.boardLike || boardPost.like || 0
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">댓글</h2>

        {/* 더보기 버튼 (맨 위) */}
        {hasMoreComments && (
          <div className="flex justify-center mb-6">
            <button
              onClick={loadMoreComments}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              댓글 {totalComments - getVisibleCommentCount()}개 더보기
            </button>
          </div>
        )}
        


        {/* 댓글 목록 */}
        <div className="space-y-4 mb-8">
          {(() => {
            const tree = organizeComments(comments, visibleIds);
            return tree.length > 0 ? (
              tree.map((comment) => (
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                아직 댓글이 없습니다.
                <br />
                첫 번째 댓글을 작성해보세요!
              </div>
            );
          })()}
        </div>



            {/* 댓글 개수 표시 */}
            {totalComments > 0 && (
              <div className="text-center text-sm text-gray-500 mt-4">
                총 {totalComments}개의 댓글
              </div>
            )}

                                {/* 댓글 작성 폼 - 컴팩트한 인라인 스타일 */}
           <div className="border-t border-gray-200 pt-4">
             <form onSubmit={handleCommentSubmit} className="flex items-center gap-3">
               <textarea 
                 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                 rows={2}
                 maxLength={100}
                 placeholder="댓글을 입력하세요..."
                 value={commentForm.content}
                 onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                 required
               />
               
                    <input 
                      type="text" 
                 className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                 placeholder="아이디"
                      maxLength={10}
                      value={commentForm.writer}
                      onChange={(e) => setCommentForm({ ...commentForm, writer: e.target.value })}
                      required
                    />
               
                    <input 
                      type="password" 
                 className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                 placeholder="비밀번호"
                      maxLength={8}
                      value={commentForm.password}
                      onChange={(e) => setCommentForm({ ...commentForm, password: e.target.value })}
                      required
                    />
               
                               <button 
                  type="submit" 
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-md transform hover:scale-105"
                >
                  작성
                      </button>
                </form>
             <p className="text-xs text-gray-500 mt-1 text-right">
               {commentForm.content.length}/100
             </p>
            </div>
          </div>

        
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="text-red-600 text-6xl mb-4">🗑️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-4">삭제 확인</h3>
              <p className="text-gray-600 mb-6">이 게시물을 정말로 삭제하시겠습니까?</p>
              <div className="flex space-x-3 justify-center">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={handleDelete}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 입력 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-4">비밀번호 입력</h3>
              <p className="text-gray-600 mb-4">게시글을 수정하려면 비밀번호를 입력하세요.</p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              <div className="flex space-x-3 justify-center">
                <button 
                  onClick={() => setShowPasswordModal(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  취소
                </button>
                <button 
                  onClick={() => {
                  setShowPasswordModal(false);
                    setEditForm({ title: boardPost.boardTitle, content: boardPost.boardContent });
                  setShowEditModal(true);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  확인
                </button>
              </div>
            </div>
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
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   rows={6}
                      maxLength={700}
                      required
                    />
                 <p className="text-xs text-gray-500 mt-1">
                   {editForm.content.length}/700
                 </p>
               </div>
               <div className="flex space-x-3 justify-center pt-4">
                 <button 
                   type="button"
                   onClick={() => setShowEditModal(false)}
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
                   onChange={(e) => setEditCommentForm({ ...editCommentForm, content: e.target.value })}
                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   rows={4}
                   maxLength={100}
                   required
                 />
                 <p className="text-xs text-gray-500 mt-1">
                   {editCommentForm.content.length}/100
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
                   onClick={() => setShowEditCommentModal(false)}
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
                   onClick={() => setShowDeleteCommentModal(false)}
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
     </div>
  );
}
