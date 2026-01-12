import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { PDVSettings } from '@/types/pdv';
import { useToast } from '@/hooks/use-toast';

export function usePDVSettings() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['pdv-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('pdv_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error) {
        // If no settings exist, create default
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('pdv_settings')
            .insert({ company_id: companyId })
            .select()
            .single();

          if (createError) throw createError;
          return newSettings as PDVSettings;
        }
        throw error;
      }

      return data as PDVSettings;
    },
    enabled: !!companyId,
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<PDVSettings>) => {
      if (!companyId) throw new Error('Company ID not found');

      const { data, error } = await supabase
        .from('pdv_settings')
        .update(updates)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdv-settings', companyId] });
      toast({
        title: 'Configurações atualizadas',
        description: 'As configurações do PDV foram salvas.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar as configurações.',
        variant: 'destructive',
      });
      console.error('Error updating PDV settings:', error);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}
