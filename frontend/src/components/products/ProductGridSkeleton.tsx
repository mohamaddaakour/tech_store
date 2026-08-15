import { Skeleton } from "../ui/Skeleton";

interface ProductGridSkeletonProps {
  /** How many placeholder tiles to draw. Match the usual first-page size. */
  count?: number;
}

/**
 * The loading state for the product grid.
 *
 * Its layout classes are deliberately identical to `ProductGrid`'s. That is what
 * makes the transition seamless: real tiles land exactly where the grey blocks were,
 * with no jump. If the two ever drift apart, the page will visibly lurch when data
 * arrives — so if you change the grid columns, change them here too.
 */
export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {/* `Array.from({ length })` is the clean way to loop a fixed number of times
          in JSX -- `new Array(n).map()` does nothing, because the holes in a sparse
          array are skipped by `map`. */}
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
          {/* Same aspect ratio as the real image, so the box is the right shape. */}
          <Skeleton className="aspect-4/3 w-full rounded-none" />

          <div className="flex flex-col gap-2 p-4">
            {/* Varying widths mimic the shape of real text. Three identical full-width
                bars look like a loading bar; this reads as "a title and a description". */}
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
