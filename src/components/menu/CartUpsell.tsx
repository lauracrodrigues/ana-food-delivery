// v1.0.0 — Sugestões de produtos relacionados no carrinho
import { useMemo } from "react";
import { formatCurrency } from "@/lib/currency-formatter";
import { Plus, Image as ImageIcon, Sparkles } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string;
  promotional_price?: number | null;
  badges?: string[] | null;
}

interface CartUpsellProps {
  cart: Array<{ product: { id: string; name: string } }>;
  allProducts: Product[];
  onSelect: (product: Product) => void;
  maxSuggestions?: number;
}

export function CartUpsell({ cart, allProducts, onSelect, maxSuggestions = 4 }: CartUpsellProps) {
  // Sugestões: produtos da mesma categoria dos itens no cart, não duplicados,
  // priorizando badges popular/new/promo
  const suggestions = useMemo(() => {
    if (cart.length === 0) return [];
    const cartIds = new Set(cart.map(i => i.product.id));
    // Pega categorias presentes no cart
    const cartCategoryIds = new Set<string>();
    for (const item of cart) {
      const product = allProducts.find(p => p.id === item.product.id);
      if (product?.category_id) cartCategoryIds.add(product.category_id);
    }
    if (cartCategoryIds.size === 0) return [];

    // Score: 3 = popular, 2 = new, 1 = promo, 0 = nenhum
    const score = (p: Product) => {
      const b = p.badges || [];
      if (b.includes("popular")) return 3;
      if (b.includes("new")) return 2;
      if (b.includes("promo") || p.promotional_price) return 1;
      return 0;
    };

    return allProducts
      .filter(p => !cartIds.has(p.id) && cartCategoryIds.has(p.category_id))
      .sort((a, b) => score(b) - score(a))
      .slice(0, maxSuggestions);
  }, [cart, allProducts, maxSuggestions]);

  if (suggestions.length === 0) return null;

  return (
    <div className="border-t border-border pt-3">
      <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2 px-1">
        <Sparkles className="h-3 w-3 text-amber-500" />
        Que tal levar também?
      </p>
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {suggestions.map(p => {
            const hasPromo = p.promotional_price != null && p.promotional_price < p.price;
            const displayPrice = hasPromo ? p.promotional_price! : p.price;
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="shrink-0 w-32 text-left bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
              >
                <div className="w-full h-20 bg-muted relative">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  {/* Botão flutuante adicionar */}
                  <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium line-clamp-2 leading-tight">{p.name}</p>
                  <p className="text-xs font-bold text-primary mt-0.5">{formatCurrency(displayPrice)}</p>
                </div>
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
