'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ServiceCreateForm from '@/components/feature/services/admin/ServiceCreateForm';

export default function ServiceCreatePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">서비스 추가</h1>
        <p className="text-sm text-gray-500 mt-1">새로운 오빠 서비스를 생성합니다.</p>
      </div>

      <ServiceCreateForm
        onSuccess={(slug) => {
          router.push(`/myoriadmin/services/${slug}`);
        }}
      />
    </div>
  );
}
