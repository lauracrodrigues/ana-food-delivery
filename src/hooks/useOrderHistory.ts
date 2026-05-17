// v2.0.0 — Histórico pedidos: localStorage + fetch servidor por customer_phone (multi-device + pedidos via WhatsApp)
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

  // Carrega localStorage no mount
  useEffect(() => {
    if (!companyId) return;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setHistory(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [key]);

  // Adiciona pedido novo (após checkout) — cache local imediato
  const addOrder = (order: OrderHistoryItem) => {
    setHistory(prev => {
      const updated = [order, ...prev.filter(o => o.orderId !== order.orderId)].slice(0, 30);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  // Fetch pedidos do servidor pelo telefone — pega pedidos de outros devices + via WhatsApp
  // Usa RPC SECURITY DEFINER pra contornar RLS (cardápio público é anônimo)
  const loadFromServer = useCallback(async (customerPhone: string) => {
    if (!companyId || !customerPhone) return;
    const phoneDigits = customerPhone.replace(/\D/g, "");
    if (phoneDigits.length < 8) return;

    const { data, error } = await supabase.rpc("get_customer_orders" as any, {
      p_company_id: companyId,
      p_phone: phoneDigits,
    });

    if (error) {
      // Log pra diagnose quando RPC falha (RLS, type, etc.)
      console.error("[useOrderHistory] RPC get_customer_orders erro:", error);
      return;
    }
    if (!data || !Array.isArray(data)) {
      console.warn("[useOrderHistory] RPC retornou formato inesperado:", data);
      return;
    }

    // Converte pra formato OrderHistoryItem + merge com localStorage existente
    const serverItems: OrderHistoryItem[] = (data as any[]).map((o: any) => ({
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

    // Merge: servidor é fonte da verdade; localStorage adiciona pedidos não persistidos (caso falha)
    setHistory(prev => {
      const merged = [...serverItems];
      for (const local of prev) {
        if (!merged.find(s => s.orderId === local.orderId)) merged.push(local);
      }
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const top = merged.slice(0, 30);
      localStorage.setItem(key, JSON.stringify(top));
      return top;
    });
  }, [companyId, key]);

  // Atualiza status dos pedidos pendentes via RPC (poll passivo)
  const refreshStatuses = useCallback(async () => {
    if (history.length === 0) return;
    const toCheck = history.filter(o => !["delivered", "cancelled", "archived"].includes(o.status));
    if (toCheck.length === 0) return;

    const updated = [...history];
    await Promise.all(
      toCheck.map(async (item) => {
        try {
          const { data } = await supabase.rpc("get_order_tracking", { p_order_id: item.orderId });
          if (data && typeof data === 'object' && 'status' in data && data.status) {
            const idx = updated.findIndex(o => o.orderId === item.orderId);
            if (idx >= 0) updated[idx] = { ...updated[idx], status: String(data.status) };
          }
        } catch { /* ignore */ }
      })
    );
    setHistory(updated);
    localStorage.setItem(key, JSON.stringify(updated));
  }, [history, key]);

  return { history, addOrder, refreshStatuses, loadFromServer };
}
