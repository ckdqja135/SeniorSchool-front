"use client";

import React, { useEffect, useRef, useState } from "react";

const API_BASE_URL = "https://api.reviewhub.life";

interface BoardData {
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
  data?: BoardData[];
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
  boards?: BoardData[];
  posts?: BoardData[];
}

const OutsourceBoardManagementPage: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<BoardData | null>(null);
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

  const [newBoard, setNewBoard] = useState({ boardTitle: "", boardContent: "", boardID: "", boardPW: "" });
  const [editingBoard, setEditingBoard] = useState<BoardData | null>(null);

  const getToken = () => localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');

  const searchBoards = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    try {
      const accessToken = getToken();
      const params = new URLSearchParams();
      if (keyword) params.append('title', keyword);
      params.append('page', String(page));
      params.append('limit', String(pageSize));

      const res = await fetch(`${API_BASE_URL}/admin/outsourceboard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: ApiResponseV1 | ApiResponseV2 = await res.json();

      const list = (raw as ApiResponseV2).boards ?? (raw as ApiResponseV2).posts ?? (raw as ApiResponseV1).data ?? [];
      setBoards(list as BoardData[]);

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
      console.error("외주오빠 후기 검색 실패:", e);
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

  const handleSearch = () => { setCurrentPage(1); setTempPage("1"); hasFetched.current = false; searchBoards(searchKeyword, 1, rowsPerPage); };
  const handleSelect = (id: number) => { setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id])); };
  const handleSelectAll = () => { if (!boards || boards.length === 0) return; if (selectedIds.length === boards.length) setSelectedIds([]); else setSelectedIds(boards.map((b) => b.boardIdx)); };

  const handleAdd = async () => {
    try {
      const accessToken = getToken();
      const payload = { boardTitle: newBoard.boardTitle, boardContent: newBoard.boardContent, boardID: newBoard.boardID, boardPW: newBoard.boardPW, category: '외주' } as any;
      const res = await fetch(`${API_BASE_URL}/admin/outsourceboard`, {
        method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (res.ok) { alert("후기가 성공적으로 추가되었습니다."); setIsAddMode(false); setNewBoard({ boardTitle: "", boardContent: "", boardID: "", boardPW: "" }); searchBoards(searchKeyword); }
      else { alert("후기 추가에 실패했습니다."); }
    } catch (e) { console.error("후기 추가 실패:", e); alert("후기 추가에 실패했습니다."); }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const accessToken = getToken();
      for (const id of selectedIds) {
        const res = await fetch(`${API_BASE_URL}/admin/outsourceboard/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
        if (!res.ok) throw new Error(`삭제 실패 id=${id}`);
      }
      setShowDeleteModal(true); setSelectedIds([]); searchBoards(searchKeyword, currentPage, rowsPerPage);
    } catch (e) { console.error("후기 삭제 실패:", e); alert("후기 삭제에 실패했습니다."); }
  };

  const goToPage = (page: number) => { if (page >= 1 && page <= totalPages) { setCurrentPage(page); setTempPage(String(page)); hasFetched.current = false; searchBoards(searchKeyword, page, rowsPerPage); } };
  const handleRowsPerPageChange = (n: number) => { setRowsPerPage(n); setCurrentPage(1); hasFetched.current = false; searchBoards(searchKeyword, 1, n); };
  const handleEditStart = () => { if (selectedBoard) { setEditingBoard({ ...selectedBoard }); setIsEditMode(true); setHasChanges(false); } };
  const handleEditCancel = () => { if (hasChanges) setShowCancelModal(true); else { setIsEditMode(false); setEditingBoard(null); setHasChanges(false); } };
  const handleCancelConfirm = () => { setIsEditMode(false); setEditingBoard(null); setHasChanges(false); setShowCancelModal(false); };

  const handleEditChange = (field: keyof BoardData, value: string) => {
    if (editingBoard && selectedBoard) {
      const updated = { ...editingBoard, [field]: value } as BoardData;
      setEditingBoard(updated);
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(selectedBoard));
    }
  };

  const handleUpdate = async () => {
    if (!editingBoard || !selectedBoard) return;
    try {
      const accessToken = getToken();
      const changedData: Partial<BoardData> = { boardIdx: editingBoard.boardIdx } as any;
      (Object.keys(editingBoard) as (keyof BoardData)[]).forEach((k) => { if (editingBoard[k] !== selectedBoard[k]) { (changedData as any)[k] = editingBoard[k]; } });
      const body = { boardTitle: changedData.boardTitle, boardContent: changedData.boardContent };
      const res = await fetch(`${API_BASE_URL}/admin/outsourceboard/${editingBoard.boardIdx}`, {
        method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) { alert("후기가 성공적으로 수정되었습니다."); setSelectedBoard({ ...selectedBoard, ...body } as BoardData); setIsEditMode(false); setEditingBoard(null); setHasChanges(false); searchBoards(searchKeyword, currentPage, rowsPerPage); }
      else { alert("후기 수정에 실패했습니다."); }
    } catch (e) { console.error("후기 수정 실패:", e); alert("후기 수정에 실패했습니다."); }
  };

  return (
    <div className="flex h-full gap-5">
      <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">외주오빠 후기 관리</h2>
          <p className="text-sm text-gray-400 mt-0.5">등록된 후기 목록</p>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="제목으로 검색..." value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all" onKeyPress={(e) => e.key === "Enter" && handleSearch()} />
          </div>
          <button onClick={handleSearch} className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm">검색</button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">{selectedIds.length > 0 && `${selectedIds.length}개 선택됨`}</span>
          <div className="flex gap-2">
            <button onClick={() => setIsAddMode(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors" title="후기 추가">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>추가
            </button>
            <button onClick={handleDelete} disabled={selectedIds.length === 0} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedIds.length > 0 ? 'text-rose-700 bg-rose-50 hover:bg-rose-100' : 'text-gray-400 bg-gray-50 cursor-not-allowed'}`} title="선택된 후기 삭제">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>삭제
            </button>
          </div>
        </div>

        <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
            <table className="w-full">
              <thead className="bg-gray-50/80 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left w-10"><input type="checkbox" checked={boards && boards.length > 0 && selectedIds.length === boards.length} onChange={handleSelectAll} className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" /></th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">제목</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">작성자</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">등록일</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-400">로딩 중...</td></tr>
                ) : !boards || boards.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-400">검색 결과가 없습니다.</td></tr>
                ) : (
                  boards.map((b) => (
                    <tr key={b.boardIdx} className={`border-t border-gray-50 cursor-pointer transition-colors ${selectedBoard?.boardIdx === b.boardIdx ? 'bg-purple-50/70' : 'hover:bg-gray-50/70'}`}
                      onClick={async () => {
                        setSelectedBoard(b);
                        try {
                          const accessToken = getToken();
                          const res = await fetch(`${API_BASE_URL}/admin/outsourceboard/${b.boardIdx}?includeDeleted=1`, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
                          if (res.ok) { const data = await res.json(); const detail = data.data || data.board || data; setSelectedBoard((prev) => ({ ...(prev as any), ...detail })); }
                        } catch (e) { console.error('상세 조회 실패:', e); }
                      }}>
                      <td className="px-3 py-2.5"><input type="checkbox" checked={selectedIds.includes(b.boardIdx)} onChange={() => handleSelect(b.boardIdx)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" /></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{b.boardIdx}</td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900 truncate max-w-[180px]">{b.boardTitle}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{b.boardID || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{b.boardRegDate ? new Date(b.boardRegDate).toLocaleDateString('ko-KR') : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <select value={rowsPerPage} onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
              <option value={10}>10개</option><option value={30}>30개</option><option value={50}>50개</option><option value={100}>100개</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg></button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
            <div className="flex items-center gap-1 px-2">
              <input type="number" value={tempPage} onChange={(e) => setTempPage(e.target.value)} onBlur={() => { const page = parseInt(tempPage); if (!isNaN(page)) goToPage(Math.min(Math.max(page, 1), totalPages)); else setTempPage(String(currentPage)); }} onKeyDown={(e) => { if (e.key === 'Enter') { const page = parseInt(tempPage); if (!isNaN(page)) goToPage(Math.min(Math.max(page, 1), totalPages)); else setTempPage(String(currentPage)); } }} className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20" min={1} max={totalPages} />
              <span className="text-xs text-gray-400">/ {totalPages}</span>
            </div>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
          </div>
        </div>
      </div>

      <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
        {isAddMode ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center"><svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div>
              <div><h3 className="text-lg font-bold text-gray-900">후기 추가</h3><p className="text-xs text-gray-400">새 후기를 작성하세요</p></div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">제목</label><input type="text" value={newBoard.boardTitle} onChange={(e) => setNewBoard({ ...newBoard, boardTitle: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all" placeholder="제목을 입력하세요" /></div>
              <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">내용</label><textarea value={newBoard.boardContent} onChange={(e) => setNewBoard({ ...newBoard, boardContent: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all resize-none" rows={8} placeholder="내용을 입력하세요" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">작성자 ID (선택)</label><input type="text" value={newBoard.boardID} onChange={(e) => setNewBoard({ ...newBoard, boardID: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all" /></div>
                <div><label className="block text-xs font-semibold text-gray-500 mb-1.5">비밀번호 (선택)</label><input type="password" value={newBoard.boardPW} onChange={(e) => setNewBoard({ ...newBoard, boardPW: e.target.value })} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all" /></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button onClick={handleAdd} className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm">저장</button>
              <button onClick={() => setIsAddMode(false)} className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">취소</button>
            </div>
          </div>
        ) : selectedBoard ? (
          <div className="flex flex-col h-full">
            <div className="mb-5 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center"><svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1">{selectedBoard.boardTitle}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedBoard.boardID && (<span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">{selectedBoard.boardID}</span>)}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${selectedBoard.isDeleted === 1 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{selectedBoard.isDeleted === 1 ? '삭제됨' : '정상'}</span>
                      <span className="text-xs text-gray-400">#{selectedBoard.boardIdx}</span>
                    </div>
                  </div>
                </div>
                {!isEditMode && (
                  <div className="flex gap-1.5">
                    <button onClick={handleEditStart} className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 hover:border-purple-300 hover:bg-purple-50 flex items-center justify-center transition-all" title="수정"><svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                    <button onClick={async () => { setSelectedIds([selectedBoard.boardIdx]); await handleDelete(); setSelectedBoard(null); }} className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 hover:border-rose-300 hover:bg-rose-50 flex items-center justify-center transition-all" title="삭제"><svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-bold text-gray-900">후기 상세</h3>
              {isEditMode && (<span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-md">편집중</span>)}
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="space-y-3">
                <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">제목</label><input type="text" value={isEditMode ? editingBoard?.boardTitle || "" : selectedBoard.boardTitle} onChange={(e) => handleEditChange("boardTitle", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} /></div>
                <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">내용</label><textarea value={isEditMode ? editingBoard?.boardContent || "" : selectedBoard.boardContent} onChange={(e) => handleEditChange("boardContent", e.target.value)} readOnly={!isEditMode} rows={10} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all resize-none ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">작성자 ID</label><input type="text" value={isEditMode ? editingBoard?.boardID || "" : (selectedBoard.boardID || "")} onChange={(e) => handleEditChange("boardID", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} /></div>
                  <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">등록일</label><div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">{selectedBoard.boardRegDate ? new Date(selectedBoard.boardRegDate).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</div></div>
                </div>
                <div><label className="block text-xs font-semibold text-gray-400 mb-1.5">삭제 여부</label><div className={`w-full px-3.5 py-2.5 text-sm border border-gray-100 rounded-xl ${selectedBoard.isDeleted === 1 ? 'bg-rose-50/80 text-rose-700' : 'bg-emerald-50/80 text-emerald-700'}`}>{selectedBoard.isDeleted === 1 ? '삭제됨' : '미삭제'}</div></div>
              </div>
            </div>
            {isEditMode && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button onClick={handleUpdate} className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm">저장</button>
                <button onClick={handleEditCancel} className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">취소</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
            <p className="text-sm text-gray-400">후기를 선택하거나</p>
            <p className="text-sm text-gray-400">추가 버튼을 클릭하세요</p>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">삭제 완료</h3>
            <p className="text-sm text-gray-500 text-center mb-5">선택한 항목이 삭제되었습니다.</p>
            <button onClick={() => setShowDeleteModal(false)} className="w-full px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors">확인</button>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4"><svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">변경 취소</h3>
            <p className="text-sm text-gray-500 text-center mb-5">변경된 사항이 있습니다. 취소하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">돌아가기</button>
              <button onClick={handleCancelConfirm} className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors">취소하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutsourceBoardManagementPage;
