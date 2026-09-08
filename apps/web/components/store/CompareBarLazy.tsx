'use client';

import dynamic from 'next/dynamic';

export const CompareBarLazy = dynamic(
  () => import('@/components/store/CompareBar').then((mod) => ({ default: mod.CompareBar })),
  { ssr: false }
);
