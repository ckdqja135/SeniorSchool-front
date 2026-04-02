"use client";

import React, { useState, useEffect, useRef } from "react";
import AddressSearchModal, { AddressResult } from "@/components/common/AddressSearchModal";
import { useNavigationGuard } from "@/components/common/NavigationGuard";

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
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse {
  status: number;
  data: ChurchData[];
  totalCount: number;
  currentPage: number;
  rowsPerPage: number;
}

const ChurchManagementPage = () => {
  const { setDirty } = useNavigationGuard();
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
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingChurch, setPendingChurch] = useState<ChurchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingChurch, setEditingChurch] = useState<ChurchData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressMode, setAddressMode] = useState<"add" | "edit">("add");
  const [isDuplicateName, setIsDuplicateName] = useState(false);
  const hasFetchedChurches = useRef(false);
  const duplicateCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 주소 정규화 (서울특별시 → 서울, 부산광역시 → 부산 등)
  const normalizeAddr = (addr: string) =>
    addr.replace(/특별시|광역시|특별자치시|특별자치도/g, "").replace(/\s+/g, " ").trim();

  // 교회 중복 체크 (이름 + 주소)
  const checkDuplicate = (name: string, addr: string) => {
    if (duplicateCheckTimer.current) clearTimeout(duplicateCheckTimer.current);
    if (!name.trim() || !addr.trim()) { setIsDuplicateName(false); return; }
    duplicateCheckTimer.current = setTimeout(async () => {
      try {
        const accessToken = localStorage.getItem("accessToken");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/admin/church/searchChurch?churchName=${encodeURIComponent(name.trim())}&page=1&rowsPerPage=100`,
          { headers: { "Authorization": `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        const normAddr = normalizeAddr(addr);
        setIsDuplicateName((data.data || []).some((c: ChurchData) =>
          c.churchName === name.trim() && normalizeAddr(c.churchAddr || "") === normAddr
        ));
      } catch { setIsDuplicateName(false); }
    }, 400);
  };

  // 교회 검색
  const searchChurches = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    console.log(`API 호출: keyword="${keyword}", page=${page}, pageSize=${pageSize}`);
    
    try {
      const url = keyword 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/admin/church/searchChurch?churchName=${encodeURIComponent(keyword)}&page=${page}&rowsPerPage=${pageSize}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/admin/church/searchChurch?page=${page}&rowsPerPage=${pageSize}`;
      
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

  // 추가/수정 모드 변경 시 navigation guard 등록
  useEffect(() => {
    setDirty(isAddMode || isEditMode, isAddMode ? "add" : "edit");
    return () => { if (!isAddMode && !isEditMode) setDirty(false); };
  }, [isAddMode, isEditMode]);

  // 초기 데이터 로드
  useEffect(() => {
    if (hasFetchedChurches.current) return;
    hasFetchedChurches.current = true;
    searchChurches("", 1, rowsPerPage);
  }, []);

  // 검색 실행
  const handleSearch = () => {
    setCurrentPage(1);
    hasFetchedChurches.current = false; // 검색 시에는 다시 호출 허용
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/church/createChurch`, {
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
      const accessToken = localStorage.getItem("accessToken");

      if (selectedChurches.length === 1) {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/church/${selectedChurches[0]}`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/church/bulk`, {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ churchIdxList: selectedChurches }),
        });
      }

      setShowDeleteModal(true);
      setSelectedChurches([]);
      searchChurches(searchKeyword);
    } catch (error) {
      console.error("교회 삭제 실패:", error);
      alert("교회 삭제에 실패했습니다.");
    }
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      hasFetchedChurches.current = false; // 페이지 변경 시에는 다시 호출 허용
      searchChurches(searchKeyword, page, rowsPerPage);
    }
  };

  // 페이지당 행 수 변경
  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    console.log(`rowsPerPage 변경: ${rowsPerPage} → ${newRowsPerPage}`);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
    hasFetchedChurches.current = false; // 행 수 변경 시에는 다시 호출 허용
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

  // 리스트 항목 클릭 (추가/수정 중일 때 이탈 확인)
  const handleChurchRowClick = (church: ChurchData) => {
    if (isAddMode || isEditMode) {
      setPendingChurch(church);
      setShowLeaveModal(true);
    } else {
      setSelectedChurch(church);
    }
  };

  // 이탈 확인
  const handleLeaveConfirm = () => {
    if (isAddMode) {
      setIsAddMode(false);
      setIsDuplicateName(false);
      setNewChurch({ churchName: "", churchLocation: "", churchType: "", churchEstablished: "", churchPastor: "", churchLatX: 0, churchLatY: 0, churchURL: "", churchLotAddr: "", churchAddr: "", churchMapIMG: "", churchStatus: 1 });
    } else if (isEditMode) {
      setIsEditMode(false);
      setEditingChurch(null);
      setHasChanges(false);
    }
    setSelectedChurch(pendingChurch);
    setPendingChurch(null);
    setShowLeaveModal(false);
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

  // 주소 검색 결과 처리
  const handleAddressSelect = (result: AddressResult) => {
    if (addressMode === "add") {
      setNewChurch({
        ...newChurch,
        ...(result.placeName ? { churchName: result.placeName } : {}),
        churchAddr: result.roadAddress,
        churchLotAddr: result.jibunAddress,
        churchLatX: result.latitude,
        churchLatY: result.longitude,
      });
      checkDuplicate(result.placeName || newChurch.churchName, result.roadAddress);
    } else if (addressMode === "edit" && editingChurch) {
      const updated = {
        ...editingChurch,
        ...(result.placeName ? { churchName: result.placeName } : {}),
        churchAddr: result.roadAddress,
        churchLotAddr: result.jibunAddress,
        churchLatX: result.latitude,
        churchLatY: result.longitude,
      };
      setEditingChurch(updated);
      if (selectedChurch) {
        const isChanged = JSON.stringify(updated) !== JSON.stringify(selectedChurch);
        setHasChanges(isChanged);
      }
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
        const value = editingChurch[typedKey];
        if (value !== selectedChurch[typedKey] && key !== 'createdAt' && key !== 'updatedAt' && value !== undefined) {
          (changedData as Record<string, string | number>)[key] = value as string | number;
        }
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/church/${editingChurch.churchIdx}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        // 경로 파라미터로 churchIdx 전달, 바디에서는 변경 필드만 전송
        body: JSON.stringify(Object.fromEntries(Object.entries(changedData).filter(([k]) => k !== 'churchIdx'))),
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

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/church/${selectedChurch.churchIdx}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
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
    <div className="flex h-full gap-5">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
        {/* 헤더 */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">교회 관리</h2>
          <p className="text-sm text-gray-400 mt-0.5">등록된 교회 목록</p>
        </div>

        {/* 검색 영역 */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="교회명 검색..."
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
            {selectedChurches.length > 0 && `${selectedChurches.length}개 선택됨`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              title="교회 추가"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>
            <button
              onClick={handleDeleteChurches}
              disabled={selectedChurches.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedChurches.length > 0
                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
              title="선택된 교회 삭제"
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
                      checked={churches && churches.length > 0 && selectedChurches.length === churches.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">교회명</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">위치</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">종류</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-400">로딩 중...</td>
                  </tr>
                ) : !churches || churches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  churches.map((church) => (
                    <tr
                      key={church.churchIdx}
                      className={`border-t border-gray-50 cursor-pointer transition-colors ${
                        selectedChurch?.churchIdx === church.churchIdx
                          ? 'bg-purple-50/70'
                          : 'hover:bg-gray-50/70'
                      }`}
                      onClick={() => handleChurchRowClick(church)}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedChurches.includes(church.churchIdx)}
                          onChange={() => handleSelectChurch(church.churchIdx)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{church.churchIdx}</td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{church.churchName}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{church.churchLocation}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{church.churchType}</td>
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
              disabled={currentPage === 1}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
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
                currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
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
                className="w-10 px-1 py-1 text-xs text-center border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                min={1}
                max={totalPages}
              />
              <span className="text-xs text-gray-400">/ {totalPages}</span>
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${
                currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
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
                currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
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
                <h3 className="text-lg font-bold text-gray-900">교회 추가</h3>
                <p className="text-xs text-gray-400">새 교회 정보를 입력하세요</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">교회명</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newChurch.churchName}
                      onChange={(e) => { setNewChurch({...newChurch, churchName: e.target.value}); checkDuplicate(e.target.value, newChurch.churchAddr); }}
                      className={`flex-1 px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                        isDuplicateName ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-400" : "border-gray-200 focus:ring-purple-500/20 focus:border-purple-400"
                      }`}
                      placeholder="교회명을 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={() => { setAddressMode("add"); setShowAddressModal(true); }}
                      className="shrink-0 px-3 py-2.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                    >
                      검색
                    </button>
                  </div>
                  {isDuplicateName && <p className="mt-1.5 text-xs text-rose-500">동일한 이름과 주소의 교회가 이미 등록되어 있습니다.</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위치</label>
                  <input
                    type="text"
                    value={newChurch.churchLocation}
                    onChange={(e) => setNewChurch({...newChurch, churchLocation: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">교회 종류</label>
                  <select
                    value={newChurch.churchType}
                    onChange={(e) => setNewChurch({...newChurch, churchType: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  >
                    <option value="">선택하세요</option>
                    <option value="감리교">감리교</option>
                    <option value="장로교">장로교</option>
                    <option value="침례교">침례교</option>
                    <option value="성결교">성결교</option>
                    <option value="순복음">순복음</option>
                    <option value="기타">기타</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">설립년도</label>
                  <input
                    type="text"
                    value={newChurch.churchEstablished}
                    onChange={(e) => setNewChurch({...newChurch, churchEstablished: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">담임목사</label>
                  <input
                    type="text"
                    value={newChurch.churchPastor}
                    onChange={(e) => setNewChurch({...newChurch, churchPastor: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위도</label>
                  <input
                    type="number"
                    value={newChurch.churchLatX}
                    readOnly
                    step="any"
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-gray-50/80 border-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">경도</label>
                  <input
                    type="number"
                    value={newChurch.churchLatY}
                    readOnly
                    step="any"
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-gray-50/80 border-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">웹사이트 URL</label>
                  <input
                    type="url"
                    value={newChurch.churchURL}
                    onChange={(e) => setNewChurch({...newChurch, churchURL: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">지번</label>
                  <input
                    type="text"
                    value={newChurch.churchLotAddr}
                    onChange={(e) => setNewChurch({...newChurch, churchLotAddr: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">주소</label>
                  <input
                    type="text"
                    value={newChurch.churchAddr}
                    onChange={(e) => { setNewChurch({...newChurch, churchAddr: e.target.value}); checkDuplicate(newChurch.churchName, e.target.value); }}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">이미지 URL</label>
                  <input
                    type="url"
                    value={newChurch.churchMapIMG}
                    onChange={(e) => setNewChurch({...newChurch, churchMapIMG: e.target.value})}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleAddChurch}
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
        ) : selectedChurch ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-5 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selectedChurch.churchName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">
                        {selectedChurch.churchType}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-md">
                        {selectedChurch.churchLocation}
                      </span>
                      <span className="text-xs text-gray-400">#{selectedChurch.churchIdx}</span>
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
                      onClick={handleDeleteSingleChurch}
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
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">교회명</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={isEditMode ? editingChurch?.churchName || "" : selectedChurch.churchName}
                      onChange={(e) => handleEditChange("churchName", e.target.value)}
                      readOnly={!isEditMode}
                      className={`flex-1 px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                        isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                      }`}
                    />
                    {isEditMode && (
                      <button type="button" onClick={() => { setAddressMode("edit"); setShowAddressModal(true); }} className="shrink-0 px-3 py-2.5 text-xs font-medium text-purple-700 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors">
                        검색
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위치</label>
                  <input
                    type="text"
                    value={isEditMode ? editingChurch?.churchLocation || "" : selectedChurch.churchLocation}
                    onChange={(e) => handleEditChange("churchLocation", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">교회 종류</label>
                  <select
                    value={isEditMode ? editingChurch?.churchType || "" : selectedChurch.churchType}
                    onChange={(e) => handleEditChange("churchType", e.target.value)}
                    disabled={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
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
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">설립년도</label>
                  <input
                    type="text"
                    value={isEditMode ? editingChurch?.churchEstablished || "" : selectedChurch.churchEstablished}
                    onChange={(e) => handleEditChange("churchEstablished", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">담임목사</label>
                  <input
                    type="text"
                    value={isEditMode ? editingChurch?.churchPastor || "" : selectedChurch.churchPastor}
                    onChange={(e) => handleEditChange("churchPastor", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchLatX || 0 : selectedChurch.churchLatX}
                    readOnly
                    step="any"
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-gray-50/80 border-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">경도</label>
                  <input
                    type="number"
                    value={isEditMode ? editingChurch?.churchLatY || 0 : selectedChurch.churchLatY}
                    readOnly
                    step="any"
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm bg-gray-50/80 border-gray-100 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">웹사이트 URL</label>
                  <input
                    type="url"
                    value={isEditMode ? editingChurch?.churchURL || "" : selectedChurch.churchURL}
                    onChange={(e) => handleEditChange("churchURL", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchLotAddr || "" : selectedChurch.churchLotAddr}
                    onChange={(e) => handleEditChange("churchLotAddr", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchAddr || "" : selectedChurch.churchAddr}
                    onChange={(e) => handleEditChange("churchAddr", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchMapIMG || "" : selectedChurch.churchMapIMG}
                    onChange={(e) => handleEditChange("churchMapIMG", e.target.value)}
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
                    value={isEditMode ? editingChurch?.churchStatus || 0 : selectedChurch.churchStatus}
                    onChange={(e) => handleEditChange("churchStatus", parseInt(e.target.value))}
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
                    value={isEditMode ? editingChurch?.churchViewCount || 0 : selectedChurch.churchViewCount}
                    onChange={(e) => handleEditChange("churchViewCount", parseInt(e.target.value))}
                    readOnly={!isEditMode}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${
                      isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">등록일</label>
                  <div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">
                    {selectedChurch.createdAt
                      ? new Date(selectedChurch.createdAt).toLocaleString('ko-KR', {
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
                    {selectedChurch.updatedAt
                      ? new Date(selectedChurch.updatedAt).toLocaleString('ko-KR', {
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
                  onClick={handleUpdateChurch}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">교회를 선택하거나</p>
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
                onClick={() => { setShowLeaveModal(false); setPendingChurch(null); }}
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

export default ChurchManagementPage;
