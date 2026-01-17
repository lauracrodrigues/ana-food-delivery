import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { usePOSStore } from '@/stores/posStore';
import { useChecks } from '@/hooks/pdv/useChecks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  MapPin,
  User,
  Phone,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';

interface POSDeliveryProps {
  onOrderSent?: () => void;
}

export function POSDelivery({ onOrderSent }: POSDeliveryProps) {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const { createCheck, addItemsToCheckAsync } = useChecks();
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
    setContext,
    setDeliveryFee,
  } = usePOSStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Customer fields
  const [customerName, setCustomerName] = useState(context.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(context.customer_phone || '');
  const [address, setAddress] = useState(context.address || '');
  const [addressNumber, setAddressNumber] = useState(context.address_number || '');
  const [neighborhood, setNeighborhood] = useState(context.neighborhood || '');

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

  // Update context when customer info changes
  const updateCustomerContext = () => {
    setContext({
      type: 'delivery',
      customer_name: customerName,
      customer_phone: customerPhone,
      address,
      address_number: addressNumber,
      neighborhood,
    });
  };

  // Handle "Enviar"
  const handleSend = async () => {
    if (cart.length === 0) return;
    if (!customerName || !customerPhone || !address) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha nome, telefone e endereço do cliente.',
        variant: 'destructive',
      });
      return;
    }
    
    updateCustomerContext();
    setIsSending(true);
    
    try {
      const check = await createCheck({ type: 'delivery' });
      await addItemsToCheckAsync(check.id);
      
      toast({
        title: 'Pedido criado',
        description: `Pedido #${check.check_number} foi criado com sucesso.`,
      });
      
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setAddress('');
      setAddressNumber('');
      setNeighborhood('');
      
      onOrderSent?.();
    } catch (error) {
      console.error('Error sending order:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: 'Não foi possível criar o pedido.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle "Pagar"
  const handlePay = () => {
    if (cart.length === 0) return;
    if (!customerName || !customerPhone || !address) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha nome, telefone e endereço do cliente.',
        variant: 'destructive',
      });
      return;
    }
    updateCustomerContext();
    setPaymentDialogOpen(true);
  };

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left Column - Customer Info + Products */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Customer Info Card */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Nome do cliente"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs">Telefone *</Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <Separator className="my-3" />
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Endereço de Entrega</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="address" className="text-xs">Rua *</Label>
                <Input
                  id="address"
                  placeholder="Nome da rua"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="number" className="text-xs">Número</Label>
                <Input
                  id="number"
                  placeholder="Nº"
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <Label htmlFor="neighborhood" className="text-xs">Bairro</Label>
              <Input
                id="neighborhood"
                placeholder="Bairro"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="h-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                      className="w-full h-16 object-cover rounded mb-2"
                    />
                  )}
                  <p className="font-medium text-sm line-clamp-2">{product.name}</p>
                  <p className="text-primary font-bold mt-1 text-sm">
                    {formatCurrency(product.price)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Cart Sidebar */}
      <Card className="w-[350px] flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="w-5 h-5" />
              Carrinho
            </CardTitle>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Badge variant="secondary" className="w-fit">
            Entrega
          </Badge>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 pt-0">
          {/* Cart Items */}
          <ScrollArea className="flex-1 -mx-4 px-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mb-2" />
                <p className="text-sm">Carrinho vazio</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleQuantityChange(item.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="font-medium text-sm w-16 text-right">
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
            {discount_amount > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>Desconto</span>
                <span>-{formatCurrency(discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>Taxa de entrega</span>
              <Input
                type="number"
                step="0.01"
                className="h-7 w-20 text-right text-sm"
                value={delivery_fee || ''}
                onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>
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
