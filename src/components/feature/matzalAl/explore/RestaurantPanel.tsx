/**
 * 식당 정보 패널 (모바일: 하단 시트 / 데스크톱: 좌하단 도킹 카드).
 *
 * - 접힘 / 기본 / 펼침 3단계. 손잡이 드래그 외에 버튼(▲▼✕)과 키보드(↑ ↓ Esc)로도 조작 가능.
 * - 드래그는 손잡이 요소에서만 시작하므로 지도 드래그와 충돌하지 않는다.
 * - 선택된 식당이 없으면 목록 탭(주변 / 핫플 / 후기)을 보여준다. '주변' 은 현재 결과 목록(빈 결과·로딩·오류 상태 포함),
 *   '핫플' · '후기' 본문은 셸이 `tabContent` 로 넘긴다 (예전에 지도 아래 있던 두 섹션을 지도 안으로 옮긴 것).
 * - 예약·웨이팅은 아직 백엔드 연동이 없으므로 '연동 준비 중' 으로만 표시한다 (가짜 값을 보여주지 않는다).
 * - 자신의 크기를 `onSizeChange` 로 알려 셸이 카메라 보정용 가시 영역을 계산한다.
 */
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton, SkeletonCircle } from '@/components/common/Skeleton';
import { buildRestaurantDetailHref } from '@/lib/matzalAl/exploreAdapter';
import type { ExploreCategory, ExploreRestaurant, PanelState, PanelTab } from '@/types/MatzalAl/explore';
import { CategoryIcon } from './categoryIcons';

export type PanelListStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RestaurantPanelProps {
  restaurant: ExploreRestaurant | null;
  /** 선택된 식당이 현재 필터(카테고리·검색어 등)에서 제외된 상태 */
  isFilteredOut: boolean;
  category: ExploreCategory;
  onResetFilters: () => void;
  list: ExploreRestaurant[];
  listStatus: PanelListStatus;
  listError: string | null;
  onRetry: () => void;
  hasQuery: boolean;
  distanceFor: (r: ExploreRestaurant) => string | null;
  state: PanelState;
  onStateChange: (s: PanelState) => void;
  isDesktop: boolean;
  containerHeight: number;
  /** 상단 오버레이(지역·검색창·칩) 높이. 패널이 이 아래로만 펼쳐지게 한다 */
  topInset: number;
  reducedMotion: boolean;
  isSaved: (id: string) => boolean;
  onToggleSave: (id: string) => void;
  onSelect: (id: string | null) => void;
  onNotice: (message: string) => void;
  onSizeChange: (size: { width: number; height: number }) => void;
  /** 목록 탭 (선택된 식당이 없을 때만 보임) */
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  /** '핫플' · '후기' 탭 본문. 셸이 데이터와 함께 구성해서 넘긴다 */
  tabContent?: React.ReactNode;
}

const TAB_LABELS: Record<PanelTab, string> = { nearby: '주변', hot: '핫플', reviews: '후기' };
const TAB_ORDER: PanelTab[] = ['nearby', 'hot', 'reviews'];

const STATE_ORDER: PanelState[] = ['collapsed', 'default', 'expanded'];
const COLLAPSED_PX = 76;

/** 패널 상태별 높이(px). 상단 오버레이(검색창·칩) 아래로만 펼쳐지도록 컨테이너 높이에서 여유를 뺀다 */
export function panelHeightPx(state: PanelState, containerHeight: number, isDesktop: boolean, topInset: number): number {
  const topReserved = topInset + (isDesktop ? 24 : 8);
  const maxH = Math.max(220, containerHeight - topReserved);
  if (state === 'collapsed') return COLLAPSED_PX;
  if (state === 'expanded') return maxH;
  const def = isDesktop ? 440 : Math.max(280, Math.round(containerHeight * 0.46));
  return Math.min(def, maxH);
}

function nextState(state: PanelState, dir: 1 | -1): PanelState {
  const i = STATE_ORDER.indexOf(state);
  return STATE_ORDER[Math.min(STATE_ORDER.length - 1, Math.max(0, i + dir))];
}

