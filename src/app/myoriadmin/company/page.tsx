"use client";

import React, { useState, useEffect, useRef } from "react";

interface CompanyData {
  compIdx: number;
  compName: string;
  compLocation: string;
  compType: string;
  compIndustry: string;
  compEstablish: string;
  compCEO: string;
  compLateX: number;
  compLateY: number;
  compURL: string;
  compLotAddr: string;
  compAddr: string;
  compMapIMG: string;
  compStatus: number;
  compViewCount: number;
}

interface ApiResponse {
  status: number;
  data: CompanyData[];
  totalCount?: number;
  currentPage?: number;
  rowsPerPage?: number;
  pagination?: {
    totalCount: number;
    totalPages: number;
    currentPage: number;
    rowsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

const CompanyManagementPage = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const hasFetchedCompanies = useRef(false);

  // 새 회사 데이터 폼
  const [newCompany, setNewCompany] = useState({
    compName: "",
    compLocation: "",
    compType: "",
    compIndustry: "",
    compEstablish: "",
    compCEO: "",
    compLateX: 0,
    compLateY: 0,
    compURL: "",
    compLotAddr: "",
    compAddr: "",
    compMapIMG: "",
    compStatus: 1
  });

  // 회사 검색
  const searchCompanies = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    console.log(`API 호출: keyword="${keyword}", page=${page}, pageSize=${pageSize}`);
    
    try {
      const url = keyword 
        ? `https://api.reviewhub.life/admin/comp/searchComp?compName=${encodeURIComponent(keyword)}&page=${page}&rowsPerPage=${pageSize}`
        : `https://api.reviewhub.life/admin/comp/searchComp?page=${page}&rowsPerPage=${pageSize}`;
      
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
      
      if (data && data.data) {
        // 회사 데이터의 위치 정보 확인을 위한 로그
        if (data.data.length > 0) {
          console.log("첫 번째 회사 데이터:", data.data[0]);
          console.log("compLocation:", data.data[0].compLocation);
          console.log("compAddr:", data.data[0].compAddr);
          console.log("compLotAddr:", data.data[0].compLotAddr);
        }
        const normalized = (data.data || []).map((item: any) => ({
          ...item,
          compLocation: item.compLocation ?? item.compLocate ?? "",
        }));
        setCompanies(normalized);
        // pagination 객체에서 페이징 정보 가져오기
        if (data.pagination) {
          const totalPagesFromAPI = data.pagination.totalPages || 1;
          
          console.log(`페이징 정보 업데이트: totalPages=${totalPagesFromAPI}, currentPage=${page}`);
          
          setTotalPages(totalPagesFromAPI);
          // currentPage는 goToPage에서 이미 설정했으므로 여기서는 설정하지 않음
          if (data.pagination.rowsPerPage) {
            setRowsPerPage(data.pagination.rowsPerPage);
          }
        } else {
          // pagination 객체가 없는 경우 기존 방식 사용
          const calculatedTotalPages = Math.max(1, Math.ceil((data.totalCount || 0) / (data.rowsPerPage || pageSize))); // 최소 1페이지 보장
          
          console.log(`계산된 페이징 정보: totalPages=${calculatedTotalPages}, currentPage=${page}`);
          
          setTotalPages(calculatedTotalPages);
          // currentPage는 goToPage에서 이미 설정했으므로 여기서는 설정하지 않음
          if (data.rowsPerPage) {
            setRowsPerPage(data.rowsPerPage);
          }
        }
      } else {
        setCompanies([]);
        setTotalPages(1);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error("검색 실패:", error);
      setCompanies([]);
      setTotalPages(1);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (hasFetchedCompanies.current) return;
    hasFetchedCompanies.current = true;
    searchCompanies("", 1, rowsPerPage);
  }, []);

  // 검색 실행
  const handleSearch = () => {
    setCurrentPage(1);
    hasFetchedCompanies.current = false; // 검색 시에는 다시 호출 허용
    searchCompanies(searchKeyword, 1, rowsPerPage);
  };

  // 체크박스 선택
  const handleSelectCompany = (compIdx: number) => {
    setSelectedCompanies(prev => 
      prev.includes(compIdx) 
        ? prev.filter(id => id !== compIdx)
        : [...prev, compIdx]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!companies || companies.length === 0) return;
    
    if (selectedCompanies.length === companies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(companies.map(company => company.compIdx));
    }
  };

  // 회사 추가
  const handleAddCompany = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch("https://api.reviewhub.life/admin/comp/createComp", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newCompany),
      });

      if (response.ok) {
        alert("회사가 성공적으로 추가되었습니다.");
        setIsAddMode(false);
        setNewCompany({
          compName: "",
          compLocation: "",
          compType: "",
          compIndustry: "",
          compEstablish: "",
          compCEO: "",
          compLateX: 0,
          compLateY: 0,
          compURL: "",
          compLotAddr: "",
          compAddr: "",
          compMapIMG: "",
          compStatus: 1
        });
        searchCompanies(searchKeyword);
      }
    } catch (error) {
      console.error("회사 추가 실패:", error);
      alert("회사 추가에 실패했습니다.");
    }
  };

  // 회사 삭제
  const handleDeleteCompanies = async () => {
    try {
      const deleteData = selectedCompanies.length === 1 
        ? { compIdx: selectedCompanies[0] }
        : { compIdx: selectedCompanies };

      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`https://api.reviewhub.life/admin/comp/comp/${selectedCompanies[0]}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedCompanies([]);
        searchCompanies(searchKeyword);
      }
    } catch (error) {
      console.error("회사 삭제 실패:", error);
      alert("회사 삭제에 실패했습니다.");
    }
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    console.log(`페이지 이동 시도: ${page}, totalPages: ${totalPages}`);
    if (page >= 1 && totalPages > 0 && page <= totalPages) {
      setCurrentPage(page); // 즉시 페이지 상태 업데이트
      hasFetchedCompanies.current = false; // 페이지 변경 시에는 다시 호출 허용
      searchCompanies(searchKeyword, page, rowsPerPage);
    } else {
      console.log(`페이지 이동 실패: page=${page}, totalPages=${totalPages}`);
    }
  };

  // 페이지당 행 수 변경
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    console.log(`rowsPerPage 변경: ${rowsPerPage} → ${newRowsPerPage}`);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
    hasFetchedCompanies.current = false; // 행 수 변경 시에는 다시 호출 허용
    searchCompanies(searchKeyword, 1, newRowsPerPage);
  };

  // 편집 시작
  const handleEditStart = () => {
    if (selectedCompany) {
      setEditingCompany({ ...selectedCompany });
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
      setEditingCompany(null);
      setHasChanges(false);
    }
  };

  // 편집 취소 확인
  const handleCancelConfirm = () => {
    setIsEditMode(false);
    setEditingCompany(null);
    setHasChanges(false);
    setShowCancelModal(false);
  };

  // 편집 데이터 변경
  const handleEditChange = (field: keyof CompanyData, value: string | number) => {
    if (editingCompany && selectedCompany) {
      const updatedCompany = { ...editingCompany, [field]: value };
      setEditingCompany(updatedCompany);
      
      const isChanged = JSON.stringify(updatedCompany) !== JSON.stringify(selectedCompany);
      setHasChanges(isChanged);
    }
  };

  // 회사 수정
  const handleUpdateCompany = async () => {
    if (!editingCompany || !selectedCompany) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const changedData: Partial<CompanyData> = { compIdx: editingCompany.compIdx };
      Object.keys(editingCompany).forEach(key => {
        const typedKey = key as keyof CompanyData;
        if (editingCompany[typedKey] !== selectedCompany[typedKey]) {
          (changedData as Record<string, string | number>)[key] = editingCompany[typedKey];
        }
      });

      const response = await fetch(`https://api.reviewhub.life/admin/comp/comp/${editingCompany.compIdx}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedData),
      });

      if (response.ok) {
        alert("회사 정보가 성공적으로 수정되었습니다.");
        setSelectedCompany(editingCompany);
        setIsEditMode(false);
        setEditingCompany(null);
        setHasChanges(false);
        searchCompanies(searchKeyword);
      }
    } catch (error) {
      console.error("회사 수정 실패:", error);
      alert("회사 수정에 실패했습니다.");
    }
  };

  // 회사 상세보기
  const handleViewCompanyDetails = async (compIdx: number) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(`https://api.reviewhub.life/admin/comp/comp/${compIdx}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const companyData = await response.json();
        console.log("회사 상세 정보:", companyData);
        // 상세 정보를 모달이나 별도 페이지에서 표시할 수 있습니다
        alert(`회사 상세 정보를 조회했습니다.\n회사명: ${companyData.compName}`);
      }
    } catch (error) {
      console.error("회사 상세보기 실패:", error);
      alert("회사 상세보기에 실패했습니다.");
    }
  };

  // 회사 상태 변경
  const handleChangeCompanyStatus = async (compIdx: number, newStatus: number) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(`https://api.reviewhub.life/admin/comp/comp/${compIdx}/status`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ compStatus: newStatus }),
      });

      if (response.ok) {
        alert("회사 상태가 변경되었습니다.");
        searchCompanies(searchKeyword);
      }
    } catch (error) {
      console.error("회사 상태 변경 실패:", error);
      alert("회사 상태 변경에 실패했습니다.");
    }
  };

  // 회사 통계 업데이트
  const handleUpdateCompanyStatistics = async (compIdx: number) => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(`https://api.reviewhub.life/admin/comp/comp/${compIdx}/statistics`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        alert("회사 통계가 업데이트되었습니다.");
        searchCompanies(searchKeyword);
      }
    } catch (error) {
      console.error("회사 통계 업데이트 실패:", error);
      alert("회사 통계 업데이트에 실패했습니다.");
    }
  };

  // 회사 통계 일괄 업데이트
  const handleBatchUpdateStatistics = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(`https://api.reviewhub.life/admin/comp/statistics/batch`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        alert("모든 회사 통계가 일괄 업데이트되었습니다.");
        searchCompanies(searchKeyword);
      }
    } catch (error) {
      console.error("회사 통계 일괄 업데이트 실패:", error);
      alert("회사 통계 일괄 업데이트에 실패했습니다.");
    }
  };

  // 단일 회사 삭제
  const handleDeleteSingleCompany = async () => {
    if (!selectedCompany) return;

    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`https://api.reviewhub.life/admin/comp/comp/${selectedCompany.compIdx}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedCompany(null);
        setIsEditMode(false);
        setEditingCompany(null);
        setHasChanges(false);
        searchCompanies(searchKeyword);
      }
    } catch (error) {
      console.error("회사 삭제 실패:", error);
      alert("회사 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4">
        {/* 메뉴 경로 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">회사선택 - 회사 관리</h2>
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
            className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
          >
            검색
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setIsAddMode(true)}
            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600"
            title="회사 추가"
          >
            +
          </button>
          <button
            onClick={handleBatchUpdateStatistics}
            className="w-8 h-8 bg-blue-500 text-white rounded-full hover:bg-blue-600"
            title="통계 일괄 업데이트"
          >
            📊
          </button>
          <button
            onClick={handleDeleteCompanies}
            disabled={selectedCompanies.length === 0}
            className={`w-8 h-8 rounded-full text-white ${
              selectedCompanies.length > 0 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title="선택된 회사 삭제"
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
                      checked={companies && companies.length > 0 && selectedCompanies.length === companies.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">회사 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">회사 이름</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">주소</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">회사 종류</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">대표명</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">로딩 중...</td>
                  </tr>
                ) : !companies || companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr 
                      key={company.compIdx}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedCompany?.compIdx === company.compIdx ? 'bg-purple-50' : ''
                      }`}
                      onClick={() => setSelectedCompany(company)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedCompanies.includes(company.compIdx)}
                          onChange={() => handleSelectCompany(company.compIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{company.compIdx}</td>
                      <td className="px-3 py-2 text-sm">{company.compName}</td>
                      <td className="px-3 py-2 text-sm">
                        {company.compLocation || company.compAddr || company.compLotAddr || '-'}
                      </td>
                      <td className="px-3 py-2 text-sm">{company.compType}</td>
                      <td className="px-3 py-2 text-sm">{company.compCEO}</td>
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
                    console.log(`페이지 입력 (Enter): ${page}, totalPages: ${totalPages}`);
                    
                    if (!isNaN(page) && page >= 1 && totalPages > 0 && page <= totalPages) {
                      goToPage(page);
                    } else {
                      console.log(`페이지 입력 유효하지 않음: page=${page}, totalPages=${totalPages}`);
                      // 유효하지 않은 값이면 현재 페이지로 복원
                      e.currentTarget.value = currentPage.toString();
                    }
                  }
                }}
                onBlur={(e) => {
                  const page = parseInt(e.target.value);
                  console.log(`페이지 입력 (Blur): ${page}, totalPages: ${totalPages}`);
                  
                  if (!isNaN(page) && page >= 1 && totalPages > 0 && page <= totalPages) {
                    goToPage(page);
                  } else {
                    console.log(`페이지 입력 유효하지 않음 (복원): page=${page}, totalPages=${totalPages}`);
                    // 유효하지 않은 값이면 현재 페이지로 복원
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
            <h3 className="text-lg font-semibold mb-4">회사 추가</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium mb-1">회사명</label>
                <input
                  type="text"
                  value={newCompany.compName}
                  onChange={(e) => setNewCompany({...newCompany, compName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">위치</label>
                <input
                  type="text"
                  value={newCompany.compLocation}
                  onChange={(e) => setNewCompany({...newCompany, compLocation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">회사 종류</label>
                <input
                  type="text"
                  value={newCompany.compType}
                  onChange={(e) => setNewCompany({...newCompany, compType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">산업군</label>
                <input
                  type="text"
                  value={newCompany.compIndustry}
                  onChange={(e) => setNewCompany({...newCompany, compIndustry: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설립년도</label>
                <input
                  type="text"
                  value={newCompany.compEstablish}
                  onChange={(e) => setNewCompany({...newCompany, compEstablish: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">대표자</label>
                <input
                  type="text"
                  value={newCompany.compCEO}
                  onChange={(e) => setNewCompany({...newCompany, compCEO: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">위도</label>
                  <input
                    type="number"
                    value={newCompany.compLateX}
                    onChange={(e) => setNewCompany({...newCompany, compLateX: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">경도</label>
                  <input
                    type="number"
                    value={newCompany.compLateY}
                    onChange={(e) => setNewCompany({...newCompany, compLateY: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">웹사이트 URL</label>
                <input
                  type="url"
                  value={newCompany.compURL}
                  onChange={(e) => setNewCompany({...newCompany, compURL: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">지번</label>
                <input
                  type="text"
                  value={newCompany.compLotAddr}
                  onChange={(e) => setNewCompany({...newCompany, compLotAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">주소</label>
                <input
                  type="text"
                  value={newCompany.compAddr}
                  onChange={(e) => setNewCompany({...newCompany, compAddr: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이미지 URL</label>
                <input
                  type="url"
                  value={newCompany.compMapIMG}
                  onChange={(e) => setNewCompany({...newCompany, compMapIMG: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button
                onClick={handleAddCompany}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
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
        ) : selectedCompany ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedCompany.compIdx}
                  </span>
                  <span className="text-lg font-semibold">{selectedCompany.compName}</span>
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedCompany.compType}
                  </span>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedCompany.compLocation}
                  </span>
                </div>
                {!isEditMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditStart}
                      className="w-8 h-8 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center justify-center"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={handleDeleteSingleCompany}
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
            <h3 className="text-lg font-semibold mb-4">회사 상세 정보</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">회사명</label>
                  <input
                    type="text"
                    value={isEditMode ? editingCompany?.compName || "" : selectedCompany.compName}
                    onChange={(e) => handleEditChange("compName", e.target.value)}
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
                    value={isEditMode ? editingCompany?.compLocation || "" : selectedCompany.compLocation}
                    onChange={(e) => handleEditChange("compLocation", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">회사 종류</label>
                  <select
                    value={isEditMode ? editingCompany?.compType || "" : selectedCompany.compType}
                    onChange={(e) => handleEditChange("compType", e.target.value)}
                    disabled={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <option value="대기업">대기업</option>
                    <option value="중소기업">중소기업</option>
                    <option value="스타트업">스타트업</option>
                    <option value="공기업">공기업</option>
                    <option value="외국계">외국계</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">산업군</label>
                  <select
                    value={isEditMode ? editingCompany?.compIndustry || "" : selectedCompany.compIndustry}
                    onChange={(e) => handleEditChange("compIndustry", e.target.value)}
                    disabled={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <option value="IT">IT</option>
                    <option value="금융">금융</option>
                    <option value="제조업">제조업</option>
                    <option value="서비스업">서비스업</option>
                    <option value="의료">의료</option>
                    <option value="교육">교육</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">설립년도</label>
                  <input
                    type="text"
                    value={isEditMode ? editingCompany?.compEstablish || "" : selectedCompany.compEstablish}
                    onChange={(e) => handleEditChange("compEstablish", e.target.value)}
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
                    value={isEditMode ? editingCompany?.compCEO || "" : selectedCompany.compCEO}
                    onChange={(e) => handleEditChange("compCEO", e.target.value)}
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
                    value={isEditMode ? editingCompany?.compLateX || 0 : selectedCompany.compLateX}
                    onChange={(e) => handleEditChange("compLateX", parseFloat(e.target.value))}
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
                    value={isEditMode ? editingCompany?.compLateY || 0 : selectedCompany.compLateY}
                    onChange={(e) => handleEditChange("compLateY", parseFloat(e.target.value))}
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
                    value={isEditMode ? editingCompany?.compURL || "" : selectedCompany.compURL}
                    onChange={(e) => handleEditChange("compURL", e.target.value)}
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
                    value={isEditMode ? editingCompany?.compLotAddr || "" : selectedCompany.compLotAddr}
                    onChange={(e) => handleEditChange("compLotAddr", e.target.value)}
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
                    value={isEditMode ? editingCompany?.compAddr || "" : selectedCompany.compAddr}
                    onChange={(e) => handleEditChange("compAddr", e.target.value)}
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
                    value={isEditMode ? editingCompany?.compMapIMG || "" : selectedCompany.compMapIMG}
                    onChange={(e) => handleEditChange("compMapIMG", e.target.value)}
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
                    value={isEditMode ? editingCompany?.compStatus || 0 : selectedCompany.compStatus}
                    onChange={(e) => handleEditChange("compStatus", parseInt(e.target.value))}
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
                    value={isEditMode ? editingCompany?.compViewCount || 0 : selectedCompany.compViewCount}
                    onChange={(e) => handleEditChange("compViewCount", parseInt(e.target.value))}
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
                  onClick={handleUpdateCompany}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
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
            회사를 선택하거나 추가 버튼을 클릭하세요.
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
              className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
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

export default CompanyManagementPage;
