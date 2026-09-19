/**
 * 주변 식당 조회 훅 (`GET /restaurant/nearby`).
 *
 * 지도 이동이 끝날 때마다 호출되므로 다음을 보장한다.
 * - 디바운스: 연속된 idle 이벤트를 350ms 로 묶는다.
 * - 중복 요청 방지: 직전 조회 중심에서 반경의 20% 미만으로 움직였고 반경 차이도 20% 미만이면 건너뛴다.
 * - 요청 취소: 새 요청이 나가면 진행 중인 요청은 AbortController 로 취소한다.
 * - 결과 수 제한: limit 은 호출부가 정하되 여기서 최대 200(백엔드 기본값)으로 캡.
 * - 언마운트 시 타이머·요청 정리.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adaptNearbyResponse, haversineKm } from '@/lib/matzalAl/exploreAdapter';
import type { ExploreRestaurant, NearbyQuery } from '@/types/MatzalAl/explore';

export type NearbyStatus = 'idle' | 'loading' | 'success' | 'error';

const DEBOUNCE_MS = 350;
const MAX_LIMIT = 200;

/** 백엔드 URL. 다른 lib 파일과 같은 env 사용 */
const BACKEND_URL = process.env.NEXT_PUBLIC_BASE_URL;

/** 직전 조회와 사실상 같은 영역인지 판단 (중복 요청 방지 기준) */
function isSameArea(prev: NearbyQuery, next: NearbyQuery): boolean {
  const moved = haversineKm({ lat: prev.lat, lng: prev.lng }, { lat: next.lat, lng: next.lng });
  const radiusDiff = Math.abs(prev.radiusKm - next.radiusKm) / Math.max(prev.radiusKm, 0.01);
  return moved < prev.radiusKm * 0.2 && radiusDiff < 0.2 && prev.limit === next.limit;
}

export function useNearbyRestaurants() {
  const [restaurants, setRestaurants] = useState<ExploreRestaurant[]>([]);
  const [status, setStatus] = useState<NearbyStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<NearbyQuery | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastQueryRef = useRef<NearbyQuery | null>(null);
  /** 마지막으로 요청한 쿼리(디바운스 대기 포함). force 재조회 시 사용 */
  const pendingQueryRef = useRef<NearbyQuery | null>(null);

  /** 진행 중인 요청·대기 타이머 취소 */
  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  /** 실제 네트워크 요청 */
  const execute = useCallback(async (query: NearbyQuery) => {
    if (!BACKEND_URL) {
      setStatus('error');
      setError('백엔드 주소(NEXT_PUBLIC_BASE_URL)가 설정되지 않았습니다.');
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('loading');
    setError(null);
    lastQueryRef.current = query;
    setLastQuery(query);

    const params = new URLSearchParams({
      lat: String(query.lat),
      lng: String(query.lng),
      radius: String(query.radiusKm),
      limit: String(Math.min(query.limit, MAX_LIMIT)),
    });

    try {
      const res = await fetch(`${BACKEND_URL}/restaurant/nearby?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (controller.signal.aborted) return;
      setRestaurants(adaptNearbyResponse(json));
      setStatus('success');
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return; // 취소는 오류가 아님
      console.error('[useNearbyRestaurants] 조회 실패:', err);
      setStatus('error');
      setError('주변 식당을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, []);

  /**
   * 조회 요청. 디바운스 + 중복 방지 적용.
   * @param options.force 중복 방지 무시(재시도·내 주변 버튼 등)
   */
  const request = useCallback(
    (query: NearbyQuery, options?: { force?: boolean }) => {
      pendingQueryRef.current = query;
      if (!options?.force && lastQueryRef.current && isSameArea(lastQueryRef.current, query)) return;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void execute(query);
      }, DEBOUNCE_MS);
    },
    [execute],
  );

  /** 직전(또는 대기 중) 쿼리를 즉시 재조회 — 오류 화면의 '다시 시도' 용 */
  const refetch = useCallback(() => {
    const q = pendingQueryRef.current || lastQueryRef.current;
    if (!q) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    void execute(q);
  }, [execute]);

  // 언마운트 정리
  useEffect(() => cancel, [cancel]);

  return { restaurants, status, error, lastQuery, request, refetch, cancel };
}
