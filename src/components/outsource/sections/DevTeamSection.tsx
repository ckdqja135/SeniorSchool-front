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
        <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag, index) => (
                <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-medium shadow-sm hover:shadow transition-shadow"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={() => handleRemoveTag(index, tags, fieldName)}
                        className="hover:text-blue-900 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                    >
                        ×
                    </button>
                </span>
            ))}
            {tags.length > 0 && (
                <span className="text-xs text-gray-500 self-center bg-gray-100 px-2 py-1 rounded-full">
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
        <div className="p-5 border-2 border-gray-200 rounded-xl space-y-4 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <span className="text-xl">{emoji}</span>
                    <span>{label}</span>
                </label>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => handleDecrement(teamFieldName, teamValue)}
                        className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                        disabled={teamValue === 0}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        {...form.register(teamFieldName as any, { valueAsNumber: true })}
                        className="w-14 text-center px-2 py-1.5 text-sm font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        min={0}
                        max={50}
                    />
                    <button
                        type="button"
                        onClick={() => handleIncrement(teamFieldName, teamValue)}
                        className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                        disabled={teamValue === 50}
                    >
                        +
                    </button>
                    <span className="text-xs text-gray-600 font-semibold w-8">명</span>
                </div>
            </div>
            <div>
                <div className="flex gap-2">
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
                        className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-all"
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
                        className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-sm hover:shadow transition-all"
                    >
                        추가
                    </button>
                </div>
                {renderTags(stacks, stackFieldName, stackMaxCount)}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* 주요 기술스택 요약 */}
            <div className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <label className="text-sm font-bold text-gray-700">
                        주요 기술스택 요약 <span className="text-red-500">*</span>
                    </label>
                </div>
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
                        className="flex-1 px-4 py-2.5 text-sm border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white transition-all"
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
                        className="px-5 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                        추가
                    </button>
                </div>
                {renderTags(techStackSummary, 'devInfo.techStackSummary', 10)}
                <p className="text-sm text-red-600 font-medium mt-2">
                    {errors.devInfo?.techStackSummary?.message}
                </p>
                <p className="text-xs text-purple-700 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    1~10개 필수, 각 2~30자
                </p>
            </div>

            {/* 역할별 통합 카드 */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        역할별 기술 스택 및 인원
                    </h3>
                    <div className="text-right">
                        <p className="text-xs text-gray-600 font-medium">전체 인원</p>
                        <p className="text-2xl font-bold text-indigo-600">
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
                    <div className="p-5 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <span className="text-xl">🎨</span>
                                <span>디자이너</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDecrement('team.designer', designer)}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                                    disabled={designer === 0}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    {...form.register('team.designer', { valueAsNumber: true })}
                                    className="w-14 text-center px-2 py-1.5 text-sm font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min={0}
                                    max={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement('team.designer', designer)}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                                    disabled={designer === 50}
                                >
                                    +
                                </button>
                                <span className="text-xs text-gray-600 font-semibold w-8">명</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <span className="text-xl">📋</span>
                                <span>PM/기획</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDecrement('team.pm', pm)}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                                    disabled={pm === 0}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    {...form.register('team.pm', { valueAsNumber: true })}
                                    className="w-14 text-center px-2 py-1.5 text-sm font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min={0}
                                    max={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement('team.pm', pm)}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                                    disabled={pm === 50}
                                >
                                    +
                                </button>
                                <span className="text-xs text-gray-600 font-semibold w-8">명</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <span className="text-xl">🔍</span>
                                <span>QA/테스터</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDecrement('team.qa', qa)}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                                    disabled={qa === 0}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    {...form.register('team.qa', { valueAsNumber: true })}
                                    className="w-14 text-center px-2 py-1.5 text-sm font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min={0}
                                    max={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement('team.qa', qa)}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                                    disabled={qa === 50}
                                >
                                    +
                                </button>
                                <span className="text-xs text-gray-600 font-semibold w-8">명</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-5 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <span className="text-xl">👤</span>
                                <span>기타</span>
                            </label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDecrement('team.etc', etc)}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                                    disabled={etc === 0}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    {...form.register('team.etc', { valueAsNumber: true })}
                                    className="w-14 text-center px-2 py-1.5 text-sm font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    min={0}
                                    max={50}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleIncrement('team.etc', etc)}
                                    className="w-8 h-8 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-400 disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold transition-all"
                                    disabled={etc === 50}
                                >
                                    +
                                </button>
                                <span className="text-xs text-gray-600 font-semibold w-8">명</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 테크 태그 및 기타 정보 */}
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">테크 태그</label>
                    <div className="flex gap-2">
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
                            className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all"
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
                            className="px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-sm hover:shadow transition-all"
                        >
                            추가
                        </button>
                    </div>
                    {renderTags(devTags, 'devInfo.devTags', 10)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            GitHub 조직/계정
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                            </div>
                            <input
                                type="text"
                                {...form.register('devInfo.githubAccount')}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                                placeholder="github.com/your-org"
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            평균 개발 경력 (년)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <input
                                type="number"
                                {...form.register('devInfo.avgDevExperienceYears', {
                                    valueAsNumber: true,
                                })}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="7"
                                min={0}
                                max={30}
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        코드 저장소 링크 (최대 5개)
                    </label>
                    <div className="flex gap-2">
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
                            className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-all"
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
                            className="px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-sm hover:shadow transition-all"
                        >
                            추가
                        </button>
                    </div>
                    {renderTags(repoUrls, 'devInfo.repoUrls', 5)}
                </div>

                <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        선호 기술/스택 메모
                    </label>
                    <textarea
                        {...form.register('devInfo.devPreferenceNote')}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                        placeholder="Next.js + TypeScript 기반의 B2B SaaS를 선호합니다."
                    />
                    <p className="text-xs text-gray-500 mt-2 text-right bg-gray-100 px-2 py-0.5 rounded-full inline-block float-right">
                        {watch('devInfo.devPreferenceNote')?.length || 0}/500
                    </p>
                </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <p className="text-sm text-blue-800 font-medium">
                    0명인 역할은 카드/리스트에 표시되지 않습니다.
                </p>
            </div>
        </div>
    );
}

