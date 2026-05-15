// v2.4.0 — Cupom + valor mínimo + taxa entrega + pontos fidelidade (ganho + resgate)
import { formatCurrency } from "@/lib/currency-formatter";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePIXPolling } from "@/hooks/menu/usePIXPolling";
import { useOrderCreation } from "@/hooks/menu/useOrderCreation";
import { Loader2, LocateFixed, Copy, CheckCircle2, Clock, AlertCircle, Sparkles } from "lucide-react";
import { CouponInput } from "./CouponInput";
import { CouponData, CouponValidationResult, validateCoupon } from "@/lib/coupon-validator";
import type { CustomerSession } from "@/hooks/useCustomerSession";
import type { LoyaltyConfig } from "@/hooks/useLoyaltyPoints";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";

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

interface Company {
  id: string;
  name: string;
  fantasy_name: string;
  delivery_fee?: number | null;
  min_order_value?: number | null;
  loyalty_points_per_real?: number | null;
  loyalty_min_redeem?: number | null;
  loyalty_redeem_value?: number | null;
}

interface MenuCheckoutProps {
  cart: CartItem[];
  total: number;
  company: Company;
  tableInfo?: { id: string; table_number: string } | null;
  requireCustomerInfo?: boolean;
  session?: CustomerSession | null;
  loyaltyPoints?: number;
  loyaltyConfig?: LoyaltyConfig;
  prefilledCouponCode?: string | null;
  onClose: () => void;
  onSuccess: (orderId?: string) => void;
  onSaveAddress?: (address: string) => void;
  onLoyaltyChange?: () => void;
}

// Tela do QR code PIX — compacta para mobile
function PixQrScreen({
  orderId, qrCode, qrCodeBase64, expiresAt, total, onConfirmed, onClose,
}: {
  orderId: string;
  qrCode: string;
  qrCodeBase64?: string | null;
  expiresAt?: string | null;
  total: number;
  onConfirmed: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!expiresAt) return 30 * 60;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  // Sincroniza quando expiresAt mudar (ex: novo QR gerado)
  useEffect(() => {
    if (!expiresAt) return;
    setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
  }, [expiresAt]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  usePIXPolling(orderId, onConfirmed);

  const copyCode = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast({ title: "Código copiado!" });
    setTimeout(() => setCopied(false), 3000);
  };

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const expired = secondsLeft <= 0;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Valor + instrução */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Escaneie o QR code ou copie o código</p>
        <p className="text-xl font-bold text-primary">{formatCurrency(total)}</p>
      </div>

      {/* QR menor para caber na tela */}
      <div className="border-2 border-dashed border-muted rounded-xl p-2 bg-white">
        {qrCodeBase64 ? (
          <img
            src={`data:image/png;base64,${qrCodeBase64}`}
            alt="QR Code PIX"
            className="w-40 h-40 object-contain"
          />
        ) : (
          <div className="w-40 h-40 flex items-center justify-center text-xs text-muted-foreground text-center p-3">
            Use o código abaixo para pagar via PIX
          </div>
        )}
      </div>

      {/* Countdown */}
      <div className={`flex items-center gap-1.5 text-sm font-medium ${expired ? "text-destructive" : "text-amber-600"}`}>
        <Clock className="w-3.5 h-3.5" />
        {expired ? "PIX expirado" : `Expira em ${mins}:${secs}`}
      </div>

      {/* Copia e cola — botão grande para facilitar no celular */}
      {!expired && (
        <div className="w-full space-y-1.5">
          <p className="text-xs text-muted-foreground text-center">PIX copia e cola:</p>
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 font-mono text-xs h-10"
            onClick={copyCode}
          >
            {copied
              ? <><CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> Copiado!</>
              : <><Copy className="w-4 h-4 shrink-0" /> Copiar código PIX</>
            }
          </Button>
        </div>
      )}

      {/* Status polling */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        Aguardando confirmação...
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground text-xs h-8">
        Cancelar pedido
      </Button>
    </div>
  );
}

