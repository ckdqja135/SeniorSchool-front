'use client';

import React from 'react';

/**
 * 데이터 조회 로딩 상태를 위한 공용 스켈레톤 컴포넌트 모음.
 *
 * 셔머 애니메이션은 globals.css 의 `.skeleton-box` 로 정의되어 있으며
 * 라이트/다크 모드를 모두 대응한다. 앱 전역의 로딩 표시를 이 컴포넌트들로
 * 통일해 사용한다.
 *
 * - 원자 단위: Skeleton, SkeletonText, SkeletonCircle
 * - 조합 프리셋: SkeletonCard, SkeletonCardGrid, SkeletonList, SkeletonTableRows
 * - 페이지 단위: SkeletonSearchPage, SkeletonDetailPage, SkeletonListPage
 */

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

/** 모든 스켈레톤의 기본 블록. className 으로 크기(w/h)를 지정한다. */
export function Skeleton({ className = '', ...rest }: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton-box rounded-md ${className}`} {...rest} />;
}

/** 원형(아바타/아이콘) 자리표시. */
export function SkeletonCircle({
  className = '',
  ...rest
}: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton-box rounded-full ${className}`} {...rest} />;
}

/** 여러 줄의 텍스트 자리표시. 마지막 줄은 짧게 표시한다. */
export function SkeletonText({
  lines = 3,
  className = '',
  lineClassName = '',
}: {
  lines?: number;
  className?: string;
  lineClassName?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'} ${lineClassName}`}
        />
      ))}
    </div>
  );
}

/** 카드 한 장(아이콘 + 제목 + 정보 줄). 그리드형 목록 조회에 사용. */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}
    >
      <div className="flex items-start space-x-4">
        <SkeletonCircle className="w-12 h-12 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-5 w-2/3 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 카드 그리드(검색/멘토 목록 조회용). */
export function SkeletonCardGrid({
  count = 6,
  className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** 세로 리스트(게시글/댓글/요청 등 행 목록 조회용). */
export function SkeletonList({
  rows = 5,
  withAvatar = false,
  className = '',
  itemClassName = 'bg-white rounded-xl border border-gray-200 p-4',
}: {
  rows?: number;
  withAvatar?: boolean;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex items-center gap-4 ${itemClassName}`}>
          {withAvatar && <SkeletonCircle className="w-10 h-10 flex-shrink-0" />}
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-3 w-10 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * 테이블 body 행 자리표시(관리자 목록 조회용).
 * 기존 `<tbody>` 내부의 `<tr><td colSpan>로딩 중...</td></tr>` 를 대체한다.
 */
export function SkeletonTableRows({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-3 py-3">
              <Skeleton className={`h-4 ${c === 0 ? 'w-3/4' : 'w-1/2'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** 전체 화면 검색/목록 조회 로딩(헤더 + 결과 그리드). */
export function SkeletonSearchPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-6 w-56 mb-6" />
        <SkeletonCardGrid count={6} />
      </main>
    </div>
  );
}

/** 전체 화면 상세 조회 로딩(제목 + 메타 + 본문 + 카드). */
export function SkeletonDetailPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <div className="flex items-center gap-3 mb-6">
            <SkeletonCircle className="w-10 h-10" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-56 w-full rounded-xl mb-6" />
          <SkeletonText lines={5} className="mb-4" />
          <SkeletonText lines={3} />
        </div>
      </div>
    </div>
  );
}

/** 전체 화면 리스트 조회 로딩(헤더 + 세로 리스트). */
export function SkeletonListPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-40 mb-6" />
        <SkeletonList rows={8} />
      </div>
    </div>
  );
}

export default Skeleton;
