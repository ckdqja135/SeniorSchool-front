'use client';

import { UseFormReturn } from 'react-hook-form';
import { VendorFormInput } from '@/schemas/vendor.schema';
import { VendorCategory } from '@/types/vendor';

interface BasicInfoSectionProps {
    form: UseFormReturn<VendorFormInput>;
}

export default function BasicInfoSection({ form }: BasicInfoSectionProps) {
    const {
        register,
        formState: { errors },
        watch,
    } = form;

    const tagline = watch('tagline') || '';
    const name = watch('name') || '';

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
                </select>
                <p className="text-sm text-red-500 mt-1">{errors.category?.message}</p>
            </div>

            {/* 세부 서비스 타입 */}
            <div>
                <label className="block text-sm font-medium mb-2">
                    세부 서비스 타입 (최대 5개)
                </label>
                <input
                    type="text"
                    {...register('serviceTypes')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="쉼표(,)로 구분하여 입력 (예: 웹사이트 제작, 관리자 페이지, 랜딩 페이지)"
                />
                <p className="text-sm text-gray-500 mt-1">
                    각 항목은 2~30자, 최대 5개까지 입력 가능합니다.
                </p>
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

            {/* 지역 */}
            <div>
                <label className="block text-sm font-medium mb-2">지역</label>
                <input
                    type="text"
                    {...register('region')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="예: 서울 강남, 부산 해운대"
                />
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
