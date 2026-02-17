'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useServiceConfig } from '@/hooks/Services/useServiceConfig';
import GenericBoardTable from '@/components/feature/services/admin/GenericBoardTable';

export default function DynamicBoardManagementPage() {
  const { serviceSlug } = useParams<{ serviceSlug: string }>();
  const router = useRouter();
  const { config, loading, error } = useServiceConfig(serviceSlug);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
        <p className="text-sm text-gray-500">서비스 설정을 불러오는 중...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-red-500">{error || '서비스를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => router.push('/myoriadmin/services')}
          className="mt-2 text-sm text-indigo-600 hover:underline"
        >
          서비스 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push(`/myoriadmin/services/${serviceSlug}`)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {config.serviceEmoji} {config.serviceDisplay} 후기 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            게시글을 관리할 수 있습니다.
          </p>
        </div>
      </div>

      <GenericBoardTable config={config} slug={serviceSlug} />
    </div>
  );
}
