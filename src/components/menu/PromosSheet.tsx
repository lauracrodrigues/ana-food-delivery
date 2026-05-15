// v1.0.0 — Sheet de promoções (cupons + cashback + compre e ganhe)
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency-formatter";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tag, Sparkles, Gift, Copy, Loader2, CheckCircle2 } from "lucide-react";
import type { LoyaltyConfig } from "@/hooks/useLoyaltyPoints";

interface PublicCoupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number | null;
  discount_limit: number | null;
  free_shipping: boolean;
  valid_until: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
}

interface PromosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  customerPhone?: string | null;
  loyaltyPoints?: number;
  loyaltyConfig?: LoyaltyConfig;
}

export function PromosSheet({
  open, onOpenChange, companyId, customerPhone,
  loyaltyPoints = 0, loyaltyConfig,
}: PromosSheetProps) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<PublicCoupon[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrega cupons disponíveis quando sheet abre
  useEffect(() => {
    if (!open || !companyId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("coupons")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      // Filtra expirados e exauridos client-side
      const now = new Date();
      const available = (data || []).filter((c: any) => {
        if (c.valid_until && new Date(c.valid_until) < now) return false;
        if (c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses) return false;
        return true;
      });
      setCoupons(available as PublicCoupon[]);
      setLoading(false);
    })();
  }, [open, companyId]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado!", description: `Use ${code} no checkout.` });
  };

  // Como funciona cashback (usa loyalty pontos: 1pt = R$ 1/min_redeem * redeem_value)
  const perReal = loyaltyConfig?.loyalty_points_per_real ?? 1;
  const minRedeem = loyaltyConfig?.loyalty_min_redeem ?? 100;
  const redeemValue = loyaltyConfig?.loyalty_redeem_value ?? 1;
  // Valor estimado do saldo em R$ (apenas se atingiu mínimo)
  const cashbackInReais = loyaltyPoints >= minRedeem
    ? Math.floor(loyaltyPoints / minRedeem) * redeemValue
    : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-0">
        <SheetHeader className="px-4 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" /> Promoções
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="coupons" className="flex flex-col h-[calc(85vh-80px)]">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="coupons" className="gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Cupons
              {coupons.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1 rounded-full">{coupons.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="cashback" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Pontos
            </TabsTrigger>
            <TabsTrigger value="combos" className="gap-1.5">
              <Gift className="h-3.5 w-3.5" /> Combos
            </TabsTrigger>
          </TabsList>

          {/* === CUPONS === */}
          <TabsContent value="coupons" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full px-4 pt-2">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Sem cupons disponíveis no momento</p>
                  <p className="text-xs mt-1">Volte mais tarde 😉</p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {coupons.map(c => {
                    const remaining = c.max_uses ? c.max_uses - (c.uses_count ?? 0) : null;
                    return (
                      <div key={c.id} className="border-2 border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-2xl font-bold tracking-wider font-mono">{c.code}</p>
                            <p className="text-sm font-medium text-amber-700">
                              {c.discount_type === "percentage"
                                ? `${c.discount_value}% de desconto`
                                : `${formatCurrency(c.discount_value)} de desconto`}
                              {c.free_shipping && " + frete grátis"}
                            </p>
                          </div>
                          <button onClick={() => copyCode(c.code)}
                            className="bg-amber-600 text-white px-3 py-2 rounded-lg flex items-center gap-1.5 text-xs font-semibold hover:bg-amber-700">
                            <Copy className="h-3.5 w-3.5" /> Copiar
                          </button>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {c.min_order_value && (
                            <li>• Pedido mínimo: {formatCurrency(c.min_order_value)}</li>
                          )}
                          {c.discount_limit && c.discount_type === "percentage" && (
                            <li>• Desconto máximo: {formatCurrency(c.discount_limit)}</li>
                          )}
                          {c.valid_until && (
                            <li>• Válido até {new Date(c.valid_until).toLocaleDateString("pt-BR")}</li>
                          )}
                          {remaining !== null && remaining < 10 && (
                            <li className="text-red-600 font-medium">• Apenas {remaining} usos restantes!</li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* === CASHBACK / PONTOS === */}
          <TabsContent value="cashback" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full px-4 pt-2">
              <div className="space-y-4 pb-4">
                {!customerPhone ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 text-center">
                    Identifique-se na aba Pedidos pra ver seu saldo de pontos
                  </div>
                ) : (
                  <>
                    {/* Saldo grande */}
                    <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-5 text-center border border-amber-200">
                      <Sparkles className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                      <p className="text-xs text-muted-foreground mb-1">Seu saldo</p>
                      <p className="text-3xl font-bold text-amber-700">{loyaltyPoints}</p>
                      <p className="text-xs text-muted-foreground">pontos</p>
                      {cashbackInReais > 0 && (
                        <p className="text-sm font-semibold text-green-700 mt-2 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Equivale a {formatCurrency(cashbackInReais)} de desconto
                        </p>
                      )}
                    </div>

                    {/* Como funciona */}
                    <div className="space-y-2 text-sm">
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium mb-1">💰 Como ganhar</p>
                        <p className="text-xs text-muted-foreground">
                          {perReal} ponto a cada R$ 1,00 gasto no pedido
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium mb-1">🎁 Como resgatar</p>
                        <p className="text-xs text-muted-foreground">
                          A cada {minRedeem} pts = {formatCurrency(redeemValue)} de desconto.
                          Mínimo de resgate: {minRedeem} pontos.
                          Aplica no checkout.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* === COMBOS / COMPRE E GANHE === */}
          <TabsContent value="combos" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full px-4 pt-2">
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">Em breve</p>
                <p className="text-xs mt-1">Combos especiais e promoções compre-e-ganhe</p>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
