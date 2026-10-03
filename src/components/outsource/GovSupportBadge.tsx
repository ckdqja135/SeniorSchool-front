import { VendorListItem } from '@/types/vendor';

interface GovSupportBadgeProps {
    hasSupport: boolean;
    totalCount?: number;
    compact?: boolean;
}

export default function GovSupportBadge({
    hasSupport,
    totalCount,
    compact = false,
}: GovSupportBadgeProps) {
    if (!hasSupport) return null;

    return (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium">
            <span className="text-sm">🏛️</span>
            {compact ? (
                <span>정부사업</span>
            ) : (
                <span>정부지원사업 수행</span>
            )}
            {totalCount && totalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-green-200 rounded-full text-xs">
                    {totalCount}회
                </span>
            )}
        </div>
    );
}
