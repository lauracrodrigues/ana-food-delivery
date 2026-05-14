// useLocalStorage.ts — v1.0.0
// Hook para ler/gravar estado em localStorage com sync entre abas
import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const newValue = value instanceof Function ? value(readValue()) : value;
      window.localStorage.setItem(key, JSON.stringify(newValue));
      setStoredValue(newValue);
      // Notifica outras abas
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(newValue) }));
    } catch (err) {
      console.warn(`[useLocalStorage] Erro ao salvar "${key}":`, err);
    }
  }, [key, readValue]);

  // Sincroniza quando outra aba altera o mesmo key
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try { setStoredValue(JSON.parse(e.newValue)); } catch (_) { /* ignore parse errors */ }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key]);

  return [storedValue, setValue] as const;
}

export function useSessionStorage<T>(key: string, initialValue: T) {
  const readValue = useCallback((): T => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      const newValue = value instanceof Function ? value(readValue()) : value;
      window.sessionStorage.setItem(key, JSON.stringify(newValue));
      setStoredValue(newValue);
    } catch (err) {
      console.warn(`[useSessionStorage] Erro ao salvar "${key}":`, err);
    }
  }, [key, readValue]);

  return [storedValue, setValue] as const;
}
