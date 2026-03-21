"use client";

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

// API 베이스 URL을 상수로 관리
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

interface OutsourceRequest {
  requestIdx: number;
  outsourceName: string;
  outsourceCEO: string | null;
  outsourceType: string | null;
  outsourceAddr: string;
  requestStatus: "pending" | "completed" | "rejected";
  requestDate: string;
  processedDate: string | null;
  adminNote: string | null;
  // 상세 정보 필드들 (API 응답의 requestData 필드 포함)
  name?: string;
  tagline?: string;
  category?: string;
  contactEmail?: string;
  isPublic?: boolean;
  serviceTypes?: string[];
  description?: string;
  region?: string;
  websiteUrl?: string;
  mainPortfolioUrl?: string;
  contactChannel?: string;
  customCategory?: string;
  minBudget?: number;
  avgBudget?: number;
  maxBudget?: number;
  avgBudgetRange?: string;
  team?: {
    frontend?: number;
    backend?: number;
    ai?: number;
    mobile?: number;
    designer?: number;
    pm?: number;
    devops?: number;
    qa?: number;
    etc?: number;
    total?: number;
  };
  devInfo?: {
    techStackSummary?: string[];
    frontendStacks?: string[];
    backendStacks?: string[];
    aiStacks?: string[];
    mobileStacks?: string[];
    infraStacks?: string[];
    devTags?: string[];
    repoUrls?: string[];
    githubAccount?: string;
    avgDevExperienceYears?: number;
    devProjectTypes?: string[];
    devPreferenceNote?: string;
  };
  govSupport?: {
    hasGovSupportExperience?: boolean;
    govSupportPrograms?: string[];
    govSupportTotalCount?: number;
    govSupportRecentYear?: number;
    govSupportMainTitle?: string;
    govSupportLinks?: string[];
    govSupportSummary?: string;
  };
}

interface ApiResponse {
  status: number;
  requests: OutsourceRequest[];
  totalCount: number;
  currentPage: string | number;
  rowsPerPage?: number;
  totalPages: number;
}

