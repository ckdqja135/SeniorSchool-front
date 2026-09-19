/**
 * 지도 모드 전환 스택 (좌하단 입체 / 지도 / 위성). 셋 다 같은 DB 데이터를 그린다.
 *
 * - 입체: three.js 디오라마 (OpenFreeMap 벡터 타일 건물 외곽선 + DB 식당 매장·간판)
 * - 지도: 카카오 일반 지도
 * - 위성: 카카오 스카이뷰 하이브리드. 지도가 준비된 뒤에만 노출 (`satelliteAvailable`)
 */
'use client';

import type { ExploreRenderer } from '@/types/MatzalAl/explore';

interface ExploreModeControlProps {
  renderer: ExploreRenderer;
  onChange: (renderer: ExploreRenderer) => void;
  /** 지도 준비 완료 여부 → 위성 버튼 노출 조건 */
  satelliteAvailable: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ICONS = {
  tilt: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </svg>
  ),
  road: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v14M15 6v14" />
    </svg>
  ),
  sky: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path strokeLinecap="round" d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" />
    </svg>
  ),
};

export function ExploreModeControl({ renderer, onChange, satelliteAvailable, className = '', style }: ExploreModeControlProps) {
  const items: { key: ExploreRenderer; label: string; hint: string; show: boolean }[] = [
    { key: 'tilt', label: '입체', hint: '입체 동네 (3D 디오라마)', show: true },
    { key: 'road', label: '지도', hint: '카카오 일반 지도', show: true },
    { key: 'sky', label: '위성', hint: '카카오 스카이뷰', show: satelliteAvailable },
  ];

  return (
    <div
      role="group"
      aria-label="지도 모드"
      className={`flex flex-col overflow-hidden rounded-2xl bg-gray-900/80 text-white shadow-lg ${className}`}
      style={style}
    >
      {items
        .filter((i) => i.show)
        .map((item) => {
          const active = renderer === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              title={item.hint}
              onClick={() => onChange(item.key)}
              className={`flex min-h-[44px] items-center gap-2 px-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300 ${
                active ? 'bg-rose-600 text-white' : 'text-gray-100 hover:bg-white/10'
              }`}
            >
              {ICONS[item.key]}
              <span>{item.label}</span>
            </button>
          );
        })}
    </div>
  );
}
