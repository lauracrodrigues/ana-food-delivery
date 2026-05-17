// v2.0.0 — Lookup cliente por telefone via RPC (RLS bloqueava SELECT direto pra anon)
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerLookupResult {
  found: boolean;
  name?: string;
  lastAddress?: string;
  totalOrders?: number;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function useCustomerLookup(companyId: string) {
  const lookupByPhone = useCallback(async (phoneInput: string): Promise<CustomerLookupResult> => {
    if (!companyId || !phoneInput) return { found: false };
    const phone = normalizePhone(phoneInput);
    if (phone.length < 10) return { found: false };

    // Usa RPC get_customer_orders (SECURITY DEFINER) — anon não tem SELECT direto via RLS
    const { data, error } = await supabase.rpc("get_customer_orders" as any, {
      p_company_id: companyId,
      p_phone: phone,
    });

    if (error) {
      console.error("[useCustomerLookup] RPC erro:", error);
      return { found: false };
    }
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { found: false };
    }

    // Primeiro item = pedido mais recente (RPC já ordena DESC)
    const firstOrder = data[0] as any;
    return {
      found: true,
      name: firstOrder.customer_name ?? undefined,
      lastAddress: firstOrder.address ?? undefined,
      totalOrders: data.length,
    };
  }, [companyId]);

  return { lookupByPhone };
}
