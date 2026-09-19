/**
 * 카카오맵 기반 실제 지도 렌더러 (지도 / 위성).
 *
 * 책임
 * - SDK 로드(공용 로더) 후 지도 인스턴스를 **한 번만** 생성한다. 필터·선택이 바뀌어도 재생성하지 않고
 *   오버레이만 diff 갱신한다. 언마운트 시 리스너·오버레이·인스턴스를 정리한다.
 * - 식당 핀은 CustomOverlay 의 content DOM 노드에 React 포털로 `RestaurantPin` 을 렌더링한다.
 *   노드는 0×0 크기로 두고 핀 래퍼가 translate(-50%,-100%) 하므로 아이콘 꼭짓점이 정확히 좌표에 놓인다.
 * - idle 이벤트 → 뷰포트(중심·반경) 알림. 셸이 nearby 조회(디바운스·취소·중복 방지)를 담당한다.
 * - idle 후 coord2RegionCode 로 현재 행정동 라벨을 알림 (services 라이브러리).
 * - 선택 핀이 검색창·패널에 가려지면 가시 영역 중앙으로 panBy 보정한다.
 * - 축소 레벨(level ≥ 4)에서는 라벨 없는 compact 핀으로 겹침을 줄인다 (호버·포커스 시 라벨 표시).
 *
 * 카카오 SDK 는 3D 를 지원하지 않으므로 여기서는 '입체' 표현을 하지 않는다.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { haversineKm } from '@/lib/matzalAl/exploreAdapter';
import { loadKakaoMapSdk } from '@/lib/matzalAl/kakaoMapLoader';
import type { ExploreRestaurant, ExploreViewport, LatLng, VisibleInsets } from '@/types/MatzalAl/explore';
import { RestaurantPin } from './RestaurantPin';

export interface FlyToRequest {
  center: LatLng;
  level?: number;
  /** 같은 좌표라도 다시 이동시키기 위한 토큰 */
  token: number;
}

