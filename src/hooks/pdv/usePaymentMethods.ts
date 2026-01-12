import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';

export interface PaymentMethod {
  id: string;
  name: string;
  type: string | null;
  is_active: boolean | null;
}

export function usePaymentMethods() {
  const { companyId } = useCompanyId();

  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['payment-methods', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('payment_methods')
        .select('id, name, type, is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!companyId,
  });

  return {
    paymentMethods,
    isLoading,
  };
}
