'use client';

import { useParams } from 'next/navigation';
import { useServiceConfig } from '@/hooks/Services/useServiceConfig';
import GenericEntityDetail from '@/components/feature/services/public/GenericEntityDetail';

export default function DynamicEntityDetailPage() {
  const { serviceSlug, id } = useParams<{ serviceSlug: string; id: string }>();
  const { config, loading, error } = useServiceConfig(serviceSlug);

  const entityId = parseInt(id, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !config || isNaN(entityId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">페이지를 찾을 수 없습니다</h2>
          <p className="text-sm text-gray-500 mb-4">{error || '존재하지 않는 페이지입니다.'}</p>
          <a href="/" className="text-sm text-indigo-600 hover:underline">홈으로 돌아가기</a>
        </div>
      </div>
    );
  }

  return <GenericEntityDetail config={config} entityId={entityId} />;
}
