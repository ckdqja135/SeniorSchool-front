/**
 * 입체 탐색 상단 오버레이: 지역 표시 · 내 주변 버튼 · 둥근 검색창 · 필터 버튼 · 카테고리 칩.
 *
 * - 래퍼는 pointer-events-none 으로 두고 요소만 pointer-events-auto 로 켜서, 요소 사이 빈 공간에서는
 *   지도 드래그가 그대로 동작하게 한다.
 * - 자신의 높이를 `onHeightChange` 로 알려 셸이 가시 영역 인셋(카메라 보정)에 반영한다.
 * - PC 는 지도 위에 뜬 좁은 카드(중앙 정렬)로, 모바일은 전폭으로 배치한다.
 *   PC 에서는 마우스를 얹기 전까지 흐려지지만, 위치 권한 안내 문구만은 항상 또렷하게 둔다.
 */
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { ExploreCategory, ExploreFilters, LocateStatus } from '@/types/MatzalAl/explore';
import type { RegionPreset } from '@/lib/matzalAl/exploreRegions';
import { CATEGORY_CHIPS, CategoryIcon } from './categoryIcons';
import { MAP_CONTROL_DIM_GROUP } from './mapControlStyles';

export interface ExploreTopBarProps {
  regionLabel: string;
  regionPresets: RegionPreset[];
  onSelectRegion: (preset: RegionPreset) => void;
  locateStatus: LocateStatus;
  onLocate: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  category: ExploreCategory;
  onCategoryChange: (c: ExploreCategory) => void;
  filters: ExploreFilters;
  onFiltersChange: (f: ExploreFilters) => void;
  resultCount: number;
  onHeightChange: (h: number) => void;
  /** PC 는 지도 위에 뜬 좁은 카드로, 모바일은 지금처럼 전폭으로 배치한다 */
  isDesktop: boolean;
}

const LOCATE_MESSAGES: Partial<Record<LocateStatus, string>> = {
  locating: '내 위치를 찾는 중이에요…',
  denied: '위치 권한이 거부됐어요. 아래 지역 목록에서 골라 둘러보세요.',
  unsupported: '이 브라우저는 위치 조회를 지원하지 않아요. 지역을 골라 둘러보세요.',
  error: '위치를 가져오지 못했어요. 다시 시도하거나 지역을 골라주세요.',
};

