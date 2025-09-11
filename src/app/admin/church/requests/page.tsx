"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

// API 베이스 URL을 상수로 관리
const API_BASE_URL = "https://api.reviewhub.life";

interface ChurchRequest {
  requestIdx: number;
  churchName: string;
  churchPastor: string;
  churchType: string | null;
  churchAddr: string;
  requestStatus: "pending" | "completed" | "rejected";
  requestDate: string;
  processedDate: string | null;
  adminNote: string | null;
}

interface ApiResponse {
  status: number;
  data: ChurchRequest[];
  totalCount: number;
  currentPage: string | number;
  rowsPerPage: number;
  totalPages: number;
}

const ChurchRequestsPage: React.FC = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<ChurchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<ChurchRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRequests = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        router.push("/admin/sign-in");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/church/requests?page=${page}&rowsPerPage=10`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      
      if (data.status === 200) {
        setRequests(data.data || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(Number(data.currentPage) || page);
      } else {
        throw new Error("교회 추가 요청을 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("교회 추가 요청 로딩 오류:", error);
      setError("교회 추가 요청을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRequests(page);
  };

  const handleRequestClick = (request: ChurchRequest) => {
    setSelectedRequest(request);
    setAdminNote(request.adminNote || '');
    setIsDetailModalOpen(true);
  };

  const handleCheckboxChange = (requestIdx: number) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestIdx)) {
      newSelected.delete(requestIdx);
    } else {
      newSelected.add(requestIdx);
    }
    setSelectedRequests(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRequests.size === requests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(requests.map(req => req.requestIdx)));
    }
  };

  const handleProcessRequests = async (status: "completed" | "rejected") => {
    if (selectedRequests.size === 0) {
      alert("처리할 요청을 선택해주세요.");
      return;
    }

    if (!adminNote.trim()) {
      alert("관리자 메모를 입력해주세요.");
      return;
    }

    try {
      setIsProcessing(true);
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(`${API_BASE_URL}/admin/church/processRequests`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestIds: Array.from(selectedRequests),
          status: status,
          adminNote: adminNote
        }),
      });

      if (response.ok) {
        alert(`요청이 ${status === "completed" ? "승인" : "거부"}되었습니다.`);
        setSelectedRequests(new Set());
        setAdminNote('');
        fetchRequests(currentPage);
      } else {
        throw new Error("요청 처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("요청 처리 오류:", error);
      alert("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">대기중</span>;
      case "completed":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">승인</span>;
      case "rejected":
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">거부</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">알 수 없음</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">교회 추가 요청</h1>
        <p className="text-gray-600">사용자가 요청한 교회 추가 요청을 관리할 수 있습니다.</p>
      </div>

      {/* 액션 버튼 */}
      {selectedRequests.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedRequests.size}개의 요청이 선택되었습니다.
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleProcessRequests("completed")}
                disabled={isProcessing}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                승인
              </button>
              <button
                onClick={() => handleProcessRequests("rejected")}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                거부
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 관리자 메모 입력 */}
      {selectedRequests.size > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            관리자 메모
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="처리 사유나 메모를 입력하세요..."
          />
        </div>
      )}

      {/* 요청 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-3">⛪</div>
            <p className="text-gray-500">교회 추가 요청이 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRequests.size === requests.length && requests.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">교회명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">담임목사</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">교회 종류</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주소</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">요청일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">처리일</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                  <tr 
                    key={request.requestIdx} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRequestClick(request)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRequests.has(request.requestIdx)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleCheckboxChange(request.requestIdx);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{request.churchName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.churchPastor}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{request.churchType || "-"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 max-w-xs truncate">{request.churchAddr}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.requestStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(request.requestDate), "yyyy-MM-dd")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.processedDate ? format(new Date(request.processedDate), "yyyy-MM-dd") : "-"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            총 {totalCount}개의 요청 중 {((currentPage - 1) * 10) + 1}-{Math.min(currentPage * 10, totalCount)}개 표시
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-2 text-sm border rounded-md ${
                  currentPage === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">교회 추가 요청 상세</h2>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">교회명</label>
                  <div className="text-sm text-gray-900">{selectedRequest.churchName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">담임목사</label>
                  <div className="text-sm text-gray-900">{selectedRequest.churchPastor}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">교회 종류</label>
                  <div className="text-sm text-gray-900">{selectedRequest.churchType || "-"}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                  <div>{getStatusBadge(selectedRequest.requestStatus)}</div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                  <div className="text-sm text-gray-900">{selectedRequest.churchAddr}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">요청일</label>
                  <div className="text-sm text-gray-900">
                    {format(new Date(selectedRequest.requestDate), "yyyy-MM-dd HH:mm")}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">처리일</label>
                  <div className="text-sm text-gray-900">
                    {selectedRequest.processedDate 
                      ? format(new Date(selectedRequest.processedDate), "yyyy-MM-dd HH:mm")
                      : "-"
                    }
                  </div>
                </div>
                {selectedRequest.adminNote && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">관리자 메모</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                      {selectedRequest.adminNote}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurchRequestsPage;
