// v1.0.0 — Sessão do cliente via localStorage (nome + telefone + endereço salvo)
import { useState, useEffect } from "react";

export interface CustomerSession {
  name: string;
  phone: string;
  lastAddress: string;
}

const STORAGE_KEY = "anafood_customer";

export function useCustomerSession() {
  const [session, setSession] = useState<CustomerSession | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSession(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const identify = (name: string, phone: string) => {
    const s: CustomerSession = { name, phone, lastAddress: session?.lastAddress ?? "" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  };

  const saveAddress = (lastAddress: string) => {
    if (!lastAddress.trim()) return;
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, lastAddress };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  return { session, identify, saveAddress, clearSession };
}
