// Polling de status de pagamento PIX.
// Separado do componente para ser testável e reutilizável.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePIXPolling(orderId: string | null, onConfirmed: () => void) {
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase.rpc("get_order_payment_status", { p_order_id: orderId });
      if (data === "approved") {
        clearInterval(interval);
        onConfirmedRef.current();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId]);
}
