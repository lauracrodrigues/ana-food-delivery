// v3.0.0 — React Query backend + localStorage cache offline-first
// API pública preservada: { history, addOrder, refreshStatuses, loadFromServer }
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderHistoryItem {
  orderId: string;
  orderNumber?: string;
  date: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  status: string;
  type?: string;
}

// localStorage compat — cache offline + suporte aos pedidos criados antes do servidor sincronizar
function readLocalStorage(companyId: string): OrderHistoryItem[] {
  try {
    const raw = localStorage.getItem(`anafood_history_${companyId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocalStorage(companyId: string, items: OrderHistoryItem[]): void {
  try {
    localStorage.setItem(`anafood_history_${companyId}`, JSON.stringify(items));
  } catch { /* quota exceeded */ }
}

/**
 * Fetch + merge server orders com cache local.
 * Server é fonte da verdade — local só pra orders ainda não sincronizados.
 */
async function fetchOrdersFromServer(companyId: string, phone: string): Promise<OrderHistoryItem[]> {
  const digits = phone.replace(/\D/g, "");
  if (!companyId || digits.length < 8) return [];

  const { data, error } = await supabase.rpc("get_customer_orders" as any, {
    p_company_id: companyId,
    p_phone: digits,
  });

  if (error) {
    console.error("[useOrderHistory] RPC erro:", error);
    return [];
  }
  if (!Array.isArray(data)) return [];

  return (data as any[]).map((o: any) => ({
    orderId: o.id,
    orderNumber: o.order_number != null ? String(o.order_number) : undefined,
    date: o.created_at,
    total: Number(o.total),
    items: Array.isArray(o.items) ? o.items.map((i: any) => ({
      name: i.name || i.item_name || "Item",
      quantity: Number(i.quantity || 1),
      price: Number(i.price || 0),
    })) : [],
    status: o.status || "pending",
    type: o.type,
  }));
}

/**
 * Hook principal — combina React Query (server) + localStorage (offline buffer)
 */
export function useOrderHistory(companyId: string) {
  const qc = useQueryClient();
  // Phone vem via session externa OR setado por loadFromServer manual
  const [phone, setPhone] = useState<string>("");
  // Local buffer pra pedidos criados antes do servidor responder
  const [localOnly, setLocalOnly] = useState<OrderHistoryItem[]>([]);

  // Hidrata localStorage no mount
  useEffect(() => {
    if (!companyId) return;
    setLocalOnly(readLocalStorage(companyId));
  }, [companyId]);

  // Query servidor — só roda quando phone presente
  const { data: serverOrders = [] } = useQuery({
    queryKey: ["customer-orders", companyId, phone],
    queryFn: () => fetchOrdersFromServer(companyId, phone),
    enabled: !!companyId && phone.replace(/\D/g, "").length >= 8,
    staleTime: 30 * 1000, // 30s — refetch automático
    refetchOnWindowFocus: true,
  });

  // Merge final: server primeiro (autoritativo) + local exclusivo (não sincronizado ainda)
  const history: OrderHistoryItem[] = (() => {
    const seen = new Set<string>(serverOrders.map(o => o.orderId));
    const merged = [...serverOrders];
    for (const local of localOnly) {
      if (!seen.has(local.orderId)) merged.push(local);
    }
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return merged.slice(0, 30);
  })();

  // Persiste merge no localStorage (cache offline)
  useEffect(() => {
    if (!companyId || history.length === 0) return;
    writeLocalStorage(companyId, history);
  }, [companyId, history]);

  // Adiciona pedido novo no buffer local — invalida query pra forçar refetch servidor
  const addOrder = useCallback((order: OrderHistoryItem) => {
    setLocalOnly(prev => {
      const dedup = prev.filter(o => o.orderId !== order.orderId);
      return [order, ...dedup].slice(0, 30);
    });
    // Invalida query — refetch após API processar
    qc.invalidateQueries({ queryKey: ["customer-orders", companyId] });
  }, [companyId, qc]);

  // Refresh status manual — força refetch do React Query
  const refreshStatuses = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["customer-orders", companyId] });
  }, [companyId, qc]);

  // Trigger carga server (chamado quando session.phone disponível)
  const loadFromServer = useCallback(async (customerPhone: string) => {
    setPhone(customerPhone);
    // Força refetch imediato (não espera staleTime)
    await qc.invalidateQueries({ queryKey: ["customer-orders", companyId, customerPhone] });
  }, [companyId, qc]);

  return { history, addOrder, refreshStatuses, loadFromServer };
}
