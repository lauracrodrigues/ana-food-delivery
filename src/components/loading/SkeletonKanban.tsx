import { Skeleton } from "@/components/ui/skeleton";

function SkeletonOrderCard({ opacity = 1 }: { opacity?: number }) {
  return (
    <div
      className="rounded-lg border bg-card p-3 space-y-2"
      style={{ opacity }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-28" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex gap-1 pt-1">
        <Skeleton className="h-7 flex-1 rounded" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
    </div>
  );
}

function SkeletonColumn({ cardCount = 3 }: { cardCount?: number }) {
  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-5 w-6 rounded-full" />
      </div>
      {/* Cards */}
      <div className="space-y-2">
        {Array.from({ length: cardCount }).map((_, i) => (
          <SkeletonOrderCard key={i} opacity={1 - i * 0.15} />
        ))}
      </div>
    </div>
  );
}

const COLUMN_CARDS = [4, 3, 2, 2, 1];

export function SkeletonKanban() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      {/* Columns */}
      <div className="flex gap-3 p-4 overflow-x-auto flex-1">
        {COLUMN_CARDS.map((count, i) => (
          <SkeletonColumn key={i} cardCount={count} />
        ))}
      </div>
    </div>
  );
}
