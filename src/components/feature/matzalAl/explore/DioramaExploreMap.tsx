/**
 * 입체(디오라마) 렌더러 — 실제 지리 데이터 + DB 식당.
 *
 * `KakaoExploreMap` 과 같은 계약을 지킨다 (restaurants/selectedId/onSelect/flyTo/onViewportChange/…).
 * three.js 씬은 `createCityScene` 이 만들고, 이 컴포넌트는 컨테이너·핀 DOM·조작 버튼·상태 표시만 담당한다.
 * - `restaurants` 는 핀으로 그릴 목록(필터 적용), `sceneRestaurants` 는 매장·간판을 세울 전체 주변 목록.
 * - 카메라 이동이 끝나면 onViewportChange 로 중심·반경을 알려 셸이 nearby 를 다시 조회한다.
 * - 행정동 라벨은 카카오 services Geocoder 를 재사용한다 (지도 없이 SDK 만 로드).
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadKakaoMapSdk } from '@/lib/matzalAl/kakaoMapLoader';
import type { CitySceneHandle } from '@/lib/matzalAl/diorama/cityScene';
import type { ExploreRestaurant, ExploreViewport, LatLng, VisibleInsets } from '@/types/MatzalAl/explore';
import type { FlyToRequest } from './KakaoExploreMap';

/** 매장 정면 카메라 요청 (패널 핫플·후기에서 식당을 골랐을 때). 같은 id 라도 다시 잡도록 토큰을 둔다 */
export interface FocusRequest {
  id: string;
  token: number;
}
import { RestaurantPin } from './RestaurantPin';