function RatingLine({ r }: { r: ExploreRestaurant }) {
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

function Thumb({ r, size }: { r: ExploreRestaurant; size: 'lg' | 'sm' }) {
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

export function RestaurantPanel({
  restaurant,
  isFilteredOut,
  category,
  onResetFilters,
  list,
  listStatus,
  listError,
  onRetry,
  hasQuery,
  distanceFor,
  state,
  onStateChange,
  isDesktop,
  containerHeight,
  topInset,
  reducedMotion,
  isSaved,
  onToggleSave,
  onSelect,
  onNotice,
  onSizeChange,
  tab,
  onTabChange,
  tabContent,
}: RestaurantPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startH: number; pointerId: number } | null>(null);
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const heights = useMemo(
    () => ({
      collapsed: panelHeightPx('collapsed', containerHeight, isDesktop, topInset),
      default: panelHeightPx('default', containerHeight, isDesktop, topInset),
      expanded: panelHeightPx('expanded', containerHeight, isDesktop, topInset),
    }),
    [containerHeight, isDesktop, topInset],
  );
  const height = dragHeight ?? heights[state];

  // 크기 보고 (셸의 가시 영역 계산용)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const report = () => onSizeChange({ width: el.offsetWidth, height: el.offsetHeight });
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onSizeChange]);

  // 선택·탭이 바뀌면 본문 스크롤을 맨 위로
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [restaurant?.id, tab]);

  // ---- 손잡이 드래그 (손잡이에서만 시작 → 지도 드래그와 충돌 없음) ----
  const onHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragRef.current = { startY: e.clientY, startH: height, pointerId: e.pointerId };
    handleRef.current?.setPointerCapture(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const next = Math.min(heights.expanded, Math.max(heights.collapsed, d.startH - (e.clientY - d.startY)));
    setDragHeight(next);
  };
  const onHandlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    const moved = Math.abs(e.clientY - d.startY);
    if (moved < 6) {
      // 탭: 접힘 ↔ 기본 토글
      setDragHeight(null);
      onStateChange(state === 'collapsed' ? 'default' : 'collapsed');
      return;
    }
    const finalH = Math.min(heights.expanded, Math.max(heights.collapsed, d.startH - (e.clientY - d.startY)));
    // 가장 가까운 단계로 스냅
    const snapped = STATE_ORDER.reduce<PanelState>(
      (best, s) => (Math.abs(heights[s] - finalH) < Math.abs(heights[best] - finalH) ? s : best),
      'collapsed',
    );
    setDragHeight(null);
    onStateChange(snapped);
  };
  const onHandleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onStateChange(nextState(state, 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onStateChange(nextState(state, -1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (restaurant) onSelect(null);
      else onStateChange('collapsed');
    }
  };

  const transition = dragHeight !== null || reducedMotion ? 'none' : 'height 260ms cubic-bezier(0.2, 0.8, 0.2, 1)';
  const layoutClass = isDesktop
    ? 'left-4 bottom-4 w-[380px] max-w-[calc(100%-2rem)] rounded-3xl'
    : 'inset-x-0 bottom-0 rounded-t-3xl';

  const detailHref = restaurant ? buildRestaurantDetailHref(restaurant) : null;
  const saved = restaurant ? isSaved(restaurant.id) : false;

  // 접힘 상태 한 줄 요약
  const peekText = restaurant
    ? `${restaurant.name}${restaurant.averageRating !== null ? ` · ★ ${restaurant.averageRating.toFixed(1)}` : ''}`
    : tab === 'hot'
      ? '지역별 핫플레이스 · 펼쳐서 보기'
      : tab === 'reviews'
        ? '인기 후기 TOP 10 · 펼쳐서 보기'
        : listStatus === 'loading'
          ? '주변 식당을 불러오는 중…'
          : `이 지역 식당 ${list.length}곳 · 펼쳐서 목록 보기`;

  const tabLabel = (t: PanelTab) =>
    t === 'nearby' && listStatus !== 'loading' ? `${TAB_LABELS[t]} ${list.length}` : TAB_LABELS[t];

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label={restaurant ? `${restaurant.name} 정보` : tab === 'hot' ? '지역별 핫플레이스' : tab === 'reviews' ? '인기 후기' : '주변 식당 목록'}
      className={`absolute z-30 flex flex-col overflow-hidden bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] ${layoutClass}`}
      style={{ height, transition }}
    >
      {/* 손잡이 + 조작 버튼 */}
      <div className="flex shrink-0 items-center gap-1 px-2 pt-2">
        <button
          ref={handleRef}
          type="button"
          aria-label={`정보 패널 크기 조절 (현재 ${state === 'collapsed' ? '접힘' : state === 'default' ? '기본' : '펼침'}). 위·아래 화살표로 조절`}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onKeyDown={onHandleKeyDown}
          className="flex min-h-[44px] flex-1 cursor-grab flex-col items-center justify-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        >
          <span className="h-1.5 w-12 rounded-full bg-gray-300" aria-hidden />
          <span className="mt-1 max-w-full truncate px-2 text-xs text-gray-500">{peekText}</span>
        </button>
        <button
          type="button"
          aria-label="패널 접기"
          disabled={state === 'collapsed'}
          onClick={() => onStateChange(nextState(state, -1))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-30"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="패널 펼치기"
          disabled={state === 'expanded'}
          onClick={() => onStateChange(nextState(state, 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-30"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
        {restaurant && (
          <button
            type="button"
            aria-label="선택 해제"
            onClick={() => onSelect(null)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 본문 */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-2" style={{ touchAction: 'pan-y' }}>
        {restaurant ? (
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
            <div className="flex gap-3">
              <Thumb r={restaurant} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <h3 className="min-w-0 flex-1 text-lg font-bold leading-tight text-gray-900">
                    {restaurant.name}
                  </h3>
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
        ) : (
          <div>
            {/* 목록 탭: 주변 / 핫플 / 후기 */}
            <div role="tablist" aria-label="패널 목록" className="mb-3 flex rounded-full bg-gray-100 p-1">
              {TAB_ORDER.map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onTabChange(t)}
                    className={`min-h-[36px] flex-1 rounded-full text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                      active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {tabLabel(t)}
                  </button>
                );
              })}
            </div>

            {tab !== 'nearby' ? (
              <div role="tabpanel">{tabContent}</div>
            ) : (
              <div role="tabpanel">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-gray-900">
                    이 지역 식당{' '}
                    {listStatus !== 'loading' && <span className="text-sm font-semibold text-gray-500">{list.length}곳</span>}
                  </h3>
                  <span className="text-xs text-gray-500">핀을 누르면 정보가 열려요</span>
                </div>

                {listStatus === 'loading' && (
                  <ul className="space-y-2" aria-label="불러오는 중">
                    {[0, 1, 2].map((i) => (
                      <li key={i} className="flex items-center gap-3 py-1">
                        <SkeletonCircle className="h-11 w-11" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-1/2" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {listStatus === 'error' && (
                  <div className="rounded-xl bg-rose-50 p-4 text-center">
                    <p className="text-sm text-rose-700">{listError ?? '주변 식당을 불러오지 못했어요.'}</p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-2 min-h-[40px] rounded-full bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    >
                      다시 시도
                    </button>
                  </div>
                )}

                {listStatus !== 'loading' && listStatus !== 'error' && list.length === 0 && (
                  <div className="rounded-xl bg-gray-50 p-4 text-center">
                    <p className="text-sm text-gray-700">
                      {hasQuery
                        ? '검색어와 맞는 식당이 없어요.'
                        : category !== '전체'
                          ? `이 지역에 ${category} 식당이 없어요.`
                          : '이 지역에 표시할 식당이 없어요. 지도를 옮기거나 다른 지역을 골라보세요.'}
                    </p>
                    {(hasQuery || category !== '전체') && (
                      <button
                        type="button"
                        onClick={onResetFilters}
                        className="mt-2 min-h-[40px] rounded-full border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                      >
                        조건 해제하고 전체 보기
                      </button>
                    )}
                  </div>
                )}

                {listStatus !== 'loading' && list.length > 0 && (
                  <ul className="divide-y divide-gray-100">
                    {list.slice(0, 30).map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(r.id)}
                          className="flex min-h-[56px] w-full items-center gap-3 py-2 text-left hover:bg-gray-50 focus:outline-none focus-visible:bg-rose-50"
                        >
                          <Thumb r={r} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-gray-900">{r.name}</span>
                            <span className="block truncate text-xs text-gray-500">
                              {[r.typeLabel, distanceFor(r)].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs">
                            {r.averageRating !== null ? (
                              <span className="font-bold text-amber-500">★ {r.averageRating.toFixed(1)}</span>
                            ) : (
                              <span className="text-gray-400">평점 없음</span>
                            )}
                          </span>
                          {isSaved(r.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-label="저장됨" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
