// v1.0.0 — Push "carrinho abandonado" client-side
// Dispara push após X minutos sem atividade no cart (aba aberta).
// Só funciona se cliente identificado + assinou push notifications.
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AbandonedCartReminderProps {
  hasItems: boolean;          // cart.length > 0
  customerPhone?: string | null;
  companyId?: string;
  companySubdomain?: string;
  delayMinutes?: number;      // default 10min
}

const STORAGE_KEY = "anafood_abandoned_cart_sent";

export function useAbandonedCartReminder({
  hasItems, customerPhone, companyId, companySubdomain, delayMinutes = 10,
}: AbandonedCartReminderProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Anti-spam: já enviou push neste cart? Reseta quando cart esvazia.
  const sentRef = useRef<boolean>(false);

  useEffect(() => {
    // Cancela timer anterior em qualquer mudança (cada update reinicia contagem)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    // Cart vazio: reset flag de envio + sai
    if (!hasItems) { sentRef.current = false; return; }
    if (!customerPhone || !companyId) return;
    if (sentRef.current) return; // já enviou pra esse cart

    // Cooldown global: não envia se já mandou nas últimas 2h (evita spam ao reabrir aba)
    try {
      const lastSent = localStorage.getItem(`${STORAGE_KEY}_${companyId}_${customerPhone}`);
      if (lastSent && Date.now() - parseInt(lastSent, 10) < 2 * 60 * 60 * 1000) return;
    } catch { /* storage indisponível */ }

    timerRef.current = setTimeout(async () => {
      try {
        await supabase.functions.invoke("send-push", {
          body: {
            company_id: companyId,
            customer_phone: customerPhone,
            title: "Esqueceu algo no carrinho? 🛒",
            body: "Volte e finalize seu pedido — está esperando você.",
            url: companySubdomain ? `https://${companySubdomain}.anafood.vip/` : "/",
          },
        });
        sentRef.current = true;
        localStorage.setItem(`${STORAGE_KEY}_${companyId}_${customerPhone}`, String(Date.now()));
      } catch (err) {
        console.warn("Push carrinho abandonado falhou:", err);
      }
    }, delayMinutes * 60 * 1000);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [hasItems, customerPhone, companyId, companySubdomain, delayMinutes]);
}
