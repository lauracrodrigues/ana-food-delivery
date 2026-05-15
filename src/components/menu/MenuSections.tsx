// v1.2.0 — Seções destaque + view tracking + mais pedidos automático
import { formatCurrency } from "@/lib/currency-formatter";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ProductCard } from "./ProductCard";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  promotional_price?: number | null;
  badges?: string[] | null;
  is_featured?: boolean;
}

interface MenuSectionsProps {
  products: Product[];
  onAdd: (product: Product) => void;
  favorites?: string[];
  onToggleFavorite?: (productId: string) => void;
  onProductView?: (productId: string) => void;
  popularProductIds?: string[]; // calculados via RPC get_popular_products
}

interface SectionConfig {
  key: string;
  title: string;
  emoji: string;
  filter: (p: Product) => boolean;
}

const SECTIONS: SectionConfig[] = [
  {
    key: "promo",
    title: "Promoções",
    emoji: "🔥",
    filter: (p) => p.promotional_price != null && p.promotional_price < p.price,
  },
  {
    key: "popular",
    title: "Mais Vendidos",
    emoji: "⭐",
    filter: (p) => (p.badges || []).includes("popular"),
  },
  {
    key: "new",
    title: "Novidades",
    emoji: "✨",
    filter: (p) => (p.badges || []).includes("new"),
  },
];

function SectionStrip({
  title, emoji, products, onAdd, favorites, onToggleFavorite, onProductView,
}: {
  title: string;
  emoji: string;
  products: Product[];
  onAdd: (p: Product) => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
  onProductView?: (id: string) => void;
}) {
  if (products.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-base font-bold mb-3 flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
      </h2>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {products.slice(0, 10).map((p) => (
            <div key={p.id} className="w-44 shrink-0">
              <ProductCard
                product={p}
                onAdd={() => onAdd(p)}
                isFavorite={favorites?.includes(p.id)}
                onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(p.id) : undefined}
                onView={onProductView ? () => onProductView(p.id) : undefined}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export function MenuSections({ products, onAdd, favorites, onToggleFavorite, onProductView, popularProductIds }: MenuSectionsProps) {
  // Mais pedidos: ordena produtos pelo ranking da RPC
  const popularProducts = popularProductIds
    ? popularProductIds
        .map(id => products.find(p => p.id === id))
        .filter((p): p is Product => !!p)
    : [];

  const hasSections = SECTIONS.some((s) => products.some(s.filter)) || popularProducts.length > 0;
  if (!hasSections) return null;

  return (
    <div className="mb-2">
      {/* Seção Mais Pedidos — primeiro, antes de promoções/badges manuais */}
      {popularProducts.length > 0 && (
        <SectionStrip
          title="Os mais pedidos"
          emoji="🏆"
          products={popularProducts}
          onAdd={onAdd}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onProductView={onProductView}
        />
      )}

      {SECTIONS.map((section) => {
        const sectionProducts = products.filter(section.filter);
        return (
          <SectionStrip
            key={section.key}
            title={section.title}
            emoji={section.emoji}
            products={sectionProducts}
            onAdd={onAdd}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onProductView={onProductView}
          />
        );
      })}
    </div>
  );
}
