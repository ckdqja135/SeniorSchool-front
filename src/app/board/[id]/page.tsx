'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BoardPost {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  boardID: string;
  boardRegDate: string;
  boardHits: number;
  boardLike: number;
  univIdx: number;
}

interface Comment {
  replyIdx: number;
  replyContent: string;
  replyWriter: string;
  replyRegDate: string;
  replyType: string;
  replyId: number;
}

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

  // 게시글 정보 가져오기
  useEffect(() => {
    if (boardId) {
      fetchBoardPost();
      fetchComments();
    }
  }, [boardId]);

  const fetchBoardPost = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      // 기존 EJS 페이지에서 사용하던 API: /board/detail?boardIdx=${boardId}
      const response = await fetch(`${backendURL}/board/detail?boardIdx=${boardId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
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
      // 기존 EJS 페이지에서 사용하던 API: /board/reply?boardIdx=${boardId}
      const response = await fetch(`${backendURL}/board/reply?boardIdx=${boardId}`);
      
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('댓글 조회 오류:', error);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      // 기존 EJS 페이지에서 사용하던 API: /board/reply/insert
      const commentData = {
        boardIdx: parseInt(boardId),
        replyContent: commentForm.content.trim(),
        replyWriter: commentForm.writer.trim(),
        replyPassword: commentForm.password.trim(),
        replyType: 'main'
      };

      const response = await fetch(`${backendURL}/board/reply/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      });

      if (response.ok) {
        setCommentForm({ content: '', writer: '', password: '' });
        fetchComments();
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      // 기존 EJS 페이지에서 사용하던 API: /board/update
      const editData = {
        boardIdx: parseInt(boardId),
        boardTitle: editForm.title.trim(),
        boardContent: editForm.content.trim(),
        boardPassword: password
      };

      const response = await fetch(`${backendURL}/board/update`, {
        method: 'POST',
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
      // 기존 EJS 페이지에서 사용하던 API: /board/delete
      const deleteData = {
        boardIdx: parseInt(boardId),
        boardPassword: password
      };

      const response = await fetch(`${backendURL}/board/delete`, {
        method: 'POST',
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
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/board/like?boardIdx=${boardId}`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchBoardPost(); // 좋아요 수 새로고침
      }
    } catch (error) {
      console.error('좋아요 오류:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="container">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !boardPost) {
    return (
      <div className="container">
        <div className="text-center">
          <h1>오류 발생</h1>
          <p>{error || '게시글을 찾을 수 없습니다.'}</p>
          <button 
            onClick={() => router.back()}
            className="btn btn-secondary"
          >
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bootstrap CSS */}
      <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css" rel="stylesheet" />
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      
      <nav className="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
        <Link className="navbar-brand" href="/">대학 오빠</Link>
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarsExampleDefault" aria-controls="navbarsExampleDefault" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
      </nav>

      <div className="container">
        {/* 전체 테두리 */}
        {/* 글 읽기 Form */}
        <div className="modal-header">
          <h5 className="modal-title" id="exampleModalLabel2">대학교 입학 후기</h5>
        </div>

        <div className="modal-body" id="modal">
          {/* 이벤트를 확인하기 위한 dropdown 컨트롤 */}  
          {/* 이벤트는 event-dropdown 클래스로 걸었다. */}  
          <div className="dropdown event-dropdown float-right b-2"> 
            <a href="#" className="dropdown-toggle" id="settings" data-toggle="dropdown"> 설정
              <span className="caret"></span>    
            </a>    
            <ul className="dropdown-menu">      
              <li><a href="#" onClick={() => {
                setEditForm({ title: boardPost.boardTitle, content: boardPost.boardContent });
                setShowPasswordModal(true);
              }}>수정</a></li>      
              <li><a href="#" onClick={() => setShowDeleteModal(true)}>삭제</a></li>    
            </ul>  
          </div>  
        </div>

        {/* 게시글 내용 */}
        <div className="row ml-auto mr-auto" style={{ width: "100%" }}>
          <div className="col-12">
            <h3>{boardPost.boardTitle}</h3>
            <p><strong>작성자:</strong> {boardPost.boardID}</p>
            <p><strong>작성일:</strong> {boardPost.boardRegDate}</p>
            <p><strong>조회수:</strong> {boardPost.boardHits}</p>
            <p><strong>좋아요:</strong> 
              <button onClick={handleLike} className="btn btn-link">
                <i className="fa fa-heart"></i> {boardPost.boardLike}
              </button>
            </p>
            <hr />
            <div className="board-content">
              {boardPost.boardContent}
            </div>
          </div>
        </div>

        <div className="row ml-auto mr-auto" style={{ width: "100%" }} id="reply_area">
          <ul className="list-group list-group-flush">
            <table className="comment_table">
              <tr data-reply-type="all">
                <td colSpan={4}></td>
              </tr>
              {/* 댓글이 들어갈 공간 */}
            </table>
          </ul>
        </div>

        {/* 댓글 목록 */}
        <div className="row ml-auto mr-auto" style={{ width: "100%" }}>
          <div className="col-12">
            <h5>댓글</h5>
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment.replyIdx} className="comment-item border-bottom pb-2 mb-2">
                  <div className="d-flex justify-content-between">
                    <strong>{comment.replyWriter}</strong>
                    <small>{comment.replyRegDate}</small>
                  </div>
                  <p className="mb-1">{comment.replyContent}</p>
                </div>
              ))
            ) : (
              <p className="text-muted">아직 댓글이 없습니다.</p>
            )}
          </div>
        </div>
          
        <footer>
          <div className="row pt-5">
            <div className="comment_div">
              <li className="list-group-item">
                <form onSubmit={handleCommentSubmit}>
                  <div className="form-inline pb-3">
                    <label htmlFor="replyId"><i className="fa fa-user-circle-o fa"></i></label>
                    <input 
                      type="text" 
                      className="form-control ml-1" 
                      placeholder="Enter your ID"  
                      id="reply_writer" 
                      name="reply_writer" 
                      maxLength={10}
                      value={commentForm.writer}
                      onChange={(e) => setCommentForm({ ...commentForm, writer: e.target.value })}
                      required
                    />
                    <label htmlFor="replyPassword"><i className="fa fa-unlock-alt fa mr-2 pl-2"></i></label>
                    <input 
                      type="password" 
                      id="reply_password" 
                      className="form-control ml-1" 
                      placeholder="Enter password" 
                      maxLength={8}
                      value={commentForm.password}
                      onChange={(e) => setCommentForm({ ...commentForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="row pl-2">
                    <textarea 
                      className="form-control" 
                      id="reply_content" 
                      rows={3} 
                      maxLength={100} 
                      placeholder="최대 100자까지 작성가능."
                      value={commentForm.content}
                      onChange={(e) => setCommentForm({ ...commentForm, content: e.target.value })}
                      required
                    />
                    <div className="col_comment">
                      <button type="submit" className="btn btn-dark" id="reply_save" style={{ position: 'relative', left: '100px' }}>
                        댓글 달기
                      </button>
                    </div>
                  </div>
                </form>
              </li>
            </div>
          </div>
          <div className="row pt-3">
            <button 
              type="button" 
              className="btn btn-secondary" 
              id="BackBtn" 
              onClick={() => router.back()} 
              style={{ position: 'relative', left: '20px' }}
            >
              뒤로가기
            </button>
          </div>
        </footer>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-confirm">
            <div className="modal-content">
              <div className="modal-header flex-column">
                <div className="icon-box">
                  <i className="material-icons">&#xE5CD;</i>
                </div>						
                <h4 className="modal-title w-100">삭제 확인</h4>	
                <button type="button" className="close" onClick={() => setShowDeleteModal(false)} aria-hidden="true">&times;</button>
              </div>
              <div>
                <p>이 게시물을 정말로 삭제 하시겠습니까?</p>
              </div>
              <div className="modal-footer justify-content-center">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>취소</button>
                <button type="button" className="btn btn-primary" onClick={handleDelete}>삭제</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비밀번호 입력 모달 */}
      {showPasswordModal && (
        <div className="modal fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-confirm">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title w-100">비밀번호 입력</h4>	
                <button type="button" className="close" onClick={() => setShowPasswordModal(false)} aria-hidden="true">&times;</button>
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="form-control"
                />
              </div>
              <div className="modal-footer justify-content-center">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>취소</button>
                <button type="button" className="btn btn-primary" onClick={() => {
                  setShowPasswordModal(false);
                  setShowEditModal(true);
                }}>확인</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && (
        <div className="modal fade show" style={{ display: 'block' }}>
          <div className="modal-dialog modal-confirm">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title w-100">게시글 수정</h4>	
                <button type="button" className="close" onClick={() => setShowEditModal(false)} aria-hidden="true">&times;</button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>제목</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="form-control"
                      maxLength={40}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>내용</label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      className="form-control"
                      rows={4}
                      maxLength={700}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer justify-content-center">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>취소</button>
                  <button type="submit" className="btn btn-primary">수정</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bootstrap JS */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
      <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.bundle.min.js"></script>
    </>
  );
}
