'use client';

import React from 'react';
import { DynamicEntity, ServiceConfig, EntityFieldConfig } from '@/types/Services';

interface BasicTemplateProps {
  entity: DynamicEntity;
  config: ServiceConfig;
}

const BasicTemplate: React.FC<BasicTemplateProps> = ({ entity, config }) => {
  const detailFields = config.fields
    .filter((field) => field.showInDetail)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const urlField = detailFields.find((f) => f.fieldKey === 'url');
  const addrField = detailFields.find((f) => f.fieldKey === 'addr');
  const latXField = detailFields.find((f) => f.fieldKey === 'latX');
  const latYField = detailFields.find((f) => f.fieldKey === 'latY');

  const hasUrl = urlField && entity[urlField.fieldKey];
  const hasAddress = addrField && entity[addrField.fieldKey];
  const hasMap =
    latXField &&
    latYField &&
    entity[latXField.fieldKey] &&
    entity[latYField.fieldKey];

  const isActive = entity.status === 1;

  const getFieldValue = (field: EntityFieldConfig): string => {
    const value = entity[field.fieldKey];
    if (value === null || value === undefined || value === '') return '-';
    if (field.fieldType === 'number') {
      return Number(value).toLocaleString();
    }
    if (field.fieldType === 'date') {
      return new Date(value).toLocaleDateString('ko-KR');
    }
    return String(value);
  };

  // Filter out special fields that are rendered separately
  const standardFields = detailFields.filter(
    (f) =>
      !['url', 'addr', 'latX', 'latY'].includes(f.fieldKey)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <h1 className="text-3xl font-bold text-gray-900">
            {entity.name || `${config.serviceDisplay} 상세`}
          </h1>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {isActive ? '활성' : '비활성'}
          </span>
        </div>
        <div
          className="h-1 w-16 rounded-full"
          style={{ backgroundColor: config.serviceColor }}
        />
      </div>

      {/* View Count */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <span>조회수 {entity.viewCount.toLocaleString()}</span>
      </div>

      {/* Fields Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          기본 정보
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {standardFields.map((field) => (
            <div
              key={field.fieldIdx}
              className="flex flex-col gap-1 p-3 bg-gray-50 rounded-lg"
            >
              <span className="text-xs font-medium text-gray-500">
                {field.fieldLabel}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {getFieldValue(field)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Address */}
      {hasAddress && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            주소
          </h2>
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <svg
              className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{entity[addrField!.fieldKey]}</span>
          </div>
        </div>
      )}

      {/* Map Placeholder */}
      {hasMap && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            위치
          </h2>
          <div className="w-full h-64 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
            <div className="text-center text-gray-400">
              <svg
                className="w-10 h-10 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
              <p className="text-sm">지도 영역</p>
              <p className="text-xs mt-1">
                위도: {entity[latXField!.fieldKey]}, 경도:{' '}
                {entity[latYField!.fieldKey]}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* URL Link Button */}
      {hasUrl && (
        <div className="mb-6">
          <a
            href={entity[urlField!.fieldKey]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all duration-200 hover:opacity-90 hover:shadow-md"
            style={{ backgroundColor: config.serviceColor }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            홈페이지 방문
          </a>
        </div>
      )}
    </div>
  );
};

export default BasicTemplate;
