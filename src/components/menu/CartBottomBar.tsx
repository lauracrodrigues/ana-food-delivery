// v1.2.0 — Carrinho mobile + barra progresso valor mínimo + upsell sugerido
import { useState } from "react";
import { formatCurrency } from "@/lib/currency-formatter";
import { ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

interface CartBottomBarProps {
  cart: CartItem[];
  total: number;
  minOrderValue?: number | null;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  allProducts?: UpsellProduct[];
  onUpsellSelect?: (p: UpsellProduct) => void;
}

export function CartBottomBar({
  cart,
  total,
  minOrderValue,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  allProducts,
  onUpsellSelect,
}: CartBottomBarProps) {
  const [open, setOpen] = useState(false);

  if (cart.length === 0) return null;

  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const belowMin = minOrderValue != null && total < minOrderValue;
  const minProgress = minOrderValue ? Math.min(100, (total / minOrderValue) * 100) : 100;

  return (
    <>
      {/* Barra fixa */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        {/* Barra de progresso valor mínimo */}
        {belowMin && (
          <div className="bg-amber-500 text-white px-4 py-1.5 flex items-center gap-2 text-xs">
            <div className="flex-1 bg-amber-300/50 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${minProgress}%` }} />
            </div>
            <span className="shrink-0 font-medium">
              Faltam {formatCurrency(minOrderValue! - total)} para pedido mínimo
            </span>
          </div>
        )}
        <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center gap-3 shadow-lg">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 flex-1 text-left"
          >
            <div className="bg-primary-foreground/20 rounded-full p-1.5 relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-white text-primary text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {itemCount}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Ver carrinho</p>
              <p className="text-xs opacity-80">{itemCount} {itemCount === 1 ? "item" : "itens"}</p>
            </div>
            <span className="font-bold text-base">{formatCurrency(total)}</span>
          </button>
        </div>
      </div>

      {/* Sheet — detalhe do carrinho */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl px-0">
          <SheetHeader className="px-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Carrinho ({itemCount})
              </SheetTitle>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={onClearCart}>
                Limpar
              </Button>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 h-[calc(80vh-160px)]">
            <div className="px-4 py-3 space-y-4">
              {cart.map((item) => (
                <div key={item.cartItemId} className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.product.name}</p>
                    {item.extras.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.extras.map((e) => (
                          <span key={e.id} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {e.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.observations && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.observations}</p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-1">
                      {formatCurrency((item.product.price + item.extrasTotal) * item.quantity)}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-1 bg-muted rounded-lg">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                      onClick={() => onRemoveItem(item.cartItemId)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Upsell: sugestões de produtos relacionados */}
              {allProducts && onUpsellSelect && (
                <CartUpsell
                  cart={cart}
                  allProducts={allProducts}
                  onSelect={(p) => { setOpen(false); onUpsellSelect(p); }}
                />
              )}
            </div>
          </ScrollArea>

          <div className="px-4 pt-3 border-t space-y-3">
            <div className="flex items-center justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
            {belowMin && (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-center">
                Faltam {formatCurrency(minOrderValue! - total)} para o pedido mínimo
              </div>
            )}
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={() => { setOpen(false); onCheckout(); }}
              disabled={belowMin}
            >
              Finalizar Pedido
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
