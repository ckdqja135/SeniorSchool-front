'use client';

import { useState, useEffect } from 'react';
import { Church, ChurchSearchParams, ApiResponse } from '@/types/Church';

export default function ChurchAdminPage() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<ChurchSearchParams>({
    churchName: '',
    churchLocation: '',
    churchType: '',
    churchPastor: '',
    churchStatus: '',
    rowsPerPage: 10,
    currentPage: 1
  });
  const [totalCount, setTotalCount] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    churchName: '',
    churchPastor: '',
    churchType: '개신교',
    churchLocation: ''
  });

  // 교회 목록 가져오기
  const fetchChurches = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const backendURL = 'https://api.reviewhub.life';
      const queryParams = new URLSearchParams();
      
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value.toString());
        }
      });
      
      const response = await fetch(`${backendURL}/admin/church/searchChurch?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiResponse<Church[]> = await response.json();
      
      if (data.status === 200 && data.data) {
        setChurches(data.data);
        setTotalCount(data.totalCount || 0);
      } else {
        throw new Error('교회 목록을 불러올 수 없습니다.');
      }
    } catch (error) {
      console.error('교회 목록 로딩 오류:', error);
      setError('교회 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 검색 파라미터 변경 시 목록 새로고침
  useEffect(() => {
    fetchChurches();
  }, [searchParams]);

  // 교회 생성 핸들러
  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.churchName.trim() || !createForm.churchPastor.trim() || !createForm.churchLocation.trim()) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/admin/church/createChurch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (response.ok) {
        alert('교회가 성공적으로 생성되었습니다.');
        setShowCreateModal(false);
        setCreateForm({
          churchName: '',
          churchPastor: '',
          churchType: '개신교',
          churchLocation: ''
        });
        fetchChurches(); // 목록 새로고침
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('교회 생성 오류:', error);
      alert('교회 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 교회 삭제 핸들러
  const handleDeleteChurch = async (churchIdx: number) => {
    if (!confirm('정말로 이 교회를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const backendURL = 'https://api.reviewhub.life';
      const response = await fetch(`${backendURL}/admin/church/${churchIdx}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('교회가 성공적으로 삭제되었습니다.');
        fetchChurches(); // 목록 새로고침
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('교회 삭제 오류:', error);
      alert('교회 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 검색 핸들러
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => ({ ...prev, currentPage: 1 }));
  };

  // 검색 필드 변경 핸들러
  const handleSearchFieldChange = (field: keyof ChurchSearchParams, value: string) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, currentPage: page }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">교회 관리</h1>
        <p className="text-gray-600">교회 정보를 관리하고 검색할 수 있습니다.</p>
      </div>

      {/* 검색 폼 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">교회 이름</label>
            <input
              type="text"
              value={searchParams.churchName || ''}
              onChange={(e) => handleSearchFieldChange('churchName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="교회 이름을 입력하세요"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">교회 위치</label>
            <input
              type="text"
              value={searchParams.churchLocation || ''}
              onChange={(e) => handleSearchFieldChange('churchLocation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="교회 위치를 입력하세요"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">교회 종류</label>
            <select
              value={searchParams.churchType || ''}
              onChange={(e) => handleSearchFieldChange('churchType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">전체</option>
              <option value="개신교">개신교</option>
              <option value="천주교">천주교</option>
              <option value="정교회">정교회</option>
              <option value="기타">기타</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">담임목사</label>
            <input
              type="text"
              value={searchParams.churchPastor || ''}
              onChange={(e) => handleSearchFieldChange('churchPastor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="담임목사 이름을 입력하세요"
            />
          </div>
          
          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              검색
            </button>
          </div>
        </form>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-500">
          총 {totalCount}개의 교회가 있습니다.
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>교회 추가</span>
        </button>
      </div>

      {/* 교회 목록 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2"></div>
            <p className="text-gray-500">로딩 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
          </div>
        ) : churches.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-3">🏛️</div>
            <p className="text-gray-500">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">교회 이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">교회 종류</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">교회 위치</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">담임목사</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">등록일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">액션</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {churches.map((church) => (
                  <tr key={church.churchIdx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{church.churchName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{church.churchType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{church.churchLocation}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{church.churchPastor}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        church.churchStatus === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {church.churchStatus === 1 ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{church.churchRegDate}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-red-600 hover:text-red-900">
                          수정
                        </button>
                        <button 
                          onClick={() => handleDeleteChurch(church.churchIdx)}
                          className="text-red-600 hover:text-red-900"
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 교회 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">교회 추가</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 모달 폼 */}
            <form onSubmit={handleCreateChurch} className="p-6 space-y-4">
              {/* 교회 이름 */}
              <div>
                <label htmlFor="createChurchName" className="block text-sm font-medium text-gray-700 mb-2">
                  교회 이름 *
                </label>
                <input
                  type="text"
                  id="createChurchName"
                  value={createForm.churchName}
                  onChange={(e) => setCreateForm({...createForm, churchName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="교회 이름을 입력하세요"
                  required
                />
              </div>

              {/* 교회 목사 */}
              <div>
                <label htmlFor="createChurchPastor" className="block text-sm font-medium text-gray-700 mb-2">
                  교회 목사 *
                </label>
                <input
                  type="text"
                  id="createChurchPastor"
                  value={createForm.churchPastor}
                  onChange={(e) => setCreateForm({...createForm, churchPastor: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="목사 이름을 입력하세요"
                  required
                />
              </div>

              {/* 교회 종류 */}
              <div>
                <label htmlFor="createChurchType" className="block text-sm font-medium text-gray-700 mb-2">
                  교회 종류 *
                </label>
                <select
                  id="createChurchType"
                  value={createForm.churchType}
                  onChange={(e) => setCreateForm({...createForm, churchType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                >
                  <option value="개신교">개신교</option>
                  <option value="천주교">천주교</option>
                  <option value="정교회">정교회</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              {/* 교회 위치 */}
              <div>
                <label htmlFor="createChurchLocation" className="block text-sm font-medium text-gray-900 mb-2">
                  교회 위치 *
                </label>
                <input
                  type="text"
                  id="createChurchLocation"
                  value={createForm.churchLocation}
                  onChange={(e) => setCreateForm({...createForm, churchLocation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="교회 위치를 입력하세요"
                  required
                />
              </div>

              {/* 제출 버튼 */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                    isSubmitting
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isSubmitting ? '생성 중...' : '생성하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
