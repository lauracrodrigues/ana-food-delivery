// Loader genérico para páginas com Suspense. Substitui o spinner básico do InlineLoader.
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoader() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-200">
      {/* Título da página */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      {/* Conteúdo genérico — 3 blocos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border bg-card p-5 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" style={{ opacity: 1 - i * 0.1 }} />
            <Skeleton className="h-4 w-24" style={{ opacity: 1 - i * 0.1 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
