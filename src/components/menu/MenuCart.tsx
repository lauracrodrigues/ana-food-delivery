import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  observations?: string;
}

interface MenuCartProps {
  cart: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
  total: number;
}

export function MenuCart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  total,
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearCart}
          >
            Limpar
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-3 pb-4 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.product.name}</h4>
                  {item.observations && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.observations}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-primary mt-1">
                    R$ {(item.product.price * item.quantity).toFixed(2)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
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
                      onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onRemoveItem(item.product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex-col gap-4">
        <div className="w-full flex items-center justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-primary">R$ {total.toFixed(2)}</span>
        </div>
        
        <Button
          onClick={onCheckout}
          className="w-full"
          size="lg"
        >
          Finalizar Pedido
        </Button>
      </CardFooter>
    </Card>
  );
}
