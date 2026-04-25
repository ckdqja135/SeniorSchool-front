'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ServiceConfig, DynamicEntity, EntityFieldConfig } from '@/types/Services';
import { useDynamicEntities } from '@/hooks/Services/useDynamicEntity';

interface GenericSearchPageProps {
  config: ServiceConfig;
  keyword: string;
}

const GenericSearchPage: React.FC<GenericSearchPageProps> = ({ config, keyword }) => {
  const router = useRouter();

  // Fetch entities matching keyword
  const searchParams = useMemo(() => ({ keyword }), [keyword]);
  const { entities, loading, error, totalCount } = useDynamicEntities(
    config.serviceSlug,
    searchParams
  );

  // Get fields that should be shown in the list view
  const listFields = useMemo(
    () =>
      config.fields
        .filter((field) => field.showInList)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config.fields]
  );

  // Get fields that should be shown in search results
  const searchFields = useMemo(
    () =>
      config.fields
        .filter((field) => field.showInSearch)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [config.fields]
  );

  // Use search-specific fields if available, otherwise fall back to list fields
  const displayFields = searchFields.length > 0 ? searchFields : listFields;

  // Format a field value for display
  const getFieldValue = (entity: DynamicEntity, field: EntityFieldConfig): string => {
    const value = entity[field.fieldKey];
    if (value === null || value === undefined || value === '') return '-';
    if (field.fieldType === 'number') {
      return Number(value).toLocaleString();
    }
    if (field.fieldType === 'date') {
      return new Date(value).toLocaleDateString('ko-KR');
    }
    if (field.fieldType === 'rating') {
      return `${value}/5`;
    }
    return String(value);
  };

  // Handle navigation to entity detail
  const handleEntityClick = (entity: DynamicEntity) => {
    router.push(`/s/${config.serviceSlug}/${entity.entityIdx}`);
  };

  // Handle new search
  const handleNewSearch = () => {
    router.push(`/s/${config.serviceSlug}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: config.serviceColor }}
          />
          <p className="mt-4 text-gray-600">검색 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href={`/s/${config.serviceSlug}`}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">{config.serviceDisplay}</span>
              </Link>
              <div className="text-gray-300">|</div>
              <h1 className="text-xl font-bold text-gray-900">
                &ldquo;{keyword}&rdquo; 검색 결과
              </h1>
            </div>
            <button
              onClick={handleNewSearch}
              className="px-4 py-2 text-white rounded-lg transition-colors flex items-center space-x-2 hover:opacity-90"
              style={{ backgroundColor: config.serviceColor }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>새 검색</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error ? (
          /* Error state */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">검색 중 오류가 발생했습니다</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: config.serviceColor }}
            >
              다시 시도
            </button>
          </div>
        ) : entities.length === 0 ? (
          /* Empty state */
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">검색 결과가 없습니다</h2>
            <p className="text-gray-600 mb-6">
              &ldquo;{keyword}&rdquo;에 대한 검색 결과를 찾을 수 없습니다.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleNewSearch}
                className="px-4 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                style={{ backgroundColor: config.serviceColor }}
              >
                새 검색하기
              </button>
              <Link
                href={`/s/${config.serviceSlug}`}
                className="inline-block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {config.serviceDisplay}(으)로 돌아가기
              </Link>
            </div>
          </div>
        ) : (
          /* Results */
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                &ldquo;{keyword}&rdquo; 검색 결과 ({totalCount}개)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {entities.map((entity: DynamicEntity) => (
                <div
                  key={entity.entityIdx}
                  onClick={() => handleEntityClick(entity)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-300"
                >
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-white text-lg"
                      style={{ backgroundColor: config.serviceColor }}
                    >
                      {config.serviceEmoji || config.serviceDisplay.charAt(0)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {entity.name || `#${entity.entityIdx}`}
                      </h3>

                      {/* Display fields */}
                      <div className="mt-2 space-y-1">
                        {displayFields.slice(0, 4).map((field) => {
                          const value = getFieldValue(entity, field);
                          if (value === '-') return null;
                          return (
                            <div
                              key={field.fieldIdx}
                              className="flex justify-between text-xs text-gray-500"
                            >
                              <span>{field.fieldLabel}:</span>
                              <span className="font-medium text-gray-700 truncate ml-2 max-w-[60%] text-right">
                                {value}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* View count */}
                      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{entity.viewCount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GenericSearchPage;
