// v1.0.0 — Toggle dark/light isolado pro cardápio público
import { Moon, Sun } from "lucide-react";
import { useMenuTheme } from "@/hooks/useMenuTheme";

export function MenuThemeToggle() {
  const { theme, toggle } = useMenuTheme();
  return (
    <button
      onClick={toggle}
      className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
      aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
