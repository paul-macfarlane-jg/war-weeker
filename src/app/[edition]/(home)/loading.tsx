import { PageSkeleton, RowSkeleton } from "@/components/page-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Hero, Now/Next cards, then a few standings rows. */
export default function Loading() {
  return (
    <PageSkeleton title={false}>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <RowSkeleton key={index} className="h-10" />
        ))}
      </div>
    </PageSkeleton>
  );
}
