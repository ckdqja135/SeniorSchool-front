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
        ? `https://api.reviewhub.life/admin/outsource/searchOutsource?outsourceName=${encodeURIComponent(keyword)}&page=${page}&rowsPerPage=${pageSize}`
        : `https://api.reviewhub.life/admin/outsource/searchOutsource?page=${page}&rowsPerPage=${pageSize}`;
      
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
        
        // totalPages를 직접 사용
        const totalPagesFromAPI = data.totalPages || 1;
        
        console.log(`페이징 정보 업데이트: totalPages=${totalPagesFromAPI}, currentPage=${page}`);
        
        setTotalPages(totalPagesFromAPI);
        
        // currentPage 설정
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
      
      const response = await fetch("https://api.reviewhub.life/admin/outsource/createOutsource", {
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

      const response = await fetch(`https://api.reviewhub.life/admin/outsource/${selectedOutsources[0]}`, {
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

      const response = await fetch(`https://api.reviewhub.life/admin/outsource/${editingOutsource.outsourceIdx}`, {
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

      const response = await fetch(`https://api.reviewhub.life/admin/outsource/${selectedOutsource.outsourceIdx}`, {
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
    <div className="flex h-full gap-4">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4">
        {/* 메뉴 경로 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">외주선택 - 외주업체 관리</h2>
        </div>

        {/* 검색 영역 */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="검색 텍스트 입력"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            검색
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setIsAddMode(true)}
            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600"
            title="외주업체 추가"
          >
            +
          </button>
          <button
            onClick={handleDeleteOutsources}
            disabled={selectedOutsources.length === 0}
            className={`w-8 h-8 rounded-full text-white ${
              selectedOutsources.length > 0 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title="선택된 외주업체 삭제"
          >
            🗑️
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
                      checked={outsources && outsources.length > 0 && selectedOutsources.length === outsources.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">외주업체 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">외주업체 이름</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">주소</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">외주업체 종류</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">대표명</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">로딩 중...</td>
                  </tr>
                ) : !outsources || outsources.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  outsources.map((outsource) => (
                    <tr 
                      key={outsource.outsourceIdx}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedOutsource?.outsourceIdx === outsource.outsourceIdx ? 'bg-yellow-50' : ''
                      }`}
                      onClick={() => setSelectedOutsource(outsource)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedOutsources.includes(outsource.outsourceIdx)}
                          onChange={() => handleSelectOutsource(outsource.outsourceIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{outsource.outsourceIdx}</td>
                      <td className="px-3 py-2 text-sm">{outsource.outsourceName}</td>
                      <td className="px-3 py-2 text-sm">
                        {outsource.outsourceLocation || outsource.outsourceAddr || outsource.outsourceLotAddr || '-'}
                      </td>
                      <td className="px-3 py-2 text-sm">{outsource.outsourceType}</td>
                      <td className="px-3 py-2 text-sm">{outsource.outsourceCEO}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {/* 페이지당 행 수 선택 */}
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
          
          {/* 페이징 버튼들 */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => goToPage(1)}
              disabled={currentPage === 1 || totalPages <= 0}
              className={`px-2 py-1 text-sm border rounded transition-colors ${
                currentPage === 1 || totalPages <= 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
              }`}
              title="첫 페이지"
            >
              ⏮️
            </button>
            <button 
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1 || totalPages <= 0}
              className={`px-2 py-1 text-sm border rounded transition-colors ${
                currentPage === 1 || totalPages <= 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
              }`}
              title="이전 페이지"
            >
              ◀️
            </button>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={currentPage}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt(e.currentTarget.value);
                    if (!isNaN(page) && page >= 1 && totalPages > 0 && page <= totalPages) {
                      goToPage(page);
                    } else {
                      e.currentTarget.value = currentPage.toString();
                    }
                  }
                }}
                onBlur={(e) => {
                  const page = parseInt(e.target.value);
                  if (!isNaN(page) && page >= 1 && totalPages > 0 && page <= totalPages) {
                    goToPage(page);
                  } else {
                    e.target.value = currentPage.toString();
                  }
                }}
                className="w-12 px-1 py-1 text-sm text-center border rounded"
                min={1}
                max={totalPages || 1}
                placeholder="1"
              />
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>
            <button 
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages <= 0}
              className={`px-2 py-1 text-sm border rounded transition-colors ${
                currentPage === totalPages || totalPages <= 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
              }`}
              title="다음 페이지"
            >
              ▶️
            </button>
            <button 
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages || totalPages <= 0}
              className={`px-2 py-1 text-sm border rounded transition-colors ${
                currentPage === totalPages || totalPages <= 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
              }`}
              title="마지막 페이지"
            >
              ⏭️
            </button>
          </div>
        </div>
      </div>

      {/* 오른쪽 상세 영역 */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        {isAddMode ? (
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4">외주업체 추가</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium mb-1">외주업체명</label>
                <input
                  type="text"
                  value={newOutsource.outsourceName}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">위치</label>
                <input
                  type="text"
                  value={newOutsource.outsourceLocation}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceLocation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">외주업체 종류</label>
                <input
                  type="text"
                  value={newOutsource.outsourceType}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설립년도</label>
                <input
                  type="text"
                  value={newOutsource.outsourceEstablished}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceEstablished: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">대표자</label>
                <input
                  type="text"
                  value={newOutsource.outsourceCEO}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceCEO: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">위도</label>
                  <input
                    type="number"
                    value={newOutsource.outsourceLatX}
                    onChange={(e) => setNewOutsource({...newOutsource, outsourceLatX: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">경도</label>
                  <input
                    type="number"
                    value={newOutsource.outsourceLatY}
                    onChange={(e) => setNewOutsource({...newOutsource, outsourceLatY: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">웹사이트 URL</label>
                <input
                  type="url"
                  value={newOutsource.outsourceURL}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceURL: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">지번</label>
                <input
                  type="text"
                  value={newOutsource.outsourceLotAddr}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceLotAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">주소</label>
                <input
                  type="text"
                  value={newOutsource.outsourceAddr}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이미지 URL</label>
                <input
                  type="url"
                  value={newOutsource.outsourceMapIMG}
                  onChange={(e) => setNewOutsource({...newOutsource, outsourceMapIMG: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button
                onClick={handleAddOutsource}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                저장
              </button>
              <button
                onClick={() => setIsAddMode(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                취소
              </button>
            </div>
          </div>
        ) : selectedOutsource ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedOutsource.outsourceIdx}
                  </span>
                  <span className="text-lg font-semibold">{selectedOutsource.outsourceName}</span>
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedOutsource.outsourceType}
                  </span>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedOutsource.outsourceLocation}
                  </span>
                </div>
                {!isEditMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditStart}
                      className="w-8 h-8 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center justify-center"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={handleDeleteSingleOutsource}
                      className="w-8 h-8 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center"
                      title="삭제"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 상세 정보 */}
            <h3 className="text-lg font-semibold mb-4">외주업체 상세 정보</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">외주업체명</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceName || "" : selectedOutsource.outsourceName}
                    onChange={(e) => handleEditChange("outsourceName", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">위치</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceLocation || "" : selectedOutsource.outsourceLocation}
                    onChange={(e) => handleEditChange("outsourceLocation", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">외주업체 종류</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceType || "" : selectedOutsource.outsourceType}
                    onChange={(e) => handleEditChange("outsourceType", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">설립년도</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceEstablished || "" : selectedOutsource.outsourceEstablished}
                    onChange={(e) => handleEditChange("outsourceEstablished", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">대표자</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceCEO || "" : selectedOutsource.outsourceCEO}
                    onChange={(e) => handleEditChange("outsourceCEO", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">위도</label>
                  <input
                    type="number"
                    value={isEditMode ? editingOutsource?.outsourceLatX || 0 : selectedOutsource.outsourceLatX}
                    onChange={(e) => handleEditChange("outsourceLatX", parseFloat(e.target.value))}
                    readOnly={!isEditMode}
                    step="any"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">경도</label>
                  <input
                    type="number"
                    value={isEditMode ? editingOutsource?.outsourceLatY || 0 : selectedOutsource.outsourceLatY}
                    onChange={(e) => handleEditChange("outsourceLatY", parseFloat(e.target.value))}
                    readOnly={!isEditMode}
                    step="any"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">웹사이트 URL</label>
                  <input
                    type="url"
                    value={isEditMode ? editingOutsource?.outsourceURL || "" : selectedOutsource.outsourceURL}
                    onChange={(e) => handleEditChange("outsourceURL", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">지번</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceLotAddr || "" : selectedOutsource.outsourceLotAddr}
                    onChange={(e) => handleEditChange("outsourceLotAddr", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">주소</label>
                  <input
                    type="text"
                    value={isEditMode ? editingOutsource?.outsourceAddr || "" : selectedOutsource.outsourceAddr}
                    onChange={(e) => handleEditChange("outsourceAddr", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">이미지 URL</label>
                  <input
                    type="url"
                    value={isEditMode ? editingOutsource?.outsourceMapIMG || "" : selectedOutsource.outsourceMapIMG}
                    onChange={(e) => handleEditChange("outsourceMapIMG", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">상태</label>
                  <input
                    type="number"
                    value={isEditMode ? editingOutsource?.outsourceStatus || 0 : selectedOutsource.outsourceStatus}
                    onChange={(e) => handleEditChange("outsourceStatus", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">조회수</label>
                  <input
                    type="number"
                    value={isEditMode ? editingOutsource?.outsourceViewCount || 0 : selectedOutsource.outsourceViewCount}
                    onChange={(e) => handleEditChange("outsourceViewCount", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">등록일</label>
                  <div className="w-full px-3 py-2 text-gray-700 bg-gray-50 rounded-md">
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
                  <label className="block text-sm font-medium mb-1">수정일</label>
                  <div className="w-full px-3 py-2 text-gray-700 bg-gray-50 rounded-md">
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
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={handleUpdateOutsource}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  저장
                </button>
                <button
                  onClick={handleEditCancel}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  취소
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            외주업체를 선택하거나 추가 버튼을 클릭하세요.
          </div>
        )}
      </div>

      {/* 삭제 완료 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">알림</h3>
            <p className="mb-4">삭제가 완료되었습니다.</p>
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 편집 취소 확인 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">확인</h3>
            <p className="mb-4">변경된 사항이 있습니다. 변경을 취소하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleCancelConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                예
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                아니오
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutsourceManagementPage;

