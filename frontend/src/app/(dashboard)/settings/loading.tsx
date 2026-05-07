import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <div className="h-7 w-64 rounded bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded bg-muted animate-pulse" />
      </div>

      <SkeletonTable rows={4} />
      <SkeletonTable rows={5} />
      <SkeletonCard />
    </div>
  );
}

