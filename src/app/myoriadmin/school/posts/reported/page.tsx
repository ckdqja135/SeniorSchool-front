"use client";

import React, { useState, useEffect } from "react";

interface ReportData {
  reportIdx: number;
  postIdx: number;
  reporterId: string;
  reportReason: string;
  reportStatus: number;
  reportDate: string;
  postTitle?: string;
  postContent?: string;
  postAuthor?: string;
}

const ReportedPostsPage = () => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // 신고 게시글 목록 가져오기
  const fetchReports = async () => {
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/report/getReports`;
      
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data: ReportData[] = await response.json();
      
      if (data && Array.isArray(data)) {
        setReports(data);
        setTotalPages(1); // 단일 페이지로 설정
        setCurrentPage(1);
      } else {
        setReports([]);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("신고 게시글 목록 가져오기 실패:", error);
      setReports([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchReports();
  }, []);

  // 체크박스 선택
  const handleSelectReport = (reportIdx: number) => {
    setSelectedReports(prev => 
      prev.includes(reportIdx) 
        ? prev.filter(id => id !== reportIdx)
        : [...prev, reportIdx]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!reports || reports.length === 0) return;
    
    if (selectedReports.length === reports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reports.map(report => report.reportIdx));
    }
  };

  // 신고 처리 (승인/거부)
  const handleProcessReports = async (status: number) => {
    try {
      const processData = selectedReports.length === 1 
        ? { reportIdx: selectedReports[0], status }
        : { reportIdx: selectedReports, status };

      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/report/processReports`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processData),
      });

      if (response.ok) {
        alert(`신고가 성공적으로 ${status === 1 ? '승인' : '거부'}되었습니다.`);
        setSelectedReports([]);
        fetchReports();
      }
    } catch (error) {
      console.error("신고 처리 실패:", error);
      alert("신고 처리에 실패했습니다.");
    }
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchReports();
    }
  };

  // 신고 상태 텍스트 변환
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "대기중";
      case 1: return "승인";
      case 2: return "거부";
      default: return "알 수 없음";
    }
  };

  // 신고 상태 색상
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return "bg-yellow-100 text-yellow-800";
      case 1: return "bg-green-100 text-green-800";
      case 2: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4">
        {/* 메뉴 경로 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">게시글 관리 - 신고 게시글</h2>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => handleProcessReports(1)}
            disabled={selectedReports.length === 0}
            className={`px-4 py-2 text-white rounded-md text-sm ${
              selectedReports.length > 0 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title="선택된 신고 승인"
          >
            승인
          </button>
          <button
            onClick={() => handleProcessReports(2)}
            disabled={selectedReports.length === 0}
            className={`px-4 py-2 text-white rounded-md text-sm ${
              selectedReports.length > 0 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title="선택된 신고 거부"
          >
            거부
          </button>
        </div>

        {/* 테이블 */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-y-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={reports && reports.length > 0 && selectedReports.length === reports.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">신고 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">게시글 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">신고자</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">신고 사유</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center">로딩 중...</td>
                  </tr>
                ) : !reports || reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center">신고된 게시글이 없습니다.</td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr 
                      key={report.reportIdx}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedReport?.reportIdx === report.reportIdx ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedReport(report)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedReports.includes(report.reportIdx)}
                          onChange={() => handleSelectReport(report.reportIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{report.reportIdx}</td>
                      <td className="px-3 py-2 text-sm">{report.postIdx}</td>
                      <td className="px-3 py-2 text-sm">{report.reporterId}</td>
                      <td className="px-3 py-2 text-sm max-w-xs truncate" title={report.reportReason}>
                        {report.reportReason}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(report.reportStatus)}`}>
                          {getStatusText(report.reportStatus)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button 
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm border rounded disabled:opacity-50"
          >
            ⏮️
          </button>
          <button 
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-sm border rounded disabled:opacity-50"
          >
            ◀️
          </button>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  goToPage(page);
                }
              }}
              className="w-12 px-1 py-1 text-sm text-center border rounded"
              min={1}
              max={totalPages}
            />
            <span className="text-sm">of {totalPages}</span>
          </div>
          <button 
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-sm border rounded disabled:opacity-50"
          >
            ▶️
          </button>
          <button 
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-sm border rounded disabled:opacity-50"
          >
            ⏭️
          </button>
        </div>
      </div>

      {/* 오른쪽 상세 영역 */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        {selectedReport ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedReport.reportIdx}
                  </span>
                  <span className="text-lg font-semibold">게시글 #{selectedReport.postIdx}</span>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedReport.reporterId}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(selectedReport.reportStatus)}`}>
                    {getStatusText(selectedReport.reportStatus)}
                  </span>
                </div>
              </div>
            </div>

            {/* 상세 정보 */}
            <h3 className="text-lg font-semibold mb-4">신고 상세 정보</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">신고 ID</label>
                  <input
                    type="text"
                    value={selectedReport.reportIdx}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">게시글 ID</label>
                  <input
                    type="text"
                    value={selectedReport.postIdx}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">신고자</label>
                  <input
                    type="text"
                    value={selectedReport.reporterId}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">신고 사유</label>
                  <textarea
                    value={selectedReport.reportReason}
                    readOnly
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">신고 상태</label>
                  <input
                    type="text"
                    value={getStatusText(selectedReport.reportStatus)}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">신고 날짜</label>
                  <input
                    type="text"
                    value={selectedReport.reportDate || "날짜 정보 없음"}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                {selectedReport.postTitle && (
                  <div>
                    <label className="block text-sm font-medium mb-1">게시글 제목</label>
                    <input
                      type="text"
                      value={selectedReport.postTitle}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                )}
                {selectedReport.postAuthor && (
                  <div>
                    <label className="block text-sm font-medium mb-1">게시글 작성자</label>
                    <input
                      type="text"
                      value={selectedReport.postAuthor}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                )}
                {selectedReport.postContent && (
                  <div>
                    <label className="block text-sm font-medium mb-1">게시글 내용</label>
                    <textarea
                      value={selectedReport.postContent}
                      readOnly
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>
            
            {/* 액션 버튼 */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => handleProcessReports(1)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                승인
              </button>
              <button
                onClick={() => handleProcessReports(2)}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                거부
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            신고된 게시글을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportedPostsPage;
