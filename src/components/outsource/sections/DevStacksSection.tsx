'use client';

import { UseFormReturn } from 'react-hook-form';
import { DevVendorInput } from '@/schemas/vendor.schema';
import { useState } from 'react';

interface DevStacksSectionProps {
    form: UseFormReturn<DevVendorInput>;
}

export default function DevStacksSection({ form }: DevStacksSectionProps) {
    const {
        setValue,
        watch,
        formState: { errors },
    } = form;

    // 각 스택 필드의 현재 값
    const techStackSummary = watch('devInfo.techStackSummary') || [];
    const frontendStacks = watch('devInfo.frontendStacks') || [];
    const backendStacks = watch('devInfo.backendStacks') || [];
    const aiStacks = watch('devInfo.aiStacks') || [];
    const mobileStacks = watch('devInfo.mobileStacks') || [];
    const infraStacks = watch('devInfo.infraStacks') || [];
    const devTags = watch('devInfo.devTags') || [];
    const repoUrls = watch('devInfo.repoUrls') || [];

    // 태그 입력용 state
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
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={() => handleRemoveTag(index, tags, fieldName)}
                        className="hover:text-blue-900"
                    >
                        ×
                    </button>
                </span>
            ))}
            {tags.length > 0 && (
                <span className="text-sm text-gray-500 self-center">
                    {tags.length}/{maxCount}
                </span>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">개발 스택 정보</h2>

            {/* 주요 기술스택 요약 */}
            <div>
                <label className="block text-sm font-medium mb-2">
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
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        추가
                    </button>
                </div>
                {renderTags(techStackSummary, 'devInfo.techStackSummary', 10)}
                <p className="text-sm text-red-500 mt-1">
                    {errors.devInfo?.techStackSummary?.message}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                    1~10개 필수, 각 2~30자
                </p>
            </div>

            {/* 프론트엔드 스택 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    프론트엔드 스택
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={frontendInput}
                        onChange={(e) => setFrontendInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag(
                                    frontendInput,
                                    frontendStacks,
                                    'devInfo.frontendStacks',
                                    15,
                                    () => setFrontendInput('')
                                );
                            }
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="React, Vue.js 등"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            handleAddTag(
                                frontendInput,
                                frontendStacks,
                                'devInfo.frontendStacks',
                                15,
                                () => setFrontendInput('')
                            )
                        }
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        추가
                    </button>
                </div>
                {renderTags(frontendStacks, 'devInfo.frontendStacks', 15)}
            </div>

            {/* 백엔드 스택 */}
            <div>
                <label className="block text-sm font-medium mb-2">백엔드 스택</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={backendInput}
                        onChange={(e) => setBackendInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag(
                                    backendInput,
                                    backendStacks,
                                    'devInfo.backendStacks',
                                    15,
                                    () => setBackendInput('')
                                );
                            }
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Node.js, Spring Boot 등"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            handleAddTag(
                                backendInput,
                                backendStacks,
                                'devInfo.backendStacks',
                                15,
                                () => setBackendInput('')
                            )
                        }
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        추가
                    </button>
                </div>
                {renderTags(backendStacks, 'devInfo.backendStacks', 15)}
            </div>

            {/* AI/데이터 스택 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    AI/데이터 스택
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag(
                                    aiInput,
                                    aiStacks,
                                    'devInfo.aiStacks',
                                    15,
                                    () => setAiInput('')
                                );
                            }
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="PyTorch, TensorFlow 등"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            handleAddTag(
                                aiInput,
                                aiStacks,
                                'devInfo.aiStacks',
                                15,
                                () => setAiInput('')
                            )
                        }
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        추가
                    </button>
                </div>
                {renderTags(aiStacks, 'devInfo.aiStacks', 15)}
            </div>

            {/* 모바일 스택 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    모바일/크로스 플랫폼 스택
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={mobileInput}
                        onChange={(e) => setMobileInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag(
                                    mobileInput,
                                    mobileStacks,
                                    'devInfo.mobileStacks',
                                    15,
                                    () => setMobileInput('')
                                );
                            }
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="React Native, Flutter 등"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            handleAddTag(
                                mobileInput,
                                mobileStacks,
                                'devInfo.mobileStacks',
                                15,
                                () => setMobileInput('')
                            )
                        }
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        추가
                    </button>
                </div>
                {renderTags(mobileStacks, 'devInfo.mobileStacks', 15)}
            </div>

            {/* 인프라/배포 환경 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    인프라/배포 환경
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={infraInput}
                        onChange={(e) => setInfraInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTag(
                                    infraInput,
                                    infraStacks,
                                    'devInfo.infraStacks',
                                    15,
                                    () => setInfraInput('')
                                );
                            }
                        }}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="AWS, Docker 등"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            handleAddTag(
                                infraInput,
                                infraStacks,
                                'devInfo.infraStacks',
                                15,
                                () => setInfraInput('')
                            )
                        }
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        추가
                    </button>
                </div>
                {renderTags(infraStacks, 'devInfo.infraStacks', 15)}
            </div>

            {/* 테크 분야 태그 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    테크 분야 태그
                </label>
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
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="SaaS, Fintech 등"
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
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        추가
                    </button>
                </div>
                {renderTags(devTags, 'devInfo.devTags', 10)}
            </div>

            {/* GitHub 계정 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    GitHub 조직/계정
                </label>
                <input
                    type="text"
                    {...form.register('devInfo.githubAccount')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="github.com/your-org"
                />
            </div>

            {/* 저장소 링크 */}
            <div>
                <label className="block text-sm font-medium mb-2">
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
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        추가
                    </button>
                </div>
                {renderTags(repoUrls, 'devInfo.repoUrls', 5)}
            </div>

            {/* 평균 개발 경력 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    팀 평균 개발 경력 (년)
                </label>
                <input
                    type="number"
                    {...form.register('devInfo.avgDevExperienceYears', {
                        valueAsNumber: true,
                    })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="7"
                    min={0}
                    max={30}
                />
            </div>

            {/* 선호 기술/스택 메모 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    선호 기술/스택 메모
                </label>
                <textarea
                    {...form.register('devInfo.devPreferenceNote')}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Next.js + TypeScript 기반의 B2B SaaS를 선호합니다."
                />
                <p className="text-sm text-gray-500 mt-1">
                    {watch('devInfo.devPreferenceNote')?.length || 0}/500
                </p>
            </div>
        </div>
    );
}
