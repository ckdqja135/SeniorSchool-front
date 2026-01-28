'use client';

import OutsourceVendorForm from '@/components/outsource/OutsourceVendorForm';
import { useRouter } from 'next/navigation';

export default function VendorApplyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 md:py-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* 헤더 섹션 */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="group inline-flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-xl text-gray-700 hover:text-indigo-600 hover:border-indigo-300 hover:bg-white transition-all duration-200 mb-6 shadow-sm hover:shadow-md font-semibold"
                    >
                        <svg
                            className="w-5 h-5 transition-transform group-hover:-translate-x-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        <span>뒤로가기</span>
                    </button>

                    {/* 타이틀 카드 */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/60 p-8 mb-8">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-md">
                                <svg
                                    className="w-8 h-8 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    외주 업체 등록
                                </h1>
                                <p className="text-gray-600 mt-2">
                                    외주 업체 정보를 입력하고 관리자 승인을 받으세요
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 rounded-lg p-3">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>필수 항목은 <span className="text-red-500 font-semibold">*</span>로 표시되어 있습니다</span>
                        </div>
                    </div>
                </div>

                <OutsourceVendorForm mode="create" />
            </div>
        </div>
    );
}

