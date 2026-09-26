/**
 * 정보 패널 '후기' 탭: 인기 후기 TOP 10 (조회수 순).
 *
 * - 예전에 지도 아래 별도 카드로 있던 '인기 후기 TOP 10' 섹션을 지도 안 패널로 옮긴 것.
 * - 행을 누르면 후기 상세(/matzal-al-board/{boardIdx})로 이동한다 (기존 규칙 그대로).
 * - 오른쪽 핀 버튼은 후기의 식당 위치로 지도를 옮긴다. 위치를 모르는 식당이면 셸이 안내 토스트를 띄운다.
 */
'use client';

import Link from 'next/link';
import { Skeleton, SkeletonCircle } from '@/components/common/Skeleton';
import type { PopularReview } from '@/types/MatzalAl/explore';
import { PanelListHeader, RankBadge } from './panelListParts';

export interface PopularReviewListProps {
  items: PopularReview[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  /** 후기의 식당 위치로 지도 이동. 위치를 모르면 false 를 돌려주고 호출부가 안내한다 */
  canLocate: (restaurantIdx: string) => boolean;
  onLocate: (restaurantIdx: string) => void;
}

export function PopularReviewList({ items, loading, refreshing, onRefresh, canLocate, onLocate }: PopularReviewListProps) {
  return (
    <div>
      <PanelListHeader title="인기 후기 TOP 10" refreshing={refreshing} onRefresh={onRefresh} />

      {loading && (
        <ul className="space-y-2" aria-label="불러오는 중">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3 py-1">
              <SkeletonCircle className="h-6 w-6" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && items.length === 0 && (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-600">아직 등록된 맛잘알 후기가 없어요.</p>
      )}

      {!loading && items.length > 0 && (
        <ol className={`divide-y divide-gray-100 ${refreshing ? 'animate-pulse' : ''}`}>
          {items.map((b, index) => {
            const locatable = b.restaurantIdx !== null && canLocate(b.restaurantIdx);
            return (
              <li key={b.boardIdx} className="flex items-center gap-1">
                <Link
                  href={`/matzal-al-board/${b.boardIdx}`}
                  className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-2 text-left hover:bg-gray-50 focus:outline-none focus-visible:bg-rose-50"
                >
                  <RankBadge rank={index + 1} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">{b.title}</span>
                    <span className="block truncate text-xs text-gray-500">{b.restaurantName ?? '맛집명 없음'}</span>
                    <span className="block truncate text-[11px] text-gray-400">
                      좋아요 {b.likeCount.toLocaleString()} · 조회 {b.hitCount.toLocaleString()}
                    </span>
                  </span>
                </Link>
                {b.restaurantIdx !== null && (
                  <button
                    type="button"
                    onClick={() => onLocate(b.restaurantIdx as string)}
                    aria-label={`${b.restaurantName ?? '식당'} 위치 지도에서 보기`}
                    title={locatable ? '지도에서 보기' : '위치 정보가 없는 식당이에요'}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                      locatable ? 'text-rose-500 hover:bg-rose-50' : 'text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
