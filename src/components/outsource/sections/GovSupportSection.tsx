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
            {/* 수행 경력 여부 토글 */}
            <div className="flex items-center gap-4 p-5 border-2 border-gray-200 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 hover:shadow-md transition-shadow cursor-pointer">
                <input
                    type="checkbox"
                    {...register('govSupport.hasGovSupportExperience')}
                    className="w-6 h-6 rounded-lg border-2 border-gray-300 text-orange-600 focus:ring-orange-500 focus:ring-2 cursor-pointer"
                    id="govSupportToggle"
                />
                <div className="flex-1">
                    <label htmlFor="govSupportToggle" className="text-sm font-bold text-gray-700 cursor-pointer flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        정부지원사업 수행 경력이 있습니다
                    </label>
                    <p className="text-xs text-gray-600 mt-1.5 ml-7">
                        TIPS, 창업도약패키지, K-Startup 바우처 등
                    </p>
                </div>
            </div>

            {/* hasGovSupport가 true일 때만 하위 필드 노출 */}
            {hasGovSupport && (
                <div className="space-y-6 pl-6 border-l-4 border-gradient-to-b from-orange-300 to-red-300 animate-in slide-in-from-top duration-500">
                    {/* 수행한 프로그램 목록 */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                                placeholder="예: TIPS, 창업도약패키지 (Enter로 추가)"
                            />
                            <button
                                type="button"
                                onClick={handleAddProgram}
                                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                                추가
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {govPrograms.map((program, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-sm font-medium shadow-sm hover:shadow transition-shadow"
                                >
                                    {program}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveProgram(index)}
                                        className="hover:text-green-900 hover:bg-green-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            {govPrograms.length > 0 && (
                                <span className="text-xs text-gray-500 self-center bg-gray-100 px-2 py-1 rounded-full">
                                    {govPrograms.length}/10
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-red-500 font-medium mt-2">
                            {errors.govSupport?.govSupportPrograms?.message}
                        </p>
                    </div>

                    {/* 총 수행 횟수 */}
                    <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            총 수행 횟수
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                            </div>
                            <input
                                type="number"
                                {...register('govSupport.govSupportTotalCount', {
                                    valueAsNumber: true,
                                })}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-gray-50 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="5"
                                min={1}
                                max={100}
                            />
                        </div>
                    </div>

                    {/* 최근 수행 연도 */}
                    <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            최근 수행 연도
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <input
                                type="number"
                                {...register('govSupport.govSupportRecentYear', {
                                    valueAsNumber: true,
                                })}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-gray-50 focus:bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="2024"
                                min={2000}
                                max={new Date().getFullYear()}
                            />
                        </div>
                    </div>

                    {/* 대표 과제명 */}
                    <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            대표 과제명
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                {...register('govSupport.govSupportMainTitle')}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                                placeholder="AI 기반 물류 최적화 플랫폼 고도화 사업"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-right bg-gray-100 px-2 py-0.5 rounded-full inline-block float-right">
                            {watch('govSupport.govSupportMainTitle')?.length || 0}/100
                        </p>
                    </div>

                    {/* 관련 링크 */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                                placeholder="https://example.com/..."
                            />
                            <button
                                type="button"
                                onClick={handleAddLink}
                                className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                                추가
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {govLinks.map((link, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-medium truncate max-w-xs shadow-sm hover:shadow transition-shadow"
                                >
                                    <a
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="truncate hover:underline flex items-center gap-1"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        {link}
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLink(index)}
                                        className="hover:text-blue-900 hover:bg-blue-200 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* 요약 설명 */}
                    <div className="group">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">요약 설명</label>
                        <textarea
                            {...register('govSupport.govSupportSummary')}
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                            placeholder="TIPS 및 창업도약패키지 과제를 다수 수행한 경험이 있습니다."
                        />
                        <p className="text-xs text-gray-500 mt-2 text-right bg-gray-100 px-2 py-0.5 rounded-full inline-block float-right">
                            {watch('govSupport.govSupportSummary')?.length || 0}/500
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
