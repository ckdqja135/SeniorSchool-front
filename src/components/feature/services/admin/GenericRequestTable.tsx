'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ServiceConfig, DynamicRequest, ListParams } from '@/types/Services';
import { adminFetchRequests, adminUpdateRequest } from '@/lib/services/dynamicBoardAPI';

interface GenericRequestTableProps {
  config: ServiceConfig;
  slug: string;
}

const STATUS_LABELS: Record<number, string> = {
  0: '대기',
  1: '승인',
  2: '거절',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'bg-yellow-100 text-yellow-800',
  1: 'bg-green-100 text-green-800',
  2: 'bg-red-100 text-red-800',
};

const ITEMS_PER_PAGE = 10;

const GenericRequestTable: React.FC<GenericRequestTableProps> = ({ config, slug }) => {
  const [requests, setRequests] = useState<DynamicRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    requestIdx: number;
    action: 'approve' | 'reject';
  }>({ open: false, requestIdx: 0, action: 'approve' });

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: ListParams = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };
      const response = await adminFetchRequests(slug, params);
      setRequests(response.data || []);
      setTotalCount(response.totalCount || 0);
    } catch (error) {
      console.error('추가 요청 목록 로드 실패:', error);
      setRequests([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [slug, currentPage]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const openConfirmDialog = (requestIdx: number, action: 'approve' | 'reject') => {
    setConfirmDialog({ open: true, requestIdx, action });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, requestIdx: 0, action: 'approve' });
  };

  const handleConfirm = async () => {
    const { requestIdx, action } = confirmDialog;
    const status = action === 'approve' ? 1 : 2;

    try {
      await adminUpdateRequest(slug, requestIdx, status);
      await loadRequests();
    } catch (error) {
      console.error('요청 상태 변경 실패:', error);
      alert('요청 처리 중 오류가 발생했습니다.');
    } finally {
      closeConfirmDialog();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {config.serviceDisplay} 추가 요청 관리
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          총 {totalCount}건의 요청이 있습니다.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                번호
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                요청명
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                요청 사유
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                등록일
              </th>
              <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    데이터를 불러오는 중...
                  </div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  등록된 추가 요청이 없습니다.
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr
                  key={request.requestIdx}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {request.requestIdx}
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-medium whitespace-nowrap">
                    {request.requestName}
                  </td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                    {request.requestReason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[request.requestStatus] ?? 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {STATUS_LABELS[request.requestStatus] ?? '알 수 없음'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {formatDate(request.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {request.requestStatus === 0 ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openConfirmDialog(request.requestIdx, 'approve')}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => openConfirmDialog(request.requestIdx, 'reject')}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        >
                          거절
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">처리 완료</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-1">
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="px-2 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="첫 페이지"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="이전 페이지"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {getPageNumbers().map((page) => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                currentPage === page
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="다음 페이지"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="마지막 페이지"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={closeConfirmDialog}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 z-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmDialog.action === 'approve' ? '요청 승인' : '요청 거절'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmDialog.action === 'approve'
                ? '이 추가 요청을 승인하시겠습니까?'
                : '이 추가 요청을 거절하시겠습니까?'}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={closeConfirmDialog}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  confirmDialog.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmDialog.action === 'approve' ? '승인' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericRequestTable;
