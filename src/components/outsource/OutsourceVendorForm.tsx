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
            // API 엔드포인트로 데이터 전송
            // TODO: 실제 API 엔드포인트로 교체 필요
            const apiUrl =
                mode === 'create'
                    ? '/api/vendors'
                    : `/api/vendors/${initialData?.id}`;
            const method = mode === 'create' ? 'POST' : 'PUT';

            const response = await fetch(apiUrl, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '저장 중 오류가 발생했습니다.');
            }

            const result = await response.json();
            console.log('Vendor saved:', result);

            // 성공 시 리스트 페이지로 리다이렉트
            router.push('/outsource-mentor');
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
