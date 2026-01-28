'use client';

import { UseFormReturn } from 'react-hook-form';
import { VendorFormInput } from '@/schemas/vendor.schema';
import { AvgBudgetRange } from '@/types/vendor';
import { useState, useEffect } from 'react';

interface BudgetSectionProps {
    form: UseFormReturn<VendorFormInput>;
}

// 숫자에 천 단위 구분 기호 추가
const formatNumber = (value: number | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '';
    return value.toLocaleString('ko-KR');
};

// 쉼표가 포함된 문자열을 숫자로 변환
const parseNumber = (value: string): number | undefined => {
    const cleaned = value.replace(/,/g, '');
    if (cleaned === '') return undefined;
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? undefined : num;
};

export default function BudgetSection({ form }: BudgetSectionProps) {
    const {
        register,
        formState: { errors },
        watch,
        setValue,
    } = form;

    const minBudget = watch('minBudget');
    const avgBudget = watch('avgBudget');
    const maxBudget = watch('maxBudget');

    // 표시용 포맷된 값들
    const [minBudgetDisplay, setMinBudgetDisplay] = useState('');
    const [avgBudgetDisplay, setAvgBudgetDisplay] = useState('');
    const [maxBudgetDisplay, setMaxBudgetDisplay] = useState('');

    // 폼 값이 변경될 때 표시값 업데이트
    useEffect(() => {
        setMinBudgetDisplay(formatNumber(minBudget));
    }, [minBudget]);

    useEffect(() => {
        setAvgBudgetDisplay(formatNumber(avgBudget));
    }, [avgBudget]);

    useEffect(() => {
        setMaxBudgetDisplay(formatNumber(maxBudget));
    }, [maxBudget]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 최소 프로젝트 단가 */}
                <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        💵 최소 프로젝트 단가
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-semibold">₩</span>
                        </div>
                        <input
                            type="text"
                            value={minBudgetDisplay}
                            onChange={(e) => {
                                const numbers = e.target.value.replace(/[^0-9]/g, '');
                                const num = parseNumber(numbers);
                                const formatted = numbers === '' ? '' : formatNumber(num!);
                                setMinBudgetDisplay(formatted);
                                setValue('minBudget', num, { shouldValidate: true });
                            }}
                            className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                            placeholder="3,000,000"
                        />
                    </div>
                    <p className="text-sm text-red-500 font-medium mt-2">
                        {errors.minBudget?.message}
                    </p>
                </div>

                {/* 평균 프로젝트 단가 */}
                <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        💰 평균 프로젝트 단가
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-semibold">₩</span>
                        </div>
                        <input
                            type="text"
                            value={avgBudgetDisplay}
                            onChange={(e) => {
                                const numbers = e.target.value.replace(/[^0-9]/g, '');
                                const num = parseNumber(numbers);
                                const formatted = numbers === '' ? '' : formatNumber(num!);
                                setAvgBudgetDisplay(formatted);
                                setValue('avgBudget', num, { shouldValidate: true });
                            }}
                            className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                            placeholder="5,000,000"
                        />
                    </div>
                    <p className="text-sm text-red-500 font-medium mt-2">
                        {errors.avgBudget?.message}
                    </p>
                </div>

                {/* 최대 프로젝트 단가 */}
                <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        💎 최대 프로젝트 단가
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-semibold">₩</span>
                        </div>
                        <input
                            type="text"
                            value={maxBudgetDisplay}
                            onChange={(e) => {
                                const numbers = e.target.value.replace(/[^0-9]/g, '');
                                const num = parseNumber(numbers);
                                const formatted = numbers === '' ? '' : formatNumber(num!);
                                setMaxBudgetDisplay(formatted);
                                setValue('maxBudget', num, { shouldValidate: true });
                            }}
                            className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                            placeholder="20,000,000"
                        />
                    </div>
                    <p className="text-sm text-red-500 font-medium mt-2">
                        {errors.maxBudget?.message}
                    </p>
                </div>
            </div>

            {/* 범위 검증 안내 */}
            {minBudget !== undefined &&
                maxBudget !== undefined &&
                minBudget > maxBudget && (
                    <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 rounded-xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
                        <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm text-red-700 font-medium">
                            최소 단가는 최대 단가보다 클 수 없습니다.
                        </p>
                    </div>
                )}

            {avgBudget !== undefined &&
                ((minBudget !== undefined && avgBudget < minBudget) ||
                    (maxBudget !== undefined && avgBudget > maxBudget)) && (
                    <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl flex items-start gap-3 animate-in slide-in-from-top duration-300">
                        <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm text-yellow-700 font-medium">
                            평균 단가는 최소 단가와 최대 단가 사이여야 합니다.
                        </p>
                    </div>
                )}

            {/* 평균 단가 구간 */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    평균 단가 구간
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <select
                        {...register('avgBudgetRange')}
                        className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                    >
                        <option value="">선택해주세요</option>
                        <option value={AvgBudgetRange.RANGE_0_1}>💸 0~100만원</option>
                        <option value={AvgBudgetRange.RANGE_1_3}>💵 100~300만원</option>
                        <option value={AvgBudgetRange.RANGE_3_5}>💰 300~500만원</option>
                        <option value={AvgBudgetRange.RANGE_5_10}>💎 500~1000만원</option>
                        <option value={AvgBudgetRange.RANGE_10_UP}>👑 1000만원 이상</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
}
