// v1.0.0 — Lookup de cliente por telefone (recupera dados em aparelho novo)
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerLookupResult {
  found: boolean;
  name?: string;
  lastAddress?: string;
  totalOrders?: number;
}

// Normaliza telefone pra comparar (só dígitos)
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function useCustomerLookup(companyId: string) {
  const lookupByPhone = useCallback(async (phoneInput: string): Promise<CustomerLookupResult> => {
    if (!companyId || !phoneInput) return { found: false };
    const phone = normalizePhone(phoneInput);
    if (phone.length < 10) return { found: false }; // telefone incompleto

    // Busca último pedido do cliente nessa empresa
    const { data, error } = await supabase
      .from("orders")
      .select("customer_name, address, customer_phone")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(50); // pega últimos 50, filtra client-side pra ignorar formatação

    if (error || !data) return { found: false };

    // Match por dígitos só (telefone pode estar salvo com/sem formatação)
    const matches = data.filter(o => o.customer_phone && normalizePhone(o.customer_phone) === phone);
    if (matches.length === 0) return { found: false };

    return {
      found: true,
      name: matches[0].customer_name ?? undefined,
      lastAddress: matches[0].address ?? undefined,
      totalOrders: matches.length,
    };
  }, [companyId]);

  return { lookupByPhone };
}
