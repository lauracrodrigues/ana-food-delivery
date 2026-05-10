// v1.1.0 — Paleta isolada ao dashboard; rotas públicas usam resetPalette()
import { useEffect, useState } from "react";

export type ColorPalette = "purple" | "blue" | "green" | "orange" | "pink";

interface PaletteColors {
  primary: string;
  accent: string;
  ring: string;
  gradientPrimary: string;
  gradientAccent: string;
  shadowGlow: string;
}

const palettes: Record<ColorPalette, PaletteColors> = {
  purple: {
    primary: "263 70% 50%",
    accent: "271 91% 65%",
    ring: "263 70% 50%",
    gradientPrimary: "linear-gradient(135deg, hsl(263 70% 50%), hsl(271 91% 65%))",
    gradientAccent: "linear-gradient(135deg, hsl(271 91% 65%), hsl(280 84% 70%))",
    shadowGlow: "0 0 24px hsl(263 70% 50% / 0.3)",
  },
  blue: {
    primary: "217 91% 60%",
    accent: "199 89% 65%",
    ring: "217 91% 60%",
    gradientPrimary: "linear-gradient(135deg, hsl(217 91% 60%), hsl(199 89% 65%))",
    gradientAccent: "linear-gradient(135deg, hsl(199 89% 65%), hsl(189 85% 70%))",
    shadowGlow: "0 0 24px hsl(217 91% 60% / 0.3)",
  },
  green: {
    primary: "142 76% 45%",
    accent: "158 64% 52%",
    ring: "142 76% 45%",
    gradientPrimary: "linear-gradient(135deg, hsl(142 76% 45%), hsl(158 64% 52%))",
    gradientAccent: "linear-gradient(135deg, hsl(158 64% 52%), hsl(168 70% 58%))",
    shadowGlow: "0 0 24px hsl(142 76% 45% / 0.3)",
  },
  orange: {
    primary: "25 95% 53%",
    accent: "38 92% 60%",
    ring: "25 95% 53%",
    gradientPrimary: "linear-gradient(135deg, hsl(25 95% 53%), hsl(38 92% 60%))",
    gradientAccent: "linear-gradient(135deg, hsl(38 92% 60%), hsl(45 90% 65%))",
    shadowGlow: "0 0 24px hsl(25 95% 53% / 0.3)",
  },
  pink: {
    primary: "330 81% 60%",
    accent: "340 82% 65%",
    ring: "330 81% 60%",
    gradientPrimary: "linear-gradient(135deg, hsl(330 81% 60%), hsl(340 82% 65%))",
    gradientAccent: "linear-gradient(135deg, hsl(340 82% 65%), hsl(350 80% 70%))",
    shadowGlow: "0 0 24px hsl(330 81% 60% / 0.3)",
  },
};

const STORAGE_KEY = "anafood-color-palette";

// Propriedades CSS que a paleta sobrescreve
const PALETTE_PROPS = [
  "--primary",
  "--accent",
  "--ring",
  "--gradient-primary",
  "--gradient-accent",
  "--shadow-glow",
] as const;

function applyPalette(paletteKey: ColorPalette) {
  const colors = palettes[paletteKey];
  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--ring", colors.ring);
  root.style.setProperty("--gradient-primary", colors.gradientPrimary);
  root.style.setProperty("--gradient-accent", colors.gradientAccent);
  root.style.setProperty("--shadow-glow", colors.shadowGlow);
}

// Remove inline overrides → CSS do stylesheet volta a valer (isolamento de rotas públicas)
export function resetPalette() {
  const root = document.documentElement;
  PALETTE_PROPS.forEach((prop) => root.style.removeProperty(prop));
}

export function useColorPalette() {
  const [palette, setPalette] = useState<ColorPalette>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as ColorPalette) || "purple";
  });

  useEffect(() => {
    applyPalette(palette);
    localStorage.setItem(STORAGE_KEY, palette);
  }, [palette]);

  return {
    palette,
    setPalette,
    palettes: Object.keys(palettes) as ColorPalette[],
  };
}

// Chamado pelo DashboardLayout para restaurar paleta do admin
export function initializeColorPalette() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const palette = (saved as ColorPalette) || "purple";
  applyPalette(palette);
}
