// v2.0.0 — Usa ProductAddModal com suporte a complementos
import { formatCurrency } from "@/lib/currency-formatter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Image as ImageIcon } from "lucide-react";
import { ProductAddModal, SelectedExtra } from "./ProductAddModal";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
}

interface MenuProductsProps {
  products: Product[];
  companyId: string;
  onAddToCart: (product: Product, quantity: number, observations?: string, extras?: SelectedExtra[]) => void;
}

export function MenuProducts({ products, companyId, onAddToCart }: MenuProductsProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleModalAdd = (extras: SelectedExtra[], quantity: number, observations: string) => {
    if (selectedProduct) {
      onAddToCart(selectedProduct, quantity, observations || undefined, extras);
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum produto disponível nesta categoria
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-0">
              <div className="flex gap-4 p-4">
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button
                onClick={() => setSelectedProduct(product)}
                className="w-full"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

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
