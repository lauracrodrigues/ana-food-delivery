import { Skeleton } from "@/components/ui/skeleton";

function SkeletonBubble({ right = false, width = "60%" }: { right?: boolean; width?: string }) {
  return (
    <div className={`flex ${right ? "justify-end" : "justify-start"} mb-3`}>
      {!right && <Skeleton className="h-8 w-8 rounded-full mr-2 flex-shrink-0" />}
      <Skeleton
        className={`h-10 rounded-2xl ${right ? "rounded-tr-sm" : "rounded-tl-sm"}`}
        style={{ width }}
      />
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="flex h-full animate-in fade-in duration-300">
      {/* Sidebar lista de contatos */}
      <div className="w-72 border-r flex flex-col">
        <div className="p-3 border-b">
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        <div className="flex-1 p-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" style={{ opacity: 1 - i * 0.08 }} />
                <Skeleton className="h-3 w-32" style={{ opacity: 0.6 - i * 0.05 }} />
              </div>
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4 overflow-hidden">
          <SkeletonBubble width="55%" />
          <SkeletonBubble right width="45%" />
          <SkeletonBubble width="70%" />
          <SkeletonBubble right width="35%" />
          <SkeletonBubble width="50%" />
          <SkeletonBubble right width="60%" />
          <SkeletonBubble width="40%" />
        </div>
        <div className="p-3 border-t flex gap-2">
          <Skeleton className="flex-1 h-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
