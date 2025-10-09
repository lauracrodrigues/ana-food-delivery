import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Plus, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
}

interface MenuProductsProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number, observations?: string) => void;
}

export function MenuProducts({ products, onAddToCart }: MenuProductsProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [observations, setObservations] = useState("");

  const handleAddToCart = () => {
    if (selectedProduct) {
      onAddToCart(selectedProduct, 1, observations);
      setSelectedProduct(null);
      setObservations("");
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
                {/* Image */}
                <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1 truncate">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary">
                    R$ {product.price.toFixed(2)}
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

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedProduct?.image_url && (
              <img
                src={selectedProduct.image_url}
                alt={selectedProduct.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            
            {selectedProduct?.description && (
              <p className="text-muted-foreground">{selectedProduct.description}</p>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex: Sem cebola, ponto da carne, etc."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-2xl font-bold text-primary">
                R$ {selectedProduct?.price.toFixed(2)}
              </p>
              <Button onClick={handleAddToCart}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar ao Carrinho
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
