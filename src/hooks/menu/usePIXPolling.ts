// Polling de status de pagamento PIX.
// v2.0.0: poll imediato + intervalo 3s (era 5s) + check Realtime se disponível
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePIXPolling(orderId: string | null, onConfirmed: () => void) {
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      if (stopped) return;
      const { data } = await supabase.rpc("get_order_payment_status", { p_order_id: orderId });
      if (data === "approved") {
        stopped = true;
        if (interval) clearInterval(interval);
        onConfirmedRef.current();
      }
    };

    // Poll imediato (não espera 3s primeiro)
    check();

    // Polling 3s — antes era 5s
    interval = setInterval(check, 3000);

    // Realtime: se MP webhook atualizar status, recebe push em tempo real (instantâneo)
    const channel = supabase
      .channel(`pix-confirm-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        const updated: any = payload.new;
        if (updated?.payment_status === 'approved') {
          stopped = true;
          if (interval) clearInterval(interval);
          onConfirmedRef.current();
        }
      })
      .subscribe();

    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [orderId]);
}
