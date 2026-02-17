'use client';

import React from 'react';
import { DynamicEntity, ServiceConfig, EntityFieldConfig } from '@/types/Services';

interface RestaurantTemplateProps {
  entity: DynamicEntity;
  config: ServiceConfig;
}

const StarRating: React.FC<{ rating: number; maxRating?: number }> = ({
  rating,
  maxRating = 5,
}) => {
  const stars = [];
  const clampedRating = Math.min(Math.max(0, rating), maxRating);

  for (let i = 1; i <= maxRating; i++) {
    if (i <= Math.floor(clampedRating)) {
      // Full star
      stars.push(
        <svg
          key={i}
          className="w-5 h-5 text-yellow-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    } else if (i - clampedRating < 1 && i - clampedRating > 0) {
      // Half star
      stars.push(
        <div key={i} className="relative w-5 h-5">
          <svg
            className="absolute w-5 h-5 text-gray-200"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <div className="absolute overflow-hidden" style={{ width: '50%' }}>
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      );
    } else {
      // Empty star
      stars.push(
        <svg
          key={i}
          className="w-5 h-5 text-gray-200"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
  }

  return <div className="flex items-center gap-0.5">{stars}</div>;
};

const RestaurantTemplate: React.FC<RestaurantTemplateProps> = ({
  entity,
  config,
}) => {
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

  // Restaurant-specific field keys
  const restaurantFieldKeys = [
    'owner',
    'image',
    'averageRating',
    'ratingCount',
    'foodType',
  ];

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

  // Standard fields excluding restaurant-specific and special keys
  const standardFields = detailFields.filter(
    (f) =>
      !restaurantFieldKeys.includes(f.fieldKey) &&
      !['url', 'addr', 'latX', 'latY'].includes(f.fieldKey)
  );

  const averageRating = entity.averageRating
    ? Number(entity.averageRating)
    : null;
  const ratingCount = entity.ratingCount
    ? Number(entity.ratingCount)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Image Banner */}
      {entity.image && (
        <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <img
            src={entity.image}
            alt={entity.name || config.serviceDisplay}
            className="w-full h-64 sm:h-80 object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center flex-wrap gap-3 mb-3">
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
          {entity.foodType && (
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: config.serviceColor }}
            >
              {entity.foodType}
            </span>
          )}
        </div>
        <div
          className="h-1 w-16 rounded-full"
          style={{ backgroundColor: config.serviceColor }}
        />
      </div>

      {/* Rating & View Count Row */}
      <div className="flex flex-wrap items-center gap-6 mb-8">
        {averageRating !== null && (
          <div className="flex items-center gap-2">
            <StarRating rating={averageRating} />
            <span className="text-lg font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            {ratingCount !== null && (
              <span className="text-sm text-gray-500">
                ({ratingCount.toLocaleString()}개 평가)
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
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
      </div>

      {/* Owner Info */}
      {entity.owner && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: config.serviceColor }}
            >
              {String(entity.owner).charAt(0)}
            </div>
            <div>
              <p className="text-xs text-gray-500">대표자</p>
              <p className="text-lg font-semibold text-gray-900">
                {entity.owner}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Standard Fields Grid */}
      {standardFields.length > 0 && (
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
      )}

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

export default RestaurantTemplate;
