'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} {...props} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-6 shadow-sm shadow-black/5 dark:shadow-black/30">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-8 w-40" />
      <Skeleton className="mt-3 h-3 w-24" />
    </div>
  );
}

export function SkeletonChart({ height = 320 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-6 shadow-sm shadow-black/5 dark:shadow-black/30">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-2 h-3 w-64" />
      <Skeleton className="mt-6 w-full" style={{ height }} />
    </div>
  );
}

export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-6 shadow-sm shadow-black/5 dark:shadow-black/30">
      <Skeleton className="h-4 w-44" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

