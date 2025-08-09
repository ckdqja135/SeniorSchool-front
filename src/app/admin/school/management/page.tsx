"use client";

import React, { useState, useEffect } from "react";

interface UnivData {
  univIdx: number;
  univName: string;
  univLocate: string;
  univType: string;
  univEstablish: string;
  univPresident: string;
  univCampos: string;
  univLateX: number;
  univLateY: number;
  univURL: string;
  univLotAddr: number;
  univAddr: string;
  univMapIMG: string;
  univStatus: number;
  univViewCount: number;
}

interface ApiResponse {
  status: number;
  data: UnivData[];
  totalCount: number;
  currentPage: number;
  rowsPerPage: number;
}

const SchoolManagementPage = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [schools, setSchools] = useState<UnivData[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<UnivData | null>(null);
  const [selectedSchools, setSelectedSchools] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSchool, setEditingSchool] = useState<UnivData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 새 학교 데이터 폼
  const [newSchool, setNewSchool] = useState({
    univName: "",
    univLocate: "",
    univType: "",
    univEstablish: "",
    univPresident: "",
    univCampos: "",
    univLateX: 0,
    univLateY: 0,
    univURL: "",
    univLotAddr: 0,
    univAddr: "",
    univMapIMG: "",
    univStatus: 1
  });

  // 학교 검색
  const searchSchools = async (keyword = "") => {
    setLoading(true);
    try {
      const url = keyword 
        ? `https://api.reviewhub.life/admin/univ/searchUniv?keyword=${encodeURIComponent(keyword)}`
        : `https://api.reviewhub.life/admin/univ/searchUniv`;
      
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data: ApiResponse = await response.json();
      
      if (data && data.data) {
        setSchools(data.data || []);
        setTotalPages(Math.ceil((data.totalCount || 0) / (data.rowsPerPage || 10)));
        setCurrentPage(data.currentPage || 1);
      } else {
        setSchools([]);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("검색 실패:", error);
      setSchools([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    searchSchools();
  }, []);

  // 검색 실행
  const handleSearch = () => {
    setCurrentPage(1);
    searchSchools(searchKeyword, 1);
  };

  // 체크박스 선택
  const handleSelectSchool = (univIdx: number) => {
    setSelectedSchools(prev => 
      prev.includes(univIdx) 
        ? prev.filter(id => id !== univIdx)
        : [...prev, univIdx]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!schools || schools.length === 0) return;
    
    if (selectedSchools.length === schools.length) {
      setSelectedSchools([]);
    } else {
      setSelectedSchools(schools.map(school => school.univIdx));
    }
  };

  // 학교 추가
  const handleAddSchool = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch("https://api.reviewhub.life/admin/univ/createUniv", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSchool),
      });

      if (response.ok) {
        alert("학교가 성공적으로 추가되었습니다.");
        setIsAddMode(false);
        setNewSchool({
          univName: "",
          univLocate: "",
          univType: "",
          univEstablish: "",
          univPresident: "",
          univCampos: "",
          univLateX: 0,
          univLateY: 0,
          univURL: "",
          univLotAddr: 0,
          univAddr: "",
          univMapIMG: "",
          univStatus: 1
        });
        searchSchools(searchKeyword, currentPage);
      }
    } catch (error) {
      console.error("학교 추가 실패:", error);
      alert("학교 추가에 실패했습니다.");
    }
  };

  // 학교 삭제
  const handleDeleteSchools = async () => {
    try {
      const deleteData = selectedSchools.length === 1 
        ? { univIdx: selectedSchools[0] }
        : { univIdx: selectedSchools };

      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch("https://api.reviewhub.life/admin/univ/deleteUniv", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteData),
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedSchools([]);
        searchSchools(searchKeyword, currentPage);
      }
    } catch (error) {
      console.error("학교 삭제 실패:", error);
      alert("학교 삭제에 실패했습니다.");
    }
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      searchSchools(searchKeyword, page);
    }
  };

  // 편집 시작
  const handleEditStart = () => {
    if (selectedSchool) {
      setEditingSchool({ ...selectedSchool });
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
      setEditingSchool(null);
      setHasChanges(false);
    }
  };

  // 편집 취소 확인
  const handleCancelConfirm = () => {
    setIsEditMode(false);
    setEditingSchool(null);
    setHasChanges(false);
    setShowCancelModal(false);
  };

  // 편집 데이터 변경
  const handleEditChange = (field: keyof UnivData, value: any) => {
    if (editingSchool && selectedSchool) {
      const updatedSchool = { ...editingSchool, [field]: value };
      setEditingSchool(updatedSchool);
      
      // 변경사항 확인
      const isChanged = JSON.stringify(updatedSchool) !== JSON.stringify(selectedSchool);
      setHasChanges(isChanged);
    }
  };

  // 학교 수정
  const handleUpdateSchool = async () => {
    if (!editingSchool || !selectedSchool) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      
      // 변경된 필드만 추출
      const changedData: any = { univIdx: editingSchool.univIdx };
      Object.keys(editingSchool).forEach(key => {
        if (editingSchool[key as keyof UnivData] !== selectedSchool[key as keyof UnivData]) {
          changedData[key] = editingSchool[key as keyof UnivData];
        }
      });

      const response = await fetch("https://api.reviewhub.life/admin/univ/putUnivData", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedData),
      });

      if (response.ok) {
        alert("학교 정보가 성공적으로 수정되었습니다.");
        setSelectedSchool(editingSchool);
        setIsEditMode(false);
        setEditingSchool(null);
        setHasChanges(false);
        searchSchools(searchKeyword, currentPage);
      }
    } catch (error) {
      console.error("학교 수정 실패:", error);
      alert("학교 수정에 실패했습니다.");
    }
  };

  // 단일 학교 삭제
  const handleDeleteSingleSchool = async () => {
    if (!selectedSchool) return;

    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch("https://api.reviewhub.life/admin/univ/deleteUniv", {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ univIdx: selectedSchool.univIdx }),
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedSchool(null);
        setIsEditMode(false);
        setEditingSchool(null);
        setHasChanges(false);
        searchSchools(searchKeyword, currentPage);
      }
    } catch (error) {
      console.error("학교 삭제 실패:", error);
      alert("학교 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4">
        {/* 메뉴 경로 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">대학선택 - 학교 관리</h2>
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
            title="학교 추가"
          >
            +
          </button>
          <button
            onClick={handleDeleteSchools}
            disabled={selectedSchools.length === 0}
            className={`w-8 h-8 rounded-full text-white ${
              selectedSchools.length > 0 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title="선택된 학교 삭제"
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
                      checked={schools && schools.length > 0 && selectedSchools.length === schools.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">학교 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">학교 이름</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">학교 주소</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">설립 연도</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">로딩 중...</td>
                  </tr>
                ) : !schools || schools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  schools.map((school) => (
                    <tr 
                      key={school.univIdx}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedSchool?.univIdx === school.univIdx ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedSchool(school)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedSchools.includes(school.univIdx)}
                          onChange={() => handleSelectSchool(school.univIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{school.univIdx}</td>
                      <td className="px-3 py-2 text-sm">{school.univName}</td>
                      <td className="px-3 py-2 text-sm">{school.univLocate}</td>
                      <td className="px-3 py-2 text-sm">{school.univEstablish}</td>
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
        {isAddMode ? (
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4">학교 추가</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium mb-1">학교명</label>
                <input
                  type="text"
                  value={newSchool.univName}
                  onChange={(e) => setNewSchool({...newSchool, univName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">위치</label>
                <input
                  type="text"
                  value={newSchool.univLocate}
                  onChange={(e) => setNewSchool({...newSchool, univLocate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">학교 유형</label>
                <input
                  type="text"
                  value={newSchool.univType}
                  onChange={(e) => setNewSchool({...newSchool, univType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설립연도</label>
                <input
                  type="text"
                  value={newSchool.univEstablish}
                  onChange={(e) => setNewSchool({...newSchool, univEstablish: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">총장</label>
                <input
                  type="text"
                  value={newSchool.univPresident}
                  onChange={(e) => setNewSchool({...newSchool, univPresident: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">캠퍼스</label>
                <input
                  type="text"
                  value={newSchool.univCampos}
                  onChange={(e) => setNewSchool({...newSchool, univCampos: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">위도</label>
                  <input
                    type="number"
                    value={newSchool.univLateX}
                    onChange={(e) => setNewSchool({...newSchool, univLateX: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">경도</label>
                  <input
                    type="number"
                    value={newSchool.univLateY}
                    onChange={(e) => setNewSchool({...newSchool, univLateY: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">웹사이트 URL</label>
                <input
                  type="url"
                  value={newSchool.univURL}
                  onChange={(e) => setNewSchool({...newSchool, univURL: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">우편번호</label>
                <input
                  type="number"
                  value={newSchool.univLotAddr}
                  onChange={(e) => setNewSchool({...newSchool, univLotAddr: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">주소</label>
                <input
                  type="text"
                  value={newSchool.univAddr}
                  onChange={(e) => setNewSchool({...newSchool, univAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이미지 URL</label>
                <input
                  type="url"
                  value={newSchool.univMapIMG}
                  onChange={(e) => setNewSchool({...newSchool, univMapIMG: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button
                onClick={handleAddSchool}
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
        ) : selectedSchool ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedSchool.univIdx}
                  </span>
                  <span className="text-lg font-semibold">{selectedSchool.univName}</span>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedSchool.univType}
                  </span>
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedSchool.univLocate}
                  </span>
                </div>
                {!isEditMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditStart}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={handleDeleteSingleSchool}
                      className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 상세 정보 */}
            <h3 className="text-lg font-semibold mb-4">학교 상세 정보</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">학교명</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univName || "" : selectedSchool.univName}
                    onChange={(e) => handleEditChange("univName", e.target.value)}
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
                    value={isEditMode ? editingSchool?.univLocate || "" : selectedSchool.univLocate}
                    onChange={(e) => handleEditChange("univLocate", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">학교 유형</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univType || "" : selectedSchool.univType}
                    onChange={(e) => handleEditChange("univType", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">설립연도</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univEstablish || "" : selectedSchool.univEstablish}
                    onChange={(e) => handleEditChange("univEstablish", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">총장</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univPresident || "" : selectedSchool.univPresident}
                    onChange={(e) => handleEditChange("univPresident", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">캠퍼스</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univCampos || "" : selectedSchool.univCampos}
                    onChange={(e) => handleEditChange("univCampos", e.target.value)}
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
                    value={isEditMode ? editingSchool?.univLateX || 0 : selectedSchool.univLateX}
                    onChange={(e) => handleEditChange("univLateX", parseFloat(e.target.value))}
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
                    value={isEditMode ? editingSchool?.univLateY || 0 : selectedSchool.univLateY}
                    onChange={(e) => handleEditChange("univLateY", parseFloat(e.target.value))}
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
                    value={isEditMode ? editingSchool?.univURL || "" : selectedSchool.univURL}
                    onChange={(e) => handleEditChange("univURL", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">우편번호</label>
                  <input
                    type="number"
                    value={isEditMode ? editingSchool?.univLotAddr || 0 : selectedSchool.univLotAddr}
                    onChange={(e) => handleEditChange("univLotAddr", parseInt(e.target.value))}
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
                    value={isEditMode ? editingSchool?.univAddr || "" : selectedSchool.univAddr}
                    onChange={(e) => handleEditChange("univAddr", e.target.value)}
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
                    value={isEditMode ? editingSchool?.univMapIMG || "" : selectedSchool.univMapIMG}
                    onChange={(e) => handleEditChange("univMapIMG", e.target.value)}
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
                    value={isEditMode ? editingSchool?.univStatus || 0 : selectedSchool.univStatus}
                    onChange={(e) => handleEditChange("univStatus", parseInt(e.target.value))}
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
                    value={isEditMode ? editingSchool?.univViewCount || 0 : selectedSchool.univViewCount}
                    onChange={(e) => handleEditChange("univViewCount", parseInt(e.target.value))}
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
                  onClick={handleUpdateSchool}
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
            학교를 선택하거나 추가 버튼을 클릭하세요.
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

export default SchoolManagementPage;
