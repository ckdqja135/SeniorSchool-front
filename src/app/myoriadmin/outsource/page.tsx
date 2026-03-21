"use client";

import React, { useState, useEffect, useRef } from "react";

interface OutsourceData {
  outsourceIdx: number;
  outsourceName: string;
  outsourceLocation: string;
  outsourceType: string;
  outsourceEstablished: string;
  outsourceCEO: string;
  outsourceLatX: number;
  outsourceLatY: number;
  outsourceURL: string;
  outsourceLotAddr: string;
  outsourceAddr: string;
  outsourceMapIMG: string;
  outsourceStatus: number;
  outsourceViewCount: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  status: number;
  outsources: OutsourceData[];
  totalCount?: number;
  currentPage?: number;
  rowsPerPage?: number;
  totalPages?: number;
  pagination?: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    rowsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const OutsourceManagementPage = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [outsources, setOutsources] = useState<OutsourceData[]>([]);
  const [selectedOutsource, setSelectedOutsource] = useState<OutsourceData | null>(null);
  const [selectedOutsources, setSelectedOutsources] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingOutsource, setEditingOutsource] = useState<OutsourceData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const hasFetchedOutsources = useRef(false);

  // 새 외주업체 데이터 폼
  const [newOutsource, setNewOutsource] = useState({
    outsourceName: "",
    outsourceLocation: "",
    outsourceType: "",
    outsourceEstablished: "",
    outsourceCEO: "",
    outsourceLatX: 0,
    outsourceLatY: 0,
    outsourceURL: "",
    outsourceLotAddr: "",
    outsourceAddr: "",
    outsourceMapIMG: "",
    outsourceStatus: 1
  });

  // 외주업체 검색
  const searchOutsources = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    console.log(`API 호출: keyword="${keyword}", page=${page}, pageSize=${pageSize}`);

    try {
      const url = keyword
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/outsource/searchOutsource?outsourceName=${encodeURIComponent(keyword)}&page=${page}&rowsPerPage=${pageSize}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/admin/outsource/searchOutsource?page=${page}&rowsPerPage=${pageSize}`;

      console.log(`요청 URL: ${url}`);

      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      const data: ApiResponse = await response.json();

      console.log(`API 응답:`, data);

      if (data && data.outsources) {
        setOutsources(data.outsources || []);

        const totalPagesFromAPI = data.totalPages || 1;

        console.log(`페이징 정보 업데이트: totalPages=${totalPagesFromAPI}, currentPage=${page}`);

        setTotalPages(totalPagesFromAPI);

        if (data.currentPage) {
          setCurrentPage(Number(data.currentPage));
        }
      } else {
        setOutsources([]);
        setTotalPages(1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("검색 실패:", error);
      setOutsources([]);
      setTotalPages(1);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (hasFetchedOutsources.current) return;
    hasFetchedOutsources.current = true;
    searchOutsources("", 1, rowsPerPage);
  }, []);

  // 검색 실행
  const handleSearch = () => {
    setCurrentPage(1);
    hasFetchedOutsources.current = false;
    searchOutsources(searchKeyword, 1, rowsPerPage);
  };

  // 체크박스 선택
  const handleSelectOutsource = (outsourceIdx: number) => {
    setSelectedOutsources(prev =>
      prev.includes(outsourceIdx)
        ? prev.filter(id => id !== outsourceIdx)
        : [...prev, outsourceIdx]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!outsources || outsources.length === 0) return;

    if (selectedOutsources.length === outsources.length) {
      setSelectedOutsources([]);
    } else {
      setSelectedOutsources(outsources.map(outsource => outsource.outsourceIdx));
    }
  };

  // 외주업체 추가
  const handleAddOutsource = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/outsource/createOutsource`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newOutsource),
      });

      if (response.ok) {
        alert("외주업체가 성공적으로 추가되었습니다.");
        setIsAddMode(false);
        setNewOutsource({
          outsourceName: "",
          outsourceLocation: "",
          outsourceType: "",
          outsourceEstablished: "",
          outsourceCEO: "",
          outsourceLatX: 0,
          outsourceLatY: 0,
          outsourceURL: "",
          outsourceLotAddr: "",
          outsourceAddr: "",
          outsourceMapIMG: "",
          outsourceStatus: 1
        });
        searchOutsources(searchKeyword);
      }
    } catch (error) {
      console.error("외주업체 추가 실패:", error);
      alert("외주업체 추가에 실패했습니다.");
    }
  };

  // 외주업체 삭제
  const handleDeleteOutsources = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/outsource/${selectedOutsources[0]}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedOutsources([]);
        searchOutsources(searchKeyword);
      }
    } catch (error) {
      console.error("외주업체 삭제 실패:", error);
      alert("외주업체 삭제에 실패했습니다.");
    }
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    console.log(`페이지 이동 시도: ${page}, totalPages: ${totalPages}`);
    if (page >= 1 && totalPages > 0 && page <= totalPages) {
      setCurrentPage(page);
      hasFetchedOutsources.current = false;
      searchOutsources(searchKeyword, page, rowsPerPage);
    } else {
      console.log(`페이지 이동 실패: page=${page}, totalPages=${totalPages}`);
    }
  };

  // 페이지당 행 수 변경
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    console.log(`rowsPerPage 변경: ${rowsPerPage} → ${newRowsPerPage}`);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
    hasFetchedOutsources.current = false;
    searchOutsources(searchKeyword, 1, newRowsPerPage);
  };

  // 편집 시작
  const handleEditStart = () => {
    if (selectedOutsource) {
      setEditingOutsource({ ...selectedOutsource });
      setIsEditMode(true);
      setHasChanges(false);
    }
  };

  // 편집 취소
  const handleEditCancel = () => {
    if (hasChanges) {
      setShowCancelModal(true);
    } else {
      setIsEditMode(false);
      setEditingOutsource(null);
      setHasChanges(false);
    }
  };

  // 편집 취소 확인
  const handleCancelConfirm = () => {
    setIsEditMode(false);
    setEditingOutsource(null);
    setHasChanges(false);
    setShowCancelModal(false);
  };

  // 편집 데이터 변경
  const handleEditChange = (field: keyof OutsourceData, value: string | number) => {
    if (editingOutsource && selectedOutsource) {
      const updatedOutsource = { ...editingOutsource, [field]: value };
      setEditingOutsource(updatedOutsource);

      const isChanged = JSON.stringify(updatedOutsource) !== JSON.stringify(selectedOutsource);
      setHasChanges(isChanged);
    }
  };

  // 외주업체 수정
  const handleUpdateOutsource = async () => {
    if (!editingOutsource || !selectedOutsource) return;

    try {
      const accessToken = localStorage.getItem("accessToken");

      const changedData: Partial<OutsourceData> = { outsourceIdx: editingOutsource.outsourceIdx };
      Object.keys(editingOutsource).forEach(key => {
        const typedKey = key as keyof OutsourceData;
        const value = editingOutsource[typedKey];
        if (value !== selectedOutsource[typedKey] && key !== 'createdAt' && key !== 'updatedAt' && value !== undefined) {
          (changedData as Record<string, string | number>)[key] = value as string | number;
        }
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/outsource/${editingOutsource.outsourceIdx}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedData),
      });

      if (response.ok) {
        alert("외주업체 정보가 성공적으로 수정되었습니다.");
        setSelectedOutsource(editingOutsource);
        setIsEditMode(false);
        setEditingOutsource(null);
        setHasChanges(false);
        searchOutsources(searchKeyword);
      }
    } catch (error) {
      console.error("외주업체 수정 실패:", error);
      alert("외주업체 수정에 실패했습니다.");
    }
  };

  // 단일 외주업체 삭제
  const handleDeleteSingleOutsource = async () => {
    if (!selectedOutsource) return;

    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/outsource/${selectedOutsource.outsourceIdx}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedOutsource(null);
        setIsEditMode(false);
        setEditingOutsource(null);
        setHasChanges(false);
        searchOutsources(searchKeyword);
      }
    } catch (error) {
      console.error("외주업체 삭제 실패:", error);
      alert("외주업체 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-5">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
        {/* 헤더 */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">외주업체 관리</h2>
          <p className="text-sm text-gray-400 mt-0.5">등록된 외주업체 목록</p>
        </div>

        {/* 검색 영역 */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="외주업체명 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
          >
            검색
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">
            {selectedOutsources.length > 0 && `${selectedOutsources.length}개 선택됨`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              title="외주업체 추가"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>
            <button
              onClick={handleDeleteOutsources}
              disabled={selectedOutsources.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedOutsources.length > 0
                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
              title="선택된 외주업체 삭제"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              삭제
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
            <table className="w-full">
              <thead className="bg-gray-50/80 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={outsources && outsources.length > 0 && selectedOutsources.length === outsources.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">업체명</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">주소</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">종류</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">대표명</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">로딩 중...</td>
                  </tr>
                ) : !outsources || outsources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  outsources.map((outsource) => (
                    <tr
                      key={outsource.outsourceIdx}
                      className={`border-t border-gray-50 cursor-pointer transition-colors ${
                        selectedOutsource?.outsourceIdx === outsource.outsourceIdx
                          ? 'bg-purple-50/70'
                          : 'hover:bg-gray-50/70'
                      }`}
                      onClick={() => setSelectedOutsource(outsource)}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedOutsources.includes(outsource.outsourceIdx)}
                          onChange={() => handleSelectOutsource(outsource.outsourceIdx)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{outsource.outsourceIdx}</td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{outsource.outsourceName}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500 truncate max-w-[150px]">
                        {outsource.outsourceLocation || outsource.outsourceAddr || outsource.outsourceLotAddr || '-'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{outsource.outsourceType}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{outsource.outsourceCEO}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
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
              disabled={currentPage === 1 || totalPages <= 0}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                currentPage === 1 || totalPages <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || totalPages <= 0}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                currentPage === 1 || totalPages <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-1 px-2">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && totalPages > 0 && page <= totalPages) {
                    goToPage(page);
                  }
                }}
                className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                min={1}
                max={totalPages || 1}
              />
              <span className="text-xs text-gray-400">/ {totalPages}</span>
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages <= 0}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                currentPage === totalPages || totalPages <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages || totalPages <= 0}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                currentPage === totalPages || totalPages <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 오른쪽 상세 영역 */}
      <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
        {isAddMode ? (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">외주업체 추가</h3>
                <p className="text-xs text-gray-400">새 외주업체 정보를 입력하세요</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">외주업체명</label>
                <input
                  type="text"
                  value={newOutsource.outsourceName}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceName: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  placeholder="외주업체명을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">위치</label>
                  <input
                    type="text"
                    value={newOutsource.outsourceLocation}
                    onChange={(e) => setNewOutsource({...newOutsource, outsourceLocation: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">업체 종류</label>
                  <input
                    type="text"
                    value={newOutsource.outsourceType}
                    onChange={(e) => setNewOutsource({...newOutsource, outsourceType: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">설립년도</label>
                  <input
                    type="text"
                    value={newOutsource.outsourceEstablished}
                    onChange={(e) => setNewOutsource({...newOutsource, outsourceEstablished: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">대표자</label>
                  <input
                    type="text"
                    value={newOutsource.outsourceCEO}
                    onChange={(e) => setNewOutsource({...newOutsource, outsourceCEO: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">위도</label>
                  <input
                    type="number"
                    value={newOutsource.outsourceLatX}
                    onChange={(e) => setNewOutsource({...newOutsource, outsourceLatX: parseFloat(e.target.value)})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">경도</label>
                  <input
                    type="number"
                    value={newOutsource.outsourceLatY}
                    onChange={(e) => setNewOutsource({...newOutsource, outsourceLatY: parseFloat(e.target.value)})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                    step="any"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">웹사이트 URL</label>
                <input
                  type="url"
                  value={newOutsource.outsourceURL}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceURL: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">지번</label>
                <input
                  type="text"
                  value={newOutsource.outsourceLotAddr}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceLotAddr: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">주소</label>
                <input
                  type="text"
                  value={newOutsource.outsourceAddr}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceAddr: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">이미지 URL</label>
                <input
                  type="url"
                  value={newOutsource.outsourceMapIMG}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceMapIMG: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleAddOutsource}
                className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
              >
                저장
              </button>
              <button
                onClick={() => setIsAddMode(false)}
                className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        ) : selectedOutsource ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-5 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selectedOutsource.outsourceName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">
                        {selectedOutsource.outsourceType}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-md">
                        {selectedOutsource.outsourceLocation}
                      </span>
                      <span className="text-xs text-gray-400">#{selectedOutsource.outsourceIdx}</span>
                    </div>
                  </div>
                </div>
                {!isEditMode && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleEditStart}
                      className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 hover:border-purple-300 hover:bg-purple-50 flex items-center justify-center transition-all"
                      title="수정"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleDeleteSingleOutsource}
                      className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 hover:border-rose-300 hover:bg-rose-50 flex items-center justify-center transition-all"
                      title="삭제"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 상세 정보 */}
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-bold text-gray-900">상세 정보</h3>
              {isEditMode && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-md">편집중</span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">외주업체명</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceName || "" : selectedOutsource.outsourceName}
                    onChange={(e) => handleEditChange("outsourceName", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위치</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceLocation || "" : selectedOutsource.outsourceLocation}
                    onChange={(e) => handleEditChange("outsourceLocation", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">업체 종류</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceType || "" : selectedOutsource.outsourceType}
                    onChange={(e) => handleEditChange("outsourceType", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">설립년도</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceEstablished || "" : selectedOutsource.outsourceEstablished}
                    onChange={(e) => handleEditChange("outsourceEstablished", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">대표자</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceCEO || "" : selectedOutsource.outsourceCEO}
                    onChange={(e) => handleEditChange("outsourceCEO", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위도</label>
                  <input
                    type="number"
                    value={isEditMode ? editingOutsource?.outsourceLatX || 0 : selectedOutsource.outsourceLatX}
                    onChange={(e) => handleEditChange("outsourceLatX", parseFloat(e.target.value))}
                    readOnly={!isEditMode}
                    step="any"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">경도</label>
                  <input
                    type="number"
                    value={isEditMode ? editingOutsource?.outsourceLatY || 0 : selectedOutsource.outsourceLatY}
                    onChange={(e) => handleEditChange("outsourceLatY", parseFloat(e.target.value))}
                    readOnly={!isEditMode}
                    step="any"
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">웹사이트 URL</label>
                  <input
                    type="url"
                    value={isEditMode ? editingOutsource?.outsourceURL || "" : selectedOutsource.outsourceURL}
                    onChange={(e) => handleEditChange("outsourceURL", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">지번</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceLotAddr || "" : selectedOutsource.outsourceLotAddr}
                    onChange={(e) => handleEditChange("outsourceLotAddr", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">주소</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceAddr || "" : selectedOutsource.outsourceAddr}
                    onChange={(e) => handleEditChange("outsourceAddr", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">이미지 URL</label>
                  <input
                    type="url"
                    value={isEditMode ? editingOutsource?.outsourceMapIMG || "" : selectedOutsource.outsourceMapIMG}
                    onChange={(e) => handleEditChange("outsourceMapIMG", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">상태</label>
                  <input
                    type="number"
                    value={isEditMode ? editingOutsource?.outsourceStatus || 0 : selectedOutsource.outsourceStatus}
                    onChange={(e) => handleEditChange("outsourceStatus", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">조회수</label>
                  <input
                    type="number"
                    value={isEditMode ? editingOutsource?.outsourceViewCount || 0 : selectedOutsource.outsourceViewCount}
                    onChange={(e) => handleEditChange("outsourceViewCount", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">등록일</label>
                  <div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">
                    {selectedOutsource.createdAt
                      ? new Date(selectedOutsource.createdAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">수정일</label>
                  <div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">
                    {selectedOutsource.updatedAt
                      ? new Date(selectedOutsource.updatedAt).toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* 편집 모드 버튼 */}
            {isEditMode && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={handleUpdateOutsource}
                  className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm"
                >
                  저장
                </button>
                <button
                  onClick={handleEditCancel}
                  className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">외주업체를 선택하거나</p>
            <p className="text-sm text-gray-400">추가 버튼을 클릭하세요</p>
          </div>
        )}
      </div>

      {/* 삭제 완료 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">삭제 완료</h3>
            <p className="text-sm text-gray-500 text-center mb-5">선택한 항목이 삭제되었습니다.</p>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="w-full px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 편집 취소 확인 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">변경 취소</h3>
            <p className="text-sm text-gray-500 text-center mb-5">변경된 사항이 있습니다. 취소하시겠습니까?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors"
              >
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutsourceManagementPage;
