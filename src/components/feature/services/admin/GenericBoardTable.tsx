'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ServiceConfig, DynamicBoard, ListParams } from '@/types/Services';
import { adminFetchBoards, adminDeleteBoard } from '@/lib/services/dynamicBoardAPI';

interface GenericBoardTableProps {
  config: ServiceConfig;
  slug: string;
}

const GenericBoardTable: React.FC<GenericBoardTableProps> = ({ config, slug }) => {
  const [boards, setBoards] = useState<DynamicBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [tempPage, setTempPage] = useState<string>('1');
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<DynamicBoard | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasFetched = useRef(false);

  // Fetch boards
  const fetchData = useCallback(
    async (keyword = '', page = 1, limit = rowsPerPage) => {
      if (!slug) return;
      setLoading(true);
      try {
        const params: ListParams = { page, limit };
        if (keyword) params.keyword = keyword;

        const response = await adminFetchBoards(slug, params);
        setBoards(response.data || []);
        const total = response.totalCount || 0;
        setTotalCount(total);
        setTotalPages(Math.max(1, Math.ceil(total / limit)));
        setCurrentPage(page);
        setTempPage(String(page));
      } catch (err) {
        console.error('게시판 목록 조회 실패:', err);
        setBoards([]);
        setTotalCount(0);
        setTotalPages(1);
        setCurrentPage(page);
      } finally {
        setLoading(false);
      }
    },
    [slug, rowsPerPage]
  );

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchData('', 1, rowsPerPage);
  }, [fetchData, rowsPerPage]);

  // Search
  const handleSearch = () => {
    setCurrentPage(1);
    setTempPage('1');
    setSelectedIds([]);
    hasFetched.current = false;
    fetchData(searchKeyword, 1, rowsPerPage);
  };

  // Pagination
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setTempPage(String(page));
      setSelectedIds([]);
      hasFetched.current = false;
      fetchData(searchKeyword, page, rowsPerPage);
    }
  };

  const handleRowsPerPageChange = (n: number) => {
    setRowsPerPage(n);
    setCurrentPage(1);
    setSelectedIds([]);
    hasFetched.current = false;
    fetchData(searchKeyword, 1, n);
  };

  // Selection
  const handleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!boards || boards.length === 0) return;
    if (selectedIds.length === boards.length) setSelectedIds([]);
    else setSelectedIds(boards.map((b) => b.boardIdx));
  };

  // Row click: open detail modal
  const handleRowClick = (board: DynamicBoard) => {
    setSelectedBoard(board);
    setShowDetailModal(true);
  };

  // Delete
  const handleDeleteClick = () => {
    if (selectedIds.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedIds.length === 0) return;
    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await adminDeleteBoard(slug, id);
      }
      setShowDeleteConfirm(false);
      setShowDeleteSuccess(true);
      setSelectedIds([]);
      // If the detail modal is open for a deleted board, close it
      if (selectedBoard && selectedIds.includes(selectedBoard.boardIdx)) {
        setSelectedBoard(null);
        setShowDetailModal(false);
      }
      fetchData(searchKeyword, currentPage, rowsPerPage);
    } catch (err) {
      console.error('게시글 삭제 실패:', err);
      alert('게시글 삭제에 실패했습니다.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR');
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">
          {config.serviceEmoji} {config.serviceDisplay} 후기 관리
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          총 {totalCount}건의 후기
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="제목으로 검색..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
        >
          검색
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">
          {selectedIds.length > 0 && `${selectedIds.length}개 선택됨`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleDeleteClick}
            disabled={selectedIds.length === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              selectedIds.length > 0
                ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                : 'text-gray-400 bg-gray-50 cursor-not-allowed'
            }`}
            title="선택된 후기 삭제"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            삭제
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
          <table className="w-full">
            <thead className="bg-gray-50/80 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={
                      boards &&
                      boards.length > 0 &&
                      selectedIds.length === boards.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">
                  ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">
                  제목
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">
                  작성자
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">
                  업체명
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">
                  좋아요
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500">
                  조회수
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">
                  등록일
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-gray-400"
                  >
                    로딩 중...
                  </td>
                </tr>
              ) : !boards || boards.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-sm text-gray-400"
                  >
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                boards.map((b) => (
                  <tr
                    key={b.boardIdx}
                    className={`border-t border-gray-50 cursor-pointer transition-colors ${
                      selectedBoard?.boardIdx === b.boardIdx && showDetailModal
                        ? 'bg-purple-50/70'
                        : 'hover:bg-gray-50/70'
                    }`}
                    onClick={() => handleRowClick(b)}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(b.boardIdx)}
                        onChange={() => handleSelect(b.boardIdx)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">
                      {b.boardIdx}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {b.boardTitle}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500">
                      {b.boardId || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-600 truncate max-w-[120px]">
                      {b.entityName || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 text-center">
                      {b.boardLike ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-sm text-gray-500 text-center">
                      {b.boardHits ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">
                      {formatDate(b.boardRegDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <select
            value={rowsPerPage}
            onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))}
            className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value={10}>10개</option>
            <option value={30}>30개</option>
            <option value={50}>50개</option>
            <option value={100}>100개</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
              currentPage === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
              currentPage === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex items-center gap-1 px-2">
            <input
              type="number"
              value={tempPage}
              onChange={(e) => setTempPage(e.target.value)}
              onBlur={() => {
                const page = parseInt(tempPage);
                if (!isNaN(page)) {
                  goToPage(Math.min(Math.max(page, 1), totalPages));
                } else {
                  setTempPage(String(currentPage));
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const page = parseInt(tempPage);
                  if (!isNaN(page)) {
                    goToPage(Math.min(Math.max(page, 1), totalPages));
                  } else {
                    setTempPage(String(currentPage));
                  }
                }
              }}
              className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              min={1}
              max={totalPages}
            />
            <span className="text-xs text-gray-400">/ {totalPages}</span>
          </div>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
              currentPage === totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
              currentPage === totalPages
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedBoard && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1">
                      {selectedBoard.boardTitle}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {selectedBoard.boardId && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">
                          {selectedBoard.boardId}
                        </span>
                      )}
                      {selectedBoard.entityName && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-md">
                          {selectedBoard.entityName}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        #{selectedBoard.boardIdx}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0 ml-2"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                {/* Meta info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1">
                      좋아요
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedBoard.boardLike ?? 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1">
                      조회수
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedBoard.boardHits ?? 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1">
                      댓글
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedBoard.commentCount ?? 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-1">
                      등록일
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {formatDateTime(selectedBoard.boardRegDate)}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    내용
                  </label>
                  <div className="w-full px-4 py-3 bg-gray-50/80 border border-gray-100 rounded-xl text-sm text-gray-700 whitespace-pre-wrap min-h-[120px] max-h-[300px] overflow-y-auto">
                    {selectedBoard.boardContent || '내용이 없습니다.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedIds([selectedBoard.boardIdx]);
                  setShowDeleteConfirm(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-rose-700 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                삭제
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-rose-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              삭제 확인
            </h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              선택한 {selectedIds.length}건의 후기를 삭제하시겠습니까?
              <br />
              <span className="text-rose-500">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedIds([]);
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {deleting ? '삭제 중...' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              삭제 완료
            </h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              선택한 항목이 삭제되었습니다.
            </p>
            <button
              onClick={() => setShowDeleteSuccess(false)}
              className="w-full px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericBoardTable;
