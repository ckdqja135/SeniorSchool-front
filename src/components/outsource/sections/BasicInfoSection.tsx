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
            <h2 className="text-2xl font-bold">기본 정보</h2>

            {/* 업체명 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    업체명 / 브랜드명 <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    {...register('name')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 코드몽키랩"
                />
                <div className="flex justify-between mt-1">
                    <p className="text-sm text-red-500">{errors.name?.message}</p>
                    <p className="text-sm text-gray-500">{name.length}/50</p>
                </div>
            </div>

            {/* 대표자명 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    대표자명 <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    {...register('outsourceCEO')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 홍길동"
                />
                <div className="flex justify-between mt-1">
                    <p className="text-sm text-red-500">{errors.outsourceCEO?.message}</p>
                    <p className="text-sm text-gray-500">{outsourceCEO.length}/30</p>
                </div>
            </div>

            {/* 한 줄 소개 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    한 줄 소개 <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    {...register('tagline')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 스타트업 특화 웹/앱 개발 전문 팀"
                />
                <div className="flex justify-between mt-1">
                    <p className="text-sm text-red-500">{errors.tagline?.message}</p>
                    <p className="text-sm text-gray-500">{tagline.length}/80</p>
                </div>
            </div>

            {/* 분야 (대분류) */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    분야 (대분류) <span className="text-red-500">*</span>
                </label>
                <select
                    {...register('category')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">선택해주세요</option>
                    <option value={VendorCategory.DEVELOPMENT}>개발</option>
                    <option value={VendorCategory.DESIGN}>디자인</option>
                    <option value={VendorCategory.MARKETING}>마케팅</option>
                    <option value={VendorCategory.VIDEO}>영상</option>
                    <option value={VendorCategory.CONSULTING}>컨설팅</option>
                    <option value={VendorCategory.OTHER}>기타</option>
                </select>
                <p className="text-sm text-red-500 mt-1">{errors.category?.message}</p>
            </div>

            {/* 커스텀 분야명 (기타 선택 시에만 표시) */}
            {category === VendorCategory.OTHER && (
                <div className="ml-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <label className="block text-sm font-medium mb-2">
                        기타 분야명 입력 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={customCategory}
                        onChange={handleCustomCategoryChange}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="예: 인테리어, 교육, 법률 (한글만 입력 가능)"
                    />
                    <div className="flex justify-between mt-1">
                        <p className="text-sm text-red-500">{errors.customCategory?.message}</p>
                        <p className="text-sm text-gray-500">{customCategory.length}/20</p>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                        ⓘ 공백을 제외한 특수문자는 자동으로 제거됩니다. 한글, 영문, 숫자, 공백만 입력 가능합니다.
                    </p>
                </div>
            )}

            {/* 세부 서비스 타입 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    세부 서비스 타입 (최대 5개)
                </label>
                <input
                    type="text"
                    value={serviceTypesDisplay}
                    onFocus={() => setIsServiceTypesInputFocused(true)}
                    onBlur={() => setIsServiceTypesInputFocused(false)}
                    onChange={(e) => {
                        const value = e.target.value;
                        setServiceTypesDisplay(value);
                        
                        // 입력값을 배열로 변환하여 폼에 저장
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
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="쉼표(,)로 구분하여 입력 (예: 웹사이트 제작, 관리자 페이지, 랜딩 페이지)"
                />
                <p className="text-sm text-gray-500 mt-1">
                    각 항목은 2~30자, 최대 5개까지 입력 가능합니다.
                </p>
                {errors.serviceTypes && (
                    <p className="text-sm text-red-500 mt-1">{errors.serviceTypes.message?.toString()}</p>
                )}
            </div>

            {/* 소개 상세 설명 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    소개 상세 설명
                </label>
                <textarea
                    {...register('description')}
                    rows={6}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="업체에 대한 상세한 소개를 작성해주세요..."
                />
                <p className="text-sm text-gray-500 mt-1">
                    {watch('description')?.length || 0}/2000
                </p>
            </div>

            {/* 지역 (카카오 주소 API) */}
            <div>
                <label className="block text-sm font-medium mb-2">지역</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        {...register('region')}
                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                        placeholder="주소 찾기 버튼을 클릭하세요"
                        readOnly
                    />
                    <button
                        type="button"
                        onClick={handleAddressSearch}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        주소 찾기
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    카카오 주소 검색을 통해 정확한 지역을 선택할 수 있습니다.
                </p>
            </div>

            {/* 웹사이트 URL */}
            <div>
                <label className="block text-sm font-medium mb-2">웹사이트 URL</label>
                <input
                    type="url"
                    {...register('websiteUrl')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                />
                <p className="text-sm text-red-500 mt-1">
                    {errors.websiteUrl?.message}
                </p>
            </div>

            {/* 대표 포트폴리오 URL */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    대표 포트폴리오 URL
                </label>
                <input
                    type="url"
                    {...register('mainPortfolioUrl')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://notion.so/..."
                />
                <p className="text-sm text-red-500 mt-1">
                    {errors.mainPortfolioUrl?.message}
                </p>
            </div>

            {/* 연락 이메일 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    연락 이메일 <span className="text-red-500">*</span>
                </label>
                <input
                    type="email"
                    {...register('contactEmail')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="hello@example.com"
                />
                <p className="text-sm text-red-500 mt-1">
                    {errors.contactEmail?.message}
                </p>
            </div>

            {/* 연락 채널 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    연락 전화/카카오 등
                </label>
                <input
                    type="text"
                    {...register('contactChannel')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 카카오톡 채널 @example"
                />
                <p className="text-sm text-gray-500 mt-1">
                    개인정보 과노출에 유의해주세요.
                </p>
            </div>

            {/* 공개 여부 */}
            <div className="flex items-center gap-3">
                <input
                    type="checkbox"
                    {...register('isPublic')}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm font-medium">프로필 공개</label>
            </div>
        </div>
    );
}
