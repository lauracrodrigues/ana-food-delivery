import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { usePOSStore } from '@/stores/posStore';
import { useChecks } from '@/hooks/pdv/useChecks';
import { usePDVSettings } from '@/hooks/pdv/usePDVSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';

interface POSCounterProps {
  onOrderSent?: () => void;
}

export function POSCounter({ onOrderSent }: POSCounterProps) {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const { createCheck, addItemsToCheckAsync } = useChecks();
  const { settings } = usePDVSettings();
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

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', companyId)
        .eq('on_off', true)
        .order('display_order');
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['products', companyId, selectedCategory, searchTerm],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('on_off', true)
        .order('name');
      
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!companyId,
  });

  const handleAddProduct = (product: any) => {
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.internal_code,
      unit_price: product.price,
      quantity: 1,
      extras: [],
      extras_total: 0,
    });
  };

  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = cart.find(i => i.id === itemId);
    if (!item) return;
    
    const newQuantity = item.quantity + delta;
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      updateItem(itemId, { quantity: newQuantity });
    }
  };

  // Handle "Enviar" - create open check with items
  const handleSend = async () => {
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
        // TODO: Implement auto print
        console.log('Auto print enabled, should print...');
      }
      
      onOrderSent?.();
    } catch (error) {
      console.error('Error sending order:', error);
      toast({
        title: 'Erro ao criar comanda',
        description: 'Não foi possível criar a comanda.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle "Pagar" - open payment dialog
  const handlePay = () => {
    if (cart.length === 0) return;
    setPaymentDialogOpen(true);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Products Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            {products.map((product) => (
              <Card 
                key={product.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleAddProduct(product)}
              >
                <CardContent className="p-3">
                  {product.image_url && (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                  )}
                  <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                  <p className="text-primary font-bold mt-1">
                    {formatCurrency(product.price)}
                  </p>
                </CardContent>
              </Card>
            ))}
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
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unit_price)} × {item.quantity}
                      </p>
                      {item.extras.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + {item.extras.map(e => e.name).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(item.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
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
                    <p className="font-medium text-sm w-20 text-right">
                      {formatCurrency(item.total_price)}
                    </p>
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
