// v1.3.0 — Card produto + tracking view + OptimizedImage (lazy + aspect-ratio anti-CLS)
import { useEffect, useRef } from "react";
import { formatCurrency } from "@/lib/currency-formatter";
import { Plus, Image as ImageIcon, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { getTagById } from "@/lib/product-tags";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  promotional_price?: number | null;
  badges?: string[] | null;
  tags?: string[] | null; // etiquetas pré-definidas (vegano, picante, etc)
  is_featured?: boolean;
}

const BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  popular:    { label: "⭐ Mais Vendido", className: "bg-amber-100 text-amber-800 border-amber-200" },
  new:        { label: "✨ Novidade",    className: "bg-blue-100 text-blue-800 border-blue-200" },
  promo:      { label: "🔥 Promoção",    className: "bg-red-100 text-red-800 border-red-200" },
  happy_hour: { label: "🎉 Happy Hour",  className: "bg-purple-100 text-purple-800 border-purple-200" },
  vegan:      { label: "🌱 Vegano",      className: "bg-green-100 text-green-800 border-green-200" },
  spicy:      { label: "🌶️ Picante",    className: "bg-orange-100 text-orange-800 border-orange-200" },
};

interface ProductCardProps {
  product: Product;
  onAdd: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onView?: () => void;
}

export function ProductCard({ product, onAdd, isFavorite, onToggleFavorite, onView }: ProductCardProps) {
  const hasPromo = product.promotional_price != null && product.promotional_price < product.price;
  const discount = hasPromo
    ? Math.round((1 - product.promotional_price! / product.price) * 100)
    : 0;
  const primaryBadge = product.badges?.[0];
  const badgeCfg = primaryBadge ? BADGE_CONFIG[primaryBadge] : null;

  // Tracking de view: dispara quando card fica >=50% visível por 800ms
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!onView) return;
    const el = cardRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Delay 800ms evita contar scroll rápido como view real
          timer = setTimeout(() => { onView(); obs.disconnect(); }, 800);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0.5] }
    );
    obs.observe(el);
    return () => { obs.disconnect(); if (timer) clearTimeout(timer); };
  }, [onView]);

  return (
    <div ref={cardRef} className="group relative bg-card rounded-xl border border-border hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Badges + Tags — empilhados topo-esquerda */}
      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
        {/* Badge legado (badges) */}
        {badgeCfg && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeCfg.className} w-fit`}>
            {badgeCfg.label}
          </span>
        )}
        {/* Tags pré-definidas (vegano, picante, etc) — máx 3 no card pra não poluir */}
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 3).map((tagId) => {
              const tag = getTagById(tagId);
              if (!tag) return null;
              return (
                <span
                  key={tagId}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${tag.color} w-fit`}
                  title={tag.label}
                >
                  {tag.emoji} {tag.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Botão favorito */}
      {onToggleFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
          <Heart className={`h-4 w-4 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
        </button>
      )}

      {/* Imagem */}
      <div className="w-full h-36 bg-muted overflow-hidden shrink-0">
        <OptimizedImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          aspectRatio="16/10"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
            </div>
          }
        />
      </div>

      {/* Conteúdo */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 flex-1">{product.description}</p>
        )}

        {/* Preço */}
        <div className="flex items-end justify-between mt-auto">
          <div>
            {hasPromo ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(product.promotional_price!)}
                  </span>
                  <span className="text-xs bg-red-100 text-red-700 px-1 rounded font-medium">
                    -{discount}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground line-through">
                  {formatCurrency(product.price)}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-primary">{formatCurrency(product.price)}</span>
            )}
          </div>

          <Button
            size="icon"
            className="h-8 w-8 rounded-full shrink-0"
            onClick={onAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
