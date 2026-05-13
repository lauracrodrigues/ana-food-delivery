import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonMetricsGrid } from "./SkeletonCard";

function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Bars */}
      <div className="flex items-end gap-2 h-36 pt-4">
        {[60, 85, 40, 70, 90, 55, 75].map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%`, opacity: 0.5 + i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <Skeleton className="h-5 w-36" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-28" style={{ opacity: 1 - i * 0.1 }} />
            </div>
            <Skeleton className="h-4 w-16" style={{ opacity: 1 - i * 0.1 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <SkeletonMetricsGrid />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonChart className="lg:col-span-2" />
        <SkeletonChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonList />
        <SkeletonList />
      </div>
    </div>
  );
}
