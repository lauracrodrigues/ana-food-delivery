// v2.1.0 — Carrinho desktop com extras/complementos + upsell sugerido
import { formatCurrency } from "@/lib/currency-formatter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CartUpsell } from "./CartUpsell";

interface SelectedExtra {
  id: string;
  name: string;
  price: number;
  groupId: string;
  groupName: string;
}

interface CartItem {
  cartItemId: string;
  product: { id: string; name: string; price: number };
  quantity: number;
  observations?: string;
  extras: SelectedExtra[];
  extrasTotal: number;
}

interface UpsellProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string;
  promotional_price?: number | null;
  badges?: string[] | null;
}

interface MenuCartProps {
  cart: CartItem[];
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  total: number;
  allProducts?: UpsellProduct[];
  onUpsellSelect?: (p: UpsellProduct) => void;
}

export function MenuCart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  total,
  allProducts,
  onUpsellSelect,
}: MenuCartProps) {
  if (cart.length === 0) {
    return (
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Seu carrinho está vazio</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Carrinho ({cart.length})
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClearCart}>
            Limpar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.cartItemId}
                className="flex gap-3 pb-4 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.product.name}</h4>

                  {/* Extras como chips */}
                  {item.extras.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.extras.map((e) => (
                        <span
                          key={e.id}
                          className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground"
                        >
                          {e.name}
                          {e.price > 0 ? ` +${formatCurrency(e.price)}` : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.observations && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {item.observations}
                    </p>
                  )}

                  <p className="text-sm font-semibold text-primary mt-1">
                    {formatCurrency((item.product.price + item.extrasTotal) * item.quantity)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onRemoveItem(item.cartItemId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Upsell: sugestões */}
        {allProducts && onUpsellSelect && (
          <div className="mt-4">
            <CartUpsell cart={cart} allProducts={allProducts} onSelect={onUpsellSelect} />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-col gap-4">
        <div className="w-full flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>

        <Button onClick={onCheckout} className="w-full" size="lg">
          Finalizar Pedido
        </Button>
      </CardFooter>
    </Card>
  );
}
