'use client';

import React, { useState, useMemo } from 'react';
import TemplateCard from './TemplateCard';
import { createService } from '@/lib/services/serviceConfigAPI';
import { CreateServiceRequest, CustomFieldInput, ServiceConfig } from '@/types/Services';

interface ServiceCreateFormProps {
  onSuccess?: (service: ServiceConfig) => void;
}

type TemplateType = 'basic' | 'company' | 'restaurant';
type FieldType = 'text' | 'number' | 'date' | 'url' | 'image' | 'rating' | 'textarea';

const TAILWIND_COLORS = [
  { value: 'blue', label: 'Blue' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'teal', label: 'Teal' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'pink', label: 'Pink' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'cyan', label: 'Cyan' },
];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'image', label: 'Image' },
  { value: 'rating', label: 'Rating' },
  { value: 'textarea', label: 'Textarea' },
];

const TEMPLATE_DEFINITIONS = {
  basic: {
    label: '기본형',
    description: '이름, 위치, 유형, 설립일, 대표자, URL, 지도 등 기본 정보를 관리합니다.',
    examples: '대학, 교회, 외주',
    features: ['이름', '위치', '유형', '설립일', '대표자', 'URL', '지도'],
  },
  company: {
    label: '회사형',
    description: '기본형에 CEO, 직원수, 평균연봉, 자본금, 매출, 영업이익, 순이익, 총자산 정보가 추가됩니다.',
    examples: '회사 오빠',
    features: [
      '이름', '위치', '유형', '설립일', '대표자', 'URL', '지도',
      'CEO', '직원수', '평균연봉', '자본금', '매출', '영업이익', '순이익', '총자산',
    ],
  },
  restaurant: {
    label: '맛잘알형',
    description: '기본형에 사장, 이미지, 평균별점, 별점수, 음식종류 정보가 추가됩니다.',
    examples: '맛잘알 오빠',
    features: [
      '이름', '위치', '유형', '설립일', '대표자', 'URL', '지도',
      '사장', '이미지', '평균별점', '별점수', '음식종류',
    ],
  },
};

const DEFAULT_FIELDS_BY_TEMPLATE: Record<TemplateType, string[]> = {
  basic: ['이름', '위치', '유형', '설립일', '대표자', 'URL', '지도'],
  company: [
    '이름', '위치', '유형', '설립일', '대표자', 'URL', '지도',
    'CEO', '직원수', '평균연봉', '자본금', '매출', '영업이익', '순이익', '총자산',
  ],
  restaurant: [
    '이름', '위치', '유형', '설립일', '대표자', 'URL', '지도',
    '사장', '이미지', '평균별점', '별점수', '음식종류',
  ],
};

const koreanToSlug = (name: string): string => {
  const mapping: Record<string, string> = {
    '병원': 'hospital',
    '학교': 'school',
    '대학': 'university',
    '교회': 'church',
    '회사': 'company',
    '맛집': 'restaurant',
    '카페': 'cafe',
    '약국': 'pharmacy',
    '은행': 'bank',
    '호텔': 'hotel',
    '마트': 'mart',
    '공원': 'park',
    '도서관': 'library',
    '외주': 'outsource',
  };
  return mapping[name] || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'service';
};