export interface KakaoExploreMapProps {
  restaurants: ExploreRestaurant[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  mapType: 'road' | 'sky';
  userLocation: LatLng | null;
  initialCenter: LatLng;
  /** 시작 확대 단계 (카카오 level). 렌더러 전환 시 이전 뷰포트를 이어받는다 */
  initialLevel?: number;
  flyTo: FlyToRequest | null;
  visibleInsets: VisibleInsets;
  onViewportChange: (vp: ExploreViewport) => void;
  onRegionChange: (label: string | null) => void;
  onReadyChange: (ready: boolean) => void;
  savedIds: Set<string>;
  distanceFor: (r: ExploreRestaurant) => string | null;
  reducedMotion: boolean;
  /** nearby 조회 상태 (지도 위 작은 안내 필) */
  fetchStatus: 'idle' | 'loading' | 'success' | 'error';
}

type SdkState = 'loading' | 'ready' | 'error';
type OverlayEntry = { overlay: any; node: HTMLDivElement };

const INITIAL_LEVEL = 4;
/** 라벨 없이 아이콘만 그리는 축소 레벨 기준 (도심은 level 4 부터 라벨이 심하게 겹친다) */
const COMPACT_LEVEL = 4;
/** 선택 핀 라벨이 오른쪽으로 뻗는 폭(px). 가시 영역 판정에 반영 */
const PIN_LABEL_WIDTH = 140;
const PIN_HEIGHT = 60;

/** 행정구역 이름 축약: '서울특별시 중구 명동' → '서울 중구 명동' */
function shortRegionName(r: Record<string, string>): string {
  const d1 = (r.region_1depth_name || '').replace(/특별자치도|특별자치시|특별시|광역시/g, '');
  return [d1, r.region_2depth_name, r.region_3depth_name].filter(Boolean).join(' ');
}

export function KakaoExploreMap({
  restaurants,
  selectedId,
  onSelect,
  mapType,
  userLocation,
  initialCenter,
  initialLevel = INITIAL_LEVEL,
  flyTo,
  visibleInsets,
  onViewportChange,
  onRegionChange,
  onReadyChange,
  savedIds,
  distanceFor,
  reducedMotion,
  fetchStatus,
}: KakaoExploreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const listenersRef = useRef<{ name: string; handler: () => void }[]>([]);
  const overlaysRef = useRef<Map<string, OverlayEntry>>(new Map());
  const userOverlayRef = useRef<any>(null);
  const regionTimerRef = useRef<number | null>(null);
  const [nodes, setNodes] = useState<Map<string, HTMLDivElement>>(new Map());
  const [sdkState, setSdkState] = useState<SdkState>('loading');
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [level, setLevel] = useState(initialLevel);
  const [retryCount, setRetryCount] = useState(0);

  // 최신 콜백을 ref 로 유지 → 지도 리스너를 다시 바인딩하지 않아도 된다
  const callbacksRef = useRef({ onViewportChange, onRegionChange, onSelect, onReadyChange });
  useEffect(() => {
    callbacksRef.current = { onViewportChange, onRegionChange, onSelect, onReadyChange };
  });

  /** 현재 뷰포트(중심·반경)를 셸에 알림 */
  const emitViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const c = { lat: center.getLat(), lng: center.getLng() };
    const radiusKm = haversineKm(c, { lat: ne.getLat(), lng: ne.getLng() });
    callbacksRef.current.onViewportChange({ center: c, radiusKm, level: map.getLevel() });
  }, []);

  /** 행정동 라벨 조회 (디바운스) */
  const scheduleRegion = useCallback(() => {
    if (regionTimerRef.current !== null) window.clearTimeout(regionTimerRef.current);
    regionTimerRef.current = window.setTimeout(() => {
      regionTimerRef.current = null;
      const map = mapRef.current;
      const geocoder = geocoderRef.current;
      if (!map || !geocoder) return;
      const center = map.getCenter();
      geocoder.coord2RegionCode(center.getLng(), center.getLat(), (result: Record<string, string>[], status: string) => {
        if (status !== window.kakao.maps.services.Status.OK || !Array.isArray(result) || result.length === 0) {
          callbacksRef.current.onRegionChange(null);
          return;
        }
        const picked = result.find((r) => r.region_type === 'H') ?? result[0];
        callbacksRef.current.onRegionChange(shortRegionName(picked));
      });
    }, 500);
  }, []);

  // ---- SDK 로드 + 지도 생성 (마운트 1회, 재시도 시 재실행) ----
  useEffect(() => {
    let cancelled = false;
    setSdkState('loading');
    setSdkError(null);

    loadKakaoMapSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const kakao = window.kakao;
        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(initialCenter.lat, initialCenter.lng),
          level: Math.min(14, Math.max(1, initialLevel)),
        });
        mapRef.current = map;
        geocoderRef.current = kakao.maps.services?.Geocoder ? new kakao.maps.services.Geocoder() : null;

        const onIdle = () => {
          emitViewport();
          scheduleRegion();
        };
        const onZoom = () => setLevel(map.getLevel());
        const onClick = () => callbacksRef.current.onSelect(null);
        kakao.maps.event.addListener(map, 'idle', onIdle);
        kakao.maps.event.addListener(map, 'zoom_changed', onZoom);
        kakao.maps.event.addListener(map, 'click', onClick);
        listenersRef.current = [
          { name: 'idle', handler: onIdle },
          { name: 'zoom_changed', handler: onZoom },
          { name: 'click', handler: onClick },
        ];

        setSdkState('ready');
        callbacksRef.current.onReadyChange(true);
        // 최초 조회
        emitViewport();
        scheduleRegion();
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setSdkState('error');
        setSdkError(err.message || '지도를 불러오지 못했어요.');
        callbacksRef.current.onReadyChange(false);
      });

    return () => {
      cancelled = true;
      if (regionTimerRef.current !== null) {
        window.clearTimeout(regionTimerRef.current);
        regionTimerRef.current = null;
      }
      const map = mapRef.current;
      if (map && window.kakao?.maps?.event) {
        listenersRef.current.forEach(({ name, handler }) => window.kakao.maps.event.removeListener(map, name, handler));
      }
      listenersRef.current = [];
      overlaysRef.current.forEach(({ overlay }) => overlay.setMap(null));
      overlaysRef.current.clear();
      setNodes(new Map());
      if (userOverlayRef.current) {
        userOverlayRef.current.setMap(null);
        userOverlayRef.current = null;
      }
      mapRef.current = null;
      geocoderRef.current = null;
      callbacksRef.current.onReadyChange(false);
    };
    // initialCenter/initialLevel 은 마운트 시점 값만 사용 (이후 이동은 flyTo 로)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, emitViewport, scheduleRegion]);

  // 컨테이너 크기 변경(모바일↔데스크톱, 패널) 시 지도 재배치
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => mapRef.current?.relayout?.());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 지도 종류 (일반 / 스카이뷰 하이브리드)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sdkState !== 'ready') return;
    const { MapTypeId } = window.kakao.maps;
    map.setMapTypeId(mapType === 'sky' ? MapTypeId.HYBRID : MapTypeId.ROADMAP);
  }, [mapType, sdkState]);

  // 외부 이동 요청 (내 주변 · 지역 프리셋)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sdkState !== 'ready' || !flyTo) return;
    map.setLevel(flyTo.level ?? INITIAL_LEVEL);
    map.setCenter(new window.kakao.maps.LatLng(flyTo.center.lat, flyTo.center.lng));
  }, [flyTo, sdkState]);

  // 사용자 위치 표시 (파란 점)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sdkState !== 'ready') return;
    if (userOverlayRef.current) {
      userOverlayRef.current.setMap(null);
      userOverlayRef.current = null;
    }
    if (!userLocation) return;
    userOverlayRef.current = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      content:
        '<div role="img" aria-label="내 위치" style="width:18px;height:18px;background:#3B82F6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 6px rgba(59,130,246,0.25);"></div>',
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 5,
      map,
    });
  }, [userLocation, sdkState]);

  // ---- 식당 오버레이 diff 갱신 ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map || sdkState !== 'ready') return;
    const kakao = window.kakao;
    const current = overlaysRef.current;
    const nextIds = new Set(restaurants.filter((r) => r.coord).map((r) => r.id));
    let changed = false;

    current.forEach((entry, id) => {
      if (!nextIds.has(id)) {
        entry.overlay.setMap(null);
        current.delete(id);
        changed = true;
      }
    });
    for (const r of restaurants) {
      if (!r.coord || current.has(r.id)) continue;
      const node = document.createElement('div');
      node.style.cssText = 'position:relative;width:0;height:0;overflow:visible;';
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(r.coord.lat, r.coord.lng),
        content: node,
        xAnchor: 0,
        yAnchor: 0,
        zIndex: 1,
        clickable: true,
        map,
      });
      current.set(r.id, { overlay, node });
      changed = true;
    }
    if (changed) {
      setNodes(new Map(Array.from(current.entries()).map(([id, e]) => [id, e.node])));
    }
  }, [restaurants, sdkState]);

  // 선택 핀을 최상단으로
  useEffect(() => {
    overlaysRef.current.forEach((entry, id) => entry.overlay.setZIndex(id === selectedId ? 100 : 1));
  }, [selectedId, nodes]);

  // ---- 카메라 보정: 선택 핀이 검색창·패널에 가려지면 가시 영역 중앙으로 ----
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el || sdkState !== 'ready' || !selectedId) return;
    const r = restaurants.find((x) => x.id === selectedId);
    if (!r?.coord) return;
    const kakao = window.kakao;
    const proj = map.getProjection();
    const pt = proj.containerPointFromCoords(new kakao.maps.LatLng(r.coord.lat, r.coord.lng));
    const W = el.clientWidth;
    const H = el.clientHeight;
    const rect = {
      left: visibleInsets.left + 16,
      top: visibleInsets.top + PIN_HEIGHT + 8,
      right: W - visibleInsets.right - PIN_LABEL_WIDTH,
      bottom: H - visibleInsets.bottom - 12,
    };
    if (rect.right <= rect.left || rect.bottom <= rect.top) return; // 가시 영역이 없을 만큼 좁으면 보정 생략
    if (pt.x >= rect.left && pt.x <= rect.right && pt.y >= rect.top && pt.y <= rect.bottom) return;
    const dx = pt.x - (rect.left + rect.right) / 2;
    const dy = pt.y - (rect.top + rect.bottom) / 2;
    if (reducedMotion) {
      const c = proj.containerPointFromCoords(map.getCenter());
      map.setCenter(proj.coordsFromContainerPoint(new kakao.maps.Point(c.x + dx, c.y + dy)));
    } else {
      map.panBy(dx, dy);
    }
  }, [selectedId, visibleInsets, restaurants, sdkState, reducedMotion]);

  const zoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.setLevel(Math.min(14, Math.max(1, map.getLevel() + delta)), { animate: !reducedMotion });
  };

  const compact = level >= COMPACT_LEVEL;

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" aria-label="카카오 지도" role="application" />

      {/* 핀 포털 */}
      {restaurants.map((r) => {
        const node = nodes.get(r.id);
        if (!node) return null;
        const selected = r.id === selectedId;
        return createPortal(
          <div style={{ position: 'absolute', left: 0, top: 0, transform: 'translate(-50%, -100%)' }}>
            <RestaurantPin
              restaurant={r}
              selected={selected}
              compact={compact}
              distanceLabel={distanceFor(r)}
              saved={savedIds.has(r.id)}
              badge={selected && savedIds.has(r.id) ? '저장한 식당' : null}
              onSelect={onSelect}
            />
          </div>,
          node,
          r.id,
        );
      })}

      {/* 조회 상태 필 */}
      {sdkState === 'ready' && (fetchStatus === 'loading' || fetchStatus === 'error') && (
        <div
          role="status"
          className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold shadow ${
            fetchStatus === 'error' ? 'bg-rose-600 text-white' : 'bg-white/90 text-gray-700'
          }`}
          style={{ top: visibleInsets.top + 6 }}
        >
          {fetchStatus === 'error' ? '주변 식당 조회 실패 · 패널에서 다시 시도' : '주변 식당 불러오는 중…'}
        </div>
      )}

      {/* 확대/축소 */}
      {sdkState === 'ready' && (
        <div
          className="absolute right-3 z-20 flex flex-col overflow-hidden rounded-xl bg-white/90 shadow-md"
          style={{ bottom: visibleInsets.bottom + 12 }}
        >
          <button
            type="button"
            aria-label="지도 확대"
            onClick={() => zoom(-1)}
            className="flex h-11 w-11 items-center justify-center text-xl font-bold text-gray-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400"
          >
            +
          </button>
          <button
            type="button"
            aria-label="지도 축소"
            onClick={() => zoom(1)}
            className="flex h-11 w-11 items-center justify-center border-t border-gray-200 text-xl font-bold text-gray-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400"
          >
            −
          </button>
        </div>
      )}

      {/* SDK 로딩 / 실패 */}
      {sdkState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100" role="status">
          <div className="rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow">지도를 불러오는 중…</div>
        </div>
      )}
      {sdkState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 p-6" role="alert">
          <div className="max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg">
            <p className="text-base font-bold text-gray-900">지도를 불러오지 못했어요</p>
            <p className="mt-1 text-sm text-gray-600">{sdkError}</p>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="mt-3 min-h-[44px] rounded-full bg-rose-600 px-5 text-sm font-bold text-white hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
