/**
 * '지도' 탭(입체 탐색)의 최상위 셸. page.tsx 에서 `next/dynamic` 으로 지연 로딩된다.
 *
 * 책임(상태 오케스트레이션)
 * - 렌더러(입체 디오라마 / 지도 / 위성), 검색어, 카테고리, 필터, 선택 핀, 패널 상태를 한 곳에서 관리해
 *   검색·카테고리·핀·패널이 같은 데이터 상태를 공유한다.
 * - 데이터 소스는 렌더러와 무관하게 하나: `useNearbyRestaurants` (DB, `GET /restaurant/nearby`).
 *   렌더러를 바꿔도 마지막 뷰포트(중심·확대)를 이어받아 같은 자리에서 계속 본다.
 * - 뷰포트 변경 → nearby 조회 파라미터 계산(반경 0.5~8km 캡, limit 60).
 * - '내 주변' 버튼을 눌렀을 때만 위치를 조회하고, 거부·미지원이면 지역 프리셋으로 수동 탐색.
 * - 상단바·패널 크기를 모아 렌더러에 가시 영역 인셋(카메라 보정)을 전달.
 * - 선택된 식당이 필터에서 제외되면 패널에 안내하고, 결과가 비면 빈 상태를 보여준다.
 * - 패널 목록 탭(주변 / 핫플 / 후기): 예전에 지도 아래 카드로 있던 '지역별 핫플레이스' · '인기 후기 TOP 10' 을
 *   지도 안 패널로 옮겼다. 데이터는 page.tsx 가 이미 받아 둔 것을 props 로 넘긴다(중복 조회 없음).
 *   핫플을 누르면 그 식당 좌표로 flyTo 하고, nearby 결과에 들어오면 핀을 자동 선택한다.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNearbyRestaurants } from '@/hooks/MatzalAl/useNearbyRestaurants';
import { useSavedRestaurants } from '@/hooks/MatzalAl/useSavedRestaurants';
import { useIsDesktop, usePrefersReducedMotion } from '@/hooks/MatzalAl/useMediaQuery';
import { displayDistanceKm, formatDistance } from '@/lib/matzalAl/exploreAdapter';
import { DEFAULT_REGION, REGION_PRESETS, type RegionPreset } from '@/lib/matzalAl/exploreRegions';
import type {
  ExploreCategory,
  ExploreFilters,
  ExploreRenderer,
  ExploreRestaurant,
  ExploreViewport,
  HotplaceRestaurant,
  LatLng,
  LocateStatus,
  PanelState,
  PanelTab,
  PopularReview,
  VisibleInsets,
} from '@/types/MatzalAl/explore';
import { ExploreModeControl } from './ExploreModeControl';
import { ExploreTopBar } from './ExploreTopBar';
import { KakaoExploreMap, type FlyToRequest } from './KakaoExploreMap';
import { RestaurantPanel } from './RestaurantPanel';
import { RestaurantDetailPanel } from './RestaurantDetailPanel';
import { DioramaExploreMap, type FocusRequest } from './DioramaExploreMap';
import { HotplaceList } from './HotplaceList';
import { PopularReviewList } from './PopularReviewList';

const DEFAULT_FILTERS: ExploreFilters = { sort: 'distance', ratedOnly: false, savedOnly: false };
/** nearby 조회 한도. 핀 라벨이 겹치지 않을 정도로 제한 */
const NEARBY_LIMIT = 60;
const NEARBY_MIN_RADIUS_KM = 0.5;
const NEARBY_MAX_RADIUS_KM = 8;
/** 렌더러 최초 확대 단계 (카카오 level 기준, 입체 지도는 zoom 16 으로 환산) */
const INITIAL_LEVEL = 4;
/** flyTo 후 nearby 결과에 식당이 안 들어오면 이 시간 뒤 대기 선택을 접고 안내한다 */
const PENDING_SELECT_TIMEOUT_MS = 6000;

/** PC 목록 패널 폭. `RestaurantPanel` 의 `w-[380px]` 과 같은 값 —
 *  측정값(panelSize)은 첫 렌더가 모바일(전폭)로 잡혀 한동안 어긋나므로 상수를 쓴다 */