export interface DioramaExploreMapProps {
  restaurants: ExploreRestaurant[];
  sceneRestaurants: ExploreRestaurant[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  userLocation: LatLng | null;
  initialCenter: LatLng;
  initialLevel: number;
  flyTo: FlyToRequest | null;
  /** 핀 클릭과 같은 '매장 정면 카메라' 를 바깥에서 요청 (flyTo 뒤에 처리) */
  focusRequest?: FocusRequest | null;
  visibleInsets: VisibleInsets;
  onViewportChange: (vp: ExploreViewport) => void;
  onRegionChange: (label: string | null) => void;
  onReadyChange: (ready: boolean) => void;
  savedIds: Set<string>;
  distanceFor: (r: ExploreRestaurant) => string | null;
  reducedMotion: boolean;
  fetchStatus: 'idle' | 'loading' | 'success' | 'error';
}

type SceneState = 'loading' | 'ready' | 'error';

/** 행정구역 이름 축약: '서울특별시 중구 명동' → '서울 중구 명동' */
function shortRegionName(r: Record<string, string>): string {
  const d1 = (r.region_1depth_name || '').replace(/특별자치도|특별자치시|특별시|광역시/g, '');
  return [d1, r.region_2depth_name, r.region_3depth_name].filter(Boolean).join(' ');
}

export function DioramaExploreMap({
  restaurants,
  sceneRestaurants,
  selectedId,
  onSelect,
  userLocation,
  initialCenter,
  initialLevel,
  flyTo,
  focusRequest = null,
  visibleInsets,
  onViewportChange,
  onRegionChange,
  onReadyChange,
  savedIds,
  distanceFor,
  reducedMotion,
  fetchStatus,
}: DioramaExploreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<CitySceneHandle | null>(null);
  const pinsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedRef = useRef<string | null>(selectedId);
  const geocoderRef = useRef<any>(null);
  const regionTimerRef = useRef<number | null>(null);
  const [state, setState] = useState<SceneState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [tilesLoading, setTilesLoading] = useState(false);
  const [retry, setRetry] = useState(0);

  const callbacksRef = useRef({ onViewportChange, onRegionChange, onSelect, onReadyChange });
  useEffect(() => {
    callbacksRef.current = { onViewportChange, onRegionChange, onSelect, onReadyChange };
  });
  useEffect(() => {
    selectedRef.current = selectedId;
    handleRef.current?.setSelected(selectedId);
  }, [selectedId]);

  /** 행정동 라벨 조회 (디바운스) */
  const scheduleRegion = useCallback((center: LatLng) => {
    if (regionTimerRef.current !== null) window.clearTimeout(regionTimerRef.current);
    regionTimerRef.current = window.setTimeout(() => {
      regionTimerRef.current = null;
      const geocoder = geocoderRef.current;
      if (!geocoder) return;
      geocoder.coord2RegionCode(center.lng, center.lat, (result: Record<string, string>[], status: string) => {
        if (status !== window.kakao.maps.services.Status.OK || !Array.isArray(result) || result.length === 0) {
          callbacksRef.current.onRegionChange(null);
          return;
        }
        const picked = result.find((r) => r.region_type === 'H') ?? result[0];
        callbacksRef.current.onRegionChange(shortRegionName(picked));
      });
    }, 500);
  }, []);

  // ---- 씬 생성 (마운트 1회) ----
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    setState('loading');
    setError(null);

    loadKakaoMapSdk()
      .then(() => {
        if (cancelled) return;
        geocoderRef.current = window.kakao?.maps?.services?.Geocoder ? new window.kakao.maps.services.Geocoder() : null;
        scheduleRegion(initialCenter);
      })
      .catch(() => {
        geocoderRef.current = null;
      });

    import('@/lib/matzalAl/diorama/cityScene')
      .then(({ createCityScene }) => {
        if (cancelled || !containerRef.current) return;
        handleRef.current = createCityScene(containerRef.current, {
          initialCenter,
          initialLevel,
          reducedMotion,
          onSelect: (id) => callbacksRef.current.onSelect(id),
          onViewport: (vp) => {
            callbacksRef.current.onViewportChange({ center: vp.center, radiusKm: vp.radiusKm, level: vp.level });
            scheduleRegion(vp.center);
          },
          onLoading: setTilesLoading,
          pinElements: () => pinsRef.current,
          selectedId: () => selectedRef.current,
        });
        if (process.env.NODE_ENV !== 'production') (window as unknown as { __city: CitySceneHandle | null }).__city = handleRef.current;
        setState('ready');
        callbacksRef.current.onReadyChange(true);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState('error');
        setError(err.message || '입체 지도를 만들지 못했어요.');
        callbacksRef.current.onReadyChange(false);
      });

    return () => {
      cancelled = true;
      if (regionTimerRef.current !== null) window.clearTimeout(regionTimerRef.current);
      handleRef.current?.dispose();
      handleRef.current = null;
      callbacksRef.current.onReadyChange(false);
    };
    // initialCenter/initialLevel 은 마운트 시점 값만 사용 (이후 이동은 flyTo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry, reducedMotion, scheduleRegion]);

  // 식당 목록 → 씬
  useEffect(() => {
    if (state !== 'ready') return;
    handleRef.current?.setRestaurants(sceneRestaurants, new Set(restaurants.map((r) => r.id)));
  }, [sceneRestaurants, restaurants, state]);

  // 외부 이동 요청
  useEffect(() => {
    if (state !== 'ready' || !flyTo) return;
    handleRef.current?.flyTo(flyTo.center, flyTo.level);
  }, [flyTo, state]);

  // 외부 정면 카메라 요청 (flyTo 효과 뒤에 선언해 같은 렌더에서는 이동 → 정면 순으로 실행)
  useEffect(() => {
    if (state !== 'ready' || !focusRequest) return;
    handleRef.current?.focus(focusRequest.id);
  }, [focusRequest, state]);

  useEffect(() => {
    if (state !== 'ready') return;
    handleRef.current?.setUserLocation(userLocation);
  }, [userLocation, state]);

  const registerPin = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (node) pinsRef.current.set(id, node);
      else pinsRef.current.delete(id);
    },
    [],
  );

  const handlePinSelect = useCallback(
    (id: string) => {
      onSelect(id);
      handleRef.current?.focus(id);
    },
    [onSelect],
  );

  const buttonClass = 'flex h-11 w-11 items-center justify-center text-gray-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-400';

  return (
    <div className="absolute inset-0 bg-[#cbb9ab]">
      <style>{`
        [data-pin-wrap][data-mode="hidden"] { display: none; }
        [data-pin-wrap][data-mode="compact"] [data-pin-label] { display: none !important; }
      `}</style>
      <div ref={containerRef} className="absolute inset-0" role="application" aria-label="입체 동네 지도. 드래그 이동, 휠·핀치 확대, 우클릭 드래그 회전" />

      {/* 디오라마 비네트 */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(30,20,15,0.26) 100%)' }} />

      {/* 핀 레이어 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {restaurants.map((r) => (
          <div key={r.id} ref={registerPin(r.id)} data-pin-wrap data-mode="hidden" className="absolute left-0 top-0 will-change-transform">
            <div className="pointer-events-auto" style={{ transform: 'translate(-50%, -100%)' }}>
              <RestaurantPin
                restaurant={r}
                selected={r.id === selectedId}
                distanceLabel={distanceFor(r)}
                saved={savedIds.has(r.id)}
                badge={r.id === selectedId && savedIds.has(r.id) ? '저장한 식당' : null}
                onSelect={handlePinSelect}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 상태 필 */}
      {state === 'ready' && (fetchStatus === 'loading' || fetchStatus === 'error' || tilesLoading) && (
        <div
          role="status"
          className={`pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold shadow ${
            fetchStatus === 'error' ? 'bg-rose-600 text-white' : 'bg-white/90 text-gray-700'
          }`}
          style={{ top: visibleInsets.top + 6 }}
        >
          {fetchStatus === 'error' ? '주변 식당 조회 실패 · 패널에서 다시 시도' : tilesLoading ? '동네를 짓는 중…' : '주변 식당 불러오는 중…'}
        </div>
      )}

      {/* 조작 버튼 */}
      {state === 'ready' && (
        <div className="absolute right-3 z-20 flex flex-col overflow-hidden rounded-xl bg-white/90 shadow-md" style={{ bottom: visibleInsets.bottom + 12 }}>
          <button type="button" aria-label="확대" onClick={() => handleRef.current?.zoomBy(1.25)} className={`${buttonClass} text-xl font-bold`}>
            +
          </button>
          <button type="button" aria-label="축소" onClick={() => handleRef.current?.zoomBy(0.8)} className={`${buttonClass} border-t border-gray-200 text-xl font-bold`}>
            −
          </button>
          <button type="button" aria-label="왼쪽으로 회전" title="회전 (우클릭 드래그로도 가능)" onClick={() => handleRef.current?.rotateBy(-Math.PI / 6)} className={`${buttonClass} border-t border-gray-200`}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.6 14.9A8 8 0 0019.4 9.1M19.4 9.1L20 4M4.6 14.9L4 20" />
            </svg>
          </button>
          <button type="button" aria-label="기본 시점으로" title="시점 초기화" onClick={() => handleRef.current?.resetView()} className={`${buttonClass} border-t border-gray-200`}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />
            </svg>
          </button>
        </div>
      )}

      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#cbb9ab]" role="status">
          <div className="rounded-full bg-white/90 px-4 py-2 text-sm text-gray-700 shadow">동네를 짓는 중…</div>
        </div>
      )}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#cbb9ab] p-6" role="alert">
          <div className="max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg">
            <p className="text-base font-bold text-gray-900">입체 지도를 만들지 못했어요</p>
            <p className="mt-1 text-sm text-gray-600">{error}</p>
            <p className="mt-1 text-xs text-gray-500">아래 '지도' 버튼으로 일반 지도에서 계속 볼 수 있어요.</p>
            <button
              type="button"
              onClick={() => setRetry((c) => c + 1)}
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
