'use client';

import { UseFormReturn } from 'react-hook-form';
import { VendorFormInput } from '@/schemas/vendor.schema';
import { VendorCategory } from '@/types/vendor';
import { useEffect, useState } from 'react';

interface BasicInfoSectionProps {
    form: UseFormReturn<VendorFormInput>;
}

// 카카오 주소 API 타입 선언
declare global {
    interface Window {
        daum: any;
    }
}

export default function BasicInfoSection({ form }: BasicInfoSectionProps) {
    const {
        register,
        formState: { errors },
        watch,
        setValue,
    } = form;

    const tagline = watch('tagline') || '';
    const name = watch('name') || '';
    const outsourceCEO = watch('outsourceCEO') || '';
    const category = watch('category');
    const customCategory = watch('customCategory') || '';
    const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
    
    // serviceTypes를 문자열로 표시하기 위한 state
    const serviceTypesArray = watch('serviceTypes') as string[] | undefined;
    const [serviceTypesDisplay, setServiceTypesDisplay] = useState(
        Array.isArray(serviceTypesArray) ? serviceTypesArray.join(', ') : ''
    );
    const [isServiceTypesInputFocused, setIsServiceTypesInputFocused] = useState(false);
    
    // serviceTypes가 변경될 때 display 값 업데이트 (입력 중이 아닐 때만)
    useEffect(() => {
        if (!isServiceTypesInputFocused && Array.isArray(serviceTypesArray)) {
            setServiceTypesDisplay(serviceTypesArray.join(', '));
        } else if (!isServiceTypesInputFocused && !serviceTypesArray) {
            setServiceTypesDisplay('');
        }
    }, [serviceTypesArray, isServiceTypesInputFocused]);

    // 카카오 주소 API 스크립트 로드
    useEffect(() => {
        if (window.daum) {
            setIsKakaoLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
        script.async = true;
        script.onload = () => setIsKakaoLoaded(true);
        script.onerror = () => console.error('카카오 주소 API 로드 실패');
        document.head.appendChild(script);
    }, []);

    // 주소 검색 팝업 열기
    const handleAddressSearch = () => {
        if (!isKakaoLoaded || !window.daum) {
            alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        new window.daum.Postcode({
            oncomplete: function (data: any) {
                // 도로명 주소 또는 지번 주소 선택 (전체 주소 사용)
                const address = data.roadAddress || data.jibunAddress;
                // 상세주소가 있으면 추가
                const fullAddress = address + (data.buildingName ? ` ${data.buildingName}` : '');

                setValue('region', fullAddress, { shouldValidate: true });
            },
        }).open();
    };

    // 커스텀 분야 입력 시 공백을 제외한 특수문자만 제거 (한글, 영문, 숫자, 공백 허용)
    const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // 한글, 영문, 숫자, 공백만 남기고 특수문자는 제거
        const sanitized = value.replace(/[^가-힣a-zA-Z0-9\s]/g, '');
        setValue('customCategory', sanitized, { shouldValidate: true });
    };

    return (
        <div className="space-y-6">
            {/* 업체명 */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    업체명 / 브랜드명 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        {...register('name')}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="예: 코드몽키랩"
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <p className="text-sm text-red-500 font-medium">{errors.name?.message}</p>
                    <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{name.length}/50</p>
                </div>
            </div>

            {/* 대표자명 */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    대표자명 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        {...register('outsourceCEO')}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="예: 홍길동"
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <p className="text-sm text-red-500 font-medium">{errors.outsourceCEO?.message}</p>
                    <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{outsourceCEO.length}/30</p>
                </div>
            </div>

            {/* 한 줄 소개 */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    한 줄 소개 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        {...register('tagline')}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="예: 스타트업 특화 웹/앱 개발 전문 팀"
                    />
                </div>
                <div className="flex justify-between mt-2">
                    <p className="text-sm text-red-500 font-medium">{errors.tagline?.message}</p>
                    <p className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tagline.length}/80</p>
                </div>
            </div>

            {/* 분야 (대분류) */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    분야 (대분류) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                    </div>
                    <select
                        {...register('category')}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white appearance-none cursor-pointer"
                    >
                        <option value="">선택해주세요</option>
                        <option value={VendorCategory.DEVELOPMENT}>💻 개발</option>
                        <option value={VendorCategory.DESIGN}>🎨 디자인</option>
                        <option value={VendorCategory.MARKETING}>📢 마케팅</option>
                        <option value={VendorCategory.VIDEO}>🎬 영상</option>
                        <option value={VendorCategory.CONSULTING}>💼 컨설팅</option>
                        <option value={VendorCategory.OTHER}>📦 기타</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
                <p className="text-sm text-red-500 font-medium mt-2">{errors.category?.message}</p>
            </div>

            {/* 커스텀 분야명 (기타 선택 시에만 표시) */}
            {category === VendorCategory.OTHER && (
                <div className="ml-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <label className="text-sm font-semibold text-gray-700">
                            기타 분야명 입력 <span className="text-red-500">*</span>
                        </label>
                    </div>
                    <input
                        type="text"
                        value={customCategory}
                        onChange={handleCustomCategoryChange}
                        className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                        placeholder="예: 인테리어, 교육, 법률"
                    />
                    <div className="flex justify-between mt-2">
                        <p className="text-sm text-red-500 font-medium">{errors.customCategory?.message}</p>
                        <p className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">{customCategory.length}/20</p>
                    </div>
                    <p className="text-xs text-blue-700 mt-3 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        한글, 영문, 숫자, 공백만 입력 가능 (특수문자 자동 제거)
                    </p>
                </div>
            )}

            {/* 세부 서비스 타입 */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    세부 서비스 타입 (최대 5개)
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        value={serviceTypesDisplay}
                        onFocus={() => setIsServiceTypesInputFocused(true)}
                        onBlur={() => setIsServiceTypesInputFocused(false)}
                        onChange={(e) => {
                            const value = e.target.value;
                            setServiceTypesDisplay(value);

                            if (value.trim() === '') {
                                setValue('serviceTypes', undefined, { shouldValidate: true });
                            } else {
                                const serviceTypesArray = value
                                    .split(',')
                                    .map((item: string) => item.trim())
                                    .filter((item: string) => item.length > 0)
                                    .slice(0, 5);
                                setValue('serviceTypes', serviceTypesArray, { shouldValidate: true });
                            }
                        }}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="쉼표(,)로 구분하여 입력 (예: 웹사이트 제작, 관리자 페이지, 랜딩 페이지)"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1">
                    각 항목은 2~30자, 최대 5개까지 입력 가능합니다.
                </p>
                {errors.serviceTypes && (
                    <p className="text-sm text-red-500 font-medium mt-1">{errors.serviceTypes.message?.toString()}</p>
                )}
            </div>

            {/* 소개 상세 설명 */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    소개 상세 설명
                </label>
                <textarea
                    {...register('description')}
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white resize-none"
                    placeholder="업체에 대한 상세한 소개를 작성해주세요..."
                />
                <p className="text-xs text-gray-500 mt-2 text-right bg-gray-100 px-2 py-0.5 rounded-full inline-block float-right">
                    {watch('description')?.length || 0}/2000
                </p>
            </div>

            {/* 지역 (카카오 주소 API) */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">지역</label>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            {...register('region')}
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-100 cursor-pointer"
                            placeholder="주소 찾기 버튼을 클릭하세요"
                            readOnly
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleAddressSearch}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-md hover:shadow-lg whitespace-nowrap"
                    >
                        🔍 주소 찾기
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1">
                    카카오 주소 검색을 통해 정확한 지역을 선택할 수 있습니다.
                </p>
            </div>

            {/* 웹사이트 URL */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">웹사이트 URL</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                    </div>
                    <input
                        type="url"
                        {...register('websiteUrl')}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="https://example.com"
                    />
                </div>
                <p className="text-sm text-red-500 font-medium mt-2">
                    {errors.websiteUrl?.message}
                </p>
            </div>

            {/* 대표 포트폴리오 URL */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    대표 포트폴리오 URL
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <input
                        type="url"
                        {...register('mainPortfolioUrl')}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="https://notion.so/..."
                    />
                </div>
                <p className="text-sm text-red-500 font-medium mt-2">
                    {errors.mainPortfolioUrl?.message}
                </p>
            </div>

            {/* 연락 이메일 */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    연락 이메일 <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <input
                        type="email"
                        {...register('contactEmail')}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="hello@example.com"
                    />
                </div>
                <p className="text-sm text-red-500 font-medium mt-2">
                    {errors.contactEmail?.message}
                </p>
            </div>

            {/* 연락 채널 */}
            <div className="group">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    연락 전화/카카오 등
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        {...register('contactChannel')}
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                        placeholder="예: 카카오톡 채널 @example"
                    />
                </div>
                <p className="text-xs text-gray-500 mt-2 ml-1 flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    개인정보 과노출에 유의해주세요.
                </p>
            </div>

            {/* 공개 여부 */}
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
                <input
                    type="checkbox"
                    {...register('isPublic')}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                    id="isPublic"
                />
                <label htmlFor="isPublic" className="text-sm font-semibold text-gray-700 cursor-pointer flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    프로필 공개
                </label>
            </div>
        </div>
    );
}