export function ExploreTopBar({
  regionLabel,
  regionPresets,
  onSelectRegion,
  locateStatus,
  onLocate,
  query,
  onQueryChange,
  category,
  onCategoryChange,
  filters,
  onFiltersChange,
  resultCount,
  onHeightChange,
  isDesktop,
}: ExploreTopBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [regionOpen, setRegionOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const regionListId = useId();
  const filterPanelId = useId();
  const searchId = useId();

  // 높이 보고 (검색창·칩 줄바꿈 등으로 높이가 바뀔 수 있음)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const report = () => onHeightChange(el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeightChange]);

  // 바깥 클릭 / Escape 로 팝오버 닫기
  useEffect(() => {
    if (!regionOpen && !filterOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setRegionOpen(false);
        setFilterOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRegionOpen(false);
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [regionOpen, filterOpen]);

  // 위치 권한이 거부되면 수동 지역 탐색을 바로 열어준다
  useEffect(() => {
    if (locateStatus === 'denied' || locateStatus === 'unsupported') setRegionOpen(true);
  }, [locateStatus]);

  const locating = locateStatus === 'locating';
  const locateMessage = LOCATE_MESSAGES[locateStatus] ?? null;
  const activeFilterCount = (filters.ratedOnly ? 1 : 0) + (filters.savedOnly ? 1 : 0) + (filters.sort !== 'distance' ? 1 : 0);

  return (
    <div
      ref={rootRef}
      data-map-overlay
      className={`group pointer-events-none absolute top-0 z-40 p-3 sm:p-4 ${
        isDesktop ? 'left-1/2 w-full max-w-[552px] -translate-x-1/2' : 'inset-x-0'
      }`}
    >
      {/* 1행: 지역 · 내 주변 */}
      <div className={`flex items-start justify-between gap-2 ${MAP_CONTROL_DIM_GROUP}`}>
        <div className={`relative min-w-0 ${isDesktop ? '' : 'max-w-[62%]'}`}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={regionOpen}
            aria-controls={regionListId}
            onClick={() => {
              setFilterOpen(false);
              setRegionOpen((v) => !v);
            }}
            className="pointer-events-auto flex min-h-[40px] max-w-full items-center gap-1.5 rounded-full bg-white/90 px-3 text-sm font-semibold text-gray-800 shadow-md hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <svg className="h-4 w-4 shrink-0 text-rose-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{regionLabel}</span>
            <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {regionOpen && (
            <ul
              id={regionListId}
              role="listbox"
              aria-label="둘러볼 지역 선택"
              className="pointer-events-auto absolute left-0 top-full z-40 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-xl"
            >
              {regionPresets.map((preset) => (
                <li key={preset.key} role="option" aria-selected={regionLabel === preset.label}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRegion(preset);
                      setRegionOpen(false);
                    }}
                    className="flex min-h-[40px] w-full items-center px-3 text-left text-sm text-gray-800 hover:bg-rose-50 focus:outline-none focus-visible:bg-rose-50"
                  >
                    {preset.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          aria-busy={locating}
          className="pointer-events-auto flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full bg-gray-900/85 px-3 text-sm font-semibold text-white shadow-md hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-70"
        >
          <svg className={`h-4 w-4 ${locating ? 'animate-spin motion-reduce:animate-none' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="8" />
          </svg>
          <span>내 주변 맛집</span>
        </button>
      </div>

      {locateMessage && (
        <p role="status" className="pointer-events-auto mt-2 inline-block rounded-lg bg-white/90 px-2.5 py-1 text-xs text-gray-700 shadow">
          {locateMessage}
        </p>
      )}

      {/* 2행: 검색창 · 필터 */}
      <div className={`mt-2.5 flex items-center gap-2 ${MAP_CONTROL_DIM_GROUP}`}>
        <div className="pointer-events-auto relative flex min-h-[46px] flex-1 items-center rounded-full bg-white/95 pl-4 pr-2 shadow-md focus-within:ring-2 focus-within:ring-rose-400">
          <svg className="h-5 w-5 shrink-0 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <label htmlFor={searchId} className="sr-only">
            이 지역에서 식당 찾기
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="이 지역에서 식당 찾기"
            autoComplete="off"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent px-2 text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="검색어 지우기"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label={`필터${activeFilterCount ? ` (${activeFilterCount}개 적용)` : ''}`}
            aria-expanded={filterOpen}
            aria-controls={filterPanelId}
            onClick={() => {
              setRegionOpen(false);
              setFilterOpen((v) => !v);
            }}
            className={`pointer-events-auto relative flex h-[46px] w-[46px] items-center justify-center rounded-full shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
              activeFilterCount ? 'bg-rose-600 text-white' : 'bg-white/95 text-gray-700 hover:bg-white'
            }`}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" d="M4 7h16M7 12h10M10 17h4" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-rose-600 ring-1 ring-rose-600">
                {activeFilterCount}
              </span>
            )}
          </button>

          {filterOpen && (
            <div
              id={filterPanelId}
              role="group"
              aria-label="필터"
              className="pointer-events-auto absolute right-0 top-full z-40 mt-1.5 w-60 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl"
            >
              <fieldset className="mb-3">
                <legend className="mb-1.5 text-xs font-semibold text-gray-500">목록 정렬</legend>
                <div className="flex gap-1.5">
                  {(
                    [
                      { key: 'distance', label: '거리순' },
                      { key: 'rating', label: '평점순' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex min-h-[36px] flex-1 cursor-pointer items-center justify-center rounded-full border text-sm ${
                        filters.sort === opt.key ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="explore-sort"
                        className="sr-only"
                        checked={filters.sort === opt.key}
                        onChange={() => onFiltersChange({ ...filters, sort: opt.key })}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={filters.ratedOnly}
                  onChange={(e) => onFiltersChange({ ...filters, ratedOnly: e.target.checked })}
                  className="h-4 w-4 accent-rose-600"
                />
                평점 있는 식당만
              </label>
              <label className="flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={filters.savedOnly}
                  onChange={(e) => onFiltersChange({ ...filters, savedOnly: e.target.checked })}
                  className="h-4 w-4 accent-rose-600"
                />
                내가 저장한 식당만
              </label>
              <p className="mt-2 text-[11px] text-gray-500">현재 {resultCount}곳 표시 중</p>
            </div>
          )}
        </div>
      </div>

      {/* 3행: 카테고리 칩 (PC 중앙 정렬 / 모바일 가로 스크롤) */}
      <div
        role="radiogroup"
        aria-label="업종 카테고리"
        className={`pointer-events-auto mt-2.5 flex gap-2 pb-1 ${MAP_CONTROL_DIM_GROUP} ${
          isDesktop ? 'flex-wrap justify-center' : 'overflow-x-auto'
        }`}
        style={{ scrollbarWidth: 'none' }}
      >
        {CATEGORY_CHIPS.map((chip) => {
          const active = category === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onCategoryChange(chip.key)}
              className={`flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold shadow-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                active ? 'bg-gray-900 text-white' : 'bg-white/90 text-gray-700 hover:bg-white'
              }`}
            >
              <CategoryIcon cuisine={chip.key} className="h-4 w-4" />
              <span className="whitespace-nowrap">{chip.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
