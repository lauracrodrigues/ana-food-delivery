// v1.0.0 — Produtos mais vendidos automáticos (últimos 30 dias)
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePopularProducts(companyId: string, days = 30, limit = 10) {
  const [popularIds, setPopularIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    supabase.rpc("get_popular_products" as any, {
      p_company_id: companyId,
      p_days: days,
      p_limit: limit,
    }).then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        setPopularIds(data.map((d: any) => d.product_id));
      }
      setLoading(false);
    });
  }, [companyId, days, limit]);

  return { popularIds, loading };
}
