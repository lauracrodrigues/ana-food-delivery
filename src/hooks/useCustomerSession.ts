// v3.0.0 — Sessão cliente: nome + telefone + endereços (localStorage + sync servidor via RPC)
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerSession {
  name: string;
  phone: string;
  lastAddress: string;       // último endereço (default checkout)
  addresses?: string[];      // lista salva (max 10)
}

const STORAGE_KEY = "anafood_customer";

export function useCustomerSession() {
  const [session, setSession] = useState<CustomerSession | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.lastAddress && !parsed.addresses?.length) {
          parsed.addresses = [parsed.lastAddress]; // migra legado
        }
        setSession(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const persist = (s: CustomerSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  };

  const identify = (name: string, phone: string) => {
    persist({
      name,
      phone,
      lastAddress: session?.lastAddress ?? "",
      addresses: session?.addresses ?? [],
    });
  };

  // Adiciona endereço (max 10) + marca como default
  const saveAddress = (address: string) => {
    const clean = address.trim();
    if (!clean) return;
    setSession(prev => {
      if (!prev) return prev;
      const existing = prev.addresses ?? [];
      const dedup = existing.filter(a => a !== clean);
      const updated: CustomerSession = {
        ...prev,
        lastAddress: clean,
        addresses: [clean, ...dedup].slice(0, 10),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeAddress = (address: string) => {
    setSession(prev => {
      if (!prev) return prev;
      const remaining = (prev.addresses ?? []).filter(a => a !== address);
      const updated: CustomerSession = {
        ...prev,
        addresses: remaining,
        lastAddress: prev.lastAddress === address ? (remaining[0] || "") : prev.lastAddress,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const setDefaultAddress = (address: string) => {
    setSession(prev => {
      if (!prev) return prev;
      const others = (prev.addresses ?? []).filter(a => a !== address);
      const updated: CustomerSession = {
        ...prev,
        lastAddress: address,
        addresses: [address, ...others],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  // Sync endereços do servidor (pedidos antigos) — merge com lista local
  const syncAddressesFromServer = useCallback(async (companyId: string) => {
    if (!session?.phone || !companyId) return;
    const { data, error } = await supabase.rpc("get_customer_addresses", {
      p_company_id: companyId,
      p_phone: session.phone,
    });
    if (error || !data || !Array.isArray(data)) return;

    const serverAddrs = (data as string[]).filter(a => typeof a === "string" && a.trim().length > 5);
    if (serverAddrs.length === 0) return;

    setSession(prev => {
      if (!prev) return prev;
      const existing = prev.addresses ?? [];
      const merged: string[] = [];
      for (const a of [...serverAddrs, ...existing]) {
        if (!merged.includes(a)) merged.push(a);
      }
      const updated: CustomerSession = {
        ...prev,
        addresses: merged.slice(0, 10),
        lastAddress: prev.lastAddress || merged[0] || "",
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [session?.phone]);

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return {
    session, identify, saveAddress, removeAddress, setDefaultAddress,
    syncAddressesFromServer, clearSession,
  };
}
