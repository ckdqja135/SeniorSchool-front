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

interface ApiResponseV1 { // 기존 다른 엔드포인트 유사 포맷 대비
  status: number;
  data?: RestaurantData[];
  totalCount?: number;
  currentPage?: number | string;
  rowsPerPage?: number;
  totalPages?: number;
}

interface ApiResponseV2 { // 식당 검색 실제 응답 포맷
  status: number;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  restaurants: RestaurantData[];
}

const API_BASE_URL = "https://api.reviewhub.life";

// 이미지 URL 헬퍼 함수
const getImageUrl = (imagePath: string | undefined | null): string | null => {
  if (!imagePath) return null;
  
  // 이미 절대 URL인 경우 그대로 반환
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }
  
  // 상대 경로인 경우 서버 URL과 결합
  if (imagePath.startsWith('/')) {
    return `${API_BASE_URL}${imagePath}`;
  }
  
  // 그 외의 경우 서버 URL과 결합
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
      // 응답 포맷 가변 대응: restaurants 우선, 없으면 data 사용
      const list = (raw as ApiResponseV2).restaurants ?? (raw as ApiResponseV1).data ?? [];
      setRestaurants(list as RestaurantData[]);

      const total = (raw as ApiResponseV2).totalCount ?? (raw as ApiResponseV1).totalCount ?? 0;
      const serverRows = (raw as ApiResponseV1).rowsPerPage; // V2에는 없음
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

  // 이미지 압축 헬퍼 함수
  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 최대 크기 설정 (800px)
          const maxSize = 800;
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // JPEG로 압축 (품질 0.7)
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
      // 파일 크기 제한 (예: 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("이미지 크기는 5MB 이하여야 합니다.");
        return;
      }
      // 이미지 파일 타입 확인
      if (!file.type.startsWith('image/')) {
        alert("이미지 파일만 업로드 가능합니다.");
        return;
      }
      setSelectedImage(file);

      try {
        // 이미지 압축 후 미리보기 생성 및 데이터 저장
        const compressedDataUrl = await compressImage(file);
        setImagePreview(compressedDataUrl);
        // 이미지 데이터를 newRestaurant에 저장하여 POST 요청에 포함되도록 함
        setNewRestaurant({ ...newRestaurant, restaurantImage: compressedDataUrl });
      } catch (error) {
        console.error('이미지 압축 실패:', error);
        alert('이미지 처리 중 오류가 발생했습니다.');
      }
    }
  };

  const handleImageUpload = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    // 이미지 업로드 API가 없는 경우, 사용자에게 경로 입력 안내
    alert("이미지 업로드 기능은 현재 사용할 수 없습니다.\n\n이미지 경로를 직접 입력해주세요.\n예: /uploads/restaurants/image.jpg");
    return null;
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setNewRestaurant({ ...newRestaurant, restaurantImage: "" });
  };

  const handleAdd = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");

      // 이미지 경로는 사용자가 직접 입력한 값 사용
      const restaurantData = {
        ...newRestaurant,
        restaurantImage: newRestaurant.restaurantImage || null,
      };

      const res = await fetch(`${API_BASE_URL}/admin/restaurant/createRestaurant`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(restaurantData),
      });
      if (res.ok) {
        alert("식당이 성공적으로 추가되었습니다.");
        setIsAddMode(false);
        setNewRestaurant({
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
      // 백엔드 스펙: DELETE /admin/restaurant/:restaurantIdx (단건)
      for (const id of selectedIds) {
        const res = await fetch(`${API_BASE_URL}/admin/restaurant/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
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
      // 파일 크기 제한 (예: 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("이미지 크기는 5MB 이하여야 합니다.");
        return;
      }
      // 이미지 파일 타입 확인
      if (!file.type.startsWith('image/')) {
        alert("이미지 파일만 업로드 가능합니다.");
        return;
      }
      setEditSelectedImage(file);

      try {
        // 이미지 압축 후 미리보기 생성 및 데이터 저장
        const compressedDataUrl = await compressImage(file);
        setEditImagePreview(compressedDataUrl);
        // 이미지 데이터를 editingRestaurant에 저장하여 PUT 요청에 포함되도록 함
        if (editingRestaurant) {
          handleEditChange("restaurantImage", compressedDataUrl);
        }
      } catch (error) {
        console.error('이미지 압축 실패:', error);
        alert('이미지 처리 중 오류가 발생했습니다.');
      }
    }
  };

  const handleEditImageUpload = async (): Promise<string | null> => {
    if (!editSelectedImage) return null;

    // 이미지 업로드 API가 없는 경우, 사용자에게 경로 입력 안내
    alert("이미지 업로드 기능은 현재 사용할 수 없습니다.\n\n이미지 경로를 직접 입력해주세요.\n예: /uploads/restaurants/image.jpg");
    return null;
  };

  const handleRemoveEditImage = () => {
    setEditSelectedImage(null);
    setEditImagePreview(null);
    if (editingRestaurant) {
      handleEditChange("restaurantImage", "");
    }
  };

  const handleEditStart = () => {
    if (selectedRestaurant) {
      setEditingRestaurant({ ...selectedRestaurant });
      setIsEditMode(true);
      setHasChanges(false);
      // 기존 이미지 경로가 있으면 미리보기 설정
      if (selectedRestaurant.restaurantImage) {
        setEditImagePreview(selectedRestaurant.restaurantImage);
      } else {
        setEditImagePreview(null);
      }
      setEditSelectedImage(null);
    }
  };

  const handleEditCancel = () => {
    if (hasChanges) setShowCancelModal(true);
    else {
      setIsEditMode(false);
      setEditingRestaurant(null);
      setHasChanges(false);
      setEditSelectedImage(null);
      setEditImagePreview(null);
    }
  };

  const handleCancelConfirm = () => {
    setIsEditMode(false);
    setEditingRestaurant(null);
    setHasChanges(false);
    setEditSelectedImage(null);
    setEditImagePreview(null);
    setShowCancelModal(false);
  };

  const handleSwitchConfirm = () => {
    // 수정 모드 취소하고 새로운 식당 선택
    setIsEditMode(false);
    setEditingRestaurant(null);
    setHasChanges(false);
    setEditSelectedImage(null);
    setEditImagePreview(null);
    if (pendingRestaurant) {
      setSelectedRestaurant(pendingRestaurant);
    }
    setPendingRestaurant(null);
    setShowSwitchConfirmModal(false);
  };

  const handleSwitchCancel = () => {
    // 현상 유지 (수정 모드 유지)
    setPendingRestaurant(null);
    setShowSwitchConfirmModal(false);
  };

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

      // 이미지 경로 업데이트 (값이 있거나 변경되었으면 항상 포함)
      const currentImage = editingRestaurant.restaurantImage || "";
      const originalImage = (selectedRestaurant.restaurantImage || "").trim();
      const currentImageTrimmed = currentImage.trim();

      // 이미지가 변경되었으면 항상 포함 (새 이미지가 있거나, 기존과 다른 경우)
      if (currentImageTrimmed !== originalImage) {
        (changedData as any).restaurantImage = currentImageTrimmed || null;
      }

      (Object.keys(editingRestaurant) as (keyof RestaurantData)[]).forEach((k) => {
        const value = editingRestaurant[k];
        if (value !== selectedRestaurant[k] && k !== 'createdAt' && k !== 'updatedAt' && k !== 'restaurantImage' && value !== undefined) {
          (changedData as any)[k] = value;
        }
      });

      // 디버깅: 변경된 데이터 확인
      console.log("변경된 데이터:", changedData);

      const res = await fetch(`${API_BASE_URL}/admin/restaurant/${editingRestaurant.restaurantIdx}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedData),
      });
      if (res.ok) {
        alert("식당 정보가 성공적으로 수정되었습니다.");
        setSelectedRestaurant(editingRestaurant);
        setIsEditMode(false);
        setEditingRestaurant(null);
        setHasChanges(false);
        setEditSelectedImage(null);
        setEditImagePreview(null);
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
    <div className="flex h-full gap-4">
      <div className="w-1/2 bg-white rounded-lg shadow p-4">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">맛잘알 오빠 - 식당 관리</h2>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="검색 텍스트 입력"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            검색
          </button>
        </div>

        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setIsAddMode(true)}
            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600"
            title="식당 추가"
          >
            +
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedIds.length === 0}
            className={`w-8 h-8 rounded-full text-white ${selectedIds.length > 0 ? "bg-red-500 hover:bg-red-600" : "bg-gray-300 cursor-not-allowed"}`}
            title="선택된 식당 삭제"
          >
            🗑️
          </button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-y-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">
                    <input
                      type="checkbox"
                      checked={restaurants && restaurants.length > 0 && selectedIds.length === restaurants.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">식당 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">식당명</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">위치</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">분류</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">로딩 중...</td>
                  </tr>
                ) : !restaurants || restaurants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  restaurants.map((r) => (
                    <tr
                      key={r.restaurantIdx}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedRestaurant?.restaurantIdx === r.restaurantIdx ? "bg-blue-50" : ""}`}
                      onClick={() => {
                        // 수정 모드이고 다른 식당을 클릭한 경우
                        if (isEditMode && selectedRestaurant?.restaurantIdx !== r.restaurantIdx) {
                          setPendingRestaurant(r);
                          setShowSwitchConfirmModal(true);
                        } else {
                          setSelectedRestaurant(r);
                        }
                      }}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.restaurantIdx)}
                          onChange={() => handleSelect(r.restaurantIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{r.restaurantIdx}</td>
                      <td className="px-3 py-2 text-sm">{r.restaurantName}</td>
                      <td className="px-3 py-2 text-sm">{r.restaurantLocation}</td>
                      <td className="px-3 py-2 text-sm">{r.restaurantType}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4">
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className={`px-2 py-1 text-sm border rounded transition-colors ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"}`}
              title="첫 페이지"
            >
              ⏮️
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-2 py-1 text-sm border rounded transition-colors ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"}`}
              title="이전 페이지"
            >
              ◀️
            </button>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={tempPage}
                onChange={(e) => {
                  // 자유 입력 허용, 숫자 외/빈문자 예외 처리
                  const val = e.target.value;
                  setTempPage(val);
                }}
                onBlur={() => {
                  const page = parseInt(tempPage as string);
                  if (!isNaN(page)) {
                    const clamped = Math.min(Math.max(page, 1), totalPages);
                    goToPage(clamped);
                  } else {
                    setTempPage(String(currentPage));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt(tempPage as string);
                    if (!isNaN(page)) {
                      const clamped = Math.min(Math.max(page, 1), totalPages);
                      goToPage(clamped);
                    } else {
                      setTempPage(String(currentPage));
                    }
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
              className={`px-2 py-1 text-sm border rounded transition-colors ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"}`}
              title="다음 페이지"
            >
              ▶️
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className={`px-2 py-1 text-sm border rounded transition-colors ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 hover:bg-gray-50 cursor-pointer"}`}
              title="마지막 페이지"
            >
              ⏭️
            </button>
          </div>
        </div>
      </div>

      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        {isAddMode ? (
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-4">식당 추가</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium mb-1">식당명</label>
                <input
                  type="text"
                  value={newRestaurant.restaurantName}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">위치</label>
                <input
                  type="text"
                  value={newRestaurant.restaurantLocation}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">분류</label>
                <input
                  type="text"
                  value={newRestaurant.restaurantType}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">설립년도</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantEstablished}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantEstablished: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">대표자</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantOwner}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantOwner: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">위도</label>
                  <input
                    type="number"
                    value={newRestaurant.restaurantLatX}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantLatX: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">경도</label>
                  <input
                    type="number"
                    value={newRestaurant.restaurantLatY}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantLatY: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="any"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">웹사이트 URL</label>
                <input
                  type="url"
                  value={newRestaurant.restaurantURL}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantURL: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">지번</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantLotAddr}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantLotAddr: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">주소</label>
                  <input
                    type="text"
                    value={newRestaurant.restaurantAddr}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantAddr: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">지도 이미지 URL</label>
                <input
                  type="url"
                  value={newRestaurant.restaurantMapIMG}
                  onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantMapIMG: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">식당 이미지</label>
                <div className="space-y-2">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="미리보기"
                        className="w-full h-48 object-cover rounded-md border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="restaurant-image-upload"
                      />
                      <label
                        htmlFor="restaurant-image-upload"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-600">이미지를 선택하거나 드래그하세요</span>
                        <span className="text-xs text-gray-400 mt-1">최대 5MB</span>
                      </label>
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    또는 이미지 URL을 직접 입력하세요:
                  </div>
                  <input
                    type="text"
                    placeholder="/uploads/restaurants/image.jpg 또는 URL"
                    value={newRestaurant.restaurantImage}
                    onChange={(e) => setNewRestaurant({ ...newRestaurant, restaurantImage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button onClick={handleAdd} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">저장</button>
              <button onClick={() => setIsAddMode(false)} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">취소</button>
            </div>
          </div>
        ) : selectedRestaurant ? (
          <div className="flex flex-col h-full">
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">{selectedRestaurant.restaurantIdx}</span>
                  <span className="text-lg font-semibold">{selectedRestaurant.restaurantName}</span>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">{selectedRestaurant.restaurantType}</span>
                  <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">{selectedRestaurant.restaurantLocation}</span>
                </div>
                {!isEditMode && (
                  <div className="flex gap-2">
                    <button onClick={handleEditStart} className="w-8 h-8 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center" title="수정">✏️</button>
                    <button onClick={async () => { setSelectedIds([selectedRestaurant.restaurantIdx]); await handleDelete(); setSelectedRestaurant(null); }} className="w-8 h-8 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center" title="삭제">🗑️</button>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-4">식당 상세 정보</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">식당명</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantName || "" : selectedRestaurant.restaurantName} onChange={(e) => handleEditChange("restaurantName", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">위치</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantLocation || "" : selectedRestaurant.restaurantLocation} onChange={(e) => handleEditChange("restaurantLocation", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">분류</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantType || "" : selectedRestaurant.restaurantType} onChange={(e) => handleEditChange("restaurantType", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">설립년도</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantEstablished || "" : selectedRestaurant.restaurantEstablished} onChange={(e) => handleEditChange("restaurantEstablished", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">대표자</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantOwner || "" : selectedRestaurant.restaurantOwner} onChange={(e) => handleEditChange("restaurantOwner", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">위도</label>
                  <input type="number" value={isEditMode ? editingRestaurant?.restaurantLatX || 0 : selectedRestaurant.restaurantLatX} onChange={(e) => handleEditChange("restaurantLatX", parseFloat(e.target.value))} readOnly={!isEditMode} step="any" className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">경도</label>
                  <input type="number" value={isEditMode ? editingRestaurant?.restaurantLatY || 0 : selectedRestaurant.restaurantLatY} onChange={(e) => handleEditChange("restaurantLatY", parseFloat(e.target.value))} readOnly={!isEditMode} step="any" className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">웹사이트 URL</label>
                  <input type="url" value={isEditMode ? editingRestaurant?.restaurantURL || "" : selectedRestaurant.restaurantURL} onChange={(e) => handleEditChange("restaurantURL", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">지번</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantLotAddr || "" : selectedRestaurant.restaurantLotAddr} onChange={(e) => handleEditChange("restaurantLotAddr", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">주소</label>
                  <input type="text" value={isEditMode ? editingRestaurant?.restaurantAddr || "" : selectedRestaurant.restaurantAddr} onChange={(e) => handleEditChange("restaurantAddr", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">지도 이미지 URL</label>
                  <input type="url" value={isEditMode ? editingRestaurant?.restaurantMapIMG || "" : selectedRestaurant.restaurantMapIMG} onChange={(e) => handleEditChange("restaurantMapIMG", e.target.value)} readOnly={!isEditMode} className={`w-full px-3 py-2 border border-gray-300 rounded-md ${isEditMode ? "bg-white" : "bg-gray-50"}`} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">식당 이미지</label>
                  <div className="space-y-2">
                    {isEditMode ? (
                      <>
                        {editImagePreview ? (
                          <div className="relative">
                            <img
                              src={editImagePreview}
                              alt="미리보기"
                              className="w-full h-48 object-cover rounded-md border border-gray-300"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveEditImage}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageSelect}
                              className="hidden"
                              id="edit-restaurant-image-upload"
                            />
                            <label
                              htmlFor="edit-restaurant-image-upload"
                              className="flex flex-col items-center justify-center cursor-pointer"
                            >
                              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm text-gray-600">이미지를 선택하거나 드래그하세요</span>
                              <span className="text-xs text-gray-400 mt-1">최대 5MB</span>
                            </label>
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          또는 이미지 URL을 직접 입력하세요:
                        </div>
                        <input
                          type="text"
                          placeholder="/uploads/restaurants/image.jpg 또는 URL"
                          value={editingRestaurant?.restaurantImage || ""}
                          onChange={(e) => handleEditChange("restaurantImage", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </>
                    ) : (
                      <div className="w-full">
                        {selectedRestaurant.restaurantImage ? (
                          <img
                            src={getImageUrl(selectedRestaurant.restaurantImage) || ''}
                            alt="식당 이미지"
                            className="w-full h-48 object-cover rounded-md border border-gray-300"
                            onError={(e) => {
                              // 이미지 로드 실패 시 플레이스홀더 표시
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.image-placeholder')) {
                                const placeholder = document.createElement('div');
                                placeholder.className = 'image-placeholder w-full h-48 bg-gray-100 rounded-md border border-gray-300 flex items-center justify-center text-gray-400';
                                placeholder.textContent = '이미지를 불러올 수 없습니다';
                                parent.appendChild(placeholder);
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded-md border border-gray-300 flex items-center justify-center text-gray-400">
                            이미지 없음
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">등록일</label>
                  <div className="w-full px-3 py-2 text-gray-700 bg-gray-50 rounded-md">
                    {selectedRestaurant.createdAt
                      ? new Date(selectedRestaurant.createdAt).toLocaleString('ko-KR', {
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
                    {selectedRestaurant.updatedAt
                      ? new Date(selectedRestaurant.updatedAt).toLocaleString('ko-KR', {
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

            {isEditMode && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button onClick={handleUpdate} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">저장</button>
                <button onClick={handleEditCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">취소</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">식당을 선택하거나 추가 버튼을 클릭하세요.</div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">알림</h3>
            <p className="mb-4">삭제가 완료되었습니다.</p>
            <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">확인</button>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">확인</h3>
            <p className="mb-4">변경된 사항이 있습니다. 변경을 취소하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={handleCancelConfirm} className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600">예</button>
              <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">아니오</button>
            </div>
          </div>
        </div>
      )}

      {showSwitchConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold mb-4">확인</h3>
            <p className="mb-4">수정을 취소하시겠습니까?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={handleSwitchConfirm} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">확인</button>
              <button onClick={handleSwitchCancel} className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantManagementPage;


