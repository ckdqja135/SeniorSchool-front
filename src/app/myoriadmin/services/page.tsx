'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ServiceConfig } from '@/types/Services';
import { fetchActiveServices, deleteService } from '@/lib/services/serviceConfigAPI';

export default function ServiceListPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveServices();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '서비스 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleDelete = async (slug: string) => {
    try {
      await deleteService(slug);
      setDeleteConfirm(null);
      loadServices();
    } catch (err) {
      alert('서비스 삭제에 실패했습니다.');
    }
  };

  const templateLabels: Record<string, string> = {
    basic: '기본형',
    company: '회사형',
    restaurant: '맛잘알형',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">서비스 관리</h1>
          <p className="text-sm text-gray-500 mt-1">동적으로 생성된 서비스를 관리합니다.</p>
        </div>
        <Link
          href="/myoriadmin/services/create"
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          서비스 추가
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">서비스 목록을 불러오는 중...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={loadServices} className="mt-2 text-sm text-indigo-600 hover:underline">
            다시 시도
          </button>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">아직 생성된 서비스가 없습니다</h3>
          <p className="text-sm text-gray-500 mb-6">
            새로운 서비스를 추가하여 동적으로 관리해보세요.
          </p>
          <Link
            href="/myoriadmin/services/create"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            첫 서비스 만들기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.serviceSlug}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{service.serviceEmoji}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.serviceDisplay}</h3>
                    <p className="text-xs text-gray-500">/{service.serviceSlug}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    service.serviceStatus === 1
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {service.serviceStatus === 1 ? '활성' : '비활성'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-16 text-gray-400">템플릿</span>
                  <span className="font-medium">{templateLabels[service.templateType] || service.templateType}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-16 text-gray-400">색상</span>
                  <span className={`w-4 h-4 rounded-full bg-${service.serviceColor}-500 mr-2`}></span>
                  <span>{service.serviceColor}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-16 text-gray-400">필드</span>
                  <span>{service.fields?.length || 0}개</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => router.push(`/myoriadmin/services/${service.serviceSlug}`)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  관리
                </button>
                <button
                  onClick={() => window.open(`/s/${service.serviceSlug}/mentor`, '_blank')}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  미리보기
                </button>
                <button
                  onClick={() => setDeleteConfirm(service.serviceSlug)}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">서비스 삭제</h3>
            <p className="text-sm text-gray-600 mb-6">
              &apos;{deleteConfirm}&apos; 서비스를 비활성화하시겠습니까?<br />
              이 작업은 서비스를 비활성화하며, 데이터는 보존됩니다.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
