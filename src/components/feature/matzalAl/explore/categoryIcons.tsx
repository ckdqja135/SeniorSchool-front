/**
 * 입체 탐색 카테고리 칩·핀에서 공용으로 쓰는 업종 아이콘(인라인 SVG).
 * 외부 아이콘 라이브러리를 추가하지 않기 위해 최소한의 선 아이콘만 직접 그린다.
 */
import type { ExploreCategory, ExploreCuisine } from '@/types/MatzalAl/explore';

/** 상단 칩 정의. 순서 = 참고 이미지 순서 */
export const CATEGORY_CHIPS: { key: ExploreCategory; label: string }[] = [
  { key: '전체', label: '전체' },
  { key: '한식', label: '한식' },
  { key: '일식', label: '일식' },
  { key: '양식', label: '양식' },
  { key: '중식', label: '중식' },
  { key: '카페', label: '카페 · 디저트' },
];

interface CategoryIconProps {
  cuisine: ExploreCuisine | ExploreCategory;
  className?: string;
}

/** 업종별 아이콘. '전체' 는 격자, '기타' 는 접시 */
export function CategoryIcon({ cuisine, className = 'w-4 h-4' }: CategoryIconProps) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
    'aria-hidden': true,
  };
  switch (cuisine) {
    case '전체':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1.5" />
          <rect x="14" y="4" width="6" height="6" rx="1.5" />
          <rect x="4" y="14" width="6" height="6" rx="1.5" />
          <rect x="14" y="14" width="6" height="6" rx="1.5" />
        </svg>
      );
    case '한식':
      // 밥그릇 + 젓가락
      return (
        <svg {...common}>
          <path d="M4 11h16a8 8 0 0 1-16 0z" />
          <path d="M9 19h6" />
          <path d="M8 3l3 6M16 3l-3 6" />
        </svg>
      );
    case '일식':
      // 초밥(밥 위 생선)
      return (
        <svg {...common}>
          <path d="M5 14h14a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-1a2 2 0 0 1 2-2z" />
          <path d="M6 14c0-4 3-7 6-7s6 3 6 7" />
          <path d="M10 9.5c1 .5 3 .5 4 0" />
        </svg>
      );
    case '양식':
      // 포크와 나이프
      return (
        <svg {...common}>
          <path d="M7 3v7a2 2 0 0 0 2 2v9" />
          <path d="M5 3v5M9 3v5" />
          <path d="M17 3c-2 2-3 5-3 8h3v10" />
        </svg>
      );
    case '중식':
      // 면 그릇
      return (
        <svg {...common}>
          <path d="M3 12h18a9 9 0 0 1-18 0z" />
          <path d="M6 9c2-2 4-2 6 0s4 2 6 0" />
          <path d="M8 20h8" />
        </svg>
      );
    case '카페':
      // 커피잔
      return (
        <svg {...common}>
          <path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" />
          <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
          <path d="M3 21h14" />
        </svg>
      );
    default:
      // 기타: 접시
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );
  }
}
