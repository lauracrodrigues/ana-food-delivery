// v2.0.0 — paletas expandidas + cor customizada via hex picker
import { useEffect, useState } from "react";

export type ColorPalette =
  | "purple" | "blue" | "green" | "orange" | "pink"
  | "red" | "teal" | "indigo" | "yellow" | "slate"
  | "custom";

interface PaletteColors {
  primary: string;
  accent: string;
  ring: string;
  gradientPrimary: string;
  gradientAccent: string;
  shadowGlow: string;
}

const palettes: Record<Exclude<ColorPalette, "custom">, PaletteColors> = {
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
  red: {
    primary: "0 84% 55%",
    accent: "8 85% 62%",
    ring: "0 84% 55%",
    gradientPrimary: "linear-gradient(135deg, hsl(0 84% 55%), hsl(8 85% 62%))",
    gradientAccent: "linear-gradient(135deg, hsl(8 85% 62%), hsl(15 82% 67%))",
    shadowGlow: "0 0 24px hsl(0 84% 55% / 0.3)",
  },
  teal: {
    primary: "174 72% 40%",
    accent: "180 66% 48%",
    ring: "174 72% 40%",
    gradientPrimary: "linear-gradient(135deg, hsl(174 72% 40%), hsl(180 66% 48%))",
    gradientAccent: "linear-gradient(135deg, hsl(180 66% 48%), hsl(185 60% 55%))",
    shadowGlow: "0 0 24px hsl(174 72% 40% / 0.3)",
  },
  indigo: {
    primary: "239 84% 67%",
    accent: "245 80% 72%",
    ring: "239 84% 67%",
    gradientPrimary: "linear-gradient(135deg, hsl(239 84% 67%), hsl(245 80% 72%))",
    gradientAccent: "linear-gradient(135deg, hsl(245 80% 72%), hsl(252 75% 76%))",
    shadowGlow: "0 0 24px hsl(239 84% 67% / 0.3)",
  },
  yellow: {
    primary: "48 96% 48%",
    accent: "42 93% 55%",
    ring: "48 96% 48%",
    gradientPrimary: "linear-gradient(135deg, hsl(48 96% 48%), hsl(42 93% 55%))",
    gradientAccent: "linear-gradient(135deg, hsl(42 93% 55%), hsl(38 90% 62%))",
    shadowGlow: "0 0 24px hsl(48 96% 48% / 0.3)",
  },
  slate: {
    primary: "215 25% 35%",
    accent: "215 20% 50%",
    ring: "215 25% 35%",
    gradientPrimary: "linear-gradient(135deg, hsl(215 25% 35%), hsl(215 20% 50%))",
    gradientAccent: "linear-gradient(135deg, hsl(215 20% 50%), hsl(215 15% 60%))",
    shadowGlow: "0 0 24px hsl(215 25% 35% / 0.3)",
  },
};

// Converte hex (#rrggbb) → {h, s, l} em inteiros
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Gera paleta completa a partir de uma cor hexadecimal
function buildCustomPalette(hex: string): PaletteColors {
  const { h, s, l } = hexToHsl(hex);
  const primary = `${h} ${s}% ${l}%`;
  const accentS = Math.min(s + 5, 100);
  const accentL = Math.min(l + 10, 90);
  const accent = `${h} ${accentS}% ${accentL}%`;
  const accent2L = Math.min(l + 20, 90);
  const accent2 = `${h} ${accentS}% ${accent2L}%`;
  return {
    primary,
    accent,
    ring: primary,
    gradientPrimary: `linear-gradient(135deg, hsl(${primary}), hsl(${accent}))`,
    gradientAccent: `linear-gradient(135deg, hsl(${accent}), hsl(${accent2}))`,
    shadowGlow: `0 0 24px hsl(${primary} / 0.3)`,
  };
}

const STORAGE_KEY = "anafood-color-palette";
const CUSTOM_COLOR_KEY = "anafood-custom-color";

const PALETTE_PROPS = [
  "--primary",
  "--accent",
  "--ring",
  "--gradient-primary",
  "--gradient-accent",
  "--shadow-glow",
] as const;

function applyPalette(paletteKey: ColorPalette, customHex?: string) {
  let colors: PaletteColors;
  if (paletteKey === "custom" && customHex) {
    colors = buildCustomPalette(customHex);
  } else if (paletteKey !== "custom") {
    colors = palettes[paletteKey];
  } else {
    return;
  }
  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--ring", colors.ring);
  root.style.setProperty("--gradient-primary", colors.gradientPrimary);
  root.style.setProperty("--gradient-accent", colors.gradientAccent);
  root.style.setProperty("--shadow-glow", colors.shadowGlow);
}

export function resetPalette() {
  const root = document.documentElement;
  PALETTE_PROPS.forEach((prop) => root.style.removeProperty(prop));
}

export function useColorPalette() {
  const [palette, setPaletteState] = useState<ColorPalette>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as ColorPalette) || "purple";
  });

  const [customColor, setCustomColorState] = useState<string>(() => {
    return localStorage.getItem(CUSTOM_COLOR_KEY) || "#8b5cf6";
  });

  useEffect(() => {
    applyPalette(palette, customColor);
    localStorage.setItem(STORAGE_KEY, palette);
  }, [palette, customColor]);

  const setPalette = (p: ColorPalette) => {
    setPaletteState(p);
  };

  // Aplica cor livre — muda palette para "custom" e armazena o hex
  const setCustomColor = (hex: string) => {
    setCustomColorState(hex);
    localStorage.setItem(CUSTOM_COLOR_KEY, hex);
    setPaletteState("custom");
  };

  return {
    palette,
    setPalette,
    customColor,
    setCustomColor,
    palettes: Object.keys(palettes) as Exclude<ColorPalette, "custom">[],
  };
}

export function initializeColorPalette() {
  const palette = (localStorage.getItem(STORAGE_KEY) as ColorPalette) || "purple";
  const customHex = localStorage.getItem(CUSTOM_COLOR_KEY) || "#8b5cf6";
  applyPalette(palette, customHex);
}
