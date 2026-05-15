// v1.0.0 — Seção "Pedir novamente" baseada no histórico do cliente
import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ProductCard } from "./ProductCard";
import type { OrderHistoryItem } from "@/hooks/useOrderHistory";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  promotional_price?: number | null;
  badges?: string[] | null;
  category_id: string;
}

interface OrderAgainSectionProps {
  history: OrderHistoryItem[];
  allProducts: Product[];
  onAdd: (product: Product) => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}

export function OrderAgainSection({
  history, allProducts, onAdd, favorites, onToggleFavorite,
}: OrderAgainSectionProps) {
  // Coleta produtos únicos dos últimos 5 pedidos, cruzando com catálogo atual
  // (filtra indisponíveis — produto deletado ou off não aparece)
  const products = useMemo(() => {
    if (history.length === 0) return [];
    const seenIds = new Set<string>();
    const result: Product[] = [];
    for (const order of history.slice(0, 5)) {
      for (const item of order.items) {
        const product = allProducts.find(p => p.name === item.name);
        if (product && !seenIds.has(product.id)) {
          seenIds.add(product.id);
          result.push(product);
          if (result.length >= 8) return result;
        }
      }
    }
    return result;
  }, [history, allProducts]);

  if (products.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-base font-bold mb-3 flex items-center gap-2">
        <RotateCcw className="h-4 w-4 text-primary" />
        <span>Peça novamente</span>
      </h2>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {products.map(p => (
            <div key={p.id} className="w-44 shrink-0">
              <ProductCard
                product={p}
                onAdd={() => onAdd(p)}
                isFavorite={favorites?.includes(p.id)}
                onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(p.id) : undefined}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
