// UserThemeSync.tsx — v1.0.0
// Aplica tema pessoal do usuário logado (localStorage por userId + profiles.preferences)
// Renderizado dentro do DashboardLayout (área autenticada).
// Ao desmontar (logout), reseta para light para não vazar para outros usuários.
import { useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/integrations/supabase/client";

function themeKey(userId: string) {
  return `anafood-theme-${userId}`;
}

// Cache global do último tema aplicado (qualquer usuário, esta máquina)
// Usado pelo inline script no index.html pra evitar flash no primeiro paint
const LAST_THEME_KEY = "anafood-last-theme";
function rememberLastTheme(theme: "light" | "dark") {
  try { localStorage.setItem(LAST_THEME_KEY, theme); } catch {}
}

export function UserThemeSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    let mounted = true;

    async function applyUserTheme() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Cache local primeiro (sem latência)
      const cached = localStorage.getItem(themeKey(user.id));
      if (cached === "dark" || cached === "light") {
        setTheme(cached);
        rememberLastTheme(cached); // alimenta inline script pro próximo load
        return;
      }

      // Sem cache → busca do banco
      const { data } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("id", user.id)
        .single();

      if (!mounted) return;
      const saved = (data?.preferences as any)?.theme;
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        localStorage.setItem(themeKey(user.id), saved);
        rememberLastTheme(saved);
      }
    }

    applyUserTheme();

    // Reset para light ao sair da área autenticada (logout / trocar de conta)
    return () => {
      mounted = false;
      setTheme("light");
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// Salva tema do usuário em localStorage(userId) + profiles.preferences
export async function saveUserTheme(theme: "light" | "dark") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Cache local imediato (por usuário + global pra anti-FOUC)
  localStorage.setItem(themeKey(user.id), theme);
  rememberLastTheme(theme);

  // Persiste no banco (merge com outras preferências)
  const { data } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  const merged = { ...(data?.preferences as object ?? {}), theme };
  await supabase
    .from("profiles")
    .update({ preferences: merged })
    .eq("id", user.id);
}
