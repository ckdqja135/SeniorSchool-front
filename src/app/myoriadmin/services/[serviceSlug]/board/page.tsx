'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useServiceConfig } from '@/hooks/Services/useServiceConfig';
import GenericBoardTable from '@/components/feature/services/admin/GenericBoardTable';
import { SkeletonListPage } from '@/components/common/Skeleton';

export default function DynamicBoardManagementPage() {
  const { serviceSlug } = useParams<{ serviceSlug: string }>();
  const router = useRouter();
  const { config, loading, error } = useServiceConfig(serviceSlug);

  if (loading) {
    return <SkeletonListPage />;
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {config.serviceEmoji} {config.serviceDisplay} 후기 관리
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          게시글을 관리할 수 있습니다.
        </p>
      </div>

      <GenericBoardTable config={config} slug={serviceSlug} />
    </div>
  );
}
