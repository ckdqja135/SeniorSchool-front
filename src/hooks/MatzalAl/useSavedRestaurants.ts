/**
 * '저장' 버튼용 훅.
 *
 * 백엔드에 즐겨찾기/저장 API 가 없어서(routes/restaurant.router.js 확인) 브라우저 localStorage 에만 보관한다.
 * UI 에서는 '내 기기에 저장' 처럼 저장 범위를 드러내 서버 동기화로 오해하지 않게 한다.
 * 저장 키는 `ExploreRestaurant.id`('api:174') 를 그대로 쓴다.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'matzalAlSavedRestaurants';

function readStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function writeStorage(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* 사생활 보호 모드 등에서 실패해도 화면 상태는 유지 */
  }
}

export function useSavedRestaurants() {
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  // setState 업데이터는 지연 실행될 수 있어 토글 결과를 즉시 알기 위해 ref 로 미러링
  const savedRef = useRef<Set<string>>(savedIds);

  // 클라이언트에서만 읽는다 (SSR 불일치 방지)
  useEffect(() => {
    const initial = new Set(readStorage());
    savedRef.current = initial;
    setSavedIds(initial);
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  /** 토글 후 새 저장 여부를 돌려준다 (토스트 문구용) */
  const toggleSaved = useCallback((id: string): boolean => {
    const next = new Set(savedRef.current);
    const nowSaved = !next.has(id);
    if (nowSaved) next.add(id);
    else next.delete(id);
    savedRef.current = next;
    writeStorage(Array.from(next));
    setSavedIds(next);
    return nowSaved;
  }, []);

  return { savedIds, isSaved, toggleSaved };
}
