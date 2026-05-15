// v1.0.0 — Realtime de novos pedidos visível em qualquer página admin
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OrderNotification {
  id: string;
  order_id: string;
  order_number: number | null;
  customer_name: string;
  total: number;
  type: string | null;
  status: string;
  created_at: string;
  read: boolean;
}

const STORAGE_KEY = "anafood_admin_notifications";
const LAST_SEEN_KEY = "anafood_admin_notifications_last_seen";
const MAX_KEEP = 30;

function loadFromStorage(): OrderNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToStorage(items: OrderNotification[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_KEEP))); }
  catch { /* storage cheio */ }
}

export function useGlobalOrderNotifications(companyId: string | null | undefined) {
  const [notifications, setNotifications] = useState<OrderNotification[]>(loadFromStorage);

  // Quantidade não lida (baseado em read flag)
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`global-orders-notif-${companyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `company_id=eq.${companyId}` },
        (payload) => {
          const newOrder = payload.new as any;
          const notif: OrderNotification = {
            id: crypto.randomUUID(),
            order_id: newOrder.id,
            order_number: newOrder.order_number ?? null,
            customer_name: newOrder.customer_name ?? "Cliente",
            total: Number(newOrder.total ?? 0),
            type: newOrder.type ?? null,
            status: newOrder.status ?? "pending",
            created_at: newOrder.created_at ?? new Date().toISOString(),
            read: false,
          };
          setNotifications(prev => {
            // Dedup por order_id
            if (prev.some(n => n.order_id === notif.order_id)) return prev;
            const updated = [notif, ...prev].slice(0, MAX_KEEP);
            saveToStorage(updated);
            return updated;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveToStorage(updated);
      try { localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString()); } catch { /* */ }
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, clear };
}
