/**
 * 정보 패널의 '핫플' · '후기' 탭이 공용으로 쓰는 작은 조각들 (제목줄 + 새로고침, 순위 배지).
 */
'use client';

/** 목록 제목 + 새로고침 버튼 */
export function PanelListHeader({ title, refreshing, onRefresh }: { title: string; refreshing: boolean; onRefresh: () => void }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-busy={refreshing}
        className="flex min-h-[32px] items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50"
      >
        <svg className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {refreshing ? '갱신 중…' : '새로고침'}
      </button>
    </div>
  );
}

/** 순위 배지. 1~3위는 강조색 */
export function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
        rank <= 3 ? 'bg-rose-600' : 'bg-gray-400'
      }`}
      aria-label={`${rank}위`}
    >
      {rank}
    </span>
  );
}
