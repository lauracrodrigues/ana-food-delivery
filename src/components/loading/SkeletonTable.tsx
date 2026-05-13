import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 8, cols = 5 }: SkeletonTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b bg-muted/30">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: i === 0 ? '30%' : `${60 / (cols - 1)}%` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 px-4 py-3 border-b last:border-0"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className="h-4"
              style={{
                width: col === 0 ? '30%' : `${60 / (cols - 1)}%`,
                opacity: 1 - row * 0.07,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
