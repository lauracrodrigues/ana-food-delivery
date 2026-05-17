// v1.0.0 — Captura ?ref=PHONE da URL e persiste por 30 dias pra atribuir no checkout
import { useEffect, useState } from "react";

const STORAGE_KEY = "anafood_referral";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

interface StoredReferral {
  phone: string;
  capturedAt: number;
}

export function useReferralCapture() {
  const [referrerPhone, setReferrerPhone] = useState<string | null>(null);

  useEffect(() => {
    // 1) Lê da URL — ?ref=62992271019 ou similar
    const params = new URLSearchParams(window.location.search);
    const refFromUrl = params.get("ref");

    if (refFromUrl) {
      const digits = refFromUrl.replace(/\D/g, "");
      if (digits.length >= 10) {
        const payload: StoredReferral = { phone: digits, capturedAt: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setReferrerPhone(digits);
        // Remove ?ref da URL pra não confundir (sem reload)
        params.delete("ref");
        const newQuery = params.toString();
        const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "") + window.location.hash;
        window.history.replaceState({}, "", newUrl);
        return;
      }
    }

    // 2) Senão, lê do storage e valida TTL
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredReferral = JSON.parse(stored);
        if (Date.now() - parsed.capturedAt < TTL_MS) {
          setReferrerPhone(parsed.phone);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Limpa quando indicação consumida (pós-pedido confirmado)
  const clearReferral = () => {
    localStorage.removeItem(STORAGE_KEY);
    setReferrerPhone(null);
  };

  return { referrerPhone, clearReferral };
}
