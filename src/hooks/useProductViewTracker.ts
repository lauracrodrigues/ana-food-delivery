// v1.0.0 — Tracker de views de produto com dedup por sessão (analytics)
import { useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "anafood_viewed_products";

// Carrega Set inicial do sessionStorage (sem reler depois)
function loadViewed(): Set<string> {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

export function useProductViewTracker(companyId: string) {
  // Set de produtos já vistos nesta sessão de browser (sessionStorage = 1 aba)
  const viewedRef = useRef<Set<string>>(loadViewed());

  const trackView = useCallback((productId: string) => {
    if (!companyId || viewedRef.current.has(productId)) return;
    viewedRef.current.add(productId);

    // Persiste no sessionStorage pra sobreviver navegação dentro da aba
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify([...viewedRef.current]));
    } catch { /* storage cheio ou desabilitado */ }

    // Fire-and-forget: erro não bloqueia UX
    supabase.from("product_events" as any).insert({
      company_id: companyId,
      product_id: productId,
      event_type: "view",
    }).then(({ error }) => {
      if (error) console.warn("track view failed", error);
    });
  }, [companyId]);

  return { trackView };
}
