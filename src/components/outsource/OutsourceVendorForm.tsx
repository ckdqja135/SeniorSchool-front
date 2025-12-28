'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendorFormSchema, VendorFormInput } from '@/schemas/vendor.schema';
import { VendorCategory } from '@/types/vendor';
import BasicInfoSection from './sections/BasicInfoSection';
import BudgetSection from './sections/BudgetSection';
import DevTeamSection from './sections/DevTeamSection';
import GovSupportSection from './sections/GovSupportSection';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api/config';

interface OutsourceVendorFormProps {
    initialData?: Partial<VendorFormInput>;
    mode?: 'create' | 'edit';
}

export default function OutsourceVendorForm({
    initialData,
    mode = 'create',
}: OutsourceVendorFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const form = useForm({
        resolver: zodResolver(vendorFormSchema) as any,
        defaultValues: (initialData || {
            name: '',
            tagline: '',
            category: '' as any,
            contactEmail: '',
            isPublic: true,
            team: {
                frontend: 0,
                backend: 0,
                ai: 0,
                mobile: 0,
                designer: 0,
                pm: 0,
                devops: 0,
                qa: 0,
                etc: 0,
                total: 0,
            },
            govSupport: {
                hasGovSupportExperience: false,
            },
        }) as any,
    });

    const {
        handleSubmit,
        watch,
        formState: { errors },
    } = form;

    const category = watch('category');
    const isDevelopment = category === VendorCategory.DEVELOPMENT;

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // serviceTypes를 문자열에서 배열로 변환 (쉼표로 구분)
            let processedData = { ...data };
            if (typeof processedData.serviceTypes === 'string' && processedData.serviceTypes.trim()) {
                processedData.serviceTypes = processedData.serviceTypes
                    .split(',')
                    .map((item: string) => item.trim())
                    .filter((item: string) => item.length > 0)
                    .slice(0, 5); // 최대 5개로 제한
            } else if (!processedData.serviceTypes) {
                delete processedData.serviceTypes;
            }

            // 개발 분야가 아닐 때는 개발 관련 필드 제거
            if (processedData.category !== 'DEVELOPMENT') {
                delete processedData.devInfo;
                delete processedData.team;
                delete processedData.govSupport;
                delete processedData.minBudget;
                delete processedData.avgBudget;
                delete processedData.maxBudget;
                delete processedData.avgBudgetRange;
            } else {
                // 개발 분야일 때는 techStackSummary가 필수인지 확인
                if (!processedData.devInfo?.techStackSummary || processedData.devInfo.techStackSummary.length === 0) {
                    throw new Error('개발 분야는 주요 기술스택을 최소 1개 이상 입력해야 합니다.');
                }
            }

            // 기타 분야가 아닐 때는 customCategory 제거
            if (processedData.category !== 'OTHER') {
                delete processedData.customCategory;
            }

            // API 엔드포인트로 데이터 전송
            const BASE_URL = getApiBaseUrl();
            const apiUrl = `${BASE_URL}/outsource/requests`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(processedData),
            });

            const responseData = await response.json();

            if (!response.ok) {
                // 에러 응답 처리
                if (response.status === 409) {
                    throw new Error(responseData.message || '이미 동일한 외주업체에 대한 요청이 처리 대기중입니다.');
                } else if (response.status === 400) {
                    throw new Error(responseData.error || responseData.message || '입력 정보를 확인해주세요.');
                } else {
                    throw new Error(responseData.error || responseData.message || '요청 처리 중 오류가 발생했습니다.');
                }
            }

            // 성공 응답
            if (responseData.success) {
                alert('외주업체 추가 요청이 성공적으로 등록되었습니다.\n관리자 승인 후 게시됩니다.');
                router.push('/outsource-mentor');
            } else {
                throw new Error(responseData.message || '요청 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('Submit error:', error);
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : '알 수 없는 오류가 발생했습니다.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">
                    {mode === 'create' ? '외주 업체 등록' : '외주 업체 수정'}
                </h1>
                <p className="text-gray-600">
                    외주 업체 정보를 입력해주세요. 필수 항목은{' '}
                    <span className="text-red-500">*</span>로 표시되어 있습니다.
                </p>
            </div>

            {/* 전역 에러 표시 */}
            {submitError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{submitError}</p>
                </div>
            )}

            {/* 폼 유효성 에러 표시 (개발용) */}
            {Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                        ⚠️ 입력 내용을 확인해주세요:
                    </p>
                    <ul className="text-sm text-yellow-700 list-disc list-inside">
                        {Object.entries(errors).map(([key, error]) => (
                            <li key={key}>
                                {key}: {error?.message?.toString() || '유효하지 않은 값'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="space-y-8">
                {/* 기본 정보 섹션 */}
                <div className="p-6 bg-white border rounded-lg shadow-sm">
                    <BasicInfoSection form={form as any} />
                </div>

                {/* 예산 정보 섹션 (개발 분야 전용) */}
                {isDevelopment && (
                    <div className="p-6 bg-white border rounded-lg shadow-sm">
                        <BudgetSection form={form as any} />
                    </div>
                )}

                {/* 개발 스택 및 팀 구성 섹션 (개발 분야 전용) */}
                {isDevelopment && (
                    <div className="p-6 bg-white border rounded-lg shadow-sm">
                        <DevTeamSection form={form as any} />
                    </div>
                )}

                {/* 정부지원사업 섹션 (개발 분야 전용) */}
                {isDevelopment && (
                    <div className="p-6 bg-white border rounded-lg shadow-sm">
                        <GovSupportSection form={form as any} />
                    </div>
                )}
            </div>

            {/* 제출 버튼 */}
            <div className="mt-8 flex gap-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    disabled={isSubmitting}
                >
                    취소
                </button>
                <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                >
                    {isSubmitting
                        ? '저장 중...'
                        : mode === 'create'
                            ? '등록하기'
                            : '수정하기'}
                </button>
            </div>
        </form>
    );
}
