import Link from 'next/link';
import { VendorListItem, AvgBudgetRange } from '@/types/vendor';
import GovSupportBadge from './GovSupportBadge';
import TeamSummaryInline from './TeamSummaryInline';

interface VendorCardProps {
    vendor: VendorListItem;
}

// 예산 구간 한글 변환
const getBudgetRangeLabel = (range?: AvgBudgetRange): string => {
    if (!range) return '';
    const labels: Record<AvgBudgetRange, string> = {
        [AvgBudgetRange.RANGE_0_1]: '~100만원',
        [AvgBudgetRange.RANGE_1_3]: '100~300만원',
        [AvgBudgetRange.RANGE_3_5]: '300~500만원',
        [AvgBudgetRange.RANGE_5_10]: '500~1000만원',
        [AvgBudgetRange.RANGE_10_UP]: '1000만원+',
    };
    return labels[range] || '';
};

// 분야 한글 변환
const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
        DEVELOPMENT: '개발',
        DESIGN: '디자인',
        MARKETING: '마케팅',
        VIDEO: '영상',
        CONSULTING: '컨설팅',
    };
    return labels[category] || category;
};

export default function VendorCard({ vendor }: VendorCardProps) {
    return (
        <Link href={`/outsource-mentor/${encodeURIComponent(vendor.name)}`}>
            <div className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
                {/* 헤더: 업체명 + 분야 */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {vendor.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {getCategoryLabel(vendor.category)}
                        </p>
                    </div>
                    {/* 공개 여부 표시 */}
                    {!vendor.isPublic && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            비공개
                        </span>
                    )}
                </div>

                {/* 한 줄 소개 */}
                <p className="text-gray-700 mb-4 line-clamp-2">{vendor.tagline}</p>

                {/* 기술스택 (개발 분야만) */}
                {vendor.techStackSummary && vendor.techStackSummary.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {vendor.techStackSummary.slice(0, 5).map((tech, index) => (
                            <span
                                key={index}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium"
                            >
                                {tech}
                            </span>
                        ))}
                        {vendor.techStackSummary.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                +{vendor.techStackSummary.length - 5}
                            </span>
                        )}
                    </div>
                )}

                {/* 팀 구성 요약 */}
                {vendor.team && vendor.team.total > 0 && (
                    <div className="mb-4">
                        <TeamSummaryInline team={vendor.team} compact={true} />
                    </div>
                )}

                {/* 하단: 배지 + 예산 */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        {/* 정부지원사업 배지 */}
                        <GovSupportBadge hasSupport={vendor.hasGovSupport} compact={true} />

                        {/* 지역 표시 */}
                        {vendor.region && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                📍 {vendor.region}
                            </span>
                        )}
                    </div>

                    {/* 예산 구간 */}
                    {vendor.avgBudgetRange && (
                        <span className="text-sm font-medium text-gray-700">
                            {getBudgetRangeLabel(vendor.avgBudgetRange)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
