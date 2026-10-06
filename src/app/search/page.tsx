'use client';

import { Suspense } from 'react';
import SearchContent from './SearchContent';
import { SkeletonSearchPage } from '@/components/common/Skeleton';

export default function SearchPage() {
  return (
    <Suspense fallback={<SkeletonSearchPage />}>
      <SearchContent />
    </Suspense>
  );
}