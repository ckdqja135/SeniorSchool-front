"use client";

import React, { useState, useEffect } from "react";

interface AdminData {
  userIdx: number;
  userId: string;
  userPw: string;
  userRole: string;
  salt: string;
  lastLogin: string;
  userStatus: number;
  accessToken: string;
}

// interface ApiResponse {
//   data: AdminData[];
// }

const AdminManagementPage = () => {
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminData | null>(null);
  const [selectedAdmins, setSelectedAdmins] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddMode, setIsAddMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<AdminData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 새 관리자 데이터 폼
  const [newAdmin, setNewAdmin] = useState({
    userId: "",
    userPw: "",
    userRole: "admin",
    userStatus: 1
  });

  // 관리자 목록 가져오기
  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/user/getAdminlist`;
      
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data: AdminData[] = await response.json();
      
      if (data && Array.isArray(data)) {
        setAdmins(data);
        setTotalPages(1); // 단일 페이지로 설정
        setCurrentPage(1);
      } else {
        setAdmins([]);
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("관리자 목록 가져오기 실패:", error);
      setAdmins([]);
      setTotalPages(1);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    fetchAdmins();
  }, []);



  // 체크박스 선택
  const handleSelectAdmin = (userIdx: number) => {
    setSelectedAdmins(prev => 
      prev.includes(userIdx) 
        ? prev.filter(id => id !== userIdx)
        : [...prev, userIdx]
    );
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (!admins || admins.length === 0) return;
    
    if (selectedAdmins.length === admins.length) {
      setSelectedAdmins([]);
    } else {
      setSelectedAdmins(admins.map(admin => admin.userIdx));
    }
  };

  // 관리자 추가
  const handleAddAdmin = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/user/createAdmin`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newAdmin),
      });

      if (response.ok) {
        alert("관리자가 성공적으로 추가되었습니다.");
        setIsAddMode(false);
        setNewAdmin({
          userId: "",
          userPw: "",
          userRole: "admin",
          userStatus: 1
        });
        fetchAdmins();
      }
    } catch (error) {
      console.error("관리자 추가 실패:", error);
      alert("관리자 추가에 실패했습니다.");
    }
  };

  // 관리자 삭제
  const handleDeleteAdmins = async () => {
    try {
      const deleteData = selectedAdmins.length === 1 
        ? { userIdx: selectedAdmins[0] }
        : { userIdx: selectedAdmins };

      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/user/deleteAdmin`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteData),
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedAdmins([]);
        fetchAdmins();
      }
    } catch (error) {
      console.error("관리자 삭제 실패:", error);
      alert("관리자 삭제에 실패했습니다.");
    }
  };

  // 페이지 이동
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchAdmins();
    }
  };

  // 편집 시작
  const handleEditStart = () => {
    if (selectedAdmin) {
      setEditingAdmin({ ...selectedAdmin });
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
      setEditingAdmin(null);
      setHasChanges(false);
    }
  };

  // 편집 취소 확인
  const handleCancelConfirm = () => {
    setIsEditMode(false);
    setEditingAdmin(null);
    setHasChanges(false);
    setShowCancelModal(false);
  };

  // 편집 데이터 변경
  const handleEditChange = (field: keyof AdminData, value: string | number) => {
    if (editingAdmin && selectedAdmin) {
      const updatedAdmin = { ...editingAdmin, [field]: value };
      setEditingAdmin(updatedAdmin);
      
      // 변경사항 확인
      const isChanged = JSON.stringify(updatedAdmin) !== JSON.stringify(selectedAdmin);
      setHasChanges(isChanged);
    }
  };

  // 관리자 수정
  const handleUpdateAdmin = async () => {
    if (!editingAdmin || !selectedAdmin) return;

    try {
      const accessToken = localStorage.getItem("accessToken");
      
      // 변경된 필드만 추출
      const changedData: Partial<AdminData> = { userIdx: editingAdmin.userIdx };
      Object.keys(editingAdmin).forEach(key => {
        const typedKey = key as keyof AdminData;
        if (editingAdmin[typedKey] !== selectedAdmin[typedKey]) {
          (changedData as Record<string, string | number>)[key] = editingAdmin[typedKey];
        }
      });

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/user/putAdminData`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changedData),
      });

      if (response.ok) {
        alert("관리자 정보가 성공적으로 수정되었습니다.");
        setSelectedAdmin(editingAdmin);
        setIsEditMode(false);
        setEditingAdmin(null);
        setHasChanges(false);
        fetchAdmins();
      }
    } catch (error) {
      console.error("관리자 수정 실패:", error);
      alert("관리자 수정에 실패했습니다.");
    }
  };

  // 단일 관리자 삭제
  const handleDeleteSingleAdmin = async () => {
    if (!selectedAdmin) return;

    try {
      const accessToken = localStorage.getItem("accessToken");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/user/deleteAdmin`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIdx: selectedAdmin.userIdx }),
      });

      if (response.ok) {
        setShowDeleteModal(true);
        setSelectedAdmin(null);
        setIsEditMode(false);
        setEditingAdmin(null);
        setHasChanges(false);
        fetchAdmins();
      }
    } catch (error) {
      console.error("관리자 삭제 실패:", error);
      alert("관리자 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* 왼쪽 리스트 영역 */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4">
        {/* 메뉴 경로 */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold">관리자 관리</h2>
        </div>



        {/* 액션 버튼 */}
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setIsAddMode(true)}
            className="w-8 h-8 bg-green-500 text-white rounded-full hover:bg-green-600"
            title="관리자 추가"
          >
            +
          </button>
          <button
            onClick={handleDeleteAdmins}
            disabled={selectedAdmins.length === 0}
            className={`w-8 h-8 rounded-full text-white ${
              selectedAdmins.length > 0 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            title="선택된 관리자 삭제"
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
                      checked={admins && admins.length > 0 && selectedAdmins.length === admins.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">관리자 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">사용자 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">역할</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">로딩 중...</td>
                  </tr>
                ) : !admins || admins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center">검색 결과가 없습니다.</td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr 
                      key={admin.userIdx}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedAdmin?.userIdx === admin.userIdx ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedAdmin(admin)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedAdmins.includes(admin.userIdx)}
                          onChange={() => handleSelectAdmin(admin.userIdx)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm">{admin.userIdx}</td>
                      <td className="px-3 py-2 text-sm">{admin.userId}</td>
                      <td className="px-3 py-2 text-sm">{admin.userRole}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          admin.userStatus === 1 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.userStatus === 1 ? '활성' : '비활성'}
                        </span>
                      </td>
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
            <h3 className="text-lg font-semibold mb-4">관리자 추가</h3>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-sm font-medium mb-1">사용자 ID</label>
                <input
                  type="text"
                  value={newAdmin.userId}
                  onChange={(e) => setNewAdmin({...newAdmin, userId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">비밀번호</label>
                <input
                  type="password"
                  value={newAdmin.userPw}
                  onChange={(e) => setNewAdmin({...newAdmin, userPw: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">역할</label>
                <select
                  value={newAdmin.userRole}
                  onChange={(e) => setNewAdmin({...newAdmin, userRole: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="admin">관리자</option>
                  <option value="master">마스터</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">상태</label>
                <select
                  value={newAdmin.userStatus}
                  onChange={(e) => setNewAdmin({...newAdmin, userStatus: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={1}>활성</option>
                  <option value={0}>비활성</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button
                onClick={handleAddAdmin}
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
        ) : selectedAdmin ? (
          <div className="flex flex-col h-full">
            {/* 상단 카드 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedAdmin.userIdx}
                  </span>
                  <span className="text-lg font-semibold">{selectedAdmin.userId}</span>
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                    {selectedAdmin.userRole}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    selectedAdmin.userStatus === 1 
                      ? 'bg-green-500 text-white' 
                      : 'bg-red-500 text-white'
                  }`}>
                    {selectedAdmin.userStatus === 1 ? '활성' : '비활성'}
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
                      onClick={handleDeleteSingleAdmin}
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
            <h3 className="text-lg font-semibold mb-4">관리자 상세 정보</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">사용자 ID</label>
                  <input
                    type="text"
                    value={isEditMode ? editingAdmin?.userId || "" : selectedAdmin.userId}
                    onChange={(e) => handleEditChange("userId", e.target.value)}
                    readOnly={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">역할</label>
                  <select
                    value={isEditMode ? editingAdmin?.userRole || "" : selectedAdmin.userRole}
                    onChange={(e) => handleEditChange("userRole", e.target.value)}
                    disabled={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <option value="admin">관리자</option>
                    <option value="master">마스터</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">상태</label>
                  <select
                    value={isEditMode ? editingAdmin?.userStatus || 0 : selectedAdmin.userStatus}
                    onChange={(e) => handleEditChange("userStatus", parseInt(e.target.value))}
                    disabled={!isEditMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
                      isEditMode ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <option value={1}>활성</option>
                    <option value={0}>비활성</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">마지막 로그인</label>
                  <input
                    type="text"
                    value={isEditMode ? editingAdmin?.lastLogin || "" : selectedAdmin.lastLogin || "로그인 기록 없음"}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
                
              </div>
            </div>
            
            {/* 편집 모드 버튼 */}
            {isEditMode && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <button
                  onClick={handleUpdateAdmin}
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
            관리자를 선택하거나 추가 버튼을 클릭하세요.
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

export default AdminManagementPage;
