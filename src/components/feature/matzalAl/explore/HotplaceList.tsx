/**
 * 정보 패널 '핫플' 탭: 지역별 핫플레이스 TOP 10.
 *
 * - 예전에 지도 아래 별도 카드로 있던 '지역별 핫플레이스' 섹션을 지도 안 패널로 옮긴 것.
 * - 지역 칩(전국 + 식당 수 상위 도시)으로 거르고, 전국은 조회수순 · 도시는 평점 → 후기 수 → 조회수 순.
 * - 항목을 누르면 셸이 지도를 그 식당 위치로 옮기고 핀을 선택한다 (좌표가 없으면 상세 페이지로).
 */
'use client';

import { useMemo } from 'react';
import { Skeleton, SkeletonCircle } from '@/components/common/Skeleton';
import type { HotplaceRestaurant } from '@/types/MatzalAl/explore';
import { PanelListHeader, RankBadge } from './panelListParts';

export interface HotplaceListProps {
  items: HotplaceRestaurant[];
  /** 지역 칩에 보여줄 도시명 (전국 제외). 셸/페이지가 식당 수 상위로 골라 준다 */
  cities: string[];
  city: string;
  onCityChange: (city: string) => void;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelect: (item: HotplaceRestaurant) => void;
  /** 현재 지도에서 선택된 식당 idx (목록에서 강조) */
  selectedRestaurantIdx: string | null;
}

/** '서울특별시' → '서울', '경기도' → '경기' 처럼 칩에 쓰는 짧은 이름 */
function shortCityName(city: string): string {
  return city.replace(/특별시|광역시|특별자치시|특별자치도/, '').replace(/도$|시$/, '') || city;
}

export function HotplaceList({
  items,
  cities,
  city,
  onCityChange,
  loading,
  refreshing,
  onRefresh,
  onSelect,
  selectedRestaurantIdx,
}: HotplaceListProps) {
  const list = useMemo(() => {
    if (city === '전국') {
      return [...items].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10);
    }
    const base = shortCityName(city);
    return items
      .filter((r) => r.addr.includes(city) || (base && r.addr.includes(base)))
      .sort(
        (a, b) =>
          (b.averageRating ?? 0) - (a.averageRating ?? 0) || b.ratingCount - a.ratingCount || b.viewCount - a.viewCount,
      )
      .slice(0, 10);
  }, [items, city]);

  return (
    <div>
      <PanelListHeader title="지역별 핫플레이스" refreshing={refreshing} onRefresh={onRefresh} />

      {/* 지역 칩 */}
      <div role="radiogroup" aria-label="핫플레이스 지역" className="mb-2 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {['전국', ...cities].map((c) => {
          const active = city === c;
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onCityChange(c)}
              className={`min-h-[32px] shrink-0 rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {c === '전국' ? '전국' : shortCityName(c)}
            </button>
          );
        })}
      </div>

      {loading && (
        <ul className="space-y-2" aria-label="불러오는 중">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3 py-1">
              <SkeletonCircle className="h-6 w-6" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && list.length === 0 && (
        <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-600">해당 지역에 등록된 식당이 없어요.</p>
      )}

      {!loading && list.length > 0 && (
        <ol className={`divide-y divide-gray-100 ${refreshing ? 'animate-pulse' : ''}`}>
          {list.map((r, index) => {
            const active = selectedRestaurantIdx === r.restaurantIdx;
            return (
              <li key={r.restaurantIdx}>
                <button
                  type="button"
                  onClick={() => onSelect(r)}
                  aria-current={active ? 'true' : undefined}
                  title={r.coord ? '지도에서 보기' : '상세 페이지로 이동'}
                  className={`flex min-h-[56px] w-full items-center gap-2.5 rounded-xl px-1 py-2 text-left focus:outline-none focus-visible:bg-rose-50 ${
                    active ? 'bg-rose-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <RankBadge rank={index + 1} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-900">{r.name}</span>
                    <span className="block truncate text-xs text-gray-500">{r.addr || '주소 정보 없음'}</span>
                    <span className="block truncate text-[11px] text-gray-400">
                      {r.typeLabel} · 조회 {r.viewCount.toLocaleString()}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    {r.averageRating !== null ? (
                      <span className="font-bold text-amber-500">
                        ★ {r.averageRating.toFixed(1)}
                        <span className="ml-0.5 font-normal text-gray-400">({r.ratingCount})</span>
                      </span>
                    ) : (
                      <span className="whitespace-nowrap text-gray-400">평점 없음</span>
                    )}
                    {r.coord && (
                      <svg className="h-4 w-4 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
