// Hook centralizado para store_settings — substitui 20+ queries inline
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';

export interface StoreSettings {
  default_whatsapp_session: string | null;
  whatsapp_phone: string | null;
  store_name: string | null;
  subdomain: string | null;
  default_printer: string | null;
  cash_shortcuts: number[] | null;
  service_percent: number | null;
  delivery_enabled: boolean | null;
  // adicione outros campos conforme necessário
  [key: string]: unknown;
}

export function useStoreSettings() {
  const { companyId } = useCompanyId();

  const { data: settings, isLoading } = useQuery<StoreSettings | null>({
    queryKey: ['store-settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();
      return data as StoreSettings | null;
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 min
  });

  return { settings, isLoading };
}
