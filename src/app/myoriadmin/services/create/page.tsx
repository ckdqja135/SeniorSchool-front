'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ServiceCreateForm from '@/components/feature/services/admin/ServiceCreateForm';

export default function ServiceCreatePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => router.push('/myoriadmin/services')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">서비스 추가</h1>
          <p className="text-sm text-gray-500 mt-1">새로운 오빠 서비스를 생성합니다.</p>
        </div>
      </div>

      <ServiceCreateForm
        onSuccess={(slug) => {
          router.push(`/myoriadmin/services/${slug}`);
        }}
      />
    </div>
  );
}