const LIST_PANEL_WIDTH = 380;
/** PC 상세 패널: 목록 패널 오른쪽에 나란히 선다 */
const DETAIL_PANEL_WIDTH = 340;
const DETAIL_PANEL_GAP = 12;
/** PC 좌우 여백 (목록 패널 `left-4` · 모드 컨트롤과 같은 값) */
const EDGE_GAP = 16;
/**
 * PC 우하단 모드 컨트롤이 차지하는 높이 + 여백.
 * 두 렌더러가 자기 확대/축소 버튼을 `visibleInsets.bottom + 12` 에 두므로,
 * 이 값만큼 바닥을 비워 두면 버튼이 모드 컨트롤 위로 알아서 올라간다.
 */
const MODE_CONTROL_RESERVE = 60;

export interface ExploreShellProps {
  /** 지역별 핫플레이스 원본 (`GET /restaurant` 전체 목록). page.tsx 가 받아 둔 것 */
  hotplaces?: HotplaceRestaurant[];
  /** 핫플 지역 칩 (전국 제외, 식당 수 상위 도시) */
  hotplaceCities?: string[];
  hotplacesLoading?: boolean;
  hotplacesRefreshing?: boolean;
  onRefreshHotplaces?: () => void;
  /** 인기 후기 TOP 10 (`GET /restaurant/board/top-viewed`) */
  reviews?: PopularReview[];
  reviewsLoading?: boolean;
  reviewsRefreshing?: boolean;
  onRefreshReviews?: () => void;
}

const NOOP = () => {};

