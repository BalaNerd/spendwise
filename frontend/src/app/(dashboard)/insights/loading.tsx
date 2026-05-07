import { SkeletonCard, SkeletonChart } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded bg-muted animate-pulse" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonChart height={320} />
        <SkeletonChart height={320} />
      </div>

      <SkeletonChart height={140} />
    </div>
  );
}

