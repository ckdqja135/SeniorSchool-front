/**
 * 정보 패널이 공용으로 쓰는 작은 조각들.
 *
 * - `PanelListHeader` · `RankBadge`: '핫플' · '후기' 탭
 * - `Thumb` · `RatingLine`: 목록 행(`RestaurantPanel`)과 상세(`RestaurantDetailPanel`) 양쪽
 */
'use client';

import { useState } from 'react';
import type { ExploreRestaurant } from '@/types/MatzalAl/explore';
import { CategoryIcon } from './categoryIcons';

/** 목록 제목 + 새로고침 버튼 */
export function PanelListHeader({ title, refreshing, onRefresh }: { title: string; refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
        className="flex min-h-[32px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
      >
        <svg className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {refreshing ? '갱신 중…' : '새로고침'}
      </button>
    </div>
  );
}

/** 식당 평점 한 줄. 평점이 없으면 숫자를 지어내지 않고 없다고만 알린다 */
export function RatingLine({ r }: { r: ExploreRestaurant }) {
  if (r.averageRating === null) {
    return <span className="text-sm text-gray-500">아직 평점이 없어요</span>;
  }
  return (
    <span className="flex items-center gap-1 text-sm">
      <span className="font-bold text-amber-500">★ {r.averageRating.toFixed(1)}</span>
      <span className="text-gray-500">({r.ratingCount.toLocaleString()})</span>
    </span>
  );
}

/** 식당 썸네일. 이미지가 없거나 깨지면 업종 아이콘으로 대체한다 */
export function Thumb({ r, size }: { r: ExploreRestaurant; size: 'lg' | 'sm' }) {
  const [broken, setBroken] = useState(false);
  const cls = size === 'lg' ? 'h-24 w-24 rounded-2xl' : 'h-11 w-11 rounded-xl';
  if (r.imageUrl && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={r.imageUrl} alt="" className={`${cls} shrink-0 object-cover`} onError={() => setBroken(true)} />;
  }
  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 text-rose-400`}
      aria-hidden
    >
      <CategoryIcon cuisine={r.cuisine} className={size === 'lg' ? 'h-9 w-9' : 'h-5 w-5'} />
    </div>
  );
}

/** 순위 배지. 1~3위는 강조색 */
export function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
        rank <= 3 ? 'bg-rose-600' : 'bg-gray-400'
      }`}
      aria-label={`${rank}위`}
    >
      {rank}
    </span>
  );
}