const OutsourceRequestsPage: React.FC = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<OutsourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<OutsourceRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const hasFetchedRequests = useRef(false);

  const fetchRequests = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        router.push("/myoriadmin/sign-in");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/outsource/request?page=${page}&rowsPerPage=10`, {
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
        setRequests(data.requests || []);
        setTotalCount(data.totalCount || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(Number(data.currentPage) || page);
      } else {
        throw new Error("외주업체 추가 요청을 불러올 수 없습니다.");
      }
    } catch (error) {
      console.error("외주업체 추가 요청 로딩 오류:", error);
      setError("외주업체 추가 요청을 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRequests.current) return;
    hasFetchedRequests.current = true;
    fetchRequests();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    hasFetchedRequests.current = false;
    fetchRequests(page);
  };

  const handleRequestClick = async (request: OutsourceRequest) => {
    setIsDetailModalOpen(true);
    setIsLoadingDetail(true);
    setAdminNote(request.adminNote || '');
    
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        router.push("/myoriadmin/sign-in");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/outsource/request/${request.requestIdx}`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 200 && data.data) {
        // API 응답 데이터를 selectedRequest에 설정
        setSelectedRequest(data.data);
        setAdminNote(data.data.adminNote || '');
      } else {
        // API 호출 실패 시 기본 데이터 사용
        setSelectedRequest(request);
      }
    } catch (error) {
      console.error("상세 정보 조회 오류:", error);
      // 에러 발생 시 기본 데이터 사용
      setSelectedRequest(request);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSelectRequest = (requestIdx: number) => {
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
      setSelectedRequests(new Set(requests.map(r => r.requestIdx)));
    }
  };

  const processRequests = async (status: "completed" | "rejected") => {
    if (selectedRequests.size === 0) {
      alert("처리할 요청을 선택해주세요.");
      return;
    }

    if (!confirm(`선택한 ${selectedRequests.size}개의 요청을 ${status === "completed" ? "승인" : "거절"}하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    const accessToken = localStorage.getItem("accessToken");

    try {
      const promises = Array.from(selectedRequests).map(requestIdx => {
        const url = `${API_BASE_URL}/admin/outsource/request/${requestIdx}/status`;
        return fetch(url, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestStatus: status,
            adminNote: status === "rejected" ? adminNote : null,
          }),
        });
      });

      const results = await Promise.all(promises);
      
      // 모든 요청이 성공했는지 확인
      const allSuccessful = results.every(response => response.ok);
      
      if (allSuccessful) {
        alert("요청이 성공적으로 처리되었습니다.");
        setSelectedRequests(new Set());
        setAdminNote('');
        fetchRequests(currentPage);
      } else {
        throw new Error("일부 요청 처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("요청 처리 오류:", error);
      alert("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const processSingleRequest = async (status: "completed" | "rejected") => {
    if (!selectedRequest) return;

    if (!confirm(`이 요청을 ${status === "completed" ? "승인" : "거절"}하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    const accessToken = localStorage.getItem("accessToken");

    try {
      const url = `${API_BASE_URL}/admin/outsource/request/${selectedRequest.requestIdx}/status`;
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestStatus: status,
          adminNote: status === "rejected" ? adminNote : null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText || `HTTP ${response.status} 에러` };
        }
        throw new Error(errorData.message || `요청 처리에 실패했습니다. (${response.status})`);
      }

      const data = await response.json();
      
      if (data.status === 200) {
        alert("요청이 성공적으로 처리되었습니다.");
        setIsDetailModalOpen(false);
        setSelectedRequest(null);
        setAdminNote('');
        fetchRequests(currentPage);
      } else {
        throw new Error(data.message || "요청 처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("요청 처리 오류:", error);
      alert(error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">대기중</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">처리완료</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">처리완료</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">거부됨</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">알 수 없음</span>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              hasFetchedRequests.current = false;
              fetchRequests();
            }}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">외주업체 추가 요청 관리</h1>
            <p className="mt-2 text-sm text-gray-600">
              사용자들이 요청한 외주업체 추가 신청을 관리합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-lg">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">전체 요청</p>
                <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600 text-lg">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">대기중</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.requestStatus === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg">✅</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">처리완료</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.requestStatus === 'completed').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-lg">❌</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">거부됨</p>
                <p className="text-2xl font-bold text-gray-900">
                  {requests.filter(r => r.requestStatus === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 요청 테이블 */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    요청 번호
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    외주업체명
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    대표자
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    외주업체 종류
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주소
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    요청일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-5xl mb-3">📋</div>
                      <p className="text-gray-500 text-sm">등록된 요청이 없습니다.</p>
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr
                      key={request.requestIdx}
                      onClick={() => handleRequestClick(request)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        #{request.requestIdx}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.requestStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.outsourceName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.outsourceCEO || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {request.outsourceType || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {request.outsourceAddr}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.requestDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">이전</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    currentPage === page
                      ? "z-10 bg-yellow-50 border-yellow-500 text-yellow-600"
                      : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">다음</span>
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* 상세보기 모달 */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900">외주업체 추가 요청 상세</h2>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                  <p className="ml-3 text-gray-600">상세 정보를 불러오는 중...</p>
                </div>
              ) : selectedRequest ? (
                <>
                  <div className="space-y-4">
                    {/* 기본 정보 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
                        <div>{getStatusBadge(selectedRequest.requestStatus)}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">요청 번호</label>
                        <p className="text-sm text-gray-900">#{selectedRequest.requestIdx}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">외주업체명</label>
                      <p className="text-sm text-gray-900">{selectedRequest.name || selectedRequest.outsourceName}</p>
                    </div>

                    {selectedRequest.tagline && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">한 줄 소개</label>
                        <p className="text-sm text-gray-900">{selectedRequest.tagline}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">대표자</label>
                        <p className="text-sm text-gray-900">{selectedRequest.outsourceCEO || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">외주업체 종류</label>
                        <p className="text-sm text-gray-900">{selectedRequest.category || selectedRequest.outsourceType || '-'}</p>
                      </div>
                    </div>

                    {selectedRequest.customCategory && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">기타 분야명</label>
                        <p className="text-sm text-gray-900">{selectedRequest.customCategory}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                      <p className="text-sm text-gray-900">{selectedRequest.region || selectedRequest.outsourceAddr}</p>
                    </div>

                    {selectedRequest.serviceTypes && selectedRequest.serviceTypes.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">세부 서비스 타입</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.serviceTypes.map((type, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedRequest.description && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">상세 설명</label>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{selectedRequest.description}</p>
                      </div>
                    )}

                    {/* 연락처 정보 */}
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">연락처 정보</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedRequest.contactEmail && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                            <p className="text-sm text-gray-900">{selectedRequest.contactEmail}</p>
                          </div>
                        )}
                        {selectedRequest.contactChannel && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">연락 채널</label>
                            <p className="text-sm text-gray-900">{selectedRequest.contactChannel}</p>
                          </div>
                        )}
                        {selectedRequest.websiteUrl && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">웹사이트</label>
                            <a href={selectedRequest.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                              {selectedRequest.websiteUrl}
                            </a>
                          </div>
                        )}
                        {selectedRequest.mainPortfolioUrl && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">포트폴리오</label>
                            <a href={selectedRequest.mainPortfolioUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                              {selectedRequest.mainPortfolioUrl}
                            </a>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">공개 여부</label>
                          <p className="text-sm text-gray-900">{selectedRequest.isPublic ? '공개' : '비공개'}</p>
                        </div>
                      </div>
                    </div>

                    {/* 개발 분야 전용 정보 */}
                    {selectedRequest.category === 'DEVELOPMENT' && selectedRequest.devInfo && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">개발 분야 정보</h3>
                        
                        {(selectedRequest.minBudget !== undefined || selectedRequest.avgBudget !== undefined || selectedRequest.maxBudget !== undefined) && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">예산 정보</label>
                            <div className="grid grid-cols-3 gap-4">
                              {selectedRequest.minBudget !== undefined && (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">최소 예산</label>
                                  <p className="text-sm text-gray-900">{(selectedRequest.minBudget as number).toLocaleString()}원</p>
                                </div>
                              )}
                              {selectedRequest.avgBudget !== undefined && (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">평균 예산</label>
                                  <p className="text-sm text-gray-900">{(selectedRequest.avgBudget as number).toLocaleString()}원</p>
                                </div>
                              )}
                              {selectedRequest.maxBudget !== undefined && (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">최대 예산</label>
                                  <p className="text-sm text-gray-900">{(selectedRequest.maxBudget as number).toLocaleString()}원</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedRequest.devInfo.techStackSummary && selectedRequest.devInfo.techStackSummary.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">주요 기술스택</label>
                            <div className="flex flex-wrap gap-2">
                              {selectedRequest.devInfo.techStackSummary.map((stack, index) => (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {stack}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedRequest.team && (selectedRequest.team.total ?? 0) > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">팀 구성 (총 {selectedRequest.team.total ?? 0}명)</label>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              {(selectedRequest.team.frontend ?? 0) > 0 && <div>프론트엔드: {selectedRequest.team.frontend}명</div>}
                              {(selectedRequest.team.backend ?? 0) > 0 && <div>백엔드: {selectedRequest.team.backend}명</div>}
                              {(selectedRequest.team.ai ?? 0) > 0 && <div>AI: {selectedRequest.team.ai}명</div>}
                              {(selectedRequest.team.mobile ?? 0) > 0 && <div>모바일: {selectedRequest.team.mobile}명</div>}
                              {(selectedRequest.team.designer ?? 0) > 0 && <div>디자이너: {selectedRequest.team.designer}명</div>}
                              {(selectedRequest.team.pm ?? 0) > 0 && <div>PM: {selectedRequest.team.pm}명</div>}
                              {(selectedRequest.team.devops ?? 0) > 0 && <div>DevOps: {selectedRequest.team.devops}명</div>}
                              {(selectedRequest.team.qa ?? 0) > 0 && <div>QA: {selectedRequest.team.qa}명</div>}
                              {(selectedRequest.team.etc ?? 0) > 0 && <div>기타: {selectedRequest.team.etc}명</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 정부지원사업 정보 */}
                    {selectedRequest.govSupport && selectedRequest.govSupport.hasGovSupportExperience && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">정부지원사업 정보</h3>
                        {selectedRequest.govSupport.govSupportPrograms && selectedRequest.govSupport.govSupportPrograms.length > 0 && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">수행 프로그램</label>
                            <div className="flex flex-wrap gap-2">
                              {selectedRequest.govSupport.govSupportPrograms.map((program, index) => (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {program}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedRequest.govSupport.govSupportSummary && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">요약</label>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-md">{selectedRequest.govSupport.govSupportSummary}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 요청 일시 */}
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">요청일</label>
                          <p className="text-sm text-gray-900">
                            {format(new Date(selectedRequest.requestDate), "yyyy-MM-dd HH:mm:ss")}
                          </p>
                        </div>
                        {selectedRequest.processedDate && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">처리일</label>
                            <p className="text-sm text-gray-900">
                              {format(new Date(selectedRequest.processedDate), "yyyy-MM-dd HH:mm:ss")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 관리자 메모 */}
                    {selectedRequest.requestStatus === 'pending' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">관리자 메모 (거절 시)</label>
                        <textarea
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                          rows={3}
                          placeholder="거절 사유를 입력하세요..."
                        />
                      </div>
                    )}

                    {selectedRequest.adminNote && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">관리자 메모</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">
                          {selectedRequest.adminNote}
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedRequest.requestStatus === 'pending' && (
                    <div className="mt-6 flex gap-3 justify-end border-t pt-4">
                      <button
                        onClick={() => processSingleRequest("rejected")}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        거절
                      </button>
                      <button
                        onClick={() => processSingleRequest("completed")}
                        disabled={isProcessing}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        승인
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500">상세 정보를 불러올 수 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutsourceRequestsPage;

