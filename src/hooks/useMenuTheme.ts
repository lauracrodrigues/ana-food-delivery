// v1.0.0 — Tema dark/light isolado do cardápio público (não conflita com admin)
import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "anafood_menu_theme";

// Detecta preferência inicial: localStorage > system > "light"
function detectInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

export function useMenuTheme() {
  const [theme, setThemeState] = useState<Theme>(detectInitialTheme);

  // Aplica .dark no documento sempre que muda (Tailwind dark mode class strategy)
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  // Reseta classe ao desmontar componente do cardápio (não vaza pra admin)
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle };
}
