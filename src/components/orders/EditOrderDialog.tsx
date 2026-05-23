// v1.0.0 — Edita pedido existente: items (add/remove/qty) + obs + address
// Lock: pedidos delivering/completed/cancelled/archived NÃO podem editar
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, Trash2, Loader2, Save, Search, Truck, Package } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency-formatter";
import { Order } from "./types";

interface Props {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

interface EditableItem {
  id?: string;
  product_id?: string;
  name: string;
  quantity: number;
  price: number;
  observations?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  on_off: boolean;
}

export function EditOrderDialog({ order, open, onClose }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<EditableItem[]>([]);
  const [observations, setObservations] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  // v1.0.1 — troco quando dinheiro
  const [trocoPara, setTrocoPara] = useState<number>(0);
  // v1.0.1 — tipo entrega/retirada editável
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [search, setSearch] = useState("");

  // v1.0.1 — opções padronizadas de pagamento
  const PAYMENT_OPTIONS = [
    { value: "pix", label: "Pix" },
    { value: "dinheiro", label: "Dinheiro" },
    { value: "cartao_credito", label: "Cartão de Crédito" },
    { value: "cartao_debito", label: "Cartão de Débito" },
    { value: "vr", label: "VR/VA" },
  ];

  useEffect(() => {
    if (order) {
      setItems(Array.isArray(order.items) ? order.items.map((i: any) => ({ ...i })) : []);
      setObservations(order.observations || "");
      setAddress(order.address || "");
      // v1.0.1 — Parse payment_method: "dinheiro - Troco para R$ 50,00" → método + troco
      const pm = (order.payment_method || "").toLowerCase();
      const trocoMatch = pm.match(/troco para r\$\s*([\d.,]+)/i);
      if (trocoMatch) {
        setTrocoPara(parseFloat(trocoMatch[1].replace(/\./g, "").replace(",", ".")));
        setPaymentMethod("dinheiro");
      } else {
        setTrocoPara(0);
        // Match contra valores do select
        const found = PAYMENT_OPTIONS.find(p => pm.includes(p.value) || pm.includes(p.label.toLowerCase()));
        setPaymentMethod(found?.value || "");
      }
      setOrderType((order.type === "pickup" ? "pickup" : "delivery"));
      setSearch("");
    }
  }, [order]);

  // Lista de produtos pra adicionar (só ativos da empresa do pedido)
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-edit", (order as any)?.company_id],
    queryFn: async () => {
      if (!(order as any)?.company_id) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name, price, on_off")
        .eq("company_id", (order as any).company_id)
        .eq("on_off", true)
        .order("name");
      return (data || []) as Product[];
    },
    enabled: open && !!(order as any)?.company_id,
  });

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 8); // limita pra não poluir
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 12);
  }, [products, search]);

  const newTotal = useMemo(() => {
    const itemsTotal = items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
    // v1.0.2 — Pickup zera taxa de entrega no preview (reflete o save)
    const fee = orderType === "delivery" ? ((order as any)?.delivery_fee || 0) : 0;
    return itemsTotal + fee;
  }, [items, order, orderType]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!order) throw new Error("Sem pedido");
      // v1.0.1 — Recalcula total considerando se virou pickup (sem taxa) ou continua delivery
      const itemsTotal = items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
      const deliveryFee = orderType === "delivery" ? ((order as any).delivery_fee || 0) : 0;
      const total = itemsTotal + deliveryFee;

      // v1.0.1 — Anexa troco ao payment_method quando dinheiro
      const paymentMethodFinal = paymentMethod === "dinheiro" && trocoPara > 0
        ? `dinheiro - Troco para R$ ${trocoPara.toFixed(2).replace(".", ",")}`
        : paymentMethod;

      const { error } = await supabase
        .from("orders")
        .update({
          items: items as any,
          total,
          type: orderType,
          delivery_fee: deliveryFee,
          observations: observations.trim() || null,
          address: orderType === "delivery" ? (address.trim() || null) : null,
          payment_method: paymentMethodFinal || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Pedido atualizado ✓" });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const addProduct = (p: Product) => {
    // Se já tem o produto, incrementa qty
    const existing = items.findIndex(it => it.product_id === p.id || (!it.product_id && it.name === p.name));
    if (existing >= 0) {
      const copy = [...items];
      copy[existing] = { ...copy[existing], quantity: (copy[existing].quantity || 1) + 1 };
      setItems(copy);
    } else {
      setItems([...items, {
        product_id: p.id,
        name: p.name,
        price: p.price,
        quantity: 1,
      }]);
    }
    setSearch("");
  };

  const updateQty = (idx: number, delta: number) => {
    const copy = [...items];
    const next = Math.max(0, (copy[idx].quantity || 0) + delta);
    if (next === 0) {
      copy.splice(idx, 1);
    } else {
      copy[idx] = { ...copy[idx], quantity: next };
    }
    setItems(copy);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  if (!order) return null;

  const lockedStatuses = ["delivering", "completed", "cancelled", "archived"];
  const isLocked = lockedStatuses.includes(order.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pedido #{order.order_number}</DialogTitle>
        </DialogHeader>

        {isLocked ? (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 rounded-lg text-sm text-amber-900 dark:text-amber-100">
            Não é possível editar pedido em <strong>{order.status}</strong>.
            Edição liberada apenas em: novo, em preparo, pronto.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Itens */}
            <div>
              <Label className="text-sm font-semibold">Itens</Label>
              <div className="space-y-2 mt-2">
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Sem itens. Adicione abaixo.</p>
                )}
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg border">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(idx, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-mono text-sm">{it.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(idx, +1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{it.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(it.price)} cada</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency((it.price || 0) * (it.quantity || 0))}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Adicionar produto */}
            <div>
              <Label className="text-sm font-semibold">Adicionar item</Label>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              {(search || products.length > 0) && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="flex justify-between items-center p-2 rounded hover:bg-muted text-left text-sm"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">{formatCurrency(p.price)}</span>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2 col-span-full">Nenhum produto encontrado</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* v1.0.1 — Tipo: entrega/retirada (toggle) */}
            <div>
              <Label className="text-sm font-semibold">Tipo</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Button
                  type="button"
                  variant={orderType === "delivery" ? "default" : "outline"}
                  onClick={() => setOrderType("delivery")}
                  className="gap-2"
                >
                  <Truck className="h-4 w-4" />
                  Entrega
                </Button>
                <Button
                  type="button"
                  variant={orderType === "pickup" ? "default" : "outline"}
                  onClick={() => setOrderType("pickup")}
                  className="gap-2"
                >
                  <Package className="h-4 w-4" />
                  Retirada
                </Button>
              </div>
            </div>

            {/* Endereço — só renderiza se delivery */}
            {orderType === "delivery" && (
              <div>
                <Label className="text-sm font-semibold">Endereço</Label>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="mt-1"
                  placeholder="Rua, número, complemento, bairro..."
                />
              </div>
            )}

            {/* v1.0.1 — Pagamento: Select padronizado em vez de Input livre */}
            <div>
              <Label className="text-sm font-semibold">Forma de pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* v1.0.1 — Campo Troco aparece só quando Dinheiro */}
              {paymentMethod === "dinheiro" && (
                <div className="mt-2">
                  <Label className="text-xs">Troco para</Label>
                  <CurrencyInput
                    value={trocoPara}
                    onChange={(v) => setTrocoPara(v)}
                    placeholder="R$ 0,00 (sem troco)"
                  />
                </div>
              )}
            </div>

            {/* Observações */}
            <div>
              <Label className="text-sm font-semibold">Observações do pedido</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Observações gerais..."
              />
            </div>

            <Separator />

            {/* Total */}
            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
              <span className="text-sm font-semibold">Novo total</span>
              <span className="text-lg font-bold text-primary">{formatCurrency(newTotal)}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {!isLocked && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || items.length === 0}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Salvar alterações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
