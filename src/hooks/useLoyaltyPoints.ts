// v1.0.0 — Fidelidade: saldo, ganhar e resgatar pontos via Supabase
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LoyaltyConfig {
  loyalty_points_per_real?: number | null;
  loyalty_min_redeem?: number | null;
  loyalty_redeem_value?: number | null;
}

export function useLoyaltyPoints(companyId: string, customerPhone: string | null | undefined) {
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPoints = useCallback(async () => {
    if (!companyId || !customerPhone) { setPoints(0); return; }
    setLoading(true);
    const { data } = await supabase
      .from("loyalty_points" as any)
      .select("points")
      .eq("company_id", companyId)
      .eq("customer_phone", customerPhone)
      .maybeSingle();
    setPoints((data as any)?.points ?? 0);
    setLoading(false);
  }, [companyId, customerPhone]);

  useEffect(() => { fetchPoints(); }, [fetchPoints]);

  // Concede pontos após pedido confirmado
  const awardPoints = async (
    orderId: string,
    orderTotal: number,
    config: LoyaltyConfig,
    currentBalance: number
  ) => {
    if (!customerPhone || !companyId) return;
    const perReal = config.loyalty_points_per_real ?? 1;
    const earned = Math.floor(orderTotal * perReal);
    if (earned <= 0) return;
    const newBalance = currentBalance + earned;

    await supabase.from("loyalty_points" as any).upsert({
      company_id: companyId,
      customer_phone: customerPhone,
      points: newBalance,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,customer_phone" });

    await supabase.from("loyalty_transactions" as any).insert({
      company_id: companyId,
      customer_phone: customerPhone,
      order_id: orderId,
      points_earned: earned,
      points_redeemed: 0,
      balance_after: newBalance,
    });

    setPoints(newBalance);
  };

  // Resgata pontos — retorna valor em R$ descontado
  const redeemPoints = async (
    pointsToRedeem: number,
    orderId: string,
    config: LoyaltyConfig,
    currentBalance: number
  ): Promise<number> => {
    if (!customerPhone || !companyId || pointsToRedeem <= 0) return 0;
    const redeemValue = config.loyalty_redeem_value ?? 1.0;
    const discountReais = (pointsToRedeem / 100) * redeemValue;
    const newBalance = currentBalance - pointsToRedeem;

    await supabase.from("loyalty_points" as any).upsert({
      company_id: companyId,
      customer_phone: customerPhone,
      points: newBalance,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,customer_phone" });

    await supabase.from("loyalty_transactions" as any).insert({
      company_id: companyId,
      customer_phone: customerPhone,
      order_id: orderId,
      points_earned: 0,
      points_redeemed: pointsToRedeem,
      balance_after: newBalance,
    });

    setPoints(newBalance);
    return discountReais;
  };

  return { points, loading, fetchPoints, awardPoints, redeemPoints };
}
