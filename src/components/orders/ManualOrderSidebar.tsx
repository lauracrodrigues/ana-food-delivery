// src/components/orders/ManualOrderSidebar.tsx — v1.0.0
import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Loader2,
  User, MapPin, CreditCard, Package
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─── TIPOS ───────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  on_off: boolean;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  on_off: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ManualOrderSidebarProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const PAYMENT_METHODS = [
  { value: "dinheiro",  label: "Dinheiro" },
  { value: "pix",       label: "PIX" },
  { value: "cartao",    label: "Cartão débito/crédito" },
  { value: "maquina",   label: "Maquininha" },
];

// ─── COMPONENTE ──────────────────────────────────────────────────

export function ManualOrderSidebar({ open, onClose, companyId }: ManualOrderSidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Estado do formulário ──────────────────────────────────────
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // ── Dados do servidor ─────────────────────────────────────────

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, on_off, display_order")
        .eq("company_id", companyId)
        .eq("on_off", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-all", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, on_off, category_id")
        .eq("company_id", companyId)
        .eq("on_off", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!companyId,
  });

  // ── Produtos filtrados ────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory) list = list.filter(p => p.category_id === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, selectedCategory, search]);

  // ── Carrinho ──────────────────────────────────────────────────

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const changeQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  // ── Totais ────────────────────────────────────────────────────

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const fee = orderType === "delivery" ? parseFloat(deliveryFee) || 0 : 0;
  const total = subtotal + fee;

  // ── Submissão ─────────────────────────────────────────────────

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!customerPhone.trim()) throw new Error("Telefone obrigatório");
      if (cart.length === 0) throw new Error("Carrinho vazio");
      if (orderType === "delivery" && !address.trim()) throw new Error("Endereço obrigatório");

      const items = cart.map(i => ({
        product_id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        subtotal: i.product.price * i.quantity,
      }));

      const res = await fetch("/v1/customers/manual-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id:          companyId,
          customer_name:       customerName.trim() || null,
          customer_phone:      customerPhone.trim(),
          type:                orderType,
          address:             orderType === "delivery" ? address.trim() : null,
          address_number:      orderType === "delivery" ? addressNumber.trim() : null,
          address_complement:  orderType === "delivery" ? addressComplement.trim() : null,
          items,
          delivery_fee:        fee,
          payment_method:      paymentMethod,
          notes:               notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pedido criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      handleClose();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar pedido", description: err.message, variant: "destructive" });
    },
  });

  // ── Reset e fechar ────────────────────────────────────────────

  const handleClose = () => {
    setCustomerName("");
    setCustomerPhone("");
    setOrderType("delivery");
    setAddress("");
    setAddressNumber("");
    setAddressComplement("");
    setDeliveryFee("0");
    setPaymentMethod("pix");
    setNotes("");
    setCart([]);
    setSearch("");
    setSelectedCategory(null);
    onClose();
  };

  // ─── RENDER ──────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:w-[80vw] sm:max-w-[80vw] p-0 flex flex-col"
      >
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Novo Pedido Manual
          </SheetTitle>
        </SheetHeader>

        {/* Conteúdo em duas colunas */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Coluna esquerda: produtos ── */}
          <div className="flex flex-col w-1/2 border-r">
            <div className="px-4 py-3 space-y-2 border-b">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSelectedCategory(null); }}
                  className="pl-9"
                />
              </div>

              {/* Categorias */}
              <ScrollArea className="whitespace-nowrap" orientation="horizontal">
                <div className="flex gap-2 pb-1">
                  <Badge
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="cursor-pointer shrink-0"
                    onClick={() => setSelectedCategory(null)}
                  >
                    Todos
                  </Badge>
                  {categories.map(cat => (
                    <Badge
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      className="cursor-pointer shrink-0"
                      onClick={() => { setSelectedCategory(cat.id); setSearch(""); }}
                    >
                      {cat.name}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Lista de produtos */}
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-1">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum produto encontrado
                  </p>
                ) : (
                  filteredProducts.map(product => {
                    const inCart = cart.find(i => i.product.id === product.id);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(product.price)}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {inCart ? (
                            <>
                              <Button size="icon" variant="outline" className="h-7 w-7"
                                onClick={() => changeQty(product.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-5 text-center">{inCart.quantity}</span>
                              <Button size="icon" variant="outline" className="h-7 w-7"
                                onClick={() => changeQty(product.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button size="icon" variant="outline" className="h-7 w-7"
                              onClick={() => addToCart(product)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ── Coluna direita: formulário + carrinho ── */}
          <ScrollArea className="flex-1">
            <div className="px-5 py-4 space-y-5">

              {/* Cliente */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" /> Cliente
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      placeholder="Nome do cliente"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone *</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Tipo pedido */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> Tipo
                </h3>
                <RadioGroup
                  value={orderType}
                  onValueChange={v => setOrderType(v as "delivery" | "pickup")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="cursor-pointer">Entrega</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="cursor-pointer">Retirada</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Endereço (só delivery) */}
              {orderType === "delivery" && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Endereço
                    </h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[1fr_80px] gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Rua *</Label>
                          <Input
                            placeholder="Rua das Flores"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Número</Label>
                          <Input
                            placeholder="123"
                            value={addressNumber}
                            onChange={e => setAddressNumber(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Complemento</Label>
                        <Input
                          placeholder="Apto 12"
                          value={addressComplement}
                          onChange={e => setAddressComplement(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Taxa de entrega (R$)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          value={deliveryFee}
                          onChange={e => setDeliveryFee(e.target.value)}
                          className="w-32"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Pagamento */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Pagamento
                </h3>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea
                  placeholder="Sem cebola, sem tomate..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <Separator />

              {/* Carrinho */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Carrinho
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{cart.length}</Badge>
                  )}
                </h3>

                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                    Adicione produtos ao carrinho
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cart.map(item => (
                      <div key={item.product.id}
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.price)} × {item.quantity} = {formatCurrency(item.product.price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => changeQty(item.product.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-5 text-center">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => changeQty(item.product.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                            onClick={() => removeFromCart(item.product.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totais */}
                {cart.length > 0 && (
                  <div className="space-y-1 pt-2 border-t text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {orderType === "delivery" && fee > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Taxa entrega</span>
                        <span>{formatCurrency(fee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-base pt-1 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão confirmar */}
              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0 || submitMutation.isPending}
                onClick={() => submitMutation.mutate()}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                Confirmar Pedido · {formatCurrency(total)}
              </Button>
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
