'use client';

import { UseFormReturn } from 'react-hook-form';
import { VendorFormInput } from '@/schemas/vendor.schema';
import { useEffect } from 'react';

interface TeamCompositionSectionProps {
    form: UseFormReturn<VendorFormInput>;
}

export default function TeamCompositionSection({
    form,
}: TeamCompositionSectionProps) {
    const { register, watch, setValue } = form;

    // 모든 팀 구성 필드 watch
    const frontend = watch('team.frontend') || 0;
    const backend = watch('team.backend') || 0;
    const ai = watch('team.ai') || 0;
    const designer = watch('team.designer') || 0;
    const pm = watch('team.pm') || 0;
    const devops = watch('team.devops') || 0;
    const qa = watch('team.qa') || 0;
    const etc = watch('team.etc') || 0;

    // 전체 인원 수 자동 계산
    useEffect(() => {
        const total = frontend + backend + ai + designer + pm + devops + qa + etc;
        setValue('team.total', total);
    }, [frontend, backend, ai, designer, pm, devops, qa, etc, setValue]);

    // Stepper UI를 위한 헬퍼 함수
    const handleIncrement = (field: string, currentValue: number) => {
        if (currentValue < 50) {
            setValue(field as any, currentValue + 1);
        }
    };

    const handleDecrement = (field: string, currentValue: number) => {
        if (currentValue > 0) {
            setValue(field as any, currentValue - 1);
        }
    };

    // 역할별 입력 필드 렌더링
    const renderRoleInput = (
        label: string,
        emoji: string,
        fieldName: string,
        value: number
    ) => (
        <div className="flex items-center justify-between p-4 border rounded-lg">
            <label className="text-sm font-medium">
                {emoji} {label}
            </label>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => handleDecrement(fieldName, value)}
                    className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    disabled={value === 0}
                >
                    −
                </button>
                <input
                    type="number"
                    {...register(fieldName as any, { valueAsNumber: true })}
                    className="w-16 text-center px-2 py-1 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={0}
                    max={50}
                />
                <button
                    type="button"
                    onClick={() => handleIncrement(fieldName, value)}
                    className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50"
                    disabled={value === 50}
                >
                    +
                </button>
                <span className="text-sm text-gray-500 w-8">명</span>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">팀 구성</h2>
                <div className="text-right">
                    <p className="text-sm text-gray-500">전체 인원</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {watch('team.total') || 0}명
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {renderRoleInput('프론트엔드', '👨‍💻', 'team.frontend', frontend)}
                {renderRoleInput('백엔드', '🧑‍💻', 'team.backend', backend)}
                {renderRoleInput('AI/데이터', '🤖', 'team.ai', ai)}
                {renderRoleInput('디자이너', '🎨', 'team.designer', designer)}
                {renderRoleInput('PM/기획', '📋', 'team.pm', pm)}
                {renderRoleInput('DevOps/인프라', '⚙️', 'team.devops', devops)}
                {renderRoleInput('QA/테스터', '🔍', 'team.qa', qa)}
                {renderRoleInput('기타', '👤', 'team.etc', etc)}
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                    💡 0명인 역할은 카드/리스트에 표시되지 않습니다.
                </p>
            </div>
        </div>
    );
}
