// v3.2.0 — Agrupado por categoria, busca, ProductCard moderno + view tracking
import { useMemo } from "react";
import { ProductCard } from "./ProductCard";
import { ProductAddModal, SelectedExtra } from "./ProductAddModal";
import { useState } from "react";
import { Search, X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string;
  promotional_price?: number | null;
  badges?: string[] | null;
  tags?: string[] | null;
  is_featured?: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface MenuProductsProps {
  products: Product[];
  categories: Category[];
  companyId: string;
  searchQuery: string;
  onAddToCart: (product: Product, quantity: number, observations?: string, extras?: SelectedExtra[]) => void;
  favorites?: string[];
  onToggleFavorite?: (productId: string) => void;
  onProductView?: (productId: string) => void;
}

export function MenuProducts({
  products,
  categories,
  companyId,
  searchQuery,
  onAddToCart,
  favorites = [],
  onToggleFavorite,
  onProductView,
}: MenuProductsProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleModalAdd = (extras: SelectedExtra[], quantity: number, observations: string) => {
    if (selectedProduct) {
      onAddToCart(selectedProduct, quantity, observations || undefined, extras);
    }
  };

  // Modo busca: flat list filtrada
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // Modo normal: agrupado por categoria
  const grouped = useMemo(() => {
    return categories
      .map((cat) => ({
        category: cat,
        products: products.filter((p) => p.category_id === cat.id),
      }))
      .filter((g) => g.products.length > 0);
  }, [products, categories]);

  const ProductGrid = ({ items }: { items: Product[] }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          onAdd={() => setSelectedProduct(p)}
          isFavorite={favorites.includes(p.id)}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(p.id) : undefined}
          onView={onProductView ? () => onProductView(p.id) : undefined}
        />
      ))}
    </div>
  );

  // v3.4.0 — Grid vertical (Saipos/Anota Aí style): 1 col mobile, 2 col desktop
  // Cards horizontais (texto esquerda, imagem direita) — sem scroll lateral nas categorias
  const ProductVerticalGrid = ({ items }: { items: Product[] }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {items.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          onAdd={() => setSelectedProduct(p)}
          isFavorite={favorites.includes(p.id)}
          onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(p.id) : undefined}
          onView={onProductView ? () => onProductView(p.id) : undefined}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Busca ativa — resultados flat */}
      {searchResults !== null ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            {searchResults.length === 0
              ? "Nenhum produto encontrado"
              : `${searchResults.length} resultado${searchResults.length !== 1 ? "s" : ""} para "${searchQuery}"`}
          </p>
          <ProductGrid items={searchResults} />
        </div>
      ) : (
        /* Modo normal — seções por categoria */
        <div className="space-y-8">
          {grouped.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum produto disponível
            </div>
          )}
          {grouped.map(({ category, products: catProducts }) => (
            <section key={category.id} id={`section-${category.id}`}>
              <h2 className="text-lg font-bold mb-4 pb-2 border-b border-border">
                {category.name}
              </h2>
              {/* v3.4.0 — Grid vertical (Saipos/Anota Aí). Scroll lateral só pra banners */}
              <ProductVerticalGrid items={catProducts} />
            </section>
          ))}
        </div>
      )}

      <ProductAddModal
        product={selectedProduct}
        companyId={companyId}
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
        onAddToCart={handleModalAdd}
      />
    </>
  );
}
