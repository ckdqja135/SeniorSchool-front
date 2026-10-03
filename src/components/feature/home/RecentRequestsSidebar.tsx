'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '@/components/common/ThemeProvider';
import { fetchRecentRequests, RecentRequestItem, RequestStatus, RequestServiceKey } from '@/lib/requests/requestsAPI';

const STATUS_META: Record<RequestStatus, { label: string; badge: string; dot: string }> = {
  pending:   { label: '대기중',   badge: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  completed: { label: '처리완료', badge: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  rejected:  { label: '반려',     badge: 'bg-rose-100 text-rose-700 border-rose-200',     dot: 'bg-rose-500' },
};

const SERVICE_EMOJI: Record<RequestServiceKey, string> = {
  church: '⛪',
  restaurant: '🍚',
  outsource: '💼',
  comp: '🏢',
  univ: '🎓',
};

const FAN_RADIUS = 90;

const formatDate = (value: string): string => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

interface RequestsListProps {
  items: RecentRequestItem[];
  loading: boolean;
  error: string | null;
  onMemoClick: (item: RecentRequestItem) => void;
}

function RequestsList({ items, loading, error, onMemoClick }: RequestsListProps) {
  if (loading) {
    return (
      <ul className="p-3 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
          </li>
        ))}
      </ul>
    );
  }
  if (error) {
    return <div className="p-4 text-xs text-rose-600">{error}</div>;
  }
  if (items.length === 0) {
    return <div className="p-4 text-xs text-gray-400 text-center">아직 신청 내역이 없어요.</div>;
  }
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-700">
      {items.map((item) => {
        const status = STATUS_META[item.requestStatus];
        return (
          <li key={`${item.service}-${item.requestIdx}`} className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span>{SERVICE_EMOJI[item.service]}</span>
                <span>{item.serviceLabel}</span>
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${status.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={item.name}>
              {item.name}
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] text-gray-400">{formatDate(item.requestDate)}</p>
              {item.adminNote && item.adminNote.trim() && (
                <button
                  type="button"
                  onClick={() => onMemoClick(item)}
                  className="inline-flex items-center px-2.5 py-1 text-[10px] font-semibold rounded-full text-indigo-700 bg-white border border-indigo-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:text-indigo-300 dark:bg-gray-800 dark:border-indigo-500/50 dark:hover:bg-indigo-600 dark:hover:text-white dark:hover:border-indigo-600 shadow-sm hover:shadow active:scale-95 transition-all duration-150"
                  aria-label="관리자 메모 보기"
                >
                  메모 보기
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function RecentRequestsSidebar() {
  const { theme, toggleTheme, setHideDefaultToggle } = useTheme();
  const [items, setItems] = useState<RecentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fanOpen, setFanOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [memoItem, setMemoItem] = useState<RecentRequestItem | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('recentRequestsCollapsed');
    if (stored === '1') setDesktopCollapsed(true);
    try {
      const raw = localStorage.getItem('recentRequestsSeen');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setSeenIds(new Set(arr));
      }
    } catch {}
  }, []);

  const toggleDesktopCollapsed = useCallback(() => {
    setDesktopCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('recentRequestsCollapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchRecentRequests(20);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  // 홈에서는 전역 ThemeToggle 숨김
  useEffect(() => {
    setHideDefaultToggle(true);
    return () => setHideDefaultToggle(false);
  }, [setHideDefaultToggle]);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

  const unseenPending = useMemo(
    () => items.filter(i => i.requestStatus === 'pending' && !seenIds.has(`${i.service}-${i.requestIdx}`)).length,
    [items, seenIds]
  );

  // 사용자가 목록을 보고 있을 때 현재 pending 건들을 '확인됨'으로 마킹
  useEffect(() => {
    const viewing = (!desktopCollapsed) || sheetOpen;
    if (!viewing) return;
    const pendingIds = items
      .filter(i => i.requestStatus === 'pending')
      .map(i => `${i.service}-${i.requestIdx}`);
    if (pendingIds.length === 0) return;
    setSeenIds(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const id of pendingIds) {
        if (!next.has(id)) { next.add(id); changed = true; }
      }
      if (!changed) return prev;
      try { localStorage.setItem('recentRequestsSeen', JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [items, desktopCollapsed, sheetOpen]);

  // 2개 아이템 부채꼴: 110°, 160°
  const fanItems = useMemo(() => {
    const angles = [110, 160];
    return angles.map(a => {
      const rad = (a * Math.PI) / 180;
      return { x: Math.cos(rad) * FAN_RADIUS, y: -Math.sin(rad) * FAN_RADIUS };
    });
  }, []);

  const handleSheetOpen = () => {
    setSheetOpen(true);
    setFanOpen(false);
  };

  const handleToggleTheme = () => {
    toggleTheme();
    setFanOpen(false);
  };

  return (
    <>
      {/* 데스크톱: 우측 고정 사이드바 (펼침) */}
      {!desktopCollapsed && (
        <aside
          className="hidden xl:block fixed top-24 right-6 w-72 max-h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm z-30 overflow-hidden"
          aria-label="최근 신청 현황"
        >
          <div
            role="button"
            tabIndex={0}
            onClick={toggleDesktopCollapsed}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDesktopCollapsed();
              }
            }}
            aria-label="사이드바 접기"
            title="클릭해서 접기"
            className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">신청 현황</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); load(); }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                새로고침
              </button>
              <span className="text-gray-400" aria-hidden="true">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-12rem)]">
            <RequestsList items={items} loading={loading} error={error} onMemoClick={setMemoItem} />
          </div>
        </aside>
      )}

      {/* 데스크톱: 접혀 있을 때의 작은 핸들 */}
      {desktopCollapsed && (
        <button
          type="button"
          onClick={toggleDesktopCollapsed}
          className="hidden xl:flex fixed top-24 right-6 z-30 items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm px-3 py-2 hover:shadow-md transition-shadow"
          aria-label="신청 현황 펼치기"
          title="신청 현황 펼치기"
        >
          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">신청 현황</span>
          {unseenPending > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[1.1rem] text-center">
              {unseenPending}
            </span>
          )}
        </button>
      )}

      {/* 모바일/태블릿: 설정 FAB + 부채꼴 */}
      <div className="xl:hidden">
        {fanOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 animate-[fadeIn_0.15s_ease-out]"
            onClick={() => setFanOpen(false)}
          />
        )}

        <div className="fixed bottom-6 right-4 z-40 pointer-events-none">
          {/* 부채꼴 아이템 1: 다크모드 토글 */}
          <button
            type="button"
            onClick={handleToggleTheme}
            style={
              fanOpen
                ? { transform: `translate(${fanItems[0].x}px, ${fanItems[0].y}px) scale(1)`, opacity: 1, transitionDelay: '0ms' }
                : { transform: 'translate(0, 0) scale(0.2)', opacity: 0, transitionDelay: '30ms' }
            }
            className="pointer-events-auto absolute bottom-0 right-0 w-12 h-12 rounded-full shadow-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center transition-all duration-300 ease-out active:scale-90"
            aria-label={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            tabIndex={fanOpen ? 0 : -1}
          >
            {theme === 'dark' ? (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" clipRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>

          {/* 부채꼴 아이템 2: 신청 목록 */}
          <button
            type="button"
            onClick={handleSheetOpen}
            style={
              fanOpen
                ? { transform: `translate(${fanItems[1].x}px, ${fanItems[1].y}px) scale(1)`, opacity: 1, transitionDelay: '30ms' }
                : { transform: 'translate(0, 0) scale(0.2)', opacity: 0, transitionDelay: '0ms' }
            }
            className="pointer-events-auto absolute bottom-0 right-0 w-12 h-12 rounded-full shadow-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center transition-all duration-300 ease-out active:scale-90"
            aria-label="신청 목록 열기"
            tabIndex={fanOpen ? 0 : -1}
          >
            <span className="text-xl leading-none">📋</span>
            {unseenPending > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[1.1rem] text-center border-2 border-white dark:border-gray-700">
                {unseenPending}
              </span>
            )}
          </button>

          {/* 메인 FAB: 톱니바퀴 */}
          <button
            type="button"
            onClick={() => setFanOpen(v => !v)}
            className="pointer-events-auto relative w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
            aria-label={fanOpen ? '메뉴 닫기' : '설정 메뉴 열기'}
            aria-expanded={fanOpen}
          >
            <svg
              className="w-6 h-6 transition-transform duration-300"
              style={{ transform: fanOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!fanOpen && unseenPending > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-bold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center border-2 border-white">
                {unseenPending}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 바텀시트 */}
      {sheetOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="신청 현황">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl max-h-[75vh] flex flex-col animate-[slideUp_0.2s_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">신청 현황</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={load}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                  새로고침
                </button>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  aria-label="닫기"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <RequestsList items={items} loading={loading} error={error} onMemoClick={setMemoItem} />
            </div>
          </div>
        </div>
      )}

      {/* 메모 팝업 */}
      {memoItem && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="관리자 메모"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setMemoItem(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-[popIn_0.15s_ease-out]">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{SERVICE_EMOJI[memoItem.service]}</span>
                  <span>{memoItem.serviceLabel}</span>
                  <span className={`ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${STATUS_META[memoItem.requestStatus].badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_META[memoItem.requestStatus].dot}`} />
                    {STATUS_META[memoItem.requestStatus].label}
                  </span>
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 truncate" title={memoItem.name}>
                  {memoItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMemoItem(null)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                aria-label="닫기"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2">관리자 메모</p>
              <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
                {memoItem.adminNote || '메모가 없습니다.'}
              </p>
              {memoItem.processedDate && (
                <p className="text-[11px] text-gray-400 mt-4">
                  처리일: {new Date(memoItem.processedDate).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
