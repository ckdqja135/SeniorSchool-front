/**
 * matchMedia 구독 훅. 입체 탐색의 모바일/데스크톱 패널 배치, 축소 동작 선호 판단에 사용.
 * SSR 에서는 항상 false 를 돌려주고 마운트 후 실제 값으로 갱신한다.
 */
'use client';

import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** 데스크톱(패널을 옆에 도킹) 기준 */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');

/** 사용자의 '동작 줄이기' 선호 */
export const usePrefersReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
