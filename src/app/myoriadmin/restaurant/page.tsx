"use client";

import React, { useEffect, useRef, useState } from "react";

interface RestaurantData {
  restaurantIdx: number;
  restaurantName: string;
  restaurantLocation: string;
  restaurantType: string;
  restaurantEstablished: string;
  restaurantOwner: string;
  restaurantLatX: number;
  restaurantLatY: number;
  restaurantURL: string;
  restaurantLotAddr: string;
  restaurantAddr: string;
  restaurantMapIMG: string;
  restaurantImage?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponseV1 {
  status: number;
  data?: RestaurantData[];
  totalCount?: number;
  currentPage?: number | string;
  rowsPerPage?: number;
  totalPages?: number;
}

interface ApiResponseV2 {
  status: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  restaurants: RestaurantData[];
}

const API_BASE_URL = "https://api.reviewhub.life";

const getImageUrl = (imagePath: string | undefined | null): string | null => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  return `${API_BASE_URL}/${imagePath}`;
};

const RestaurantManagementPage: React.FC = () => {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantData | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [tempPage, setTempPage] = useState<string>("1");
  const [totalPages, setTotalPages] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showSwitchConfirmModal, setShowSwitchConfirmModal] = useState(false);
  const [pendingRestaurant, setPendingRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const hasFetched = useRef(false);

  const [newRestaurant, setNewRestaurant] = useState({
    restaurantName: "",
    restaurantLocation: "",
    restaurantType: "",
    restaurantEstablished: "",
    restaurantOwner: "",
    restaurantLatX: 0,
    restaurantLatY: 0,
    restaurantURL: "",
    restaurantLotAddr: "",
    restaurantAddr: "",
    restaurantMapIMG: "",
    restaurantImage: "",
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editSelectedImage, setEditSelectedImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const searchRestaurants = async (keyword = "", page = 1, pageSize = rowsPerPage) => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const url = keyword
        ? `${API_BASE_URL}/admin/restaurant/searchRestaurant?restaurantName=${encodeURIComponent(keyword)}&page=${page}&rowsPerPage=${pageSize}`
        : `${API_BASE_URL}/admin/restaurant/searchRestaurant?page=${page}&rowsPerPage=${pageSize}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const raw: ApiResponseV1 | ApiResponseV2 = await res.json();
      const list = (raw as ApiResponseV2).restaurants ?? (raw as ApiResponseV1).data ?? [];
      setRestaurants(list as RestaurantData[]);

      const total = (raw as ApiResponseV2).totalCount ?? (raw as ApiResponseV1).totalCount ?? 0;
      const serverRows = (raw as ApiResponseV1).rowsPerPage;
      const serverPage = (raw as ApiResponseV2).currentPage ?? (raw as ApiResponseV1).currentPage ?? page;
      const serverTotalPages = (raw as ApiResponseV2).totalPages;

      const size = serverRows || pageSize;
      if (typeof serverTotalPages === 'number') {
        setTotalPages(Math.max(1, serverTotalPages));
      } else {
        setTotalPages(Math.max(1, Math.ceil(total / size)));
      }
      const nextPage = Number(serverPage) || page;
      setCurrentPage(nextPage);
      setTempPage(String(nextPage));
      if (serverRows) setRowsPerPage(serverRows);
    } catch (e) {
      console.error("식당 검색 실패:", e);
      setRestaurants([]);
      setTotalPages(1);
      setCurrentPage(page);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    searchRestaurants("", 1, rowsPerPage);
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    setTempPage("1");
    hasFetched.current = false;
    searchRestaurants(searchKeyword, 1, rowsPerPage);
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (!restaurants || restaurants.length === 0) return;
    if (selectedIds.length === restaurants.length) setSelectedIds([]);
    else setSelectedIds(restaurants.map((r) => r.restaurantIdx));
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          if (width > height) {
            if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
          } else {
            if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("이미지 크기는 5MB 이하여야 합니다."); return; }
      if (!file.type.startsWith('image/')) { alert("이미지 파일만 업로드 가능합니다."); return; }
      setSelectedImage(file);
      try {
        const compressedDataUrl = await compressImage(file);
        setImagePreview(compressedDataUrl);
        setNewRestaurant({ ...newRestaurant, restaurantImage: compressedDataUrl });
      } catch (error) {
        console.error('이미지 압축 실패:', error);
        alert('이미지 처리 중 오류가 발생했습니다.');
      }
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setNewRestaurant({ ...newRestaurant, restaurantImage: "" });
  };

  const handleAdd = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const restaurantData = { ...newRestaurant, restaurantImage: newRestaurant.restaurantImage || null };
      const res = await fetch(`${API_BASE_URL}/admin/restaurant/createRestaurant`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(restaurantData),
      });
      if (res.ok) {
        alert("식당이 성공적으로 추가되었습니다.");
        setIsAddMode(false);
        setNewRestaurant({ restaurantName: "", restaurantLocation: "", restaurantType: "", restaurantEstablished: "", restaurantOwner: "", restaurantLatX: 0, restaurantLatY: 0, restaurantURL: "", restaurantLotAddr: "", restaurantAddr: "", restaurantMapIMG: "", restaurantImage: "" });
        setSelectedImage(null);
        setImagePreview(null);
        searchRestaurants(searchKeyword);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "식당 추가에 실패했습니다.");
      }
    } catch (e) {
      console.error("식당 추가 실패:", e);
      alert("식당 추가에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const accessToken = localStorage.getItem("accessToken");
      for (const id of selectedIds) {
        const res = await fetch(`${API_BASE_URL}/admin/restaurant/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(`삭제 실패 id=${id}`);
      }
      setShowDeleteModal(true);
      setSelectedIds([]);
      searchRestaurants(searchKeyword, currentPage, rowsPerPage);
    } catch (e) {
      console.error("식당 삭제 실패:", e);
      alert("식당 삭제에 실패했습니다.");
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setTempPage(String(page));
      hasFetched.current = false;
      searchRestaurants(searchKeyword, page, rowsPerPage);
    }
  };

  const handleRowsPerPageChange = (n: number) => {
    setRowsPerPage(n);
    setCurrentPage(1);
    hasFetched.current = false;
    searchRestaurants(searchKeyword, 1, n);
  };

  const handleEditImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("이미지 크기는 5MB 이하여야 합니다."); return; }
      if (!file.type.startsWith('image/')) { alert("이미지 파일만 업로드 가능합니다."); return; }
      setEditSelectedImage(file);
      try {
        const compressedDataUrl = await compressImage(file);
        setEditImagePreview(compressedDataUrl);
        if (editingRestaurant) { handleEditChange("restaurantImage", compressedDataUrl); }
      } catch (error) {
        console.error('이미지 압축 실패:', error);
        alert('이미지 처리 중 오류가 발생했습니다.');
      }
    }
  };

  const handleRemoveEditImage = () => {
    setEditSelectedImage(null);
    setEditImagePreview(null);
    if (editingRestaurant) { handleEditChange("restaurantImage", ""); }
  };

  const handleEditStart = () => {
    if (selectedRestaurant) {
      setEditingRestaurant({ ...selectedRestaurant });
      setIsEditMode(true);
      setHasChanges(false);
      if (selectedRestaurant.restaurantImage) { setEditImagePreview(selectedRestaurant.restaurantImage); }
      else { setEditImagePreview(null); }
      setEditSelectedImage(null);
    }
  };

  const handleEditCancel = () => {
    if (hasChanges) setShowCancelModal(true);
    else { setIsEditMode(false); setEditingRestaurant(null); setHasChanges(false); setEditSelectedImage(null); setEditImagePreview(null); }
  };

  const handleCancelConfirm = () => {
    setIsEditMode(false); setEditingRestaurant(null); setHasChanges(false); setEditSelectedImage(null); setEditImagePreview(null); setShowCancelModal(false);
  };

  const handleSwitchConfirm = () => {
    setIsEditMode(false); setEditingRestaurant(null); setHasChanges(false); setEditSelectedImage(null); setEditImagePreview(null);
    if (pendingRestaurant) { setSelectedRestaurant(pendingRestaurant); }
    setPendingRestaurant(null); setShowSwitchConfirmModal(false);
  };

  const handleSwitchCancel = () => { setPendingRestaurant(null); setShowSwitchConfirmModal(false); };

  const handleEditChange = (field: keyof RestaurantData, value: string | number) => {
    if (editingRestaurant && selectedRestaurant) {
      const updated = { ...editingRestaurant, [field]: value } as RestaurantData;
      setEditingRestaurant(updated);
      const changed = JSON.stringify(updated) !== JSON.stringify(selectedRestaurant);
      setHasChanges(changed);
    }
  };

  const handleUpdate = async () => {
    if (!editingRestaurant || !selectedRestaurant) return;
    try {
      const accessToken = localStorage.getItem("accessToken");
      const changedData: Partial<RestaurantData> = { restaurantIdx: editingRestaurant.restaurantIdx } as any;
      const currentImage = editingRestaurant.restaurantImage || "";
      const originalImage = (selectedRestaurant.restaurantImage || "").trim();
      const currentImageTrimmed = currentImage.trim();
      if (currentImageTrimmed !== originalImage) { (changedData as any).restaurantImage = currentImageTrimmed || null; }
      (Object.keys(editingRestaurant) as (keyof RestaurantData)[]).forEach((k) => {
        const value = editingRestaurant[k];
        if (value !== selectedRestaurant[k] && k !== 'createdAt' && k !== 'updatedAt' && k !== 'restaurantImage' && value !== undefined) { (changedData as any)[k] = value; }
      });
      const res = await fetch(`${API_BASE_URL}/admin/restaurant/${editingRestaurant.restaurantIdx}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(changedData),
      });
      if (res.ok) {
        alert("식당 정보가 성공적으로 수정되었습니다.");
        setSelectedRestaurant(editingRestaurant); setIsEditMode(false); setEditingRestaurant(null); setHasChanges(false); setEditSelectedImage(null); setEditImagePreview(null);
        searchRestaurants(searchKeyword, currentPage, rowsPerPage);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || "식당 수정에 실패했습니다.");
      }
    } catch (e) {
      console.error("식당 수정 실패:", e);
      alert("식당 수정에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-5">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
        {/* 헤더 */}
        <div className="mb-5">
          <h2 className="text-lg font-bold text-gray-900">식당 관리</h2>
          <p className="text-sm text-gray-400 mt-0.5">등록된 식당 목록</p>
        </div>

        {/* 검색 영역 */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="식당명 검색..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
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
            {selectedIds.length > 0 && `${selectedIds.length}개 선택됨`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddMode(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
              title="식당 추가"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>
            <button
              onClick={handleDelete}
              disabled={selectedIds.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                selectedIds.length > 0
                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                  : 'text-gray-400 bg-gray-50 cursor-not-allowed'
              }`}
              title="선택된 식당 삭제"
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
                      checked={restaurants && restaurants.length > 0 && selectedIds.length === restaurants.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">식당명</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">위치</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500">분류</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-400">로딩 중...</td>
                  </tr>
                ) : !restaurants || restaurants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-gray-400">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  restaurants.map((r) => (
                    <tr
                      key={r.restaurantIdx}
                      className={`border-t border-gray-50 cursor-pointer transition-colors ${
                        selectedRestaurant?.restaurantIdx === r.restaurantIdx
                          ? 'bg-purple-50/70'
                          : 'hover:bg-gray-50/70'
                      }`}
                      onClick={() => {
                        if (isEditMode && selectedRestaurant?.restaurantIdx !== r.restaurantIdx) {
                          setPendingRestaurant(r);
                          setShowSwitchConfirmModal(true);
                        } else {
                          setSelectedRestaurant(r);
                        }
                      }}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.restaurantIdx)}
                          onChange={() => handleSelect(r.restaurantIdx)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 font-mono">{r.restaurantIdx}</td>
                      <td className="px-3 py-2.5 text-sm font-medium text-gray-900">{r.restaurantName}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-500">{r.restaurantLocation}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{r.restaurantType}</td>
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
                value={tempPage}
                onChange={(e) => setTempPage(e.target.value)}
                onBlur={() => {
                  const page = parseInt(tempPage);
                  if (!isNaN(page)) { goToPage(Math.min(Math.max(page, 1), totalPages)); }
                  else { setTempPage(String(currentPage)); }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt(tempPage);
                    if (!isNaN(page)) { goToPage(Math.min(Math.max(page, 1), totalPages)); }
                    else { setTempPage(String(currentPage)); }
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
                <h3 className="text-lg font-bold text-gray-900">식당 추가</h3>
                <p className="text-xs text-gray-400">새 식당 정보를 입력하세요</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">식당명</label>
                <input
                  type="text"
                  value={newRestaurant.restaurantName}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  placeholder="식당명을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">위치</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantLocation}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantLocation: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">분류</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantType}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantType: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">설립년도</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantEstablished}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantEstablished: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">대표자</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantOwner}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantOwner: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">위도</label>
                  <input
                    type="number"
                    value={newRestaurant.restaurantLatX}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantLatX: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">경도</label>
                  <input
                    type="number"
                    value={newRestaurant.restaurantLatY}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantLatY: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                    step="any"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">웹사이트 URL</label>
                <input
                  type="url"
                  value={newRestaurant.restaurantURL}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantURL: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">지번</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantLotAddr}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantLotAddr: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">주소</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantAddr}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantAddr: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">지도 이미지 URL</label>
                <input
                  type="url"
                  value={newRestaurant.restaurantMapIMG}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantMapIMG: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">식당 이미지</label>
                <div className="space-y-2">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="미리보기" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 shadow-sm border border-gray-200 hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center transition-all"
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" id="restaurant-image-upload" />
                      <label htmlFor="restaurant-image-upload" className="flex flex-col items-center justify-center cursor-pointer">
                        <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-gray-500">이미지를 선택하세요</span>
                        <span className="text-xs text-gray-400 mt-0.5">최대 5MB</span>
                      </label>
                    </div>
                  )}
                  <div className="text-xs text-gray-400">또는 이미지 URL을 직접 입력:</div>
                  <input
                    type="text"
                    placeholder="/uploads/restaurants/image.jpg"
                    value={newRestaurant.restaurantImage}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantImage: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button onClick={handleAdd} className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm">저장</button>
              <button onClick={() => setIsAddMode(false)} className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">취소</button>
            </div>
          </div>
        ) : selectedRestaurant ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-5 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{selectedRestaurant.restaurantName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-md">
                        {selectedRestaurant.restaurantType}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-md">
                        {selectedRestaurant.restaurantLocation}
                      </span>
                      <span className="text-xs text-gray-400">#{selectedRestaurant.restaurantIdx}</span>
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
                      onClick={async () => { setSelectedIds([selectedRestaurant.restaurantIdx]); await handleDelete(); setSelectedRestaurant(null); }}
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
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">식당명</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantName || "" : selectedRestaurant.restaurantName} onChange={(e) => handleEditChange("restaurantName", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위치</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantLocation || "" : selectedRestaurant.restaurantLocation} onChange={(e) => handleEditChange("restaurantLocation", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">분류</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantType || "" : selectedRestaurant.restaurantType} onChange={(e) => handleEditChange("restaurantType", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">설립년도</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantEstablished || "" : selectedRestaurant.restaurantEstablished} onChange={(e) => handleEditChange("restaurantEstablished", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">대표자</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantOwner || "" : selectedRestaurant.restaurantOwner} onChange={(e) => handleEditChange("restaurantOwner", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">위도</label>
                  <input type="number" value={isEditMode ? editingRestaurant?.restaurantLatX || 0 : selectedRestaurant.restaurantLatX} onChange={(e) => handleEditChange("restaurantLatX", parseFloat(e.target.value))} readOnly={!isEditMode} step="any" className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">경도</label>
                  <input type="number" value={isEditMode ? editingRestaurant?.restaurantLatY || 0 : selectedRestaurant.restaurantLatY} onChange={(e) => handleEditChange("restaurantLatY", parseFloat(e.target.value))} readOnly={!isEditMode} step="any" className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">웹사이트 URL</label>
                  <input type="url" value={isEditMode ? editingRestaurant?.restaurantURL || "" : selectedRestaurant.restaurantURL} onChange={(e) => handleEditChange("restaurantURL", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">지번</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantLotAddr || "" : selectedRestaurant.restaurantLotAddr} onChange={(e) => handleEditChange("restaurantLotAddr", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">주소</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantAddr || "" : selectedRestaurant.restaurantAddr} onChange={(e) => handleEditChange("restaurantAddr", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">지도 이미지 URL</label>
                  <input type="url" value={isEditMode ? editingRestaurant?.restaurantMapIMG || "" : selectedRestaurant.restaurantMapIMG} onChange={(e) => handleEditChange("restaurantMapIMG", e.target.value)} readOnly={!isEditMode} className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all ${isEditMode ? "bg-white border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" : "bg-gray-50/80 border-gray-100 text-gray-700"}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">식당 이미지</label>
                  <div className="space-y-2">
                    {isEditMode ? (
                      <>
                        {editImagePreview ? (
                          <div className="relative">
                            <img src={editImagePreview} alt="미리보기" className="w-full h-48 object-cover rounded-xl border border-gray-200" />
                            <button
                              type="button"
                              onClick={handleRemoveEditImage}
                              className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 shadow-sm border border-gray-200 hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center transition-all"
                            >
                              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                            <input type="file" accept="image/*" onChange={handleEditImageSelect} className="hidden" id="edit-restaurant-image-upload" />
                            <label htmlFor="edit-restaurant-image-upload" className="flex flex-col items-center justify-center cursor-pointer">
                              <svg className="w-10 h-10 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs text-gray-500">이미지를 선택하세요</span>
                              <span className="text-xs text-gray-400 mt-0.5">최대 5MB</span>
                            </label>
                          </div>
                        )}
                        <div className="text-xs text-gray-400">또는 이미지 URL을 직접 입력:</div>
                        <input
                          type="text"
                          placeholder="/uploads/restaurants/image.jpg"
                          value={editingRestaurant?.restaurantImage || ""}
                          onChange={(e) => handleEditChange("restaurantImage", e.target.value)}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                        />
                      </>
                    ) : (
                      <div className="w-full">
                        {selectedRestaurant.restaurantImage ? (
                          <img
                            src={getImageUrl(selectedRestaurant.restaurantImage) || ''}
                            alt="식당 이미지"
                            className="w-full h-48 object-cover rounded-xl border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.image-placeholder')) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'image-placeholder w-full h-48 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 text-sm';
                                placeholder.textContent = '이미지를 불러올 수 없습니다';
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                            이미지 없음
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">등록일</label>
                  <div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">
                    {selectedRestaurant.createdAt
                      ? new Date(selectedRestaurant.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">수정일</label>
                  <div className="w-full px-3.5 py-2.5 text-sm text-gray-500 bg-gray-50/80 border border-gray-100 rounded-xl">
                    {selectedRestaurant.updatedAt
                      ? new Date(selectedRestaurant.updatedAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                      : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* 편집 모드 버튼 */}
            {isEditMode && (
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button onClick={handleUpdate} className="px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors shadow-sm">저장</button>
                <button onClick={handleEditCancel} className="px-5 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">취소</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">식당을 선택하거나</p>
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
            <button onClick={() => setShowDeleteModal(false)} className="w-full px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors">확인</button>
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
              <button onClick={() => setShowCancelModal(false)} className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">돌아가기</button>
              <button onClick={handleCancelConfirm} className="flex-1 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors">취소하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 중 다른 식당 선택 확인 모달 */}
      {showSwitchConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">수정 취소</h3>
            <p className="text-sm text-gray-500 text-center mb-5">수정을 취소하고 다른 식당을 선택하시겠습니까?</p>
            <div className="flex gap-2">
              <button onClick={handleSwitchCancel} className="flex-1 px-4 py-2.5 text-gray-600 text-sm font-medium bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">돌아가기</button>
              <button onClick={handleSwitchConfirm} className="flex-1 px-4 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors">확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantManagementPage;
