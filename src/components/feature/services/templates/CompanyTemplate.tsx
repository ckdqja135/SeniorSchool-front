'use client';

import React from 'react';
import { DynamicEntity, ServiceConfig, EntityFieldConfig } from '@/types/Services';

interface CompanyTemplateProps {
  entity: DynamicEntity;
  config: ServiceConfig;
}

interface FinancialCard {
  fieldKey: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  unit: string;
}

const CompanyTemplate: React.FC<CompanyTemplateProps> = ({ entity, config }) => {
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

  // Company-specific field keys
  const companyFieldKeys = [
    'ceo',
    'employeeCount',
    'avgSalary',
    'capital',
    'sales',
    'operatingProfit',
    'netIncome',
    'totalAssets',
  ];

  const financialCards: FinancialCard[] = [
    {
      fieldKey: 'capital',
      label: '자본금',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      unit: '원',
    },
    {
      fieldKey: 'sales',
      label: '매출액',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      unit: '원',
    },
    {
      fieldKey: 'operatingProfit',
      label: '영업이익',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      unit: '원',
    },
    {
      fieldKey: 'netIncome',
      label: '순이익',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
      color: 'text-orange-700',
      bgColor: 'bg-orange-50',
      unit: '원',
    },
    {
      fieldKey: 'totalAssets',
      label: '총자산',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'text-teal-700',
      bgColor: 'bg-teal-50',
      unit: '원',
    },
    {
      fieldKey: 'employeeCount',
      label: '직원 수',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-50',
      unit: '명',
    },
    {
      fieldKey: 'avgSalary',
      label: '평균 급여',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'text-pink-700',
      bgColor: 'bg-pink-50',
      unit: '원',
    },
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

  const formatNumber = (value: any): string => {
    if (value === null || value === undefined || value === '') return '-';
    return Number(value).toLocaleString();
  };

  // Standard fields excluding company-specific and special keys
  const standardFields = detailFields.filter(
    (f) =>
      !companyFieldKeys.includes(f.fieldKey) &&
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

      {/* CEO Info */}
      {entity.ceo && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: config.serviceColor }}
            >
              {String(entity.ceo).charAt(0)}
            </div>
            <div>
              <p className="text-xs text-gray-500">대표이사</p>
              <p className="text-lg font-semibold text-gray-900">
                {entity.ceo}
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

      {/* Financial Data Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          재무 정보
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {financialCards.map((card) => {
            const value = entity[card.fieldKey];
            if (value === null || value === undefined || value === '') return null;

            return (
              <div
                key={card.fieldKey}
                className={`${card.bgColor} rounded-2xl p-5 border border-gray-100 shadow-sm transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${card.color}`}>{card.icon}</div>
                  <span className="text-sm font-medium text-gray-600">
                    {card.label}
                  </span>
                </div>
                <p className={`text-xl font-bold ${card.color}`}>
                  {formatNumber(value)}
                  <span className="text-sm font-normal ml-1">{card.unit}</span>
                </p>
              </div>
            );
          })}
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

export default CompanyTemplate;
