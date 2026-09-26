/**
 * 지도 위 식당 핀 (카카오 오버레이 · 시뮬레이션 공용).
 *
 * 구조: 버튼 박스 = 물방울 아이콘만(고정 크기). 라벨은 아이콘 오른쪽에 absolute 로 붙여
 * 렌더러가 항상 '아이콘 아래 꼭짓점 = 좌표' 로 앵커링할 수 있게 한다.
 * (카카오 CustomOverlay xAnchor 0.5 / yAnchor 1, 시뮬레이션 translate(-50%, -100%))
 *
 * - 일반 핀: 흰 물방울 + 반투명 라벨(지도 위 가독성)
 * - 선택 핀: 코랄·로즈 물방울을 키우고 라벨을 진하게 강조
 * - 축소 레벨(compact): 라벨은 호버·키보드 포커스 시에만 표시 (선택 핀은 항상 라벨 표시)
 */
'use client';

import { memo } from 'react';
import type { ExploreRestaurant } from '@/types/MatzalAl/explore';
import { CategoryIcon } from './categoryIcons';

export interface RestaurantPinProps {
  restaurant: ExploreRestaurant;
  selected: boolean;
  compact?: boolean;
  distanceLabel: string | null;
  saved?: boolean;
  /** 선택 핀 위에 띄우는 작은 배지 (예: '저장한 식당', '예약한 식당 · 체험') */
  badge?: string | null;
  onSelect: (id: string) => void;
}

function RestaurantPinBase({
  restaurant,
  selected,
  compact = false,
  distanceLabel,
  saved = false,
  badge,
  onSelect,
}: RestaurantPinProps) {
  // compact 면 라벨을 숨기되 호버/포커스에서 드러낸다 (group-hover). 선택 핀은 항상 표시
  const labelVisibility = selected || !compact ? 'flex' : 'hidden group-hover:flex group-focus-visible:flex';
  const typeShort = restaurant.cuisine === '기타' ? restaurant.typeLabel.slice(0, 8) : restaurant.cuisine;
  const metaParts = [typeShort, distanceLabel].filter(Boolean);
  const ratingText = restaurant.averageRating !== null ? restaurant.averageRating.toFixed(1) : null;

  const ariaLabel = [
    restaurant.name,
    restaurant.typeLabel,
    distanceLabel ? `거리 ${distanceLabel}` : null,
    ratingText ? `평점 ${ratingText}` : '평점 없음',
    saved ? '저장됨' : null,
    selected ? '선택됨' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={selected}
      data-restaurant-id={restaurant.id}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(restaurant.id);
      }}
      className={`group relative block overflow-visible rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-300 ${
        selected ? 'z-30 h-14 w-12' : 'z-10 h-12 w-10 hover:z-20'
      }`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* 물방울 아이콘 */}
      <span
        className={`absolute left-1/2 top-0 flex -translate-x-1/2 items-center justify-center rounded-full shadow-md transition-transform duration-200 motion-reduce:transition-none ${
          selected
            ? 'h-12 w-12 bg-rose-600 text-white ring-4 ring-rose-200/80'
            : 'h-10 w-10 bg-white text-rose-500 ring-2 ring-white hover:scale-105'
        }`}
      >
        <CategoryIcon cuisine={restaurant.cuisine} className={selected ? 'h-6 w-6' : 'h-5 w-5'} />
      </span>
      {/* 아래 꼭짓점 */}
      <span
        className={`absolute left-1/2 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent ${
          selected ? 'top-[44px] border-t-rose-600' : 'top-[36px] border-t-white'
        }`}
        aria-hidden
      />
      {/* 저장 표시 점 */}
      {saved && (
        <span
          className="absolute -right-0.5 top-0 h-3 w-3 rounded-full border-2 border-white bg-amber-400"
          aria-hidden
        />
      )}

      {/* 라벨 — data-pin-label: 렌더러가 겹침 회피로 라벨만 숨길 때 쓰는 훅 */}
      {(
        <span
          data-pin-label
          className={`absolute left-full top-0 ml-1.5 ${labelVisibility} flex-col items-start rounded-xl px-2 py-1 text-left leading-tight shadow-sm ${
            selected
              ? 'border border-rose-300 bg-white/95 text-rose-700'
              : 'border border-white/60 bg-white/95 text-gray-800'
          }`}
          style={{ whiteSpace: 'nowrap' }}
        >
          {badge && (
            <span className="mb-0.5 rounded-full bg-rose-100 px-1.5 py-px text-[10px] font-semibold text-rose-700">
              {badge}
            </span>
          )}
          <span className={`font-bold ${selected ? 'text-[14px]' : 'text-[13px]'}`}>{restaurant.name}</span>
          {metaParts.length > 0 && (
            <span className={`text-[11px] ${selected ? 'text-rose-600/80' : 'text-gray-600'}`}>
              {metaParts.join(' · ')}
            </span>
          )}
          {ratingText && (
            <span className="text-[11px] font-semibold text-amber-600">★ {ratingText}</span>
          )}
        </span>
      )}
    </button>
  );
}

export const RestaurantPin = memo(RestaurantPinBase);
