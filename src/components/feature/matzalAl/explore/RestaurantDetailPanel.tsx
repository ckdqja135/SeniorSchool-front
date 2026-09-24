/**
 * 선택된 식당의 상세 내용.
 *
 * - 데스크톱: 셸이 목록 패널 오른쪽에 `RestaurantDetailPanel` 로 따로 띄운다. 목록이 사라지지 않아
 *   여러 곳을 비교하며 고를 수 있다.
 * - 모바일: `RestaurantPanel` 본문 안에서 목록 대신 `RestaurantDetailContent` 가 렌더된다 (기존 동작 그대로).
 *
 * 두 경우의 내용은 완전히 같다. 감싸는 껍데기만 다르다.
 */
'use client';

import Link from 'next/link';
import { buildRestaurantDetailHref } from '@/lib/matzalAl/exploreAdapter';
import type { ExploreCategory, ExploreRestaurant } from '@/types/MatzalAl/explore';
import { RatingLine, Thumb } from './panelListParts';

export interface RestaurantDetailContentProps {
  restaurant: ExploreRestaurant;
  /** 선택된 식당이 현재 필터(카테고리·검색어 등)에서 제외된 상태 */
  isFilteredOut: boolean;
  category: ExploreCategory;
  hasQuery: boolean;
  onResetFilters: () => void;
  distanceFor: (r: ExploreRestaurant) => string | null;
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  /**
   * 폭이 좁은 PC 상세 패널(340px)용. 이름을 썸네일 옆이 아니라 위쪽 전체 폭에 한 줄로 놓는다.
   * 모바일 하단 시트는 폭이 넉넉해 기존 배치를 그대로 쓴다.
   */
  narrow?: boolean;
}

export function RestaurantDetailContent({
  restaurant,
  isFilteredOut,
  category,
  hasQuery,
  onResetFilters,
  distanceFor,
  isSaved,
  onToggleSave,
  narrow = false,
}: RestaurantDetailContentProps) {
  const detailHref = buildRestaurantDetailHref(restaurant);
  const saved = isSaved(restaurant.id);

  const saveButton = (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? '저장 취소 (내 기기에 저장됨)' : '내 기기에 저장'}
      title={saved ? '저장됨 · 내 기기에만 보관' : '내 기기에 저장'}
      onClick={() => onToggleSave(restaurant.id)}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
        saved ? 'bg-rose-50 text-rose-600' : 'text-gray-500 hover:bg-gray-100'
      }`}
    >
      <svg className="h-5 w-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  );

  return (
    <div>
      {isFilteredOut && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span>
            현재 {hasQuery ? '검색어' : `'${category}'`} 조건에는 포함되지 않는 식당이에요.
          </span>
          <button type="button" onClick={onResetFilters} className="shrink-0 font-semibold underline">
            조건 해제
          </button>
        </div>
      )}

      {/* 헤더: 사진 · 이름 · 업종 · 평점 · 거리 · 저장 */}
      {narrow ? (
        <>
          {/* 이름은 패널 전체 폭을 써서 한 줄로. 그래도 넘치면 말줄임 (title 에 전체 이름) */}
          <div className="flex items-start gap-2">
            <h3
              className="min-w-0 flex-1 truncate text-lg font-bold leading-tight text-gray-900"
              title={restaurant.name}
            >
              {restaurant.name}
            </h3>
            {saveButton}
          </div>
          <div className="mt-2 flex gap-3">
            <Thumb r={restaurant} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-600">{restaurant.typeLabel}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingLine r={restaurant} />
                {distanceFor(restaurant) && (
                  <span className="text-sm text-gray-500">{distanceFor(restaurant)}</span>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex gap-3">
          <Thumb r={restaurant} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="min-w-0 flex-1 text-lg font-bold leading-tight text-gray-900">
                {restaurant.name}
              </h3>
              {saveButton}
            </div>
            <p className="mt-0.5 text-sm text-gray-600">{restaurant.typeLabel}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <RatingLine r={restaurant} />
              {distanceFor(restaurant) && (
                <span className="text-sm text-gray-500">{distanceFor(restaurant)}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {restaurant.addr && <p className="mt-3 text-xs text-gray-500">{restaurant.addr}</p>}

      {/* 예약 · 웨이팅: 백엔드 연동 전까지 안내만 */}
      <p className="mt-4 rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">
        예약 · 웨이팅은 연동 준비 중이에요. 지금은 후기와 식당 정보를 제공해요.
      </p>

      {/* 대표 메뉴 */}
      <div className="mt-4">
        <h4 className="mb-1.5 text-sm font-bold text-gray-900">대표 메뉴</h4>
        {restaurant.menu.length > 0 ? (
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {restaurant.menu.slice(0, 4).map((m, i) => (
              <li key={`${m.name}-${i}`} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate text-gray-800">{m.name}</span>
                <span className="ml-3 shrink-0 text-gray-600">
                  {m.price !== null ? `${m.price.toLocaleString()}원` : '가격 미등록'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">등록된 메뉴 정보가 없어요.</p>
        )}
      </div>

      {/* 후기 · 상세 진입 (기존 상세 페이지 규칙 재사용) */}
      <div className="mt-4">
        {detailHref ? (
          <Link
            href={detailHref}
            className="flex min-h-[48px] items-center justify-center rounded-full bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            후기 보기 · 상세 정보
            {restaurant.ratingCount > 0 && <span className="ml-1 font-normal opacity-90">({restaurant.ratingCount})</span>}
          </Link>
        ) : (
          <p className="rounded-full bg-gray-100 px-4 py-3 text-center text-xs text-gray-500">
            체험용 식당이라 상세 페이지가 없어요. 지도 모드에서 실제 식당을 둘러보세요.
          </p>
        )}
      </div>
    </div>
  );
}

export interface RestaurantDetailPanelProps extends RestaurantDetailContentProps {
  onClose: () => void;
  /** 지도를 드래그하는 동안 잠깐 비춰준다 */
  translucent?: boolean;
  /** 셸이 계산한 위치(목록 패널 오른쪽). 데스크톱에서만 쓰인다 */
  style?: React.CSSProperties;
}

/** 데스크톱 전용 껍데기. 목록 패널과 나란히 서는 독립 패널 */
export function RestaurantDetailPanel({ onClose, translucent = false, style, ...content }: RestaurantDetailPanelProps) {
  return (
    <aside
      role="region"
      aria-label={`${content.restaurant.name} 정보`}
      data-map-overlay
      className="absolute z-40 flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_16px_40px_-14px_rgba(0,0,0,0.35)]"
      // 투명도는 인라인으로 준다 — 유틸리티 클래스로 주면 셸의 위치 style 과 섞이며 적용이 어긋난다
      style={{ ...style, opacity: translucent ? 0.3 : 1, transition: 'opacity 150ms linear' }}
    >
      <div className="flex shrink-0 justify-end px-2 pt-2">
        <button
          type="button"
          aria-label="선택 해제"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5">
        <RestaurantDetailContent {...content} narrow />
      </div>
    </aside>
  );
}
