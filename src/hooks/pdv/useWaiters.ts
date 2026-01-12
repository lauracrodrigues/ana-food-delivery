import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Waiter } from '@/types/pdv';

export function useWaiters() {
  const { companyId } = useCompanyId();

  const { data: waiters = [], isLoading } = useQuery({
    queryKey: ['waiters', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('waiters')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Waiter[];
    },
    enabled: !!companyId,
  });

  return {
    waiters,
    isLoading,
  };
}
