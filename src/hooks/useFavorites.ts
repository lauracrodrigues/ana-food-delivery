// v1.0.0 — Favoritos do cliente por empresa (localStorage)
import { useState, useEffect } from "react";

export function useFavorites(companyId: string) {
  const key = `anafood_favorites_${companyId}`;
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!companyId) return;
    try {
      const stored = localStorage.getItem(key);
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [key]);

  const toggle = (productId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  return { favorites, toggle, isFavorite };
}
