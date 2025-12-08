'use client';

import { UseFormReturn } from 'react-hook-form';
import { VendorFormInput } from '@/schemas/vendor.schema';
import { AvgBudgetRange } from '@/types/vendor';

interface BudgetSectionProps {
    form: UseFormReturn<VendorFormInput>;
}

export default function BudgetSection({ form }: BudgetSectionProps) {
    const {
        register,
        formState: { errors },
        watch,
    } = form;

    const minBudget = watch('minBudget');
    const avgBudget = watch('avgBudget');
    const maxBudget = watch('maxBudget');

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
                        type="number"
                        {...register('minBudget', { valueAsNumber: true })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="3000000"
                        min={0}
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
                        type="number"
                        {...register('avgBudget', { valueAsNumber: true })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="5000000"
                        min={0}
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
                        type="number"
                        {...register('maxBudget', { valueAsNumber: true })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="20000000"
                        min={0}
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
