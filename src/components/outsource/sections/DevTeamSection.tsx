'use client';

import { UseFormReturn } from 'react-hook-form';
import { DevVendorInput } from '@/schemas/vendor.schema';
import { useState, useEffect } from 'react';

interface DevTeamSectionProps {
    form: UseFormReturn<DevVendorInput>;
}

export default function DevTeamSection({ form }: DevTeamSectionProps) {
    const {
        setValue,
        watch,
        formState: { errors },
    } = form;

    // 기술 스택 필드
    const techStackSummary = watch('devInfo.techStackSummary') || [];
    const frontendStacks = watch('devInfo.frontendStacks') || [];
    const backendStacks = watch('devInfo.backendStacks') || [];
    const aiStacks = watch('devInfo.aiStacks') || [];
    const mobileStacks = watch('devInfo.mobileStacks') || [];
    const infraStacks = watch('devInfo.infraStacks') || [];
    const devTags = watch('devInfo.devTags') || [];
    const repoUrls = watch('devInfo.repoUrls') || [];

    // 팀 구성 필드
    const frontend = watch('team.frontend') || 0;
    const backend = watch('team.backend') || 0;
    const ai = watch('team.ai') || 0;
    const mobile = watch('team.mobile') || 0;
    const designer = watch('team.designer') || 0;
    const pm = watch('team.pm') || 0;
    const devops = watch('team.devops') || 0;
    const qa = watch('team.qa') || 0;
    const etc = watch('team.etc') || 0;

    // 전체 인원 수 자동 계산
    useEffect(() => {
        const total = frontend + backend + ai + mobile + designer + pm + devops + qa + etc;
        setValue('team.total', total);
    }, [frontend, backend, ai, mobile, designer, pm, devops, qa, etc, setValue]);

    // 입력 필드용 state
    const [techStackInput, setTechStackInput] = useState('');
    const [frontendInput, setFrontendInput] = useState('');
    const [backendInput, setBackendInput] = useState('');
    const [aiInput, setAiInput] = useState('');
    const [mobileInput, setMobileInput] = useState('');
    const [infraInput, setInfraInput] = useState('');
    const [devTagInput, setDevTagInput] = useState('');
    const [repoUrlInput, setRepoUrlInput] = useState('');

    // 태그 추가 핸들러
    const handleAddTag = (
        value: string,
        currentArray: string[],
        fieldName: string,
        maxCount: number,
        clearInput: () => void
    ) => {
        if (!value.trim()) return;
        if (currentArray.length >= maxCount) {
            alert(`최대 ${maxCount}개까지만 추가할 수 있습니다.`);
            return;
        }
        if (currentArray.includes(value.trim())) {
            alert('이미 추가된 항목입니다.');
            return;
        }
        setValue(fieldName as any, [...currentArray, value.trim()]);
        clearInput();
    };

    // 태그 제거 핸들러
    const handleRemoveTag = (
        index: number,
        currentArray: string[],
        fieldName: string
    ) => {
        const newArray = currentArray.filter((_, i) => i !== index);
        setValue(fieldName as any, newArray);
    };

    // 인원 수 증감 핸들러
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

    // 태그 렌더링 헬퍼
    const renderTags = (
        tags: string[],
        fieldName: string,
        maxCount: number
    ) => (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
            {tags.map((tag, index) => (
                <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={() => handleRemoveTag(index, tags, fieldName)}
                        className="hover:text-blue-900 text-sm leading-none"
                    >
                        ×
                    </button>
                </span>
            ))}
            {tags.length > 0 && (
                <span className="text-xs text-gray-500 self-center">
                    {tags.length}/{maxCount}
                </span>
            )}
        </div>
    );

    // 역할별 카드 렌더링 (기술 스택 + 인원 수)
    const renderRoleCard = (
        label: string,
        emoji: string,
        stacks: string[],
        stackFieldName: string,
        stackInput: string,
        setStackInput: (value: string) => void,
        stackPlaceholder: string,
        teamFieldName: string,
        teamValue: number,
        stackMaxCount: number = 15
    ) => (
        <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                    {emoji} {label}
                </label>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => handleDecrement(teamFieldName, teamValue)}
                        className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                        disabled={teamValue === 0}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        {...form.register(teamFieldName as any, { valueAsNumber: true })}
                        className="w-12 text-center px-1 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={0}
                        max={50}
                    />
                    <button
                        type="button"
                        onClick={() => handleIncrement(teamFieldName, teamValue)}
                        className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                        disabled={teamValue === 50}
                    >
                        +
                    </button>
                    <span className="text-xs text-gray-500 w-6">명</span>
                </div>
            </div>
            <div>
                <div className="flex gap-1.5">
                    <input
                        type="text"
                        value={stackInput}
                        onChange={(e) => setStackInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag(
                                    stackInput,
                                    stacks,
                                    stackFieldName,
                                    stackMaxCount,
                                    () => setStackInput('')
                                );
                            }
                        }}
                        className="flex-1 px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={stackPlaceholder}
                    />
                    <button
                        type="button"
                        onClick={() =>
                            handleAddTag(
                                stackInput,
                                stacks,
                                stackFieldName,
                                stackMaxCount,
                                () => setStackInput('')
                            )
                        }
                        className="px-2 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        +
                    </button>
                </div>
                {renderTags(stacks, stackFieldName, stackMaxCount)}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* 주요 기술스택 요약 */}
            <div>
                <h2 className="text-2xl font-bold mb-4">개발 스택 및 팀 구성</h2>
                <div>
                    <label className="block text-xs font-medium mb-1.5">
                        주요 기술스택 요약 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={techStackInput}
                            onChange={(e) => setTechStackInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTag(
                                        techStackInput,
                                        techStackSummary,
                                        'devInfo.techStackSummary',
                                        10,
                                        () => setTechStackInput('')
                                    );
                                }
                            }}
                            className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="React, Node.js 등 (Enter로 추가)"
                        />
                        <button
                            type="button"
                            onClick={() =>
                                handleAddTag(
                                    techStackInput,
                                    techStackSummary,
                                    'devInfo.techStackSummary',
                                    10,
                                    () => setTechStackInput('')
                                )
                            }
                            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            추가
                        </button>
                    </div>
                    {renderTags(techStackSummary, 'devInfo.techStackSummary', 10)}
                    <p className="text-xs text-red-500 mt-0.5">
                        {errors.devInfo?.techStackSummary?.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        1~10개 필수, 각 2~30자
                    </p>
                </div>
            </div>

            {/* 역할별 통합 카드 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">역할별 기술 스택 및 인원</h3>
                    <div className="text-right">
                        <p className="text-xs text-gray-500">전체 인원</p>
                        <p className="text-xl font-bold text-blue-600">
                            {watch('team.total') || 0}명
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderRoleCard(
                        '프론트엔드',
                        '👨‍💻',
                        frontendStacks,
                        'devInfo.frontendStacks',
                        frontendInput,
                        setFrontendInput,
                        'React, Vue.js',
                        'team.frontend',
                        frontend
                    )}
                    {renderRoleCard(
                        '백엔드',
                        '🧑‍💻',
                        backendStacks,
                        'devInfo.backendStacks',
                        backendInput,
                        setBackendInput,
                        'Node.js, Spring',
                        'team.backend',
                        backend
                    )}
                    {renderRoleCard(
                        'AI/데이터',
                        '🤖',
                        aiStacks,
                        'devInfo.aiStacks',
                        aiInput,
                        setAiInput,
                        'PyTorch, TensorFlow',
                        'team.ai',
                        ai
                    )}
                    {renderRoleCard(
                        '인프라/배포',
                        '⚙️',
                        infraStacks,
                        'devInfo.infraStacks',
                        infraInput,
                        setInfraInput,
                        'AWS, Docker',
                        'team.devops',
                        devops
                    )}
                    {renderRoleCard(
                        '모바일',
                        '📱',
                        mobileStacks,
                        'devInfo.mobileStacks',
                        mobileInput,
                        setMobileInput,
                        'React Native, Flutter',
                        'team.mobile',
                        mobile
                    )}
                </div>

                {/* 스택이 없는 역할들 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">🎨 디자이너</label>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleDecrement('team.designer', designer)}
                                    className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                                    disabled={designer === 0}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    {...form.register('team.designer', { valueAsNumber: true })}
                                    className="w-12 text-center px-1 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min={0}
                                    max={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement('team.designer', designer)}
                                    className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                                    disabled={designer === 50}
                                >
                                    +
                                </button>
                                <span className="text-xs text-gray-500 w-6">명</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">📋 PM/기획</label>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleDecrement('team.pm', pm)}
                                    className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                                    disabled={pm === 0}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    {...form.register('team.pm', { valueAsNumber: true })}
                                    className="w-12 text-center px-1 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min={0}
                                    max={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement('team.pm', pm)}
                                    className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                                    disabled={pm === 50}
                                >
                                    +
                                </button>
                                <span className="text-xs text-gray-500 w-6">명</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">🔍 QA/테스터</label>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleDecrement('team.qa', qa)}
                                    className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                                    disabled={qa === 0}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    {...form.register('team.qa', { valueAsNumber: true })}
                                    className="w-12 text-center px-1 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min={0}
                                    max={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement('team.qa', qa)}
                                    className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                                    disabled={qa === 50}
                                >
                                    +
                                </button>
                                <span className="text-xs text-gray-500 w-6">명</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">👤 기타</label>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleDecrement('team.etc', etc)}
                                    className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                                    disabled={etc === 0}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    {...form.register('team.etc', { valueAsNumber: true })}
                                    className="w-12 text-center px-1 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min={0}
                                    max={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement('team.etc', etc)}
                                    className="w-7 h-7 flex items-center justify-center border rounded-lg hover:bg-gray-100 disabled:opacity-50 text-sm"
                                    disabled={etc === 50}
                                >
                                    +
                                </button>
                                <span className="text-xs text-gray-500 w-6">명</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 테크 태그 및 기타 정보 */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium mb-1.5">테크 태그</label>
                        <div className="flex gap-1.5">
                            <input
                                type="text"
                                value={devTagInput}
                                onChange={(e) => setDevTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag(
                                            devTagInput,
                                            devTags,
                                            'devInfo.devTags',
                                            10,
                                            () => setDevTagInput('')
                                        );
                                    }
                                }}
                                className="flex-1 px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="SaaS, Fintech"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    handleAddTag(
                                        devTagInput,
                                        devTags,
                                        'devInfo.devTags',
                                        10,
                                        () => setDevTagInput('')
                                    )
                                }
                                className="px-2 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                +
                            </button>
                        </div>
                        {renderTags(devTags, 'devInfo.devTags', 10)}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium mb-1.5">
                            GitHub 조직/계정
                        </label>
                        <input
                            type="text"
                            {...form.register('devInfo.githubAccount')}
                            className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="github.com/your-org"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5">
                            평균 개발 경력 (년)
                        </label>
                        <input
                            type="number"
                            {...form.register('devInfo.avgDevExperienceYears', {
                                valueAsNumber: true,
                            })}
                            className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="7"
                            min={0}
                            max={30}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1.5">
                        코드 저장소 링크 (최대 5개)
                    </label>
                    <div className="flex gap-1.5">
                        <input
                            type="url"
                            value={repoUrlInput}
                            onChange={(e) => setRepoUrlInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTag(
                                        repoUrlInput,
                                        repoUrls,
                                        'devInfo.repoUrls',
                                        5,
                                        () => setRepoUrlInput('')
                                    );
                                }
                            }}
                            className="flex-1 px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="https://github.com/..."
                        />
                        <button
                            type="button"
                            onClick={() =>
                                handleAddTag(
                                    repoUrlInput,
                                    repoUrls,
                                    'devInfo.repoUrls',
                                    5,
                                    () => setRepoUrlInput('')
                                )
                            }
                            className="px-2 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            +
                        </button>
                    </div>
                    {renderTags(repoUrls, 'devInfo.repoUrls', 5)}
                </div>

                <div>
                    <label className="block text-xs font-medium mb-1.5">
                        선호 기술/스택 메모
                    </label>
                    <textarea
                        {...form.register('devInfo.devPreferenceNote')}
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Next.js + TypeScript 기반의 B2B SaaS를 선호합니다."
                    />
                    <p className="text-xs text-gray-500 mt-0.5">
                        {watch('devInfo.devPreferenceNote')?.length || 0}/500
                    </p>
                </div>
            </div>

            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                    💡 0명인 역할은 카드/리스트에 표시되지 않습니다.
                </p>
            </div>
        </div>
    );
}

