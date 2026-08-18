import { Skeleton } from "../ui/Skeleton";

interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
          <Skeleton className="aspect-4/3 w-full rounded-none" />

          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-full" />
            <Skeleton className="h-2.5 w-2/3" />
            <Skeleton className="mt-2 h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
