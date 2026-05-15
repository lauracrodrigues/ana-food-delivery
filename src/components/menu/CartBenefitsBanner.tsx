// v1.0.0 — Banner no carrinho com progresso de combos compre-e-ganhe
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency-formatter";
import { Gift } from "lucide-react";

interface ComboCampaign {
  id: string;
  name: string;
  trigger_type: "qty_get" | "min_value";
  trigger_qty: number | null;
  trigger_value: number | null;
  trigger_product_id: string | null;
  reward_product_id: string | null;
  reward_discount_pct: number;
  valid_until: string | null;
  reward_product?: { name: string } | null;
}

interface CartItem {
  product: { id: string };
  quantity: number;
}

interface CartBenefitsBannerProps {
  companyId: string;
  cart: CartItem[];
  cartTotal: number;
}

export function CartBenefitsBanner({ companyId, cart, cartTotal }: CartBenefitsBannerProps) {
  const [combos, setCombos] = useState<ComboCampaign[]>([]);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("combo_campaigns" as any)
      .select(`*, reward_product:products!combo_campaigns_reward_product_id_fkey(name)`)
      .eq("company_id", companyId)
      .eq("is_active", true)
      .then(({ data }) => {
        const today = new Date().toISOString().slice(0, 10);
        const active = (data || []).filter((c: any) =>
          !c.valid_until || c.valid_until >= today
        );
        setCombos(active as ComboCampaign[]);
      });
  }, [companyId]);

  if (combos.length === 0) return null;

  // Calcula progresso pra cada combo
  const items = combos.map(c => {
    if (c.trigger_type === "min_value" && c.trigger_value) {
      const remaining = c.trigger_value - cartTotal;
      const progress = Math.min(100, (cartTotal / c.trigger_value) * 100);
      const achieved = remaining <= 0;
      return {
        combo: c,
        achieved,
        message: achieved
          ? `🎉 Você ganhou ${c.reward_product?.name || "produto bônus"}!`
          : `Faltam ${formatCurrency(remaining)} pra ganhar ${c.reward_product?.name || "produto bônus"}`,
        progress,
      };
    }
    if (c.trigger_type === "qty_get" && c.trigger_qty) {
      // Conta unidades de items do trigger_product_id OU total cart
      const relevantQty = c.trigger_product_id
        ? cart.filter(i => i.product.id === c.trigger_product_id).reduce((s, i) => s + i.quantity, 0)
        : cart.reduce((s, i) => s + i.quantity, 0);
      const remaining = c.trigger_qty - relevantQty;
      const progress = Math.min(100, (relevantQty / c.trigger_qty) * 100);
      const achieved = remaining <= 0;
      return {
        combo: c,
        achieved,
        message: achieved
          ? `🎉 Você ganhou ${c.reward_product?.name || "produto bônus"}!`
          : `Adicione mais ${remaining} pra ganhar ${c.reward_product?.name || "produto bônus"}`,
        progress,
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  // Mostra só combos relevantes: já conquistados OU >30% próximos
  const relevant = items.filter(i => i.achieved || i.progress >= 30);
  if (relevant.length === 0) return null;

  // Pega o mais próximo (maior progresso, mas não conquistado primeiro)
  const showcase = relevant.sort((a, b) => {
    if (a.achieved && !b.achieved) return -1;
    if (!a.achieved && b.achieved) return 1;
    return b.progress - a.progress;
  })[0];

  return (
    <div className={`rounded-xl p-3 mb-3 border-2 ${showcase.achieved
      ? "bg-green-50 border-green-300 dark:bg-green-950/20"
      : "bg-purple-50 border-purple-200 dark:bg-purple-950/20"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Gift className={`h-4 w-4 ${showcase.achieved ? "text-green-600" : "text-purple-600"}`} />
        <p className={`text-sm font-semibold ${showcase.achieved ? "text-green-900" : "text-purple-900"}`}>
          {showcase.combo.name}
        </p>
      </div>
      <p className={`text-xs mb-2 ${showcase.achieved ? "text-green-800" : "text-purple-800"}`}>
        {showcase.message}
      </p>
      <div className="h-1.5 bg-white/60 dark:bg-background/60 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all rounded-full ${showcase.achieved ? "bg-green-500" : "bg-purple-500"}`}
          style={{ width: `${showcase.progress}%` }}
        />
      </div>
    </div>
  );
}
