'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ServiceConfig, DynamicBoard } from '@/types/Services';
import { useDynamicEntityDetail } from '@/hooks/Services/useDynamicEntity';
import { useDynamicBoards } from '@/hooks/Services/useDynamicBoard';
import BasicTemplate from '../templates/BasicTemplate';
import CompanyTemplate from '../templates/CompanyTemplate';
import RestaurantTemplate from '../templates/RestaurantTemplate';

interface GenericEntityDetailProps {
  config: ServiceConfig;
  entityId: number;
}

const GenericEntityDetail: React.FC<GenericEntityDetailProps> = ({ config, entityId }) => {
  const router = useRouter();

  // Fetch entity detail
  const { entity, loading: entityLoading, error: entityError } = useDynamicEntityDetail(
    config.serviceSlug,
    entityId
  );

  // Fetch boards filtered by this entity
  const boardParams = useMemo(() => ({ keyword: String(entityId) }), [entityId]);
  const {
    boards,
    loading: boardsLoading,
    error: boardsError,
  } = useDynamicBoards(config.serviceSlug, boardParams);

  // Filter boards to only those belonging to this entity
  const entityBoards = useMemo(
    () => boards.filter((board) => board.entityIdx === entityId),
    [boards, entityId]
  );

  // Format date to readable string
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`;
  };

  // Render the appropriate template based on config.templateType
  const renderTemplate = () => {
    if (!entity) return null;

    switch (config.templateType) {
      case 'company':
        return <CompanyTemplate entity={entity} config={config} />;
      case 'restaurant':
        return <RestaurantTemplate entity={entity} config={config} />;
      case 'basic':
      default:
        return <BasicTemplate entity={entity} config={config} />;
    }
  };

  // Loading state
  if (entityLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: config.serviceColor }} />
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (entityError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{entityError}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: config.serviceColor }}
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // Entity not found
  if (!entity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">데이터를 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">요청하신 정보가 존재하지 않습니다.</p>
          <Link
            href={`/s/${config.serviceSlug}`}
            className="inline-block px-6 py-2 text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: config.serviceColor }}
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back button */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <button
          onClick={() => router.push(`/s/${config.serviceSlug}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">{config.serviceDisplay} 목록</span>
        </button>
      </div>

      {/* Entity detail template */}
      {renderTemplate()}

      {/* Board / Review section */}
      <div className="max-w-4xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-800">
              후기 / 게시글
            </h2>
            <span className="text-sm text-gray-500">
              총 {entityBoards.length}건
            </span>
          </div>

          {boardsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: config.serviceColor }} />
              <span className="ml-3 text-gray-500">게시글을 불러오는 중...</span>
            </div>
          ) : boardsError ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{boardsError}</p>
            </div>
          ) : entityBoards.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">아직 작성된 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entityBoards.map((board: DynamicBoard) => (
                <Link
                  key={board.boardIdx}
                  href={`/s/${config.serviceSlug}/board/${board.boardIdx}`}
                  className="block bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors border border-gray-100 hover:border-gray-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {board.boardTitle}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {board.boardId}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(board.boardRegDate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-shrink-0">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {board.boardLike}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {board.boardHits}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenericEntityDetail;
