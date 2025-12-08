'use client';

import { UseFormReturn } from 'react-hook-form';
import { VendorFormInput } from '@/schemas/vendor.schema';
import { useState } from 'react';

interface GovSupportSectionProps {
    form: UseFormReturn<VendorFormInput>;
}

export default function GovSupportSection({ form }: GovSupportSectionProps) {
    const {
        register,
        watch,
        setValue,
        formState: { errors },
    } = form;

    const hasGovSupport = watch('govSupport.hasGovSupportExperience') || false;
    const govPrograms = watch('govSupport.govSupportPrograms') || [];
    const govLinks = watch('govSupport.govSupportLinks') || [];

    const [programInput, setProgramInput] = useState('');
    const [linkInput, setLinkInput] = useState('');

    // 프로그램 추가
    const handleAddProgram = () => {
        if (!programInput.trim()) return;
        if (govPrograms.length >= 10) {
            alert('최대 10개까지만 추가할 수 있습니다.');
            return;
        }
        if (govPrograms.includes(programInput.trim())) {
            alert('이미 추가된 프로그램입니다.');
            return;
        }

        setValue('govSupport.govSupportPrograms', [
            ...govPrograms,
            programInput.trim(),
        ]);
        setProgramInput('');
    };

    // 프로그램 제거
    const handleRemoveProgram = (index: number) => {
        const newPrograms = govPrograms.filter((_, i) => i !== index);
        setValue('govSupport.govSupportPrograms', newPrograms);
    };

    // 링크 추가
    const handleAddLink = () => {
        if (!linkInput.trim()) return;
        if (govLinks.length >= 3) {
            alert('최대 3개까지만 추가할 수 있습니다.');
            return;
        }
        if (govLinks.includes(linkInput.trim())) {
            alert('이미 추가된 링크입니다.');
            return;
        }

        setValue('govSupport.govSupportLinks', [...govLinks, linkInput.trim()]);
        setLinkInput('');
    };

    // 링크 제거
    const handleRemoveLink = (index: number) => {
        const newLinks = govLinks.filter((_, i) => i !== index);
        setValue('govSupport.govSupportLinks', newLinks);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">정부지원사업 수행 경력</h2>

            {/* 수행 경력 여부 토글 */}
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-gray-50">
                <input
                    type="checkbox"
                    {...register('govSupport.hasGovSupportExperience')}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                    <label className="text-sm font-medium">
                        정부지원사업 수행 경력이 있습니다
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                        TIPS, 창업도약패키지, K-Startup 바우처 등
                    </p>
                </div>
            </div>

            {/* hasGovSupport가 true일 때만 하위 필드 노출 */}
            {hasGovSupport && (
                <div className="space-y-6 pl-4 border-l-4 border-blue-300">
                    {/* 수행한 프로그램 목록 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            수행한 정부지원사업 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={programInput}
                                onChange={(e) => setProgramInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddProgram();
                                    }
                                }}
                                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="예: TIPS, 창업도약패키지 (Enter로 추가)"
                            />
                            <button
                                type="button"
                                onClick={handleAddProgram}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                추가
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {govPrograms.map((program, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                                >
                                    {program}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveProgram(index)}
                                        className="hover:text-green-900"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            {govPrograms.length > 0 && (
                                <span className="text-sm text-gray-500 self-center">
                                    {govPrograms.length}/10
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-red-500 mt-1">
                            {errors.govSupport?.govSupportPrograms?.message}
                        </p>
                    </div>

                    {/* 총 수행 횟수 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            총 수행 횟수
                        </label>
                        <input
                            type="number"
                            {...register('govSupport.govSupportTotalCount', {
                                valueAsNumber: true,
                            })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="5"
                            min={1}
                            max={100}
                        />
                    </div>

                    {/* 최근 수행 연도 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            최근 수행 연도
                        </label>
                        <input
                            type="number"
                            {...register('govSupport.govSupportRecentYear', {
                                valueAsNumber: true,
                            })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="2024"
                            min={2000}
                            max={new Date().getFullYear()}
                        />
                    </div>

                    {/* 대표 과제명 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            대표 과제명
                        </label>
                        <input
                            type="text"
                            {...register('govSupport.govSupportMainTitle')}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="AI 기반 물류 최적화 플랫폼 고도화 사업"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            {watch('govSupport.govSupportMainTitle')?.length || 0}/100
                        </p>
                    </div>

                    {/* 관련 링크 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            관련 링크 (성과/보도자료, 최대 3개)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={linkInput}
                                onChange={(e) => setLinkInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddLink();
                                    }
                                }}
                                className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="https://example.com/..."
                            />
                            <button
                                type="button"
                                onClick={handleAddLink}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                                추가
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {govLinks.map((link, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm truncate max-w-xs"
                                >
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="truncate hover:underline"
                                    >
                                        {link}
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLink(index)}
                                        className="hover:text-blue-900"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 요약 설명 */}
                    <div>
                        <label className="block text-sm font-medium mb-2">요약 설명</label>
                        <textarea
                            {...register('govSupport.govSupportSummary')}
                            rows={4}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="TIPS 및 창업도약패키지 과제를 다수 수행한 경험이 있습니다."
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            {watch('govSupport.govSupportSummary')?.length || 0}/500
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
