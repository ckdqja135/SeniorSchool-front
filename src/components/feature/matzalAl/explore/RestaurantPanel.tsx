/**
 * 식당 목록 패널 (모바일: 하단 시트 / 데스크톱: 좌측 전체 높이 컬럼).
 *
 * - 모바일: 접힘 / 기본 / 펼침 3단계. 손잡이 드래그 외에 버튼(▲▼✕)과 키보드(↑ ↓ Esc)로도 조작 가능.
 *   드래그는 손잡이 요소에서만 시작하므로 지도 드래그와 충돌하지 않는다.
 *   식당을 고르면 목록 자리에 상세(`RestaurantDetailContent`)가 대신 들어온다.
 * - 데스크톱: 좌측 기둥이라 중간 높이가 애매해 최소화 ↔ 전체 높이 두 단계만 쓴다.
 *   손잡이 드래그·키보드는 그대로 두고 ▲▼ 대신 토글 버튼 하나를 둔다.
 *   상세는 셸이 이 패널 오른쪽에 `RestaurantDetailPanel` 로 따로 띄우므로,
 *   식당을 골라도 목록이 그대로 남는다.
 * - 목록 탭(주변 / 핫플 / 후기): '주변' 은 현재 결과 목록(빈 결과·로딩·오류 상태 포함),
 *   '핫플' · '후기' 본문은 셸이 `tabContent` 로 넘긴다 (예전에 지도 아래 있던 두 섹션을 지도 안으로 옮긴 것).
 * - 자신의 크기를 `onSizeChange` 로 알려 셸이 카메라 보정용 가시 영역을 계산한다.
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton, SkeletonCircle } from '@/components/common/Skeleton';
import type { ExploreCategory, ExploreRestaurant, PanelState, PanelTab } from '@/types/MatzalAl/explore';
import { RestaurantDetailContent } from './RestaurantDetailPanel';
import { Thumb } from './panelListParts';

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
  /** 지도를 드래그하는 동안 잠깐 비춰준다 (셸이 PC 에서만 켠다) */
  translucent?: boolean;
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

/**
 * 패널 상태별 높이(px). 상단 오버레이(검색창·칩) 아래로만 펼쳐지도록 컨테이너 높이에서 여유를 뺀다.
 * 데스크톱은 중간 단계 없이 최소화 ↔ 전체 높이 두 단계로 쓴다 (좌측 기둥 형태라 중간 높이가 애매하다).
 */
export function panelHeightPx(state: PanelState, containerHeight: number, isDesktop: boolean, topInset: number): number {
  const topReserved = topInset + (isDesktop ? 24 : 8);
  const maxH = Math.max(220, containerHeight - topReserved);
  if (state === 'collapsed') return COLLAPSED_PX;
  if (isDesktop || state === 'expanded') return maxH;
  const def = Math.max(280, Math.round(containerHeight * 0.46));
  return Math.min(def, maxH);
}

function nextState(state: PanelState, dir: 1 | -1): PanelState {
  const i = STATE_ORDER.indexOf(state);
  return STATE_ORDER[Math.min(STATE_ORDER.length - 1, Math.max(0, i + dir))];
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
  translucent = false,
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

  const heightTransition = dragHeight !== null || reducedMotion ? null : 'height 260ms cubic-bezier(0.2, 0.8, 0.2, 1)';
  const transition = [heightTransition, reducedMotion ? null : 'opacity 150ms linear'].filter(Boolean).join(', ') || 'none';
  const layoutClass = isDesktop
    ? 'left-4 bottom-4 w-[380px] max-w-[calc(100%-2rem)] rounded-3xl shadow-[0_16px_40px_-14px_rgba(0,0,0,0.35)]'
    : 'inset-x-0 bottom-0 rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)]';

  /** 데스크톱은 상세를 셸이 옆 패널로 띄우므로, 이 패널은 목록을 계속 보여준다 */
  const showDetailInline = restaurant !== null && !isDesktop;
  const collapsed = state === 'collapsed';

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
      aria-label={showDetailInline && restaurant ? `${restaurant.name} 정보` : tab === 'hot' ? '지역별 핫플레이스' : tab === 'reviews' ? '인기 후기' : '주변 식당 목록'}
      data-map-overlay
      className={`absolute z-40 flex flex-col overflow-hidden bg-white ${layoutClass}`}
      style={{ height, transition, opacity: translucent ? 0.3 : 1 }}
    >
      {/* 손잡이 + 조작 버튼. 데스크톱은 목록에 자리를 더 주려고 납작하게 둔다 */}
      <div className={`flex shrink-0 items-center gap-1 px-2 ${isDesktop ? 'pt-1' : 'pt-2'}`}>
        <button
          ref={handleRef}
          type="button"
          aria-label={
            isDesktop
              ? `목록 패널 크기 조절 (현재 ${collapsed ? '최소화' : '펼침'}). 위·아래 화살표로 조절`
              : `정보 패널 크기 조절 (현재 ${state === 'collapsed' ? '접힘' : state === 'default' ? '기본' : '펼침'}). 위·아래 화살표로 조절`
          }
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onKeyDown={onHandleKeyDown}
          className={`flex flex-1 cursor-grab flex-col items-center justify-center rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 active:cursor-grabbing ${
            isDesktop && !collapsed ? 'min-h-[20px]' : 'min-h-[44px]'
          }`}
          style={{ touchAction: 'none' }}
        >
          <span className="h-1.5 w-12 rounded-full bg-gray-300" aria-hidden />
          {/* 펼친 데스크톱 패널은 바로 아래 목록 제목과 겹치므로 요약을 숨긴다 */}
          {(!isDesktop || collapsed) && (
            <span className="mt-1 max-w-full truncate px-2 text-xs text-gray-500">{peekText}</span>
          )}
        </button>

        {isDesktop ? (
          // 데스크톱은 최소화 ↔ 펼침 두 단계뿐이라 토글 하나로 둔다
          <button
            type="button"
            aria-label={collapsed ? '목록 펼치기' : '목록 최소화'}
            aria-expanded={!collapsed}
            title={collapsed ? '목록 펼치기' : '목록 최소화'}
            onClick={() => onStateChange(collapsed ? 'expanded' : 'collapsed')}
            className={`flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              collapsed ? 'h-10 w-10' : 'h-7 w-7'
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
          </button>
        ) : (
          <>
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
          </>
        )}

        {/* 데스크톱은 상세 패널이 자기 ✕ 를 갖는다 */}
        {restaurant && !isDesktop && (
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
      <div
        ref={bodyRef}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 ${isDesktop ? 'pt-1.5' : 'pt-2'}`}
        style={{ touchAction: 'pan-y' }}
      >
        {showDetailInline && restaurant ? (
          <RestaurantDetailContent
            restaurant={restaurant}
            isFilteredOut={isFilteredOut}
            category={category}
            hasQuery={hasQuery}
            onResetFilters={onResetFilters}
            distanceFor={distanceFor}
            isSaved={isSaved}
            onToggleSave={onToggleSave}
          />
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
