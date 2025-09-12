"use client";

import React, { useState, useEffect } from "react";

interface ChurchData {
  churchIdx: number;
  churchName: string;
  churchLocation: string;
  churchType: string;
  churchEstablished: string;
  churchPastor: string;
  churchLatX: number;
  churchLatY: number;
  churchURL: string;
  churchLotAddr: string;
  churchAddr: string;
  churchMapIMG: string;
  churchStatus: number;
  churchViewCount: number;
}

interface ApiResponse {
  status: number;
  data: ChurchData[];
  totalCount: number;
  currentPage: number;
  rowsPerPage: number;
}

const ChurchManagementPage = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [churches, setChurches] = useState<ChurchData[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<ChurchData | null>(null);
  const [selectedChurches, setSelectedChurches] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingChurch, setEditingChurch] = useState<ChurchData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 새 교회 데이터 폼
  const [newChurch, setNewChurch] = useState({
    churchName: "",
    churchLocation: "",
    churchType: "",
    churchEstablished: "",
    churchPastor: "",
    churchLatX: 0,
    churchLatY: 0,
    churchURL: "",
    churchLotAddr: "",
    churchAddr: "",
    churchMapIMG: "",
    churchStatus: 1
  });

  // 교회 검색
  const searchChurches = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    console.log(`API 호출: keyword="${keyword}", page=${page}, pageSize=${pageSize}`);
    
    try {
      const url = keyword 
        ? `https://api.reviewhub.life/admin/church/searchChurch?churchName=${encodeURIComponent(keyword)}&page=${page}&rowsPerPage=${pageSize}`
        : `https://api.reviewhub.life/admin/church/searchChurch?page=${page}&rowsPerPage=${pageSize}`;
      
      console.log(`요청 URL: ${url}`);
      
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data: ApiResponse = await response.json();
      
      console.log(`API 응답:`, data);
      
      if (data && data.data) {
        setChurches(data.data || []);
        setTotalPages(Math.ceil((data.totalCount || 0) / (data.rowsPerPage || pageSize)));
        setCurrentPage(page);
        if (data.rowsPerPage) {
          setRowsPerPage(data.rowsPerPage);
        }
      } else {
        setChurches([]);
        setTotalPages(1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("검색 실패:", error);
      setChurches([]);
      setTotalPages(1);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    searchChurches("", 1, rowsPerPage);
  }, []);

  // 검색 실행
  const handleSearch = () => {
    setCurrentPage(1);
    searchChurches(searchKeyword, 1, rowsPerPage);
  };

  // 체크박스 선택
  const handleSelectChurch = (churchIdx: number) => {
    setSelectedChurches(prev => 
      prev.includes(churchIdx) 
        ? prev.filter(id => id !== churchIdx)
        : [...prev, churchIdx]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!churches || churches.length === 0) return;
    
    if (selectedChurches.length === churches.length) {
      setSelectedChurches([]);
    } else {
      setSelectedChurches(churches.map(church => church.churchIdx));
    }
  };

  // 교회 추가
  const handleAddChurch = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch("https://api.reviewhub.life/admin/church/createChurch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newChurch),
      });

      if (response.ok) {
        alert("교회가 성공적으로 추가되었습니다.");
        setIsAddMode(false);
        setNewChurch({
          churchName: "",
          churchLocation: "",
          churchType: "",
          churchEstablished: "",
          churchPastor: "",
          churchLatX: 0,
          churchLatY: 0,
          churchURL: "",
          churchLotAddr: "",
          churchAddr: "",
          churchMapIMG: "",
          churchStatus: 1
        });
        searchChurches(searchKeyword);
      }
    } catch (error) {
      console.error("교회 추가 실패:", error);
      alert("교회 추가에 실패했습니다.");
    }
  };

  // 교회 삭제
  const handleDeleteChurches = async () => {
    try {
      const deleteData = selectedChurches.length === 1 
        ? { churchIdx: selectedChurches[0] }
        : { churchIdx: selectedChurches };

      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch("https://api.reviewhub.life/admin/church/deleteChurch", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteData),
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedChurches([]);
        searchChurches(searchKeyword);
      }
    } catch (error) {
      console.error("교회 삭제 실패:", error);
      alert("교회 삭제에 실패했습니다.");
    }
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      searchChurches(searchKeyword, page, rowsPerPage);
    }
  };

  // 페이지당 행 수 변경
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    console.log(`rowsPerPage 변경: ${rowsPerPage} → ${newRowsPerPage}`);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
    searchChurches(searchKeyword, 1, newRowsPerPage);
  };

  // 편집 시작
  const handleEditStart = () => {
    if (selectedChurch) {
      setEditingChurch({ ...selectedChurch });
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
      setEditingChurch(null);
      setHasChanges(false);
    }
  };

  // 편집 취소 확인
  const handleCancelConfirm = () => {
    setIsEditMode(false);
    setEditingChurch(null);
    setHasChanges(false);
    setShowCancelModal(false);
  };

  // 편집 데이터 변경
  const handleEditChange = (field: keyof ChurchData, value: string | number) => {
    if (editingChurch && selectedChurch) {
      const updatedChurch = { ...editingChurch, [field]: value };
      setEditingChurch(updatedChurch);
      
      const isChanged = JSON.stringify(updatedChurch) !== JSON.stringify(selectedChurch);
      setHasChanges(isChanged);
    }
  };

  // 교회 수정
  const handleUpdateChurch = async () => {
    if (!editingChurch || !selectedChurch) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const changedData: Partial<ChurchData> = { churchIdx: editingChurch.churchIdx };
      Object.keys(editingChurch).forEach(key => {
        const typedKey = key as keyof ChurchData;
        if (editingChurch[typedKey] !== selectedChurch[typedKey]) {
          (changedData as Record<string, string | number>)[key] = editingChurch[typedKey];
        }
      });

      const response = await fetch("https://api.reviewhub.life/admin/church/putChurchData", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedData),
      });

      if (response.ok) {
        alert("교회 정보가 성공적으로 수정되었습니다.");
        setSelectedChurch(editingChurch);
        setIsEditMode(false);
        setEditingChurch(null);
        setHasChanges(false);
        searchChurches(searchKeyword);
      }
    } catch (error) {
      console.error("교회 수정 실패:", error);
      alert("교회 수정에 실패했습니다.");
    }
  };

  // 단일 교회 삭제
  const handleDeleteSingleChurch = async () => {
    if (!selectedChurch) return;

    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch("https://api.reviewhub.life/admin/church/deleteChurch", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ churchIdx: selectedChurch.churchIdx }),
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedChurch(null);
        setIsEditMode(false);
        setEditingChurch(null);
        setHasChanges(false);
        searchChurches(searchKeyword);
      }
    } catch (error) {
      console.error("교회 삭제 실패:", error);
      alert("교회 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4">
        {/* 메뉴 경로 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">교회선택 - 교회 관리</h2>
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
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            검색
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setIsAddMode(true)}
            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600"
            title="교회 추가"
          >
            +
          </button>
          <button
            onClick={handleDeleteChurches}
            disabled={selectedChurches.length === 0}
            className={`w-8 h-8 rounded-full text-white ${
              selectedChurches.length > 0 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title="선택된 교회 삭제"
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
                      checked={churches && churches.length > 0 && selectedChurches.length === churches.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">교회 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">교회 이름</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">교회 위치</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">교회 종류</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">로딩 중...</td>
                  </tr>
                ) : !churches || churches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  churches.map((church) => (
                    <tr 
                      key={church.churchIdx}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedChurch?.churchIdx === church.churchIdx ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedChurch(church)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedChurches.includes(church.churchIdx)}
                          onChange={() => handleSelectChurch(church.churchIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{church.churchIdx}</td>
                      <td className="px-3 py-2 text-sm">{church.churchName}</td>
                      <td className="px-3 py-2 text-sm">{church.churchLocation}</td>
                      <td className="px-3 py-2 text-sm">{church.churchType}</td>
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
              disabled={currentPage === 1}
              className={`px-2 py-1 text-sm border rounded transition-colors ${
                currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
              }`}
              title="첫 페이지"
            >
              ⏮️
            </button>
            <button 
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-2 py-1 text-sm border rounded transition-colors ${
                currentPage === 1 
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
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>
            <button 
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 text-sm border rounded transition-colors ${
                currentPage === totalPages 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
              }`}
              title="다음 페이지"
            >
              ▶️
            </button>
            <button 
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 text-sm border rounded transition-colors ${
                currentPage === totalPages 
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
            <h3 className="text-lg font-semibold mb-4">교회 추가</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium mb-1">교회명</label>
                <input
                  type="text"
                  value={newChurch.churchName}
                  onChange={(e) => setNewChurch({...newChurch, churchName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">위치</label>
                <input
                  type="text"
                  value={newChurch.churchLocation}
                  onChange={(e) => setNewChurch({...newChurch, churchLocation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">교회 종류</label>
                <input
                  type="text"
                  value={newChurch.churchType}
                  onChange={(e) => setNewChurch({...newChurch, churchType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설립년도</label>
                <input
                  type="text"
                  value={newChurch.churchEstablished}
                  onChange={(e) => setNewChurch({...newChurch, churchEstablished: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">담임목사</label>
                <input
                  type="text"
                  value={newChurch.churchPastor}
                  onChange={(e) => setNewChurch({...newChurch, churchPastor: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">위도</label>
                  <input
                    type="number"
                    value={newChurch.churchLatX}
                    onChange={(e) => setNewChurch({...newChurch, churchLatX: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">경도</label>
                  <input
                    type="number"
                    value={newChurch.churchLatY}
                    onChange={(e) => setNewChurch({...newChurch, churchLatY: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">웹사이트 URL</label>
                <input
                  type="url"
                  value={newChurch.churchURL}
                  onChange={(e) => setNewChurch({...newChurch, churchURL: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">지번</label>
                <input
                  type="text"
                  value={newChurch.churchLotAddr}
                  onChange={(e) => setNewChurch({...newChurch, churchLotAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">주소</label>
                <input
                  type="text"
                  value={newChurch.churchAddr}
                  onChange={(e) => setNewChurch({...newChurch, churchAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이미지 URL</label>
                <input
                  type="url"
                  value={newChurch.churchMapIMG}
                  onChange={(e) => setNewChurch({...newChurch, churchMapIMG: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button
                onClick={handleAddChurch}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
        ) : selectedChurch ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedChurch.churchIdx}
                  </span>
                  <span className="text-lg font-semibold">{selectedChurch.churchName}</span>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedChurch.churchType}
                  </span>
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedChurch.churchLocation}
                  </span>
                </div>
                {!isEditMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditStart}
                      className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={handleDeleteSingleChurch}
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
            <h3 className="text-lg font-semibold mb-4">교회 상세 정보</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">교회명</label>
                  <input
                    type="text"
                    value={isEditMode ? editingChurch?.churchName || "" : selectedChurch.churchName}
                    onChange={(e) => handleEditChange("churchName", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchLocation || "" : selectedChurch.churchLocation}
                    onChange={(e) => handleEditChange("churchLocation", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">교회 종류</label>
                  <select
                    value={isEditMode ? editingChurch?.churchType || "" : selectedChurch.churchType}
                    onChange={(e) => handleEditChange("churchType", e.target.value)}
                    disabled={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <option value="감리교">감리교</option>
                    <option value="장로교">장로교</option>
                    <option value="침례교">침례교</option>
                    <option value="성결교">성결교</option>
                    <option value="순복음">순복음</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">설립년도</label>
                  <input
                    type="text"
                    value={isEditMode ? editingChurch?.churchEstablished || "" : selectedChurch.churchEstablished}
                    onChange={(e) => handleEditChange("churchEstablished", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">담임목사</label>
                  <input
                    type="text"
                    value={isEditMode ? editingChurch?.churchPastor || "" : selectedChurch.churchPastor}
                    onChange={(e) => handleEditChange("churchPastor", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchLatX || 0 : selectedChurch.churchLatX}
                    onChange={(e) => handleEditChange("churchLatX", parseFloat(e.target.value))}
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
                    value={isEditMode ? editingChurch?.churchLatY || 0 : selectedChurch.churchLatY}
                    onChange={(e) => handleEditChange("churchLatY", parseFloat(e.target.value))}
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
                    value={isEditMode ? editingChurch?.churchURL || "" : selectedChurch.churchURL}
                    onChange={(e) => handleEditChange("churchURL", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchLotAddr || "" : selectedChurch.churchLotAddr}
                    onChange={(e) => handleEditChange("churchLotAddr", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchAddr || "" : selectedChurch.churchAddr}
                    onChange={(e) => handleEditChange("churchAddr", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchMapIMG || "" : selectedChurch.churchMapIMG}
                    onChange={(e) => handleEditChange("churchMapIMG", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchStatus || 0 : selectedChurch.churchStatus}
                    onChange={(e) => handleEditChange("churchStatus", parseInt(e.target.value))}
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
                    value={isEditMode ? editingChurch?.churchViewCount || 0 : selectedChurch.churchViewCount}
                    onChange={(e) => handleEditChange("churchViewCount", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
              </div>
            </div>
            
            {/* 편집 모드 버튼 */}
            {isEditMode && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={handleUpdateChurch}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
            교회를 선택하거나 추가 버튼을 클릭하세요.
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
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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

export default ChurchManagementPage;
