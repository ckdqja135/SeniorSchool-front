"use client";

import React, { useEffect, useRef, useState } from "react";

const API_BASE_URL = "https://api.reviewhub.life";

interface FreeboardData {
  boardIdx: number;
  boardTitle: string;
  boardContent: string;
  boardID?: string;
  boardPW?: string;
  category?: string;
  boardRegDate?: string;
  isDeleted?: number;
}

interface ApiResponseV1 {
  status: number;
  data?: FreeboardData[];
  totalCount?: number;
  currentPage?: number | string;
  rowsPerPage?: number;
  totalPages?: number;
}

interface ApiResponseV2 {
  status: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  boards?: FreeboardData[];
  posts?: FreeboardData[];
}

const FreeboardManagementPage: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [boards, setBoards] = useState<FreeboardData[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<FreeboardData | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tempPage, setTempPage] = useState<string>("1");
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const hasFetched = useRef(false);

  const [newBoard, setNewBoard] = useState({
    boardTitle: "",
    boardContent: "",
    boardID: "",
    boardPW: "",
  });
  const [editingBoard, setEditingBoard] = useState<FreeboardData | null>(null);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');

  const searchBoards = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    try {
      const accessToken = getToken();
      const params = new URLSearchParams();
      if (keyword) params.append('title', keyword);
      params.append('page', String(page));
      params.append('limit', String(pageSize));

      const res = await fetch(`${API_BASE_URL}/admin/freeboard?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: ApiResponseV1 | ApiResponseV2 = await res.json();

      const list = (raw as ApiResponseV2).boards ?? (raw as ApiResponseV2).posts ?? (raw as ApiResponseV1).data ?? [];
      setBoards(list as FreeboardData[]);

      const total = (raw as ApiResponseV2).totalCount ?? (raw as ApiResponseV1).totalCount ?? 0;
      const serverRows = (raw as ApiResponseV1).rowsPerPage;
      const serverPage = (raw as ApiResponseV2).currentPage ?? (raw as ApiResponseV1).currentPage ?? page;
      const serverTotalPages = (raw as ApiResponseV2).totalPages;

      const size = serverRows || pageSize;
      if (typeof serverTotalPages === 'number') setTotalPages(Math.max(1, serverTotalPages));
      else setTotalPages(Math.max(1, Math.ceil((total || 0) / size)));

      const nextPage = Number(serverPage) || page;
      setCurrentPage(nextPage);
      setTempPage(String(nextPage));
      if (serverRows) setRowsPerPage(serverRows);
    } catch (e) {
      console.error("자유게시판 검색 실패:", e);
      setBoards([]);
      setTotalPages(1);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    searchBoards("", 1, rowsPerPage);
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    setTempPage("1");
    hasFetched.current = false;
    searchBoards(searchKeyword, 1, rowsPerPage);
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (!boards || boards.length === 0) return;
    if (selectedIds.length === boards.length) setSelectedIds([]);
    else setSelectedIds(boards.map((b) => b.boardIdx));
  };

  const handleAdd = async () => {
    try {
      const accessToken = getToken();
      const payload = {
        boardTitle: newBoard.boardTitle,
        boardContent: newBoard.boardContent,
        boardID: newBoard.boardID,
        boardPW: newBoard.boardPW,
        // UI 변경 없이 필수 category 충족: 기본값 '자유'
        category: '자유'
      } as any;
      const res = await fetch(`${API_BASE_URL}/admin/freeboard`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert("게시글이 성공적으로 추가되었습니다.");
        setIsAddMode(false);
        setNewBoard({ boardTitle: "", boardContent: "", boardID: "", boardPW: "" });
        searchBoards(searchKeyword);
      } else {
        alert("게시글 추가에 실패했습니다.");
      }
    } catch (e) {
      console.error("게시글 추가 실패:", e);
      alert("게시글 추가에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const accessToken = getToken();
      for (const id of selectedIds) {
        const res = await fetch(`${API_BASE_URL}/admin/freeboard/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error(`삭제 실패 id=${id}`);
      }
      setShowDeleteModal(true);
      setSelectedIds([]);
      searchBoards(searchKeyword, currentPage, rowsPerPage);
    } catch (e) {
      console.error("게시글 삭제 실패:", e);
      alert("게시글 삭제에 실패했습니다.");
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setTempPage(String(page));
      hasFetched.current = false;
      searchBoards(searchKeyword, page, rowsPerPage);
    }
  };

  const handleRowsPerPageChange = (n: number) => {
    setRowsPerPage(n);
    setCurrentPage(1);
    hasFetched.current = false;
    searchBoards(searchKeyword, 1, n);
  };

  const handleEditStart = () => {
    if (selectedBoard) {
      setEditingBoard({ ...selectedBoard });
      setIsEditMode(true);
      setHasChanges(false);
    }
  };

  const handleEditCancel = () => {
    if (hasChanges) setShowCancelModal(true);
    else {
      setIsEditMode(false);
      setEditingBoard(null);
      setHasChanges(false);
    }
  };

  const handleCancelConfirm = () => {
    setIsEditMode(false);
    setEditingBoard(null);
    setHasChanges(false);
    setShowCancelModal(false);
  };

  const handleEditChange = (field: keyof FreeboardData, value: string) => {
    if (editingBoard && selectedBoard) {
      const updated = { ...editingBoard, [field]: value } as FreeboardData;
      setEditingBoard(updated);
      const changed = JSON.stringify(updated) !== JSON.stringify(selectedBoard);
      setHasChanges(changed);
    }
  };

  const handleUpdate = async () => {
    if (!editingBoard || !selectedBoard) return;
    try {
      const accessToken = getToken();
      const changedData: Partial<FreeboardData> = { boardIdx: editingBoard.boardIdx } as any;
      (Object.keys(editingBoard) as (keyof FreeboardData)[]).forEach((k) => {
        if (editingBoard[k] !== selectedBoard[k]) {
          (changedData as any)[k] = editingBoard[k];
        }
      });
      const body = {
        boardTitle: changedData.boardTitle,
        boardContent: changedData.boardContent
      };

      const res = await fetch(`${API_BASE_URL}/admin/freeboard/${editingBoard.boardIdx}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        alert("게시글이 성공적으로 수정되었습니다.");
        setSelectedBoard({ ...selectedBoard, ...body } as FreeboardData);
        setIsEditMode(false);
        setEditingBoard(null);
        setHasChanges(false);
        searchBoards(searchKeyword, currentPage, rowsPerPage);
      } else {
        alert("게시글 수정에 실패했습니다.");
      }
    } catch (e) {
      console.error("게시글 수정 실패:", e);
      alert("게시글 수정에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-4">
      <div className="w-1/2 bg-white rounded-lg shadow p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">자유게시판 관리</h2>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="제목으로 검색"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            검색
          </button>
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setIsAddMode(true)}
            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600"
            title="게시글 추가"
          >
            +
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
            className={`w-8 h-8 rounded-full text-white ${selectedIds.length > 0 ? "bg-red-500 hover:bg-red-600" : "bg-gray-300 cursor-not-allowed"}`}
            title="선택된 게시글 삭제"
          >
            🗑️
          </button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-y-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={boards && boards.length > 0 && selectedIds.length === boards.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">글 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">제목</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">작성자</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">등록일</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">로딩 중...</td>
                  </tr>
                ) : !boards || boards.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  boards.map((b) => (
                    <tr
                      key={b.boardIdx}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedBoard?.boardIdx === b.boardIdx ? "bg-blue-50" : ""}`}
                      onClick={async () => {
                        setSelectedBoard(b);
                        try {
                          const accessToken = getToken();
                          const res = await fetch(`${API_BASE_URL}/admin/freeboard/${b.boardIdx}?includeDeleted=1`, {
                            headers: {
                              Authorization: `Bearer ${accessToken}`,
                              "Content-Type": "application/json",
                            },
                          });
                          if (res.ok) {
                            const data = await res.json();
                            const detail = data.data || data.board || data;
                            setSelectedBoard((prev) => ({ ...(prev as any), ...detail }));
                          }
                        } catch (e) {
                          console.error('상세 조회 실패:', e);
                        }
                      }}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(b.boardIdx)}
                          onChange={() => handleSelect(b.boardIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{b.boardIdx}</td>
                      <td className="px-3 py-2 text-sm">{b.boardTitle}</td>
                      <td className="px-3 py-2 text-sm">{b.boardID || '-'}</td>
                      <td className="px-3 py-2 text-sm">{b.boardRegDate ? new Date(b.boardRegDate).toLocaleString() : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">페이지당:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))}
              className="px-2 py-1 text-sm border rounded bg-white"
            >
              <option value={10}>10개</option>
              <option value={30}>30개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className={`px-2 py-1 text-sm border rounded transition-colors ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"}`}
              title="첫 페이지"
            >
              ⏮️
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-2 py-1 text-sm border rounded transition-colors ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"}`}
              title="이전 페이지"
            >
              ◀️
            </button>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={tempPage}
                onChange={(e) => setTempPage(e.target.value)}
                onBlur={() => {
                  const page = parseInt(tempPage as string);
                  if (!isNaN(page)) {
                    const clamped = Math.min(Math.max(page, 1), totalPages);
                    goToPage(clamped);
                  } else {
                    setTempPage(String(currentPage));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt(tempPage as string);
                    if (!isNaN(page)) {
                      const clamped = Math.min(Math.max(page, 1), totalPages);
                      goToPage(clamped);
                    } else {
                      setTempPage(String(currentPage));
                    }
                  }
                }}
                className="w-12 px-1 py-1 text-sm text-center border rounded"
                min={1}
                max={totalPages}
              />
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 text-sm border rounded transition-colors ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"}`}
              title="다음 페이지"
            >
              ▶️
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 text-sm border rounded transition-colors ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"}`}
              title="마지막 페이지"
            >
              ⏭️
            </button>
          </div>
        </div>
      </div>

      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        {isAddMode ? (
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4">게시글 추가</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium mb-1">제목</label>
                <input
                  type="text"
                  value={newBoard.boardTitle}
                  onChange={(e) => setNewBoard({ ...newBoard, boardTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">내용</label>
                <textarea
                  value={newBoard.boardContent}
                  onChange={(e) => setNewBoard({ ...newBoard, boardContent: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={8}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">작성자 ID (선택)</label>
                  <input
                    type="text"
                    value={newBoard.boardID}
                    onChange={(e) => setNewBoard({ ...newBoard, boardID: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">비밀번호 (선택)</label>
                  <input
                    type="password"
                    value={newBoard.boardPW}
                    onChange={(e) => setNewBoard({ ...newBoard, boardPW: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button onClick={handleAdd} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">저장</button>
              <button onClick={() => setIsAddMode(false)} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">취소</button>
            </div>
          </div>
        ) : selectedBoard ? (
          <div className="flex flex-col h-full">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">{selectedBoard.boardIdx}</span>
                  <span className="text-lg font-semibold">{selectedBoard.boardTitle}</span>
                  {selectedBoard.boardID && (
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">{selectedBoard.boardID}</span>
                  )}
                </div>
                {!isEditMode && (
                  <div className="flex gap-2">
                    <button onClick={handleEditStart} className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center" title="수정">✏️</button>
                    <button onClick={async () => { setSelectedIds([selectedBoard.boardIdx]); await handleDelete(); setSelectedBoard(null); }} className="w-8 h-8 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center" title="삭제">🗑️</button>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">게시글 상세</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">제목</label>
                  <input type="text" value={isEditMode ? editingBoard?.boardTitle || "" : selectedBoard.boardTitle} onChange={(e) => handleEditChange("boardTitle", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">내용</label>
                  <textarea value={isEditMode ? editingBoard?.boardContent || "" : selectedBoard.boardContent} onChange={(e) => handleEditChange("boardContent", e.target.value)} readOnly={!isEditMode} rows={10} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">작성자 ID</label>
                    <input type="text" value={isEditMode ? editingBoard?.boardID || "" : (selectedBoard.boardID || "")} onChange={(e) => handleEditChange("boardID", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                  </div>
                </div>
                  <div>
                  <label className="block text-sm font-medium mb-1">등록일</label>
                  <input type="text" value={selectedBoard.boardRegDate ? new Date(selectedBoard.boardRegDate).toLocaleString() : "-"} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50" />
                </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">삭제 여부</label>
                    <input type="text" value={selectedBoard.isDeleted === 1 ? '삭제됨' : '미삭제'} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50" />
                  </div>
              </div>
            </div>

            {isEditMode && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button onClick={handleUpdate} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">저장</button>
                <button onClick={handleEditCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">취소</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">게시글을 선택하거나 추가 버튼을 클릭하세요.</div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">알림</h3>
            <p className="mb-4">삭제가 완료되었습니다.</p>
            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">확인</button>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">확인</h3>
            <p className="mb-4">변경된 사항이 있습니다. 변경을 취소하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={handleCancelConfirm} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">예</button>
              <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">아니오</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreeboardManagementPage;



