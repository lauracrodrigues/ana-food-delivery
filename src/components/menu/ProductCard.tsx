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
  // v2.1.0 — variant compact (img topo, vertical) usada em strips horizontais
  // como "Mais Pedidos" / "Comprar Novamente". Default horizontal.
  variant?: "horizontal" | "compact";
}

export function ProductCard({ product, onAdd, isFavorite, onToggleFavorite, onView, variant = "horizontal" }: ProductCardProps) {
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

  // v2.1.0 — Variant compact: layout vertical (img topo + info baixo) pra strips horizontais
  if (variant === "compact") {
    return (
      <div ref={cardRef} className="group relative bg-card rounded-xl border border-border hover:shadow-md transition-all overflow-hidden flex flex-col h-full">
        {/* Imagem topo aspect 4:3 */}
        <div className="relative w-full aspect-[4/3] bg-muted">
          <OptimizedImage
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            aspectRatio="4/3"
            fallback={<div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-muted-foreground/40" /></div>}
          />
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-sm"
              aria-label="Favoritar"
            >
              <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
            </button>
          )}
        </div>
        {/* Info compacta */}
        <div className="p-2 flex flex-col flex-1">
          <h3 className="font-semibold text-xs leading-tight line-clamp-2 min-h-[2em]">{product.name}</h3>
          <div className="flex items-end justify-between mt-auto pt-1">
            <span className="text-sm font-bold text-primary truncate">
              {hasPromo ? formatCurrency(product.promotional_price!) : formatCurrency(product.price)}
            </span>
            <Button size="icon" className="h-7 w-7 rounded-full shrink-0" onClick={onAdd}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // v2.0.0 — Layout horizontal estilo Saipos/Anota Aí
    // Texto à esquerda + imagem 110x110 à direita. Scroll vertical 1 col mobile, 2 col desktop.
    <div
      ref={cardRef}
      className="group relative bg-card rounded-xl border border-border hover:shadow-md transition-all overflow-hidden flex h-[120px] sm:h-[130px]"
    >
      {/* Conteúdo à esquerda */}
      <div className="flex-1 min-w-0 p-3 flex flex-col">
        {/* Badges/tags inline no topo */}
        {(badgeCfg || (product.tags && product.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1 mb-1">
            {badgeCfg && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${badgeCfg.className}`}>
                {badgeCfg.label}
              </span>
            )}
            {product.tags?.slice(0, 2).map((tagId) => {
              const tag = getTagById(tagId);
              if (!tag) return null;
              return (
                <span
                  key={tagId}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${tag.color}`}
                  title={tag.label}
                >
                  {tag.emoji} {tag.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Nome (1 linha truncada) */}
        <h3 className="font-semibold text-sm leading-tight line-clamp-1">{product.name}</h3>

        {/* Descrição (2 linhas) */}
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 flex-1">{product.description}</p>
        )}

        {/* Preço + ação */}
        <div className="flex items-end justify-between mt-auto pt-1">
          <div className="min-w-0">
            {hasPromo ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-bold text-primary">{formatCurrency(product.promotional_price!)}</span>
                  <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded font-medium">-{discount}%</span>
                </div>
                <span className="text-[10px] text-muted-foreground line-through">{formatCurrency(product.price)}</span>
              </>
            ) : (
              <span className="text-base font-bold text-primary">{formatCurrency(product.price)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Imagem à direita — quadrada, full height do card */}
      <div className="relative w-[110px] sm:w-[130px] shrink-0 bg-muted">
        <OptimizedImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover"
          aspectRatio="1/1"
          fallback={
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
          }
        />
        {/* Botão favorito sobre imagem (canto sup direito) */}
        {onToggleFavorite && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
            aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar"}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-500"}`} />
          </button>
        )}
        {/* Botão + flutuante canto inferior direito sobre a imagem */}
        <Button
          size="icon"
          className="absolute bottom-1.5 right-1.5 h-9 w-9 rounded-full shadow-lg"
          onClick={onAdd}
          aria-label="Adicionar ao carrinho"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
