// v1.0.0 — Histórico de pedidos do cliente (localStorage + status via RPC)
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OrderHistoryItem {
  orderId: string;
  orderNumber?: string;
  date: string;        // ISO string
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  status: string;
  type?: string;
}

export function useOrderHistory(companyId: string) {
  const key = `anafood_history_${companyId}`;
  const [history, setHistory] = useState<OrderHistoryItem[]>([]);

  useEffect(() => {
    if (!companyId) return;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [key]);

  const addOrder = (order: OrderHistoryItem) => {
    setHistory(prev => {
      const updated = [order, ...prev.filter(o => o.orderId !== order.orderId)].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  // Atualiza status dos pedidos pendentes via RPC
  const refreshStatuses = useCallback(async () => {
    if (history.length === 0) return;
    const toCheck = history.filter(o => !["delivered", "cancelled", "archived"].includes(o.status));
    if (toCheck.length === 0) return;

    const updated = [...history];
    await Promise.all(
      toCheck.map(async (item) => {
        try {
          const { data } = await supabase.rpc("get_order_tracking", { p_order_id: item.orderId });
          if (data?.status) {
            const idx = updated.findIndex(o => o.orderId === item.orderId);
            if (idx >= 0) updated[idx] = { ...updated[idx], status: data.status };
          }
        } catch { /* ignore */ }
      })
    );
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  }, [history, key]);

  return { history, addOrder, refreshStatuses };
}
