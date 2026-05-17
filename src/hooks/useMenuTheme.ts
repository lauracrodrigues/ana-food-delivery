// v2.0.0 — Tema dark/light isolado do cardápio público
// Fix v2: aplica `.light` ou `.dark` explicitamente (antes só toggleava .dark, sem efeito porque :root já é dark)
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

  // Aplica classe explícita em <html> — remove a outra pra evitar conflito
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  // Cleanup ao desmontar — volta pro padrão light (admin)
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.classList.remove("dark");
      root.classList.add("light");
    };
  }, []);

  const setTheme = (t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t);
    setThemeState(t);
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle };
}