export function MenuCheckout({
  cart, total, company, tableInfo, requireCustomerInfo, session,
  loyaltyPoints = 0, loyaltyConfig, prefilledCouponCode,
  onClose, onSuccess, onSaveAddress, onLoyaltyChange,
}: MenuCheckoutProps) {
  const { toast } = useToast();
  const { createOrder, loading, pixData } = useOrderCreation();
  const [locating, setLocating] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [redeemPointsActive, setRedeemPointsActive] = useState(false);
  const [lookupDone, setLookupDone] = useState(false); // evita lookup repetido
  const { lookupByPhone } = useCustomerLookup(company.id);

  const [formData, setFormData] = useState({
    customer_name: session?.name ?? "",
    customer_phone: session?.phone ?? "",
    type: tableInfo ? "table" : "delivery",
    address: session?.lastAddress ?? "",
    payment_method: "dinheiro",
    observations: "",
  });

  const isTableOrder = !!tableInfo;

  // Taxa de entrega: aplica só em modo delivery; zera se cupom tem freeShipping
  const deliveryFee = !isTableOrder && formData.type === "delivery"
    ? (couponResult?.freeShipping ? 0 : (company.delivery_fee ?? 0))
    : 0;
  const couponDiscount = couponResult?.discount ?? 0;

  // Resgate de pontos: calcula desconto em R$ se cliente tem saldo >= mínimo
  const minRedeem = loyaltyConfig?.loyalty_min_redeem ?? 100;
  const redeemValue = loyaltyConfig?.loyalty_redeem_value ?? 1.0;
  const canRedeem = loyaltyPoints >= minRedeem;
  // Resgata em blocos do mínimo: ex 250 pts, min 100 → resgata 200 pts = 2x redeem_value
  const redeemBlocks = canRedeem ? Math.floor(loyaltyPoints / minRedeem) : 0;
  const redeemPointsAmount = redeemBlocks * minRedeem;
  const redeemDiscount = redeemPointsActive ? redeemBlocks * redeemValue : 0;

  const finalTotal = Math.max(0, total + deliveryFee - couponDiscount - redeemDiscount);

  // Lookup automático por telefone: ao digitar 10+ dígitos sem nome preenchido,
  // busca dados do cliente em pedidos anteriores e auto-preenche
  useEffect(() => {
    if (lookupDone || isTableOrder) return;
    const phoneDigits = formData.customer_phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) return;
    // Já tem nome preenchido (provavelmente veio da session)? não sobrescreve
    if (formData.customer_name.trim() && formData.address.trim()) return;

    const timer = setTimeout(async () => {
      const result = await lookupByPhone(formData.customer_phone);
      if (!result.found) { setLookupDone(true); return; }

      setFormData(prev => ({
        ...prev,
        customer_name: prev.customer_name.trim() || result.name || "",
        address: prev.address.trim() || result.lastAddress || "",
      }));
      setLookupDone(true);
      toast({
        title: `Bem-vindo de volta! 👋`,
        description: `${result.name || "Cliente"} — você já fez ${result.totalOrders} pedido(s) aqui.`,
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [formData.customer_phone, formData.customer_name, formData.address, lookupDone, isTableOrder, lookupByPhone, toast]);

  // Pré-aplica cupom passado via link compartilhado (?cupom=CODE)
  useEffect(() => {
    if (!prefilledCouponCode || appliedCoupon || isTableOrder) return;
    (async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("company_id", company.id)
        .eq("code", prefilledCouponCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) return;
      const result = validateCoupon(data as CouponData, total);
      if (result.valid) {
        setAppliedCoupon(data as CouponData);
        setCouponResult(result);
        toast({
          title: "Cupom aplicado automaticamente! 🎟️",
          description: `${data.code} — desconto de ${formatCurrency(result.discount)}${result.freeShipping ? " + frete grátis" : ""}`,
        });
      }
    })();
  }, [prefilledCouponCode, company.id, total, isTableOrder, appliedCoupon, toast]);

  // Verifica se empresa tem MP configurado via função segura (não expõe credenciais ao anon)
  const { data: hasMpActive } = useQuery({
    queryKey: ["mp-active", company.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("company_has_mp", { p_company_id: company.id });
      return !!data;
    },
  });

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS não disponível", description: "Seu navegador não suporta geolocalização.", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "pt-BR", "User-Agent": "AnaFood/1.0" } }
          );
          const data = await res.json();
          const a = data?.address || {};
          const road = a.road || a.pedestrian || a.footway || "";
          const houseNumber = a.house_number || "";
          const suburb = a.suburb || a.neighbourhood || a.quarter || "";
          const city = a.city || a.town || a.village || a.municipality || "";
          const state = a.state || "";
          const addressParts = [road, houseNumber, suburb, city, state].filter(Boolean).join(", ");
          setFormData(prev => ({ ...prev, address: addressParts }));
          toast({ title: "Localização detectada", description: "Verifique e ajuste o endereço se necessário." });
        } catch {
          toast({ title: "Erro ao buscar endereço", description: "Tente digitar manualmente.", variant: "destructive" });
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        const msg = err.code === 1
          ? "Permita o acesso à localização nas configurações do navegador."
          : "Não foi possível obter sua localização.";
        toast({ title: "Localização negada", description: msg, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Pós-pedido: resgata pontos (se ativo) e concede novos pontos pelo total final
  const handleLoyaltyAfterOrder = async (orderId: string) => {
    if (!session?.phone || !loyaltyConfig) return;
    const phone = session.phone;
    let balance = loyaltyPoints;

    // 1) Resgate: debita os pontos usados
    if (redeemPointsActive && redeemPointsAmount > 0) {
      balance = balance - redeemPointsAmount;
      await supabase.from("loyalty_points" as any).upsert({
        company_id: company.id,
        customer_phone: phone,
        points: balance,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,customer_phone" });
      await supabase.from("loyalty_transactions" as any).insert({
        company_id: company.id,
        customer_phone: phone,
        order_id: orderId,
        points_earned: 0,
        points_redeemed: redeemPointsAmount,
        balance_after: balance,
      });
    }

    // 2) Ganho: gera pontos pelo total final do pedido
    const perReal = loyaltyConfig.loyalty_points_per_real ?? 1;
    const earned = Math.floor(finalTotal * perReal);
    if (earned > 0) {
      balance = balance + earned;
      await supabase.from("loyalty_points" as any).upsert({
        company_id: company.id,
        customer_phone: phone,
        points: balance,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id,customer_phone" });
      await supabase.from("loyalty_transactions" as any).insert({
        company_id: company.id,
        customer_phone: phone,
        order_id: orderId,
        points_earned: earned,
        points_redeemed: 0,
        balance_after: balance,
      });
    }

    onLoyaltyChange?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.customer_phone) {
      toast({ title: "Atenção", description: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (formData.type === "delivery" && !formData.address) {
      toast({ title: "Atenção", description: "Informe o endereço de entrega", variant: "destructive" });
      return;
    }
    if (company.min_order_value && total < company.min_order_value && !isTableOrder) {
      toast({ title: "Pedido mínimo não atingido", description: `Mínimo de ${formatCurrency(company.min_order_value)}`, variant: "destructive" });
      return;
    }

    const payload = {
      company_id: company.id,
      customer_name: formData.customer_name,
      customer_phone: formData.customer_phone,
      total: finalTotal,
      items: cart.map(item => {
        const extrasDesc = item.extras.length > 0
          ? `Extras: ${item.extras.map(e => e.name).join(", ")}`
          : null;
        const obs = [item.observations, extrasDesc].filter(Boolean).join(" | ");
        return {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price + item.extrasTotal,
          quantity: item.quantity,
          observations: obs || undefined,
        };
      }),
      type: isTableOrder ? "table" : formData.type,
      address: formData.address,
      payment_method: formData.payment_method,
      observations: formData.observations,
      status: "pending",
      delivery_fee: deliveryFee,
      estimated_time: 30,
      source: tableInfo ? "qr_code" : "digital_menu",
      ...(tableInfo && { table_id: tableInfo.id, table_number: tableInfo.table_number }),
      ...(appliedCoupon && { coupon_id: appliedCoupon.id }),
    };

    try {
      await createOrder(payload, async (orderId) => {
        // Incrementa uso do cupom após pedido criado
        if (appliedCoupon) {
          await supabase
            .from("coupons")
            .update({ uses_count: (appliedCoupon.uses_count ?? 0) + 1 })
            .eq("id", appliedCoupon.id);
        }
        // Salva endereço na sessão do cliente
        if (formData.type === "delivery" && formData.address && onSaveAddress) {
          onSaveAddress(formData.address);
        }
        // Fidelidade: resgate (consome pontos) + ganho (gera pontos)
        if (session?.phone && loyaltyConfig) {
          await handleLoyaltyAfterOrder(orderId);
        }
        // Tracking event: registra pedido para analytics
        try {
          await supabase.from("product_events" as any).insert(
            cart.map(item => ({
              company_id: company.id,
              product_id: item.product.id,
              event_type: "order",
            }))
          );
        } catch (err) { console.warn("Failed to log order events", err); }
        toast({ title: "Pedido realizado!", description: "Aguarde a confirmação." });
        onSuccess(orderId);
      });
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast({ title: "Erro", description: error?.message ?? "Erro ao realizar pedido. Tente novamente.", variant: "destructive" });
    }
  };

  // Pagamento PIX confirmado via polling
  const handlePixConfirmed = () => {
    setPaymentConfirmed(true);
    toast({ title: "Pagamento confirmado! ✅", description: "Seu pedido foi recebido com sucesso." });
    setTimeout(() => onSuccess(pixData?.orderId), 2000);
  };

  // Tela de QR code
  if (pixData) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-sm w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pagar com PIX</DialogTitle>
          </DialogHeader>
          {paymentConfirmed ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <p className="text-lg font-semibold">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground">Seu pedido está sendo preparado.</p>
            </div>
          ) : (
            <PixQrScreen
              orderId={pixData.orderId}
              qrCode={pixData.qrCode}
              qrCodeBase64={pixData.qrCodeBase64}
              expiresAt={pixData.expiresAt}
              total={finalTotal}
              onConfirmed={handlePixConfirmed}
              onClose={onClose}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isTableOrder ? `Finalizar Pedido - Mesa ${tableInfo?.table_number}` : "Finalizar Pedido"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados do cliente */}
          <div className="space-y-4">
            <h3 className="font-semibold">Seus Dados</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>

          {/* Tipo de pedido */}
          {!isTableOrder && (
            <div className="space-y-4">
              <h3 className="font-semibold">Tipo de Pedido</h3>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery">Entrega</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <Label htmlFor="pickup">Retirada</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Endereço */}
          {!isTableOrder && formData.type === "delivery" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="address">Endereço de Entrega *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-7 text-blue-600 border-blue-300 hover:bg-blue-50"
                  onClick={handleDetectLocation}
                  disabled={locating}
                >
                  {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LocateFixed className="w-3.5 h-3.5" />}
                  {locating ? "Detectando..." : "Usar minha localização"}
                </Button>
              </div>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, bairro, complemento"
                rows={3}
                required
              />
            </div>
          )}

          {/* Forma de pagamento */}
          <div className="space-y-4">
            <h3 className="font-semibold">Forma de Pagamento</h3>
            <RadioGroup
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dinheiro" id="dinheiro" />
                <Label htmlFor="dinheiro">Dinheiro</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix">PIX (manual)</Label>
              </div>
              {/* Opção MP PIX aparece só se empresa configurou */}
              {hasMpActive && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pix_mp" id="pix_mp" />
                  <Label htmlFor="pix_mp" className="flex items-center gap-2">
                    <span>PIX automático</span>
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">QR Code</span>
                  </Label>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cartao" id="cartao" />
                <Label htmlFor="cartao">Cartão</Label>
              </div>
            </RadioGroup>

            {/* Aviso quando PIX automático selecionado */}
            {formData.payment_method === "pix_mp" && (
              <p className="text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded px-3 py-2">
                Após confirmar, você receberá um QR code para pagar via PIX. O pedido é confirmado automaticamente após o pagamento.
              </p>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              placeholder="Alguma observação adicional?"
              rows={3}
            />
          </div>

          {/* Cupom de desconto */}
          {!isTableOrder && (
            <div className="space-y-2">
              <Label>Cupom de desconto</Label>
              <CouponInput
                companyId={company.id}
                cartTotal={total}
                customerPhone={formData.customer_phone || session?.phone}
                appliedCoupon={appliedCoupon}
                appliedResult={couponResult}
                onApply={(coupon, result) => {
                  setAppliedCoupon(coupon);
                  setCouponResult(result);
                  toast({ title: "Cupom aplicado!", description: `-${formatCurrency(result.discount)}${result.freeShipping ? " + frete grátis" : ""}` });
                }}
                onRemove={() => { setAppliedCoupon(null); setCouponResult(null); }}
              />
            </div>
          )}

          {/* Resgate de pontos fidelidade */}
          {!isTableOrder && canRedeem && loyaltyConfig && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={redeemPointsActive}
                  onCheckedChange={(v) => setRedeemPointsActive(!!v)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-900">
                      Usar {redeemPointsAmount} pontos
                    </p>
                  </div>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Você tem {loyaltyPoints} pts — desconto de {formatCurrency(redeemBlocks * redeemValue)}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Aviso valor mínimo */}
          {company.min_order_value != null && total < company.min_order_value && !isTableOrder && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <span>Pedido mínimo: {formatCurrency(company.min_order_value)}</span>
                <div className="mt-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (total / company.min_order_value) * 100)}%` }}
                  />
                </div>
                <span className="text-xs">Faltam {formatCurrency(company.min_order_value - total)}</span>
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span>Taxa de Entrega</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            {couponResult?.freeShipping && company.delivery_fee && company.delivery_fee > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Frete (cupom)</span>
                <span>-{formatCurrency(company.delivery_fee)}</span>
              </div>
            )}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Desconto ({appliedCoupon?.code})</span>
                <span>-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
            {redeemDiscount > 0 && (
              <div className="flex justify-between text-sm text-amber-700">
                <span>Pontos resgatados ({redeemPointsAmount} pts)</span>
                <span>-{formatCurrency(redeemDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(finalTotal)}</span>
            </div>
            {/* Pontos a ganhar */}
            {session?.phone && loyaltyConfig && finalTotal > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 pt-1">
                <Sparkles className="h-3 w-3" />
                <span>
                  Você ganhará{" "}
                  <strong>{Math.floor(finalTotal * (loyaltyConfig.loyalty_points_per_real ?? 1))} pontos</strong>{" "}
                  com este pedido
                </span>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (!!company.min_order_value && total < company.min_order_value && !isTableOrder)}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formData.payment_method === "pix_mp" ? "Gerar QR Code PIX" : "Confirmar Pedido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
