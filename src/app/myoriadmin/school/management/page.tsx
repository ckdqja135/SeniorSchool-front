"use client";

import React, { useState, useEffect, useRef } from "react";
import AddressSearchModal, { AddressResult } from "@/components/common/AddressSearchModal";

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
  createdAt?: string;
  updatedAt?: string;
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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingSchool, setEditingSchool] = useState<UnivData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressMode, setAddressMode] = useState<"add" | "edit">("add");
  const hasFetchedSchools = useRef(false);

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
  const searchSchools = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    console.log(`API 호출: keyword="${keyword}", page=${page}, pageSize=${pageSize}`);
    
    try {
      const url = keyword 
        ? `https://api.reviewhub.life/admin/univ/searchUniv?keyword=${encodeURIComponent(keyword)}&page=${page}&rowsPerPage=${pageSize}`
        : `https://api.reviewhub.life/admin/univ/searchUniv?page=${page}&rowsPerPage=${pageSize}`;
      
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
        setSchools(data.data || []);
        setTotalPages(Math.ceil((data.totalCount || 0) / (data.rowsPerPage || pageSize)));
        // 요청한 page 번호를 우선적으로 사용 (백엔드 응답과 관계없이)
        // console.log(`페이지 상태 업데이트: requestedPage=${page}, responseCurrentPage=${data.currentPage}`);
        setCurrentPage(page);
        // 백엔드 응답의 rowsPerPage로 상태 업데이트
        if (data.rowsPerPage) {
          setRowsPerPage(data.rowsPerPage);
        }
      } else {
        setSchools([]);
        setTotalPages(1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("검색 실패:", error);
      setSchools([]);
      setTotalPages(1);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (hasFetchedSchools.current) return;
    hasFetchedSchools.current = true;
    searchSchools("", 1, rowsPerPage);
  }, []);

  // 검색 실행
  const handleSearch = () => {
    setCurrentPage(1);
    hasFetchedSchools.current = false; // 검색 시에는 다시 호출 허용
    searchSchools(searchKeyword, 1, rowsPerPage);
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
        searchSchools(searchKeyword);
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
        searchSchools(searchKeyword);
      }
    } catch (error) {
      console.error("학교 삭제 실패:", error);
      alert("학교 삭제에 실패했습니다.");
    }
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      hasFetchedSchools.current = false; // 페이지 변경 시에는 다시 호출 허용
      searchSchools(searchKeyword, page, rowsPerPage);
    }
  };

  // 페이지당 행 수 변경
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    console.log(`rowsPerPage 변경: ${rowsPerPage} → ${newRowsPerPage}`);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1); // 첫 페이지로 이동
    hasFetchedSchools.current = false; // 행 수 변경 시에는 다시 호출 허용
    searchSchools(searchKeyword, 1, newRowsPerPage);
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
  const handleEditChange = (field: keyof UnivData, value: string | number) => {
    if (editingSchool && selectedSchool) {
      const updatedSchool = { ...editingSchool, [field]: value };
      setEditingSchool(updatedSchool);
      
      // 변경사항 확인
      const isChanged = JSON.stringify(updatedSchool) !== JSON.stringify(selectedSchool);
      setHasChanges(isChanged);
    }
  };

  // 주소 검색 결과 처리
  const handleAddressSelect = (result: AddressResult) => {
    if (addressMode === "add") {
      setNewSchool({
        ...newSchool,
        univAddr: result.roadAddress,
        univLateX: result.latitude,
        univLateY: result.longitude,
      });
    } else if (addressMode === "edit" && editingSchool) {
      const updated = {
        ...editingSchool,
        univAddr: result.roadAddress,
        univLateX: result.latitude,
        univLateY: result.longitude,
      };
      setEditingSchool(updated);
      if (selectedSchool) {
        const isChanged = JSON.stringify(updated) !== JSON.stringify(selectedSchool);
        setHasChanges(isChanged);
      }
    }
  };

  // 학교 수정
  const handleUpdateSchool = async () => {
    if (!editingSchool || !selectedSchool) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      
      // 변경된 필드만 추출
      const changedData: Partial<UnivData> = { univIdx: editingSchool.univIdx };
      Object.keys(editingSchool).forEach(key => {
        const typedKey = key as keyof UnivData;
        const value = editingSchool[typedKey];
        if (value !== selectedSchool[typedKey] && key !== 'createdAt' && key !== 'updatedAt' && value !== undefined) {
          (changedData as Record<string, string | number>)[key] = value as string | number;
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
        searchSchools(searchKeyword);
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
        searchSchools(searchKeyword);
      }
    } catch (error) {
      console.error("학교 삭제 실패:", error);
      alert("학교 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-5">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
        {/* 헤더 */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">학교 관리</h2>
          <p className="text-sm text-gray-400 mt-0.5">등록된 학교 목록</p>
        </div>

        {/* 검색 영역 */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="학교명 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
          >
            검색
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">
            {selectedSchools.length > 0 && `${selectedSchools.length}개 선택됨`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              title="학교 추가"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>
            <button
              onClick={handleDeleteSchools}
              disabled={selectedSchools.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedSchools.length > 0
                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
              title="선택된 학교 삭제"
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
                      checked={schools && schools.length > 0 && selectedSchools.length === schools.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">학교명</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">지역</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">설립</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-400">로딩 중...</td>
                  </tr>
                ) : !schools || schools.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  schools.map((school) => (
                    <tr
                      key={school.univIdx}
                      className={`border-t border-gray-50 cursor-pointer transition-colors ${
                        selectedSchool?.univIdx === school.univIdx
                          ? 'bg-indigo-50/70'
                          : 'hover:bg-gray-50/70'
                      }`}
                      onClick={() => setSelectedSchool(school)}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedSchools.includes(school.univIdx)}
                          onChange={() => handleSelectSchool(school.univIdx)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{school.univIdx}</td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{school.univName}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{school.univLocate}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{school.univEstablish}</td>
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
              className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
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
                  if (page >= 1 && page <= totalPages) {
                    goToPage(page);
                  }
                }}
                className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
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
                <h3 className="text-lg font-bold text-gray-900">학교 추가</h3>
                <p className="text-xs text-gray-400">새 학교 정보를 입력하세요</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">학교명</label>
                <input
                  type="text"
                  value={newSchool.univName}
                  onChange={(e) => setNewSchool({...newSchool, univName: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  placeholder="학교명을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">위치</label>
                  <input
                    type="text"
                    value={newSchool.univLocate}
                    onChange={(e) => setNewSchool({...newSchool, univLocate: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">학교 유형</label>
                  <input
                    type="text"
                    value={newSchool.univType}
                    onChange={(e) => setNewSchool({...newSchool, univType: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">설립연도</label>
                  <input
                    type="text"
                    value={newSchool.univEstablish}
                    onChange={(e) => setNewSchool({...newSchool, univEstablish: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">총장</label>
                  <input
                    type="text"
                    value={newSchool.univPresident}
                    onChange={(e) => setNewSchool({...newSchool, univPresident: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">캠퍼스</label>
                <input
                  type="text"
                  value={newSchool.univCampos}
                  onChange={(e) => setNewSchool({...newSchool, univCampos: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">위도</label>
                  <input
                    type="number"
                    value={newSchool.univLateX}
                    readOnly
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/80 text-gray-700"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">경도</label>
                  <input
                    type="number"
                    value={newSchool.univLateY}
                    readOnly
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/80 text-gray-700"
                    step="any"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">웹사이트 URL</label>
                <input
                  type="url"
                  value={newSchool.univURL}
                  onChange={(e) => setNewSchool({...newSchool, univURL: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">우편번호</label>
                <input
                  type="number"
                  value={newSchool.univLotAddr}
                  onChange={(e) => setNewSchool({...newSchool, univLotAddr: parseInt(e.target.value)})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">주소</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSchool.univAddr}
                    onChange={(e) => setNewSchool({...newSchool, univAddr: e.target.value})}
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => { setAddressMode("add"); setShowAddressModal(true); }}
                    className="shrink-0 px-3 py-2.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    주소 검색
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">이미지 URL</label>
                <input
                  type="url"
                  value={newSchool.univMapIMG}
                  onChange={(e) => setNewSchool({...newSchool, univMapIMG: e.target.value})}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleAddSchool}
                className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
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
        ) : selectedSchool ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-5 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selectedSchool.univName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-md">
                        {selectedSchool.univType}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">
                        {selectedSchool.univLocate}
                      </span>
                      <span className="text-xs text-gray-400">#{selectedSchool.univIdx}</span>
                    </div>
                  </div>
                </div>
                {!isEditMode && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleEditStart}
                      className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 flex items-center justify-center transition-all"
                      title="수정"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={handleDeleteSingleSchool}
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
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">학교명</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univName || "" : selectedSchool.univName}
                    onChange={(e) => handleEditChange("univName", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위치</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univLocate || "" : selectedSchool.univLocate}
                    onChange={(e) => handleEditChange("univLocate", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">학교 유형</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univType || "" : selectedSchool.univType}
                    onChange={(e) => handleEditChange("univType", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">설립연도</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univEstablish || "" : selectedSchool.univEstablish}
                    onChange={(e) => handleEditChange("univEstablish", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">총장</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univPresident || "" : selectedSchool.univPresident}
                    onChange={(e) => handleEditChange("univPresident", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">캠퍼스</label>
                  <input
                    type="text"
                    value={isEditMode ? editingSchool?.univCampos || "" : selectedSchool.univCampos}
                    onChange={(e) => handleEditChange("univCampos", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위도</label>
                  <input
                    type="number"
                    value={isEditMode ? editingSchool?.univLateX || 0 : selectedSchool.univLateX}
                    readOnly
                    step="any"
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-gray-50/80 border-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">경도</label>
                  <input
                    type="number"
                    value={isEditMode ? editingSchool?.univLateY || 0 : selectedSchool.univLateY}
                    readOnly
                    step="any"
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-gray-50/80 border-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">웹사이트 URL</label>
                  <input
                    type="url"
                    value={isEditMode ? editingSchool?.univURL || "" : selectedSchool.univURL}
                    onChange={(e) => handleEditChange("univURL", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">우편번호</label>
                  <input
                    type="number"
                    value={isEditMode ? editingSchool?.univLotAddr || 0 : selectedSchool.univLotAddr}
                    onChange={(e) => handleEditChange("univLotAddr", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">주소</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={isEditMode ? editingSchool?.univAddr || "" : selectedSchool.univAddr}
                      onChange={(e) => handleEditChange("univAddr", e.target.value)}
                      readOnly={!isEditMode}
                      className={`flex-1 px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                        isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                      }`}
                    />
                    {isEditMode && (
                      <button
                        type="button"
                        onClick={() => { setAddressMode("edit"); setShowAddressModal(true); }}
                        className="shrink-0 px-3 py-2.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        주소 검색
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">이미지 URL</label>
                  <input
                    type="url"
                    value={isEditMode ? editingSchool?.univMapIMG || "" : selectedSchool.univMapIMG}
                    onChange={(e) => handleEditChange("univMapIMG", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">상태</label>
                  <input
                    type="number"
                    value={isEditMode ? editingSchool?.univStatus || 0 : selectedSchool.univStatus}
                    onChange={(e) => handleEditChange("univStatus", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">조회수</label>
                  <input
                    type="number"
                    value={isEditMode ? editingSchool?.univViewCount || 0 : selectedSchool.univViewCount}
                    onChange={(e) => handleEditChange("univViewCount", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">등록일</label>
                  <div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">
                    {selectedSchool.createdAt
                      ? new Date(selectedSchool.createdAt).toLocaleString('ko-KR', {
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
                    {selectedSchool.updatedAt
                      ? new Date(selectedSchool.updatedAt).toLocaleString('ko-KR', {
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
                  onClick={handleUpdateSchool}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">학교를 선택하거나</p>
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
              className="w-full px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
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

      {/* 주소 검색 모달 */}
      <AddressSearchModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelect={handleAddressSelect}
      />
    </div>
  );
};

export default SchoolManagementPage;
