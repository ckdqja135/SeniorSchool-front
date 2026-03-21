"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";

// API 베이스 URL을 상수로 관리
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

interface ReportData {
  reportIdx: number;
  boardIdx: number;
  serviceType: string;
  reportReason: string;
  reportDate: string;
  reportStatus: string;
  reportResult: string | null;
  reporterId: string;
  isDeleted: boolean;
}

interface ApiResponse {
  status: number;
  data: ReportData[];
  totalCount: number;
  currentPage: number;
  rowsPerPage: number;
}

const ReportedPostsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [selectedReports, setSelectedReports] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 신고 게시글 목록 가져오기
  const fetchReports = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // 로컬 스토리지에서 인증 토큰 가져오기
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      console.log('🔑 인증 토큰 확인:', token ? '있음' : '없음');
      
      const apiUrl = `${API_BASE_URL}/admin/report/getReports?page=${page}`;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      // 토큰이 있으면 Authorization 헤더에 추가
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        setError('로그인이 필요합니다.');
        return;
      }
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers,
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      const data: ApiResponse = await response.json();
      
      if (data.status === 200) {
        console.log('🎯 데이터 설정 시작');
        setReports(data.data || []);
        setTotalPages(Math.ceil(data.totalCount / data.rowsPerPage));
        setTotalCount(data.totalCount || 0);
        setCurrentPage(data.currentPage || 1);
      } else {
        throw new Error(`API 응답 오류: ${data.status}`);
      }
    } catch (err) {
      console.error('💥 Fetch Error:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      console.log('🏁 API 호출 완료');
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchReports();
  }, []);

  // 체크박스 선택
  const toggleReportSelection = (reportIdx: number) => {
    const newSelected = new Set(selectedReports);
    if (newSelected.has(reportIdx)) {
      newSelected.delete(reportIdx);
    } else {
      newSelected.add(reportIdx);
    }
    setSelectedReports(newSelected);
  };

  // 전체 선택/해제
  const toggleAllSelection = () => {
    if (selectedReports.size === reports.length) {
      setSelectedReports(new Set());
    } else {
      setSelectedReports(new Set(reports.map(r => r.reportIdx)));
    }
  };

  // 신고 처리 (승인/거부)
  const handleProcessReports = async (status: string) => {
    try {
      setIsProcessing(true);
      
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const processData = selectedReports.size === 1 
        ? { reportIdx: Array.from(selectedReports)[0], status }
        : { reportIdx: Array.from(selectedReports), status };

      const response = await fetch(`${API_BASE_URL}/admin/report/processReports`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processData),
      });

      if (response.ok) {
        alert(`신고가 성공적으로 ${status === 'completed' ? '조치 완료' : status === 'rejected' ? '거부' : '처리'}되었습니다.`);
        setSelectedReports(new Set());
        fetchReports(currentPage);
      }
    } catch (error) {
      console.error("신고 처리 실패:", error);
      setError("신고 처리에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 신고 상태 업데이트 (새로운 API)
  const updateReportStatus = async (reportIdx: number, status: string, reportResult: string) => {
    try {
      setIsProcessing(true);
      
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || sessionStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }

      const updateData = {
        reportIdx: reportIdx,
        reportStatus: status,
        reportResult: reportResult
      };

      const response = await fetch(`${API_BASE_URL}/admin/report/updateReportStatus`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert(`신고가 성공적으로 ${status === 'completed' ? '조치 완료' : status === 'rejected' ? '거부' : '처리'}되었습니다.`);
        closeDetailModal();
        fetchReports(currentPage);
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error("신고 상태 업데이트 실패:", error);
      setError("신고 상태 업데이트에 실패했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 페이지 이동
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchReports(page);
  };

  // 신고 상태 텍스트 변환
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "대기중";
      case "completed": return "조치";
      case "rejected": return "거부";
      default: return status || "알 수 없음";
    }
  };

  // 신고 상태 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // 상태 배지 컴포넌트
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">대기중</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">조치완료</span>;
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

  const handleRequestClick = (report: ReportData) => {
    setSelectedReport(report);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedReport(null);
    setAdminNote('');
  };

  // 전체 선택된 신고들 처리
  const processSelectedReports = async (status: string) => {
    if (selectedReports.size === 0) {
      setError('선택된 신고가 없습니다.');
      return;
    }

    try {
      setIsProcessing(true);
      
      for (const reportIdx of selectedReports) {
        await handleProcessReports(status);
      }
      
      setSelectedReports(new Set());
      setAdminNote('');
      
    } catch (err) {
      console.error('💥 전체 처리 오류:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
            onClick={() => fetchReports()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
            <h1 className="text-2xl font-bold text-gray-900">신고 게시글 관리</h1>
            <p className="mt-2 text-sm text-gray-600">
              사용자들이 신고한 게시글을 관리합니다.
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
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">전체 신고</p>
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
                  {reports.filter(r => r.reportStatus === 'pending').length}
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
                <p className="text-sm font-medium text-gray-500">조치완료</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.reportStatus === 'completed').length}
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
                  {reports.filter(r => r.reportStatus === 'rejected').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">신고 목록</h2>
              <div className="flex items-center space-x-3">
                {selectedReports.size > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {selectedReports.size}개 선택됨
                    </span>
                    <input
                      type="text"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="관리자 메모 (선택사항)"
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => processSelectedReports('completed')}
                      disabled={isProcessing}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span className="text-sm">선택 조치</span>
                    </button>
                    <button
                      onClick={() => processSelectedReports('completed')}
                      disabled={isProcessing}
                      className="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      <span className="text-sm">선택 거부</span>
                    </button>
                  </div>
                )}
                <button
                  onClick={() => fetchReports(currentPage)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-300 bg-blue-100 text-blue-600 hover:bg-blue-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  <span className="text-sm">새로고침</span>
                </button>
              </div>
            </div>
          </div>

                  {reports.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">신고가 없습니다</h3>
              <p className="text-gray-500">아직 신고된 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedReports.size === reports.length && reports.length > 0}
                        onChange={toggleAllSelection}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신고 번호
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      게시글 ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      서비스 타입
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신고자
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신고 사유
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      신고일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr
                      key={report.reportIdx}
                      className="hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedReports.has(report.reportIdx)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleReportSelection(report.reportIdx);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                        onClick={() => handleRequestClick(report)}
                      >
                        {report.reportIdx}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {report.boardIdx}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.serviceType || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.reporterId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                        {report.reportReason || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(report.reportStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(report.reportDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  총 <span className="font-medium">{totalCount}</span>개 중{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * 10 + 1}
                  </span>
                  -{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * 10, totalCount)}
                  </span>
                  개
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  신고 상세 정보
                </h3>
                <button
                  onClick={closeDetailModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      신고 번호
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {selectedReport.reportIdx}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      상태
                    </label>
                    <div className="mt-1">
                      {getStatusBadge(selectedReport.reportStatus)}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      게시글 ID
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {selectedReport.boardIdx}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      서비스 타입
                    </label>
                    <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                      {selectedReport.serviceType || '-'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    신고자
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {selectedReport.reporterId || '-'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    신고 사유
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                    {selectedReport.reportReason || '-'}
                  </p>
                </div>
                
                                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       신고일
                     </label>
                     <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                       {formatDate(selectedReport.reportDate)}
                     </p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       신고 결과
                     </label>
                     <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                       {selectedReport.reportResult || '처리되지 않음'}
                     </p>
                   </div>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     신고 처리 결과
                   </label>
                   <textarea
                     value={adminNote}
                     onChange={(e) => setAdminNote(e.target.value)}
                     placeholder="신고 처리 결과를 입력하세요..."
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     rows={3}
                   />
                 </div>
               </div>
              
                             <div className="mt-6 flex justify-end space-x-3">
                 <button
                   onClick={() => updateReportStatus(selectedReport.reportIdx, 'completed', adminNote)}
                   disabled={isProcessing || !adminNote.trim()}
                   className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                 >
                   {isProcessing ? '처리 중...' : '조치 완료'}
                 </button>
                 <button
                   onClick={() => updateReportStatus(selectedReport.reportIdx, 'rejected', adminNote)}
                   className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                 >
                   거부
                 </button>
                 <button
                   onClick={closeDetailModal}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                 >
                   닫기
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportedPostsPage;
