/**
 * 디오라마 시각 시제품 화면 (/matzal-al-mentor/diorama).
 *
 * 목적: 참고 시안(해 질 무렵 미니어처 동네)과 나란히 비교하며 도시 장면의 품질을 먼저 맞춘다.
 * 실데이터·검색·예약 패널은 이 단계에서 다루지 않는다. 식당 5곳(고정 표본)·카메라 이동/확대/회전·핀 선택만 있다.
 *
 * - three.js 씬은 `createDioramaScene` 이 만들고, 이 컴포넌트는 컨테이너·핀 DOM·간단한 조작 버튼만 담당한다.
 * - 핀은 기존 `RestaurantPin` 을 그대로 쓰고, 위치·겹침 처리는 씬이 DOM 을 직접 갱신한다.
 */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/MatzalAl/useMediaQuery';
import { DEFAULT_SELECTED_ID, PROTOTYPE_RESTAURANTS } from '@/lib/matzalAl/diorama/layout';
import type { DioramaHandle } from '@/lib/matzalAl/diorama/dioramaScene';
import { formatDistance } from '@/lib/matzalAl/exploreAdapter';
import { RestaurantPin } from '@/components/feature/matzalAl/explore/RestaurantPin';

const EMPTY_SAVED = new Set<string>();

export default function DioramaLab() {
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<DioramaHandle | null>(null);
  const pinsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedRef = useRef<string | null>(DEFAULT_SELECTED_ID);
  const [selectedId, setSelectedId] = useState<string | null>(DEFAULT_SELECTED_ID);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    selectedRef.current = selectedId;
    handleRef.current?.setSelected(selectedId);
  }, [selectedId]);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) handleRef.current?.focus(id);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    setStatus('loading');
    import('@/lib/matzalAl/diorama/dioramaScene')
      .then(({ createDioramaScene }) => {
        if (cancelled || !containerRef.current) return;
        handleRef.current = createDioramaScene(containerRef.current, {
          reducedMotion,
          onSelect: handleSelect,
          pinElements: () => pinsRef.current,
          selectedId: () => selectedRef.current,
        });
        setStatus('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setStatus('error');
        setError(err.message || '3D 장면을 만들지 못했어요.');
      });
    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
    // reducedMotion 변경은 재생성 대상 (드물다)
  }, [reducedMotion, handleSelect]);

  const registerPin = useCallback((id: string) => (node: HTMLDivElement | null) => {
    if (node) pinsRef.current.set(id, node);
    else pinsRef.current.delete(id);
  }, []);

  const selected = PROTOTYPE_RESTAURANTS.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#cbb9ab] text-gray-900">
      {/* 핀·라벨 숨김 규칙: 씬이 data-mode 를 갱신한다 */}
      <style>{`
        [data-pin-wrap][data-mode="hidden"] { display: none; }
        [data-pin-wrap][data-mode="compact"] [data-pin-label] { display: none !important; }
      `}</style>

      <div ref={containerRef} className="absolute inset-0" aria-label="디오라마 3D 장면 (시제품)" role="application" />

      {/* 디오라마 비네트 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(30,20,15,0.28) 100%)' }}
      />

      {/* 핀 레이어 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PROTOTYPE_RESTAURANTS.map((r) => (
          <div
            key={r.id}
            ref={registerPin(r.id)}
            data-pin-wrap
            data-mode="hidden"
            className="absolute left-0 top-0 will-change-transform"
          >
            <div className="pointer-events-auto" style={{ transform: 'translate(-50%, -100%)' }}>
              <RestaurantPin
                restaurant={r}
                selected={r.id === selectedId}
                distanceLabel={formatDistance(r.distanceKm)}
                saved={EMPTY_SAVED.has(r.id)}
                badge={r.id === selectedId && r.id === 'proto:5' ? '웨이팅 9명 · 시제품' : null}
                onSelect={handleSelect}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 상단: 시제품 안내 */}
      {/* 사이트 공통 테마 버튼(우상단)과 겹치지 않게 왼쪽에 모아 둔다 */}
      <div className="pointer-events-none absolute left-0 top-0 z-30 flex items-center gap-2 p-3 sm:p-4">
        <div className="pointer-events-auto rounded-2xl bg-white/85 px-3.5 py-2 shadow-md backdrop-blur">
          <p className="text-[13px] font-bold">디오라마 시제품 · 오리동 사거리</p>
          <p className="text-[11px] text-gray-600">가상 블록 · 식당 5곳 고정 표본 · 실데이터 미연동</p>
        </div>
        <Link
          href="/matzal-al-mentor"
          className="pointer-events-auto rounded-full bg-gray-900/85 px-3.5 py-2 text-[13px] font-semibold text-white shadow-md hover:bg-gray-900"
        >
          맛잘알로 돌아가기
        </Link>
      </div>

      {/* 우하단: 카메라 조작 */}
      {status === 'ready' && (
        <div className="absolute bottom-4 right-3 z-30 flex flex-col overflow-hidden rounded-xl bg-white/90 shadow-md">
          <button type="button" aria-label="확대" onClick={() => handleRef.current?.zoomBy(1.25)} className="flex h-11 w-11 items-center justify-center text-xl font-bold text-gray-700 hover:bg-white">
            +
          </button>
          <button type="button" aria-label="축소" onClick={() => handleRef.current?.zoomBy(0.8)} className="flex h-11 w-11 items-center justify-center border-t border-gray-200 text-xl font-bold text-gray-700 hover:bg-white">
            −
          </button>
          <button type="button" aria-label="왼쪽으로 회전" onClick={() => handleRef.current?.rotateBy(-Math.PI / 6)} className="flex h-11 w-11 items-center justify-center border-t border-gray-200 text-gray-700 hover:bg-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.6 14.9A8 8 0 0019.4 9.1M19.4 9.1L20 4M4.6 14.9L4 20" />
            </svg>
          </button>
          <button type="button" aria-label="처음 시점" onClick={() => handleRef.current?.resetView()} className="flex h-11 w-11 items-center justify-center border-t border-gray-200 text-gray-700 hover:bg-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />
            </svg>
          </button>
        </div>
      )}

      {/* 좌하단: 선택 식당 요약 (패널 완성본이 아니라 확인용 최소 카드) */}
      <div className="absolute bottom-4 left-3 z-30 w-[min(92vw,360px)] rounded-2xl bg-white/90 p-3.5 shadow-xl backdrop-blur">
        {selected ? (
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">{selected.name}</h2>
              <span className="text-xs text-gray-500">{selected.typeLabel}</span>
            </div>
            <p className="mt-0.5 text-sm text-amber-600">
              ★ {selected.averageRating?.toFixed(1)} <span className="text-gray-500">({selected.ratingCount})</span>
              <span className="ml-2 text-gray-500">{formatDistance(selected.distanceKm)}</span>
            </p>
            <p className="mt-1 text-xs text-gray-500">건물을 누르거나 핀을 눌러 다른 식당 선택 · 드래그 이동 · 휠 확대 · 우클릭 드래그 회전</p>
          </div>
        ) : (
          <p className="text-sm text-gray-700">식당 건물이나 핀을 눌러 선택하세요. 드래그로 이동, 휠로 확대, 우클릭 드래그로 회전.</p>
        )}
      </div>

      {status === 'loading' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#cbb9ab]" role="status">
          <div className="rounded-full bg-white/90 px-4 py-2 text-sm text-gray-700 shadow">동네를 짓는 중…</div>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#cbb9ab] p-6" role="alert">
          <div className="max-w-sm rounded-2xl bg-white p-5 text-center shadow-lg">
            <p className="text-base font-bold">3D 장면을 만들지 못했어요</p>
            <p className="mt-1 text-sm text-gray-600">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
