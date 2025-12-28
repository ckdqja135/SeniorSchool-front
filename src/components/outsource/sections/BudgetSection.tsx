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
            <h2 className="text-2xl font-bold">예산 정보</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 최소 프로젝트 단가 */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        최소 프로젝트 단가 (원)
                    </label>
                    <input
                        type="text"
                        value={minBudgetDisplay}
                        onChange={(e) => {
                            // 숫자만 추출
                            const numbers = e.target.value.replace(/[^0-9]/g, '');
                            const num = parseNumber(numbers);
                            // 숫자를 포맷팅하여 표시
                            const formatted = numbers === '' ? '' : formatNumber(num!);
                            setMinBudgetDisplay(formatted);
                            setValue('minBudget', num, { shouldValidate: true });
                        }}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="3,000,000"
                    />
                    <p className="text-sm text-red-500 mt-1">
                        {errors.minBudget?.message}
                    </p>
                </div>

                {/* 평균 프로젝트 단가 */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        평균 프로젝트 단가 (원)
                    </label>
                    <input
                        type="text"
                        value={avgBudgetDisplay}
                        onChange={(e) => {
                            // 숫자만 추출
                            const numbers = e.target.value.replace(/[^0-9]/g, '');
                            const num = parseNumber(numbers);
                            // 숫자를 포맷팅하여 표시
                            const formatted = numbers === '' ? '' : formatNumber(num!);
                            setAvgBudgetDisplay(formatted);
                            setValue('avgBudget', num, { shouldValidate: true });
                        }}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="5,000,000"
                    />
                    <p className="text-sm text-red-500 mt-1">
                        {errors.avgBudget?.message}
                    </p>
                </div>

                {/* 최대 프로젝트 단가 */}
                <div>
                    <label className="block text-sm font-medium mb-2">
                        최대 프로젝트 단가 (원)
                    </label>
                    <input
                        type="text"
                        value={maxBudgetDisplay}
                        onChange={(e) => {
                            // 숫자만 추출
                            const numbers = e.target.value.replace(/[^0-9]/g, '');
                            const num = parseNumber(numbers);
                            // 숫자를 포맷팅하여 표시
                            const formatted = numbers === '' ? '' : formatNumber(num!);
                            setMaxBudgetDisplay(formatted);
                            setValue('maxBudget', num, { shouldValidate: true });
                        }}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="20,000,000"
                    />
                    <p className="text-sm text-red-500 mt-1">
                        {errors.maxBudget?.message}
                    </p>
                </div>
            </div>

            {/* 범위 검증 안내 */}
            {minBudget !== undefined &&
                maxBudget !== undefined &&
                minBudget > maxBudget && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">
                            ⚠️ 최소 단가는 최대 단가보다 클 수 없습니다.
                        </p>
                    </div>
                )}

            {avgBudget !== undefined &&
                ((minBudget !== undefined && avgBudget < minBudget) ||
                    (maxBudget !== undefined && avgBudget > maxBudget)) && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-600">
                            ⚠️ 평균 단가는 최소 단가와 최대 단가 사이여야 합니다.
                        </p>
                    </div>
                )}

            {/* 평균 단가 구간 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    평균 단가 구간
                </label>
                <select
                    {...register('avgBudgetRange')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">선택해주세요</option>
                    <option value={AvgBudgetRange.RANGE_0_1}>0~100만원</option>
                    <option value={AvgBudgetRange.RANGE_1_3}>100~300만원</option>
                    <option value={AvgBudgetRange.RANGE_3_5}>300~500만원</option>
                    <option value={AvgBudgetRange.RANGE_5_10}>500~1000만원</option>
                    <option value={AvgBudgetRange.RANGE_10_UP}>1000만원 이상</option>
                </select>
            </div>
        </div>
    );
}
