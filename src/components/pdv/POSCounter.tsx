import { useState, useRef, useCallback } from 'react';
import { usePOSCategories, usePOSProducts } from '@/hooks/pdv/usePOSProducts';
import { useCompanyId } from '@/hooks/useCompanyId';
import { usePOSStore } from '@/stores/posStore';
import { useChecks } from '@/hooks/pdv/useChecks';
import { usePDVSettings } from '@/hooks/pdv/usePDVSettings';
import { usePromotions } from '@/hooks/pdv/usePromotions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { PaymentDialog } from '@/components/pdv/PaymentDialog';
import { useToast } from '@/hooks/use-toast';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  Receipt,
  CreditCard,
  Loader2,
  MessageSquare,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { cn } from '@/lib/utils';

interface POSCounterProps {
  onOrderSent?: () => void;
}

export function POSCounter({ onOrderSent }: POSCounterProps) {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const { createCheck, addItemsToCheckAsync } = useChecks();
  const { settings } = usePDVSettings();
  const { findPromotion } = usePromotions();
  const { 
    cart, 
    subtotal, 
    service_amount, 
    discount_amount, 
    delivery_fee, 
    total,
    context,
    addItem,
    updateItem,
    removeItem,
    clearCart,
  } = usePOSStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Controla quais itens do carrinho estão com campo de observação aberto
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = usePOSCategories(companyId);
  const { data: products = [] } = usePOSProducts(companyId, selectedCategory, searchTerm);

  const handleAddProduct = useCallback((product: any) => {
    // Verifica se há promoção ativa para este produto no tipo de venda atual
    const promo = findPromotion(product.id, product.category_id, product.price, context.type);

    addItem({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.internal_code,
      unit_price: promo ? promo.final_price : product.price, // preço já com desconto
      quantity: 1,
      extras: [],
      extras_total: 0,
      ...(promo && {
        promotion_id: promo.promotion_id,
        discount_amount: promo.discount_amount,
      }),
    });

    // Limpa busca e re-foca após adicionar via barcode/Enter
    setSearchTerm('');
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [addItem, findPromotion, context]);

  // Enter na busca adiciona o primeiro produto (suporte a leitor de código de barras)
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && products.length > 0) {
      handleAddProduct(products[0]);
    }
  }, [products, handleAddProduct]);

  // Alterna campo de observação de um item do carrinho
  const toggleNotes = useCallback((itemId: string) => {
    setOpenNotes(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const handleQuantityChange = useCallback((itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      updateItem(itemId, { quantity: newQuantity });
    }
  }, [cart, removeItem, updateItem]);

  // Handle "Enviar" - create open check with items
  const handleSend = useCallback(async () => {
    if (cart.length === 0) return;

    setIsSending(true);
    try {
      const check = await createCheck({});
      await addItemsToCheckAsync(check.id);

      toast({
        title: 'Comanda criada',
        description: `Comanda #${check.check_number} foi criada com sucesso.`,
      });

      // Trigger auto-print if enabled
      if (settings?.auto_print_on_send) {
        // TODO: implementar auto-print via QZ Tray
      }

      onOrderSent?.();
    } catch (error) {
      toast({
        title: 'Erro ao criar comanda',
        description: 'Não foi possível criar a comanda.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  }, [cart, createCheck, addItemsToCheckAsync, toast, settings, onOrderSent]);

  // Handle "Pagar" - open payment dialog
  const handlePay = useCallback(() => {
    if (cart.length === 0) return;
    setPaymentDialogOpen(true);
  }, [cart]);

  return (
    <div className="flex h-full gap-4">
      {/* Products Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Search — autoFocus e Enter adiciona primeiro resultado (leitor de barras) */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            autoFocus
            placeholder="Buscar produto ou código de barras... (Enter para adicionar)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Products Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((product) => {
              const promo = findPromotion(product.id, product.category_id, product.price, context.type);
              return (
                <Card
                  key={product.id}
                  className={cn(
                    'cursor-pointer hover:border-primary transition-colors relative',
                    promo && 'border-green-500/50'
                  )}
                  onClick={() => handleAddProduct(product)}
                >
                  {promo && (
                    <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      PROMO
                    </span>
                  )}
                  <CardContent className="p-3">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-20 object-cover rounded mb-2"
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                    {promo ? (
                      <div className="mt-1">
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-green-600 font-bold text-sm">
                          {formatCurrency(promo.final_price)}
                        </p>
                      </div>
                    ) : (
                      <p className="text-primary font-bold mt-1">
                        {formatCurrency(product.price)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Sidebar */}
      <Card className="w-[380px] flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrinho
            </CardTitle>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <Trash2 className="w-4 h-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
          <Badge variant="outline" className="w-fit">
            {context.type === 'counter' && 'Balcão'}
            {context.type === 'table' && `Mesa ${context.table_number || ''}`}
            {context.type === 'delivery' && 'Delivery'}
            {context.type === 'pickup' && 'Retirada'}
          </Badge>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 pt-0">
          {/* Cart Items */}
          <ScrollArea className="flex-1 -mx-4 px-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mb-2" />
                <p>Carrinho vazio</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="rounded-lg bg-muted/50 overflow-hidden">
                    {/* Linha principal do item */}
                    <div className="flex items-center gap-2 p-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="font-medium text-sm truncate">{item.product_name}</p>
                          {item.promotion_id && (
                            <span className="shrink-0 text-[9px] font-bold bg-green-500 text-white px-1 rounded">
                              PROMO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unit_price)} × {item.quantity}
                        </p>
                        {item.extras.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            + {item.extras.map(e => e.name).join(', ')}
                          </p>
                        )}
                        {item.notes && !openNotes[item.id] && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 truncate">
                            Obs: {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Controles de quantidade */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-7 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleQuantityChange(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Preço + botão de obs */}
                      <div className="flex items-center gap-1 shrink-0">
                        <p className="font-medium text-sm w-16 text-right">
                          {formatCurrency(item.total_price)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-7 w-7',
                            item.notes ? 'text-amber-500' : 'text-muted-foreground'
                          )}
                          title="Observação do item"
                          onClick={() => toggleNotes(item.id)}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Campo de observação inline (expansível) */}
                    {openNotes[item.id] && (
                      <div className="px-2 pb-2">
                        <Textarea
                          autoFocus
                          placeholder="Ex: sem cebola, bem passado..."
                          value={item.notes || ''}
                          onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                          className="text-xs min-h-[52px] resize-none"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {service_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Serviço (10%)</span>
                <span>{formatCurrency(service_amount)}</span>
              </div>
            )}
            {discount_amount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Desconto</span>
                <span>-{formatCurrency(discount_amount)}</span>
              </div>
            )}
            {delivery_fee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Taxa de entrega</span>
                <span>{formatCurrency(delivery_fee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              disabled={cart.length === 0 || isSending}
              onClick={handleSend}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Receipt className="w-4 h-4 mr-2" />
              )}
              Enviar
            </Button>
            <Button 
              disabled={cart.length === 0}
              onClick={handlePay}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <PaymentDialog 
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={total}
      />
    </div>
  );
}