const ServiceCreateForm: React.FC<ServiceCreateFormProps> = ({ onSuccess }) => {
  // Step management
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);

  // Step 2: Service info
  const [serviceName, setServiceName] = useState('');
  const [serviceSlug, setServiceSlug] = useState('');
  const [serviceDisplay, setServiceDisplay] = useState('');
  const [serviceEmoji, setServiceEmoji] = useState('');
  const [serviceColor, setServiceColor] = useState('blue');
  const [customFields, setCustomFields] = useState<CustomFieldInput[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [displayManuallyEdited, setDisplayManuallyEdited] = useState(false);

  // Step 3: Result
  const [createdService, setCreatedService] = useState<ServiceConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived default fields for the selected template
  const defaultFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return DEFAULT_FIELDS_BY_TEMPLATE[selectedTemplate];
  }, [selectedTemplate]);

  // Handle service name change with auto-generation
  const handleServiceNameChange = (value: string) => {
    setServiceName(value);
    if (!slugManuallyEdited) {
      setServiceSlug(koreanToSlug(value));
    }
    if (!displayManuallyEdited) {
      setServiceDisplay(value ? `${value} 오빠` : '');
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setServiceSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleDisplayChange = (value: string) => {
    setDisplayManuallyEdited(true);
    setServiceDisplay(value);
  };

  // Custom fields management
  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { fieldKey: '', fieldLabel: '', fieldType: 'text' },
    ]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: Partial<CustomFieldInput>) => {
    setCustomFields(
      customFields.map((cf, i) => (i === index ? { ...cf, ...field } : cf))
    );
  };

  // Step navigation
  const canProceedStep1 = selectedTemplate !== null;
  const canProceedStep2 =
    serviceName.trim() !== '' &&
    serviceSlug.trim() !== '' &&
    serviceDisplay.trim() !== '' &&
    serviceEmoji.trim() !== '' &&
    customFields.every(
      (cf) => cf.fieldKey.trim() !== '' && cf.fieldLabel.trim() !== ''
    );

  const handleNext = () => {
    if (currentStep === 1 && canProceedStep1) {
      setCurrentStep(2);
    } else if (currentStep === 2 && canProceedStep2) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) return;

    setIsSubmitting(true);
    setError(null);

    const requestData: CreateServiceRequest = {
      serviceSlug,
      serviceName,
      serviceDisplay,
      serviceEmoji,
      serviceColor,
      templateType: selectedTemplate,
      customFields: customFields.length > 0 ? customFields : undefined,
    };

    try {
      const result = await createService(requestData);
      if (result) {
        setCreatedService(result);
        setCurrentStep(3);
        onSuccess?.(result);
      } else {
        setError('서비스 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (err: any) {
      setError(err.message || '서비스 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicator
  const renderStepIndicator = () => {
    const steps = [
      { num: 1, label: '템플릿 선택' },
      { num: 2, label: '서비스 정보' },
      { num: 3, label: '완료' },
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, idx) => (
          <React.Fragment key={step.num}>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  currentStep >= step.num
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {currentStep > step.num ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.num
                )}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  currentStep >= step.num ? 'text-indigo-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-3 ${
                  currentStep > step.num ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Step 1: Template selection
  const renderStep1 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">서비스 템플릿 선택</h2>
      <p className="text-sm text-gray-500 mb-6">
        생성할 서비스의 기본 구조를 선택하세요. 템플릿에 따라 기본 필드가 자동으로 설정됩니다.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(TEMPLATE_DEFINITIONS) as TemplateType[]).map((type) => {
          const def = TEMPLATE_DEFINITIONS[type];
          return (
            <TemplateCard
              key={type}
              type={type}
              label={def.label}
              description={def.description}
              examples={def.examples}
              features={def.features}
              selected={selectedTemplate === type}
              onSelect={() => setSelectedTemplate(type)}
            />
          );
        })}
      </div>

      <div className="flex justify-end mt-8">
        <button
          onClick={handleNext}
          disabled={!canProceedStep1}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            canProceedStep1
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          다음 단계
          <svg className="inline-block w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Step 2: Service info input
  const renderStep2 = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">서비스 정보 입력</h2>
      <p className="text-sm text-gray-500 mb-6">
        새 서비스의 기본 정보를 입력하세요. 슬러그와 표시명은 자동 생성되지만 직접 수정할 수 있습니다.
      </p>

      {/* Basic service info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">기본 정보</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 서비스 한글명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              서비스 한글명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => handleServiceNameChange(e.target.value)}
              placeholder='예: 병원'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>

          {/* 영문 URL slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              영문 URL 슬러그 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serviceSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder='예: hospital'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
            <p className="mt-1 text-xs text-gray-400">URL에 사용되는 영문 식별자 (자동 생성)</p>
          </div>

          {/* 서비스 표시명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              서비스 표시명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serviceDisplay}
              onChange={(e) => handleDisplayChange(e.target.value)}
              placeholder='예: 병원 오빠'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
            <p className="mt-1 text-xs text-gray-400">사용자에게 표시되는 이름 (자동 생성)</p>
          </div>

          {/* 이모지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              서비스 이모지 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={serviceEmoji}
              onChange={(e) => setServiceEmoji(e.target.value)}
              placeholder='예: 🏥'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              maxLength={4}
            />
          </div>

          {/* 서비스 색상 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              서비스 색상
            </label>
            <select
              value={serviceColor}
              onChange={(e) => setServiceColor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white"
            >
              {TAILWIND_COLORS.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>
            {/* Color preview */}
            <div className="flex items-center gap-2 mt-2">
              <div
                className={`w-5 h-5 rounded-full bg-${serviceColor}-500`}
              />
              <span className="text-xs text-gray-400">선택된 색상 미리보기</span>
            </div>
          </div>
        </div>
      </div>

      {/* Default fields (read-only) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-1">기본 필드</h3>
        <p className="text-xs text-gray-400 mb-4">
          선택한 템플릿({TEMPLATE_DEFINITIONS[selectedTemplate!]?.label})에 포함된 기본 필드입니다.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {defaultFields.map((field) => (
            <div
              key={field}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
            >
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-700">{field}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Custom fields */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">커스텀 필드</h3>
            <p className="text-xs text-gray-400 mt-0.5">기본 필드 외에 추가할 필드를 설정하세요.</p>
          </div>
          <button
            onClick={addCustomField}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            필드 추가
          </button>
        </div>

        {customFields.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            추가된 커스텀 필드가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {customFields.map((field, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">필드 키 (영문)</label>
                    <input
                      type="text"
                      value={field.fieldKey}
                      onChange={(e) =>
                        updateCustomField(index, {
                          fieldKey: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                        })
                      }
                      placeholder="예: custom_field"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">필드 라벨 (표시명)</label>
                    <input
                      type="text"
                      value={field.fieldLabel}
                      onChange={(e) =>
                        updateCustomField(index, { fieldLabel: e.target.value })
                      }
                      placeholder="예: 특이사항"
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">필드 타입</label>
                    <select
                      value={field.fieldType}
                      onChange={(e) =>
                        updateCustomField(index, {
                          fieldType: e.target.value as FieldType,
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    >
                      {FIELD_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => removeCustomField(index)}
                  className="mt-5 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="필드 삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={handleBack}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <svg className="inline-block w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          이전 단계
        </button>
        <button
          onClick={handleNext}
          disabled={!canProceedStep2 || isSubmitting}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            canProceedStep2 && !isSubmitting
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? (
            <>
              <svg className="inline-block w-4 h-4 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              생성 중...
            </>
          ) : (
            <>
              서비스 생성
              <svg className="inline-block w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Step 3: Confirmation / Success
  const renderStep3 = () => (
    <div className="text-center">
      {/* Success icon */}
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">서비스가 생성되었습니다!</h2>
      <p className="text-sm text-gray-500 mb-8">
        새 서비스가 성공적으로 생성되었습니다. 아래에서 생성된 서비스 정보를 확인하세요.
      </p>

      {/* Created service info card */}
      {createdService && (
        <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{createdService.serviceEmoji}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{createdService.serviceDisplay}</h3>
              <p className="text-sm text-gray-500">/{createdService.serviceSlug}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">한글명</span>
              <span className="font-medium text-gray-900">{createdService.serviceName}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">템플릿</span>
              <span className="font-medium text-gray-900">
                {TEMPLATE_DEFINITIONS[createdService.templateType]?.label || createdService.templateType}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">색상</span>
              <div className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full bg-${createdService.serviceColor}-500`} />
                <span className="font-medium text-gray-900">{createdService.serviceColor}</span>
              </div>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">상태</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                활성
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action links */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <a
          href={`/myoriadmin/admin/services/${createdService?.serviceSlug}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          관리 페이지로 이동
        </a>
        <a
          href={`/${createdService?.serviceSlug}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          공개 페이지 보기
        </a>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {renderStepIndicator()}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  );
};

export default ServiceCreateForm;