export default function ExploreShell({
  hotplaces = [],
  hotplaceCities = [],
  hotplacesLoading = false,
  hotplacesRefreshing = false,
  onRefreshHotplaces = NOOP,
  reviews = [],
  reviewsLoading = false,
  reviewsRefreshing = false,
  onRefreshReviews = NOOP,
}: ExploreShellProps) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const reducedMotion = usePrefersReducedMotion();
  const { savedIds, isSaved, toggleSaved } = useSavedRestaurants();
  const nearby = useNearbyRestaurants();

  const [renderer, setRenderer] = useState<ExploreRenderer>('tilt');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExploreCategory>('전체');
  const [filters, setFilters] = useState<ExploreFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelState, setPanelState] = useState<PanelState>('collapsed');
  const [panelTab, setPanelTab] = useState<PanelTab>('nearby');
  const [hotplaceCity, setHotplaceCity] = useState('전국');
  /** 핫플·후기에서 고른 식당 id. flyTo 뒤 nearby 결과에 들어오면 선택으로 바꾼다 */
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locateStatus, setLocateStatus] = useState<LocateStatus>('idle');
  const [regionLabel, setRegionLabel] = useState<string | null>(null);
  const [regionPreset, setRegionPreset] = useState<RegionPreset>(DEFAULT_REGION);
  const [flyTo, setFlyTo] = useState<FlyToRequest | null>(null);
  /** 입체 모드 정면 카메라 요청 (핫플·후기 선택). 카카오 모드는 flyTo + 선택 핀 보정으로 충분 */
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [tiltReady, setTiltReady] = useState(false);
  const [lastViewport, setLastViewport] = useState<ExploreViewport | null>(null);

  const [topBarHeight, setTopBarHeight] = useState(140);
  const [panelSize, setPanelSize] = useState({ width: 0, height: 76 });
  const [containerHeight, setContainerHeight] = useState(640);
  const containerRef = useRef<HTMLDivElement>(null);
  const noticeTimerRef = useRef<number | null>(null);

  // 컨테이너 높이 추적 (패널 단계 높이 계산용)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight));
    ro.observe(el);
    setContainerHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    },
    [],
  );

  // ---- 지도 드래그 중에는 PC 패널을 비춰준다 (패널에 가린 지도를 보면서 옮기도록) ----
  // 렌더러마다 드래그 이벤트가 달라(카카오 idle / OrbitControls end) 셸에서 포인터로 직접 잡는다.
  // 패널·컨트롤(`data-map-overlay`) 위에서 시작한 포인터는 지도 드래그가 아니다.
  const [mapDragging, setMapDragging] = useState(false);
  const dragProbeRef = useRef<{ x: number; y: number; active: boolean } | null>(null);

  const handleMapPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest?.('[data-map-overlay]')) return;
    dragProbeRef.current = { x: e.clientX, y: e.clientY, active: false };
  }, []);

  const handleMapPointerMove = useCallback((e: React.PointerEvent) => {
    const probe = dragProbeRef.current;
    if (!probe || probe.active) return;
    // 클릭과 구분: 6px 넘게 움직여야 드래그로 본다
    if (Math.hypot(e.clientX - probe.x, e.clientY - probe.y) < 6) return;
    probe.active = true;
    setMapDragging(true);
  }, []);

  const endMapDrag = useCallback(() => {
    dragProbeRef.current = null;
    setMapDragging(false);
  }, []);

  // 데스크톱 좌측 기둥은 펼친 상태로 시작한다 (모바일 하단 시트는 접힘 유지).
  // useMediaQuery 가 SSR 에서 false 라 첫 렌더 뒤 한 번만 올려준다.
  const desktopPanelInitRef = useRef(false);
  useEffect(() => {
    if (!isDesktop || desktopPanelInitRef.current) return;
    desktopPanelInitRef.current = true;
    setPanelState('expanded');
  }, [isDesktop]);

  /** 짧은 안내 토스트 */
  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2600);
  }, []);

  // ---- 데이터 소스 (DB) ----
  const sourceList: ExploreRestaurant[] = nearby.restaurants;

  const distanceFor = useCallback(
    (r: ExploreRestaurant) => formatDistance(displayDistanceKm(r, userLocation)),
    [userLocation],
  );

  /** 검색어·카테고리·필터 적용 + 정렬 */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = sourceList.filter((r) => {
      if (category !== '전체' && r.cuisine !== category) return false;
      if (filters.ratedOnly && r.averageRating === null) return false;
      if (filters.savedOnly && !savedIds.has(r.id)) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.typeLabel.toLowerCase().includes(q)) return false;
      return true;
    });
    const dist = (r: ExploreRestaurant) => displayDistanceKm(r, userLocation) ?? Number.POSITIVE_INFINITY;
    list = [...list].sort((a, b) => {
      if (filters.sort === 'rating') {
        const ra = a.averageRating ?? -1;
        const rb = b.averageRating ?? -1;
        if (rb !== ra) return rb - ra;
      }
      return dist(a) - dist(b);
    });
    return list;
  }, [sourceList, query, category, filters, savedIds, userLocation]);

  const selected = useMemo(() => sourceList.find((r) => r.id === selectedId) ?? null, [sourceList, selectedId]);
  const selectedFilteredOut = !!selected && !filtered.some((r) => r.id === selected.id);
  /** 핀으로 그릴 목록: 필터 결과 + (필터에서 빠졌더라도) 선택된 식당 */
  const pinned = useMemo(
    () => (selected && selectedFilteredOut ? [...filtered, selected] : filtered),
    [filtered, selected, selectedFilteredOut],
  );

  // 렌더러 전환: 데이터·선택·검색어는 그대로 두고 지도 엔진만 바꾼다.
  // 새 렌더러는 lastViewport 를 시작 위치로 쓰므로, 예전 flyTo 요청이 다시 실행되지 않게 비운다.
  const handleRendererChange = useCallback(
    (next: ExploreRenderer) => {
      if (next === renderer) return;
      setFlyTo(null);
      setFocusRequest(null);
      setRenderer(next);
    },
    [renderer],
  );

  // 실데이터 목록이 갱신됐는데 선택된 식당이 더 이상 없으면 선택 해제
  useEffect(() => {
    if (selectedId && !sourceList.some((r) => r.id === selectedId)) {
      setSelectedId(null);
    }
  }, [sourceList, selectedId]);

  const handleSelect = useCallback((id: string | null) => {
    setPendingSelectId(null);
    setSelectedId(id);
    if (id) setPanelState((s) => (s === 'collapsed' ? 'default' : s));
  }, []);

  /** 주변 목록에서 고르면 핀을 누른 것처럼 선택하고 그 식당으로 카메라를 옮긴다 */
  const handleListSelect = useCallback(
    (id: string | null) => {
      handleSelect(id);
      if (!id) return;
      const token = Date.now();
      // 입체: 핀 클릭과 같은 정면 카메라
      if (renderer === 'tilt') {
        setFocusRequest({ id, token });
        return;
      }
      // 지도·위성: 지금 확대 단계를 유지한 채 식당 위치로 이동
      const r = sourceList.find((x) => x.id === id);
      if (r?.coord) setFlyTo({ center: r.coord, level: lastViewport?.level ?? INITIAL_LEVEL, token });
    },
    [handleSelect, renderer, sourceList, lastViewport],
  );

  // ---- 핫플 · 후기 → 지도 이동 + 자동 선택 ----
  /** 핫플 목록에서 idx 로 좌표 찾기 (후기 탭의 핀 버튼도 같은 목록을 쓴다) */
  const hotplaceByIdx = useMemo(() => {
    const m = new Map<string, HotplaceRestaurant>();
    for (const h of hotplaces) m.set(h.restaurantIdx, h);
    return m;
  }, [hotplaces]);

  const canLocateRestaurant = useCallback(
    (restaurantIdx: string) => hotplaceByIdx.get(restaurantIdx)?.coord != null,
    [hotplaceByIdx],
  );

  /** 좌표로 이동하고, 그 식당이 nearby 결과에 들어오면 선택 + 정면 카메라 */
  const focusRestaurant = useCallback(
    (restaurantIdx: string, coord: LatLng) => {
      const id = `api:${restaurantIdx}`;
      const token = Date.now();
      setFlyTo({ center: coord, level: INITIAL_LEVEL, token });
      setPanelState((s) => (s === 'collapsed' ? 'default' : s));
      if (sourceList.some((r) => r.id === id)) {
        setPendingSelectId(null);
        setSelectedId(id);
        setFocusRequest({ id, token });
      } else {
        setPendingSelectId(id);
      }
    },
    [sourceList],
  );

  const handleHotplaceSelect = useCallback(
    (h: HotplaceRestaurant) => {
      if (h.coord) {
        focusRestaurant(h.restaurantIdx, h.coord);
        return;
      }
      // 좌표가 없는 식당은 지도에 올릴 수 없으므로 상세 페이지로 (기존 핫플레이스 카드와 같은 규칙)
      router.push(`/matzal-al-mentor/${encodeURIComponent(h.name)}?matzalAlIdx=${h.restaurantIdx}`);
    },
    [focusRestaurant, router],
  );

  const handleLocateReviewRestaurant = useCallback(
    (restaurantIdx: string) => {
      const h = hotplaceByIdx.get(restaurantIdx);
      if (!h?.coord) {
        showNotice('이 식당은 위치 정보가 없어 지도에 표시할 수 없어요');
        return;
      }
      focusRestaurant(restaurantIdx, h.coord);
    },
    [hotplaceByIdx, focusRestaurant, showNotice],
  );

  // flyTo 후 nearby 결과가 갱신되면 대기 중인 식당을 선택 + 정면 카메라
  useEffect(() => {
    if (!pendingSelectId) return;
    if (sourceList.some((r) => r.id === pendingSelectId)) {
      setSelectedId(pendingSelectId);
      setFocusRequest({ id: pendingSelectId, token: Date.now() });
      setPendingSelectId(null);
    }
  }, [sourceList, pendingSelectId]);

  // 조회 실패·시간 초과 시 대기 선택을 접고 안내
  useEffect(() => {
    if (!pendingSelectId) return;
    if (nearby.status === 'error') {
      setPendingSelectId(null);
      return;
    }
    const t = window.setTimeout(() => {
      setPendingSelectId(null);
      showNotice('지도에서 이 식당을 찾지 못했어요. 지도를 조금 옮겨보세요');
    }, PENDING_SELECT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [pendingSelectId, nearby.status, showNotice]);

  const handleToggleSave = useCallback(
    (id: string) => {
      const now = toggleSaved(id);
      showNotice(now ? '내 기기에 저장했어요' : '저장을 취소했어요');
    },
    [toggleSaved, showNotice],
  );

  const resetFilters = useCallback(() => {
    setQuery('');
    setCategory('전체');
    setFilters(DEFAULT_FILTERS);
  }, []);

  // ---- 위치 ----
  const handleLocate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocateStatus('unsupported');
      return;
    }
    setLocateStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setLocateStatus('done');
        setFlyTo({ center: loc, level: INITIAL_LEVEL, token: Date.now() });
      },
      (err) => {
        setLocateStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  const handleSelectRegion = useCallback((preset: RegionPreset) => {
    setRegionPreset(preset);
    setRegionLabel(preset.label);
    setFlyTo({ center: preset.center, level: INITIAL_LEVEL, token: Date.now() });
  }, []);

  // ---- 뷰포트 → nearby 조회 ----
  const handleViewportChange = useCallback(
    (vp: ExploreViewport) => {
      setLastViewport(vp);
      const radiusKm = Math.min(NEARBY_MAX_RADIUS_KM, Math.max(NEARBY_MIN_RADIUS_KM, vp.radiusKm));
      nearby.request({ lat: vp.center.lat, lng: vp.center.lng, radiusKm, limit: NEARBY_LIMIT });
    },
    [nearby],
  );

  const handleRegionChange = useCallback((label: string | null) => {
    setRegionLabel(label);
  }, []);

  // ---- 가시 영역 인셋 ----
  // PC 에서 상세 패널이 열리면 그만큼 왼쪽이 더 가려진다. 이걸 반영하지 않으면
  // 카카오의 panBy 보정이 선택된 핀을 상세 패널 밑으로 밀어 넣는다.
  const visibleInsets: VisibleInsets = useMemo(
    () => ({
      top: topBarHeight,
      right: 0,
      bottom: isDesktop ? MODE_CONTROL_RESERVE : panelSize.height,
      left: isDesktop
        ? LIST_PANEL_WIDTH + EDGE_GAP + (selected ? DETAIL_PANEL_GAP + DETAIL_PANEL_WIDTH : 0)
        : 0,
    }),
    [topBarHeight, panelSize, isDesktop, selected],
  );

  const displayRegionLabel = regionLabel ?? (lastViewport ? '위치 확인 중…' : regionPreset.label);

  const listStatus = nearby.status === 'idle' ? 'loading' : nearby.status;

  /** 렌더러를 바꿔도 같은 자리에서 이어보기: 마지막 뷰포트 → 사용자 위치 → 지역 프리셋 순 */
  const initialCenter = lastViewport?.center ?? userLocation ?? regionPreset.center;
  const initialLevel = lastViewport?.level ?? INITIAL_LEVEL;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
      style={{ height: 'min(calc(100dvh - 96px), 1080px)', minHeight: 560 }}
      data-explore-renderer={renderer}
      onPointerDown={handleMapPointerDown}
      onPointerMove={handleMapPointerMove}
      onPointerUp={endMapDrag}
      onPointerCancel={endMapDrag}
      onPointerLeave={endMapDrag}
    >
      {/* 렌더러 — 셋 다 같은 DB 데이터(pinned)를 그린다 */}
      {renderer === 'tilt' ? (
        <DioramaExploreMap
          restaurants={pinned}
          sceneRestaurants={nearby.restaurants}
          selectedId={selectedId}
          onSelect={handleSelect}
          userLocation={userLocation}
          initialCenter={initialCenter}
          initialLevel={initialLevel}
          flyTo={flyTo}
          focusRequest={focusRequest}
          visibleInsets={visibleInsets}
          onViewportChange={handleViewportChange}
          onRegionChange={handleRegionChange}
          onReadyChange={setTiltReady}
          savedIds={savedIds}
          distanceFor={distanceFor}
          reducedMotion={reducedMotion}
          fetchStatus={nearby.status}
        />
      ) : (
        <KakaoExploreMap
          restaurants={pinned}
          selectedId={selectedId}
          onSelect={handleSelect}
          mapType={renderer === 'sky' ? 'sky' : 'road'}
          userLocation={userLocation}
          initialCenter={initialCenter}
          initialLevel={initialLevel}
          flyTo={flyTo}
          visibleInsets={visibleInsets}
          onViewportChange={handleViewportChange}
          onRegionChange={handleRegionChange}
          onReadyChange={setKakaoReady}
          savedIds={savedIds}
          distanceFor={distanceFor}
          reducedMotion={reducedMotion}
          fetchStatus={nearby.status}
        />
      )}

      {/* 상단 오버레이 */}
      <ExploreTopBar
        regionLabel={displayRegionLabel}
        regionPresets={REGION_PRESETS}
        onSelectRegion={handleSelectRegion}
        locateStatus={locateStatus}
        onLocate={handleLocate}
        query={query}
        onQueryChange={setQuery}
        category={category}
        onCategoryChange={setCategory}
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filtered.length}
        onHeightChange={setTopBarHeight}
        isDesktop={isDesktop}
      />

      {/* 지도 모드. 데스크톱은 우하단 가로 배치(확대/축소 버튼이 그 위로 올라온다),
          모바일은 패널 위에 세로로 배치.
          위성(카카오 하이브리드)은 어느 렌더러든 준비된 뒤에 노출한다 */}
      <ExploreModeControl
        renderer={renderer}
        onChange={handleRendererChange}
        satelliteAvailable={kakaoReady || tiltReady || renderer === 'sky'}
        orientation={isDesktop ? 'horizontal' : 'vertical'}
        className="absolute z-40"
        style={
          isDesktop
            ? { right: EDGE_GAP, bottom: EDGE_GAP }
            : { left: 12, bottom: panelSize.height + 12 }
        }
      />

      {/* 정보 패널 */}
      <RestaurantPanel
        restaurant={selected}
        isFilteredOut={selectedFilteredOut}
        category={category}
        onResetFilters={resetFilters}
        list={filtered}
        listStatus={listStatus}
        listError={nearby.error}
        onRetry={nearby.refetch}
        hasQuery={query.trim().length > 0}
        distanceFor={distanceFor}
        state={panelState}
        onStateChange={setPanelState}
        isDesktop={isDesktop}
        translucent={isDesktop && mapDragging}
        containerHeight={containerHeight}
        topInset={topBarHeight}
        reducedMotion={reducedMotion}
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
        onSelect={handleListSelect}
        onNotice={showNotice}
        onSizeChange={setPanelSize}
        tab={panelTab}
        onTabChange={setPanelTab}
        tabContent={
          panelTab === 'hot' ? (
            <HotplaceList
              items={hotplaces}
              cities={hotplaceCities}
              city={hotplaceCity}
              onCityChange={setHotplaceCity}
              loading={hotplacesLoading}
              refreshing={hotplacesRefreshing}
              onRefresh={onRefreshHotplaces}
              onSelect={handleHotplaceSelect}
              selectedRestaurantIdx={selected?.restaurantIdx ?? null}
            />
          ) : panelTab === 'reviews' ? (
            <PopularReviewList
              items={reviews}
              loading={reviewsLoading}
              refreshing={reviewsRefreshing}
              onRefresh={onRefreshReviews}
              canLocate={canLocateRestaurant}
              onLocate={handleLocateReviewRestaurant}
            />
          ) : null
        }
      />

      {/* PC 전용 상세 패널: 목록 패널 오른쪽에 나란히. 모바일은 목록 패널 안에서 목록 대신 그려진다 */}
      {isDesktop && selected && (
        <RestaurantDetailPanel
          restaurant={selected}
          isFilteredOut={selectedFilteredOut}
          category={category}
          hasQuery={query.trim().length > 0}
          onResetFilters={resetFilters}
          distanceFor={distanceFor}
          isSaved={isSaved}
          onToggleSave={handleToggleSave}
          onClose={() => handleSelect(null)}
          translucent={mapDragging}
          style={{
            left: EDGE_GAP + LIST_PANEL_WIDTH + DETAIL_PANEL_GAP,
            width: DETAIL_PANEL_WIDTH,
            top: topBarHeight + 8,
            bottom: EDGE_GAP,
          }}
        />
      )}

      {/* 토스트 */}
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900/90 px-4 py-2 text-sm text-white shadow-lg"
          style={{ bottom: (isDesktop ? 24 : panelSize.height + 56) }}
        >
          {notice}
        </div>
      )}
    </div>
  );
}
