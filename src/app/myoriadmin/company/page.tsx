"use client";

import React, { useState, useEffect, useRef } from "react";
import AddressSearchModal, { AddressResult } from "@/components/common/AddressSearchModal";
import { useNavigationGuard } from "@/components/common/NavigationGuard";

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
  createdAt?: string;
  updatedAt?: string;
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
  const { setDirty } = useNavigationGuard();
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
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showBatchDeleteConfirmModal, setShowBatchDeleteConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingCompany, setPendingCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState<CompanyData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressMode, setAddressMode] = useState<"add" | "edit">("add");
  const [isDuplicateName, setIsDuplicateName] = useState(false);
  const duplicateCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedCompanies = useRef(false);

  // 새 회사 데이터 폼
  const [newCompany, setNewCompany] = useState({
    compName: "",
    compLocation: "",
    compLocate: "",
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

  // 사업자등록번호 검증 (국세청 API 연동, DB 저장 X — 등록 전 휴폐업 게이트)
  const [bizNo, setBizNo] = useState("");
  const [bizValidation, setBizValidation] = useState<null | { ok: boolean; status: string; message: string }>(null);
  const [bizValidating, setBizValidating] = useState(false);

  const handleValidateBusiness = async () => {
    if (!bizNo.trim()) {
      setBizValidation({ ok: false, status: "EMPTY", message: "사업자번호를 입력하세요" });
      return;
    }
    setBizValidating(true);
    setBizValidation(null);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/validateBusiness`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bizNo: bizNo.replace(/\D/g, "") }),
      });
      const data = await res.json();
      setBizValidation({ ok: !!data.ok, status: data.status || "UNKNOWN", message: data.message || "" });
    } catch {
      setBizValidation({ ok: false, status: "ERROR", message: "검증 호출 실패" });
    } finally {
      setBizValidating(false);
    }
  };

  // 주소 정규화 (서울특별시 → 서울, 부산광역시 → 부산 등)
  const normalizeAddr = (addr: string) =>
    addr.replace(/특별시|광역시|특별자치시|특별자치도/g, "").replace(/\s+/g, " ").trim();

  // 회사 중복 체크 (이름 + 주소)
  const checkDuplicate = (name: string, addr: string) => {
    if (duplicateCheckTimer.current) clearTimeout(duplicateCheckTimer.current);
    if (!name.trim() || !addr.trim()) { setIsDuplicateName(false); return; }
    duplicateCheckTimer.current = setTimeout(async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/searchComp?compName=${encodeURIComponent(name.trim())}&page=1&rowsPerPage=100`,
          { headers: { "Authorization": `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        const normAddr = normalizeAddr(addr);
        setIsDuplicateName((data.data || []).some((c: CompanyData) =>
          c.compName === name.trim() && normalizeAddr(c.compAddr || "") === normAddr
        ));
      } catch { setIsDuplicateName(false); }
    }, 400);
  };

  // 회사 검색
  const searchCompanies = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    console.log(`API 호출: keyword="${keyword}", page=${page}, pageSize=${pageSize}`);
    
    try {
      const url = keyword 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/searchComp?compName=${encodeURIComponent(keyword)}&page=${page}&rowsPerPage=${pageSize}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/searchComp?page=${page}&rowsPerPage=${pageSize}`;
      
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

  useEffect(() => {
    setDirty(isAddMode || isEditMode, isAddMode ? "add" : "edit");
    return () => { if (!isAddMode && !isEditMode) setDirty(false); };
  }, [isAddMode, isEditMode]);

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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/createComp`, {
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
          compLocate: "",
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
        setBizNo("");
        setBizValidation(null);
        searchCompanies(searchKeyword);
      }
    } catch (error) {
      console.error("회사 추가 실패:", error);
      alert("회사 추가에 실패했습니다.");
    }
  };

  // 일괄 삭제 확인 모달 열기
  const handleBatchDeleteClick = () => {
    if (selectedCompanies.length === 0) return;
    setShowBatchDeleteConfirmModal(true);
  };

  // 회사 삭제 (확인 후 실행)
  const handleDeleteCompanies = async () => {
    if (selectedCompanies.length === 0) return;
    
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      // 선택된 모든 회사를 순차적으로 삭제
      const deletePromises = selectedCompanies.map(compIdx =>
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/deleteComp/${compIdx}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        })
      );
      
      const results = await Promise.all(deletePromises);
      const allSuccess = results.every(response => response.ok);
      
      if (allSuccess) {
        setShowBatchDeleteConfirmModal(false);
        setShowDeleteModal(true);
        setSelectedCompanies([]);
        searchCompanies(searchKeyword);
      } else {
        alert("일부 회사 삭제에 실패했습니다.");
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

  const handleCompanyRowClick = (company: CompanyData) => {
    if (isAddMode || isEditMode) {
      setPendingCompany(company);
      setShowLeaveModal(true);
    } else {
      setSelectedCompany(company);
    }
  };

  const handleLeaveConfirm = () => {
    if (isAddMode) {
      setIsAddMode(false);
      setNewCompany({
        compName: "",
        compLocation: "",
        compLocate: "",
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
    } else if (isEditMode) {
      setIsEditMode(false);
      setEditingCompany(null);
      setHasChanges(false);
    }
    setSelectedCompany(pendingCompany);
    setPendingCompany(null);
    setShowLeaveModal(false);
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

  // 주소 검색 결과 처리
  const handleAddressSelect = (result: AddressResult) => {
    if (addressMode === "add") {
      setNewCompany({
        ...newCompany,
        ...(result.placeName ? { compName: result.placeName } : {}),
        compAddr: result.roadAddress,
        compLotAddr: result.jibunAddress,
        compLateX: result.latitude,
        compLateY: result.longitude,
      });
      checkDuplicate(result.placeName || newCompany.compName, result.roadAddress);
    } else if (addressMode === "edit" && editingCompany) {
      const updated = {
        ...editingCompany,
        ...(result.placeName ? { compName: result.placeName } : {}),
        compAddr: result.roadAddress,
        compLotAddr: result.jibunAddress,
        compLateX: result.latitude,
        compLateY: result.longitude,
      };
      setEditingCompany(updated);
      if (selectedCompany) {
        const isChanged = JSON.stringify(updated) !== JSON.stringify(selectedCompany);
        setHasChanges(isChanged);
      }
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
        const value = editingCompany[typedKey];
        if (value !== selectedCompany[typedKey] && key !== 'createdAt' && key !== 'updatedAt' && value !== undefined) {
          (changedData as Record<string, string | number>)[key] = value as string | number;
        }
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/comp/${editingCompany.compIdx}`, {
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/comp/${compIdx}`, {
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/comp/${compIdx}/status`, {
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/comp/${compIdx}/statistics`, {
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/statistics/batch`, {
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

  // 삭제 확인 모달 열기
  const handleDeleteClick = () => {
    if (!selectedCompany) return;
    setShowDeleteConfirmModal(true);
  };

  // 단일 회사 삭제 (확인 후 실행)
  const handleDeleteSingleCompany = async () => {
    if (!selectedCompany) return;

    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/comp/deleteComp/${selectedCompany.compIdx}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setShowDeleteConfirmModal(false);
        setShowDeleteModal(true);
        setSelectedCompany(null);
        setIsEditMode(false);
        setEditingCompany(null);
        setHasChanges(false);
        searchCompanies(searchKeyword);
      } else {
        alert("회사 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("회사 삭제 실패:", error);
      alert("회사 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-5">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">회사 관리</h2>
          <p className="text-sm text-gray-400 mt-0.5">등록된 회사 목록</p>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="회사명 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button onClick={handleSearch} className="px-5 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 transition-colors shadow-sm">
            검색
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-400">{selectedCompanies.length > 0 && `${selectedCompanies.length}개 선택됨`}</span>
          <div className="flex gap-2">
            <button onClick={() => setIsAddMode(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors" title="회사 추가">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              추가
            </button>
            <button onClick={handleBatchDeleteClick} disabled={selectedCompanies.length === 0} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedCompanies.length > 0 ? 'text-rose-700 bg-rose-50 hover:bg-rose-100' : 'text-gray-400 bg-gray-50 cursor-not-allowed'}`} title="선택된 회사 삭제">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              삭제
            </button>
          </div>
        </div>

        <div className="flex-1 border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-y-auto max-h-[calc(100vh-380px)]">
            <table className="w-full">
              <thead className="bg-gray-50/80 sticky top-0">
                <tr>
                  <th className="px-3 py-3 text-left w-10">
                    <input type="checkbox" checked={companies && companies.length > 0 && selectedCompanies.length === companies.length} onChange={handleSelectAll} className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">회사명</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">주소</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">종류</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">대표</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">로딩 중...</td></tr>
                ) : !companies || companies.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">검색 결과가 없습니다.</td></tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.compIdx} className={`border-t border-gray-50 cursor-pointer transition-colors ${selectedCompany?.compIdx === company.compIdx ? 'bg-amber-50/70' : 'hover:bg-gray-50/70'}`} onClick={() => handleCompanyRowClick(company)}>
                      <td className="px-3 py-2.5"><input type="checkbox" checked={selectedCompanies.includes(company.compIdx)} onChange={() => handleSelectCompany(company.compIdx)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500" /></td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{company.compIdx}</td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{company.compName}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500 truncate max-w-[120px]">{company.compLocation || company.compAddr || company.compLotAddr || '-'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{company.compType}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{company.compCEO}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <select value={rowsPerPage} onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value))} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
            <option value={10}>10개</option>
            <option value={30}>30개</option>
            <option value={50}>50개</option>
            <option value={100}>100개</option>
          </select>
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(1)} disabled={currentPage === 1 || totalPages <= 0} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === 1 || totalPages <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1 || totalPages <= 0} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === 1 || totalPages <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex items-center gap-1 px-2">
              <input type="number" value={currentPage} onKeyPress={(e) => { if (e.key === 'Enter') { const page = parseInt(e.currentTarget.value); if (!isNaN(page) && page >= 1 && totalPages > 0 && page <= totalPages) goToPage(page); else e.currentTarget.value = currentPage.toString(); } }} onBlur={(e) => { const page = parseInt(e.target.value); if (!isNaN(page) && page >= 1 && totalPages > 0 && page <= totalPages) goToPage(page); else e.target.value = currentPage.toString(); }} className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20" min={1} max={totalPages || 1} />
              <span className="text-xs text-gray-400">/ {totalPages}</span>
            </div>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages || totalPages <= 0} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === totalPages || totalPages <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages || totalPages <= 0} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === totalPages || totalPages <= 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
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
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">회사 추가</h3>
                <p className="text-xs text-gray-400">새 회사 정보를 입력하세요</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">회사명</label>
                  <div className="flex gap-2">
                    <input type="text" value={newCompany.compName} onChange={(e) => { setNewCompany({...newCompany, compName: e.target.value}); checkDuplicate(e.target.value, newCompany.compAddr); }} className={`flex-1 px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${isDuplicateName ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-400" : "border-gray-200 focus:ring-amber-500/20 focus:border-amber-400"}`} placeholder="회사명" />
                    <button type="button" onClick={() => { setAddressMode("add"); setShowAddressModal(true); }} className="shrink-0 px-3 py-2.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">검색</button>
                  </div>
                  {isDuplicateName && <p className="mt-1.5 text-xs text-rose-500">동일한 이름과 주소의 회사가 이미 등록되어 있습니다.</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">대표자</label>
                  <input type="text" value={newCompany.compCEO} onChange={(e) => setNewCompany({...newCompany, compCEO: e.target.value})} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" placeholder="대표자명" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                  사업자등록번호 <span className="text-gray-400 font-normal">(선택, 국세청 휴폐업 검증)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bizNo}
                    onChange={(e) => { setBizNo(e.target.value); setBizValidation(null); }}
                    placeholder="10자리 숫자 (하이픈 제외)"
                    className={`flex-1 px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      bizValidation?.ok
                        ? "border-emerald-400 focus:ring-emerald-500/20 focus:border-emerald-400"
                        : bizValidation && !bizValidation.ok
                          ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-400"
                          : "border-gray-200 focus:ring-amber-500/20 focus:border-amber-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleValidateBusiness}
                    disabled={bizValidating || !bizNo.trim()}
                    className="shrink-0 px-3 py-2.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bizValidating ? "검증중..." : "검증"}
                  </button>
                </div>
                {bizValidation && (
                  <p className={`mt-1.5 text-xs ${bizValidation.ok ? "text-emerald-600" : "text-rose-500"}`}>
                    {bizValidation.ok ? "✓ " : "✗ "}{bizValidation.message}
                    {!bizValidation.ok && bizValidation.status !== "EMPTY" && bizValidation.status !== "INVALID_FORMAT" && (
                      <span className="text-gray-400"> · 그래도 등록 가능하지만 권장하지 않습니다</span>
                    )}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">회사 종류</label>
                  <select value={newCompany.compType} onChange={(e) => setNewCompany({...newCompany, compType: e.target.value})} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-white">
                    <option value="">선택</option><option value="대기업">대기업</option><option value="중견기업">중견기업</option><option value="중소기업">중소기업</option><option value="스타트업">스타트업</option><option value="공기업">공기업</option><option value="외국계">외국계</option><option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">산업군</label>
                  <select value={newCompany.compIndustry} onChange={(e) => setNewCompany({...newCompany, compIndustry: e.target.value})} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all bg-white">
                    <option value="">선택</option><option value="IT">IT</option><option value="금융">금융</option><option value="제조업">제조업</option><option value="서비스업">서비스업</option><option value="의료">의료</option><option value="교육">교육</option><option value="통신">통신</option><option value="기타">기타</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">설립년도</label>
                  <input type="text" value={newCompany.compEstablish} onChange={(e) => setNewCompany({...newCompany, compEstablish: e.target.value})} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" placeholder="예: 1984" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">위치</label>
                  <input type="text" value={newCompany.compLocation} onChange={(e) => setNewCompany({...newCompany, compLocation: e.target.value, compLocate: e.target.value})} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" placeholder="예: 서울특별시" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">도로명 주소</label>
                <input type="text" value={newCompany.compAddr} onChange={(e) => { setNewCompany({...newCompany, compAddr: e.target.value}); checkDuplicate(newCompany.compName, e.target.value); }} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" placeholder="도로명 주소" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">지번 주소</label>
                <input type="text" value={newCompany.compLotAddr} onChange={(e) => setNewCompany({...newCompany, compLotAddr: e.target.value})} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" placeholder="지번 주소" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">위도</label>
                  <input type="number" value={newCompany.compLateX || ""} readOnly className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/80 text-gray-700" step="any" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">경도</label>
                  <input type="number" value={newCompany.compLateY || ""} readOnly className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/80 text-gray-700" step="any" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">웹사이트 URL</label>
                <input type="url" value={newCompany.compURL} onChange={(e) => setNewCompany({...newCompany, compURL: e.target.value})} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">지도 이미지 URL</label>
                <input type="url" value={newCompany.compMapIMG} onChange={(e) => setNewCompany({...newCompany, compMapIMG: e.target.value})} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all" />
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button onClick={handleAddCompany} className="px-5 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 transition-colors shadow-sm">저장</button>
              <button onClick={() => setIsAddMode(false)} className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">취소</button>
            </div>
          </div>
        ) : selectedCompany ? (
          <div className="flex flex-col h-full">
            <div className="mb-5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selectedCompany.compName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-md">{selectedCompany.compType}</span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-md">{selectedCompany.compLocation}</span>
                      <span className="text-xs text-gray-400">#{selectedCompany.compIdx}</span>
                    </div>
                  </div>
                </div>
                {!isEditMode && (
                  <div className="flex gap-1.5">
                    <button onClick={handleEditStart} className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 hover:border-amber-300 hover:bg-amber-50 flex items-center justify-center transition-all" title="수정">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={handleDeleteClick} className="w-8 h-8 rounded-lg bg-white shadow-sm border border-gray-200 hover:border-rose-300 hover:bg-rose-50 flex items-center justify-center transition-all" title="삭제">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-bold text-gray-900">상세 정보</h3>
              {isEditMode && <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-md">편집중</span>}
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">회사명</label>
                  <div className="flex gap-2">
                    <input type="text" value={isEditMode ? editingCompany?.compName || "" : selectedCompany.compName} onChange={(e) => handleEditChange("compName", e.target.value)} readOnly={!isEditMode} className={`flex-1 px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                    {isEditMode && <button type="button" onClick={() => { setAddressMode("edit"); setShowAddressModal(true); }} className="shrink-0 px-3 py-2.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">검색</button>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위치</label>
                  <input type="text" value={isEditMode ? editingCompany?.compLocation || "" : selectedCompany.compLocation} onChange={(e) => handleEditChange("compLocation", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">회사 종류</label>
                  <select value={isEditMode ? editingCompany?.compType || "" : selectedCompany.compType} onChange={(e) => handleEditChange("compType", e.target.value)} disabled={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`}>
                    <option value="대기업">대기업</option><option value="중견기업">중견기업</option><option value="중소기업">중소기업</option><option value="스타트업">스타트업</option><option value="공기업">공기업</option><option value="외국계">외국계</option><option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">산업군</label>
                  <select value={isEditMode ? editingCompany?.compIndustry || "" : selectedCompany.compIndustry} onChange={(e) => handleEditChange("compIndustry", e.target.value)} disabled={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`}>
                    <option value="IT">IT</option><option value="금융">금융</option><option value="제조업">제조업</option><option value="서비스업">서비스업</option><option value="의료">의료</option><option value="교육">교육</option><option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">설립년도</label>
                  <input type="text" value={isEditMode ? editingCompany?.compEstablish || "" : selectedCompany.compEstablish} onChange={(e) => handleEditChange("compEstablish", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">대표자</label>
                  <input type="text" value={isEditMode ? editingCompany?.compCEO || "" : selectedCompany.compCEO} onChange={(e) => handleEditChange("compCEO", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위도</label>
                  <input type="number" value={isEditMode ? editingCompany?.compLateX || 0 : selectedCompany.compLateX} readOnly step="any" className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-gray-50/80 border-gray-100 text-gray-700" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">경도</label>
                  <input type="number" value={isEditMode ? editingCompany?.compLateY || 0 : selectedCompany.compLateY} readOnly step="any" className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-gray-50/80 border-gray-100 text-gray-700" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">웹사이트 URL</label>
                  <input type="url" value={isEditMode ? editingCompany?.compURL || "" : selectedCompany.compURL} onChange={(e) => handleEditChange("compURL", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">지번</label>
                  <input type="text" value={isEditMode ? editingCompany?.compLotAddr || "" : selectedCompany.compLotAddr} onChange={(e) => handleEditChange("compLotAddr", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">주소</label>
                  <input type="text" value={isEditMode ? editingCompany?.compAddr || "" : selectedCompany.compAddr} onChange={(e) => handleEditChange("compAddr", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">이미지 URL</label>
                  <input type="url" value={isEditMode ? editingCompany?.compMapIMG || "" : selectedCompany.compMapIMG} onChange={(e) => handleEditChange("compMapIMG", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">상태</label>
                  <input type="number" value={isEditMode ? editingCompany?.compStatus || 0 : selectedCompany.compStatus} onChange={(e) => handleEditChange("compStatus", parseInt(e.target.value))} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">조회수</label>
                  <input type="number" value={isEditMode ? editingCompany?.compViewCount || 0 : selectedCompany.compViewCount} onChange={(e) => handleEditChange("compViewCount", parseInt(e.target.value))} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">등록일</label>
                  <div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">{selectedCompany.createdAt ? new Date(selectedCompany.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">수정일</label>
                  <div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">{selectedCompany.updatedAt ? new Date(selectedCompany.updatedAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                </div>
              </div>
            </div>
            {isEditMode && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button onClick={handleUpdateCompany} className="px-5 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 transition-colors shadow-sm">저장</button>
                <button onClick={handleEditCancel} className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">취소</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <p className="text-sm text-gray-400">회사를 선택하거나</p>
            <p className="text-sm text-gray-400">추가 버튼을 클릭하세요</p>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">삭제 확인</h3>
            <p className="text-sm text-gray-500 text-center mb-5"><span className="font-semibold text-gray-900">{selectedCompany?.compName}</span>을(를) 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirmModal(false)} className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">취소</button>
              <button onClick={handleDeleteSingleCompany} className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 모달 */}
      {showBatchDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">일괄 삭제</h3>
            <p className="text-sm text-gray-500 text-center mb-5"><span className="font-semibold text-gray-900">{selectedCompanies.length}개</span>의 회사를 삭제하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBatchDeleteConfirmModal(false)} className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">취소</button>
              <button onClick={handleDeleteCompanies} className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 완료 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">삭제 완료</h3>
            <p className="text-sm text-gray-500 text-center mb-5">선택한 항목이 삭제되었습니다.</p>
            <button onClick={() => setShowDeleteModal(false)} className="w-full px-4 py-2.5 bg-amber-600 text-white text-sm font-medium rounded-xl hover:bg-amber-700 transition-colors">확인</button>
          </div>
        </div>
      )}

      {/* 편집 취소 확인 모달 */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">변경 취소</h3>
            <p className="text-sm text-gray-500 text-center mb-5">변경된 사항이 있습니다. 취소하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">돌아가기</button>
              <button onClick={handleCancelConfirm} className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors">취소하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 이탈 확인 모달 */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              {isAddMode ? "추가 취소" : "수정 취소"}
            </h3>
            <p className="text-sm text-gray-500 text-center mb-5">
              {isAddMode ? "현재 입력하신 부분이 취소됩니다." : "현재 수정이 취소됩니다."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleLeaveConfirm}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors"
              >
                확인
              </button>
              <button
                onClick={() => { setShowLeaveModal(false); setPendingCompany(null); }}
                className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                취소
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

export default CompanyManagementPage;
