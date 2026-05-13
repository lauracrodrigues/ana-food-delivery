// useUserPreferences.ts — v1.0.0
// Preferências pessoais por user_id em profiles.preferences JSONB
// Separado de store_settings (config da empresa, compartilhada por todos os usuários)

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Preferências pessoais do usuário (NÃO da empresa)
export interface UserPreferences {
  soundEnabled?: boolean;           // som de notificação
  notificationSound?: string;       // arquivo de som escolhido
  visibleColumns?: string[];        // colunas visíveis no kanban
  sidebarOpen?: boolean;            // estado da sidebar
  theme?: "light" | "dark";        // tema da interface
  autoPrint?: boolean;              // impressão automática pessoal
  printerSettings?: Record<string, unknown>; // config impressora pessoal
}

const QUERY_KEY = "user-preferences";

// Busca preferências do perfil do usuário logado
async function fetchUserPreferences(): Promise<UserPreferences> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("[useUserPreferences] fetch error:", error);
    return {};
  }

  return (data?.preferences as UserPreferences) ?? {};
}

// Salva preferências parciais (merge com existentes)
async function saveUserPreferences(patch: Partial<UserPreferences>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Busca preferências atuais para merge
  const current = await fetchUserPreferences();
  const merged = { ...current, ...patch };

  const { error } = await supabase
    .from("profiles")
    .update({ preferences: merged })
    .eq("id", user.id);

  if (error) throw error;
}

export function useUserPreferences() {
  const queryClient = useQueryClient();

  const { data: preferences = {}, isLoading } = useQuery<UserPreferences>({
    queryKey: [QUERY_KEY],
    queryFn: fetchUserPreferences,
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  const mutation = useMutation({
    mutationFn: saveUserPreferences,
    // Optimistic update: aplica antes de confirmar no servidor
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY] });
      const previous = queryClient.getQueryData<UserPreferences>([QUERY_KEY]);
      queryClient.setQueryData<UserPreferences>([QUERY_KEY], (old) => ({ ...old, ...patch }));
      return { previous };
    },
    onError: (_, __, ctx) => {
      // Reverte em caso de erro
      if (ctx?.previous) queryClient.setQueryData([QUERY_KEY], ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    preferences,
    isLoading,
    savePreference: (patch: Partial<UserPreferences>) => mutation.mutate(patch),
    isSaving: mutation.isPending,
  };
}
