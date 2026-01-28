'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { vendorFormSchema, VendorFormInput } from '@/schemas/vendor.schema';
import { VendorCategory } from '@/types/vendor';
import BasicInfoSection from './sections/BasicInfoSection';
import BudgetSection from './sections/BudgetSection';
import DevTeamSection from './sections/DevTeamSection';
import GovSupportSection from './sections/GovSupportSection';
import { useState, useEffect } from 'react';
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
            outsourceCEO: '',
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
        setValue,
        getValues,
        formState: { errors },
    } = form;

    const category = watch('category');
    const isDevelopment = category === VendorCategory.DEVELOPMENT;

    // category 변경 시 devInfo 처리
    useEffect(() => {
        if (category === VendorCategory.DEVELOPMENT) {
            const currentDevInfo = getValues('devInfo');
            // devInfo가 없거나 techStackSummary가 없을 때만 초기화
            if (!currentDevInfo || !Array.isArray(currentDevInfo?.techStackSummary)) {
                setValue('devInfo', {
                    techStackSummary: [],
                }, { shouldValidate: false });
            }
        } else if (category && category !== '' && category !== VendorCategory.DEVELOPMENT) {
            // 개발 분야가 아닐 때 devInfo 제거 (validation 에러 방지)
            const currentDevInfo = getValues('devInfo');
            if (currentDevInfo !== undefined) {
                setValue('devInfo', undefined, { shouldValidate: false });
            }
        }
    }, [category, setValue, getValues]);

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 전역 에러 표시 */}
            {submitError && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-l-4 border-red-500 p-5 animate-in slide-in-from-top duration-300">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-800 mb-1">오류가 발생했습니다</h3>
                            <p className="text-red-700 text-sm">{submitError}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 폼 유효성 에러 표시 */}
            {Object.keys(errors).length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-l-4 border-yellow-500 p-5 animate-in slide-in-from-top duration-300">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-yellow-800 mb-2">입력 내용을 확인해주세요</h3>
                            <ul className="space-y-1">
                                {Object.entries(errors).map(([key, error]) => {
                                    const errorMessage =
                                        error && typeof error === 'object' && 'message' in error
                                            ? (error as { message?: string | { message?: string } }).message
                                            : undefined;

                                    const messageText =
                                        typeof errorMessage === 'string'
                                            ? errorMessage
                                            : errorMessage && typeof errorMessage === 'object' && 'message' in errorMessage
                                            ? String(errorMessage.message)
                                            : '유효하지 않은 값';

                                    return (
                                        <li key={key} className="flex items-center gap-2 text-sm text-yellow-700">
                                            <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                                            <span className="font-medium">{key}:</span>
                                            <span>{messageText}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* 기본 정보 섹션 */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6 md:p-8 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">기본 정보</h2>
                    </div>
                    <BasicInfoSection form={form as any} />
                </div>

                {/* 예산 정보 섹션 (개발 분야 전용) */}
                {isDevelopment && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6 md:p-8 hover:shadow-xl transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">예산 정보</h2>
                        </div>
                        <BudgetSection form={form as any} />
                    </div>
                )}

                {/* 개발 스택 및 팀 구성 섹션 (개발 분야 전용) */}
                {isDevelopment && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6 md:p-8 hover:shadow-xl transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">개발 스택 및 팀 구성</h2>
                        </div>
                        <DevTeamSection form={form as any} />
                    </div>
                )}

                {/* 정부지원사업 섹션 (개발 분야 전용) */}
                {isDevelopment && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-6 md:p-8 hover:shadow-xl transition-shadow duration-300">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">정부지원사업</h2>
                        </div>
                        <GovSupportSection form={form as any} />
                    </div>
                )}
            </div>

            {/* 제출 버튼 */}
            <div className="sticky bottom-4 mt-8 flex gap-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/60 p-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-8 py-3.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 font-semibold text-gray-700 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                >
                    취소
                </button>
                <button
                    type="submit"
                    className="flex-1 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>저장 중...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{mode === 'create' ? '등록하기' : '수정하기'}</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
