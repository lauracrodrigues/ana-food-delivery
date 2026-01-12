import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Check, CheckItem, CheckWithItems, SaleType } from '@/types/pdv';
import { useToast } from '@/hooks/use-toast';
import { usePOSStore } from '@/stores/posStore';

export function useChecks() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { cart, context, subtotal, service_amount, service_percent, discount_amount, couvert_amount, delivery_fee, total, clearCart, resetContext } = usePOSStore();

  // Get all open checks
  const { data: openChecks = [], isLoading } = useQuery({
    queryKey: ['checks-open', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('checks')
        .select(`
          *,
          check_items(count),
          tables(table_number, name)
        `)
        .eq('company_id', companyId)
        .in('status', ['open', 'partial'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Get check by ID with items
  const useCheck = (checkId: string | undefined) => useQuery({
    queryKey: ['check', checkId],
    queryFn: async () => {
      if (!checkId) return null;

      const { data: check, error } = await supabase
        .from('checks')
        .select(`
          *,
          items:check_items(*),
          payments:check_payments(*),
          table:tables(*)
        `)
        .eq('id', checkId)
        .single();

      if (error) throw error;
      return check as unknown as CheckWithItems;
    },
    enabled: !!checkId,
  });

  // Create new check
  const createCheck = useMutation({
    mutationFn: async (data?: { 
      table_id?: string; 
      customer_name?: string;
      customer_phone?: string;
      waiter_id?: string;
      waiter_name?: string;
      guest_count?: number;
      notes?: string;
      type?: SaleType;
    }) => {
      if (!companyId) throw new Error('Company ID not found');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get check number from sequence
      const { data: sequence, error: seqError } = await supabase
        .rpc('get_next_check_number', { p_company_id: companyId });

      if (seqError) throw seqError;

      const checkData = {
        company_id: companyId,
        check_number: sequence,
        opened_by: user.user.id,
        type: data?.type || context.type || 'counter',
        source: context.source || 'pdv',
        table_id: data?.table_id || context.table_id,
        customer_name: data?.customer_name || context.customer_name,
        customer_phone: data?.customer_phone || context.customer_phone,
        waiter_id: data?.waiter_id || context.waiter_id,
        waiter_name: data?.waiter_name || context.waiter_name,
        guest_count: data?.guest_count || 1,
        notes: data?.notes,
        status: 'open',
        // Delivery info
        address: context.address,
        address_number: context.address_number,
        address_complement: context.address_complement,
        neighborhood: context.neighborhood,
        city: context.city,
        state: context.state,
        zip_code: context.zip_code,
        delivery_fee: context.delivery_fee || delivery_fee,
        estimated_time: context.estimated_time,
      };

      const { data: check, error } = await supabase
        .from('checks')
        .insert(checkData)
        .select()
        .single();

      if (error) throw error;
      return check as Check;
    },
    onSuccess: (check) => {
      queryClient.invalidateQueries({ queryKey: ['checks-open', companyId] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-status', companyId] });
      return check;
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar comanda',
        description: 'Não foi possível criar a comanda.',
        variant: 'destructive',
      });
      console.error('Error creating check:', error);
    },
  });

  // Add items to check
  const addItemsToCheck = useMutation({
    mutationFn: async (checkId: string) => {
      if (!companyId) throw new Error('Company ID not found');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Convert cart items to check_items - cast extras to Json
      const items = cart.map(item => ({
        check_id: checkId,
        company_id: companyId,
        created_by: user.user!.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        unit_price: item.unit_price,
        quantity: item.quantity,
        extras: JSON.parse(JSON.stringify(item.extras)),
        extras_total: item.extras_total,
        notes: item.notes,
        promotion_id: item.promotion_id,
        discount_amount: item.discount_amount,
        total_price: item.total_price,
        status: 'pending',
      }));

      const { data, error } = await supabase
        .from('check_items')
        .insert(items)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, checkId) => {
      queryClient.invalidateQueries({ queryKey: ['check', checkId] });
      queryClient.invalidateQueries({ queryKey: ['checks-open', companyId] });
      clearCart();
      toast({
        title: 'Itens adicionados',
        description: 'Os itens foram adicionados à comanda.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar itens',
        description: 'Não foi possível adicionar os itens.',
        variant: 'destructive',
      });
      console.error('Error adding items:', error);
    },
  });

  // Update check totals
  const updateCheckTotals = useMutation({
    mutationFn: async (checkId: string) => {
      const { data, error } = await supabase
        .from('checks')
        .update({
          subtotal,
          service_percent,
          service_amount,
          discount_amount,
          couvert_amount,
          delivery_fee,
          total_amount: total,
        })
        .eq('id', checkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, checkId) => {
      queryClient.invalidateQueries({ queryKey: ['check', checkId] });
    },
  });

  // Close check (after payment)
  const closeCheck = useMutation({
    mutationFn: async (checkId: string) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('checks')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user.user?.id,
          paid_at: new Date().toISOString(),
        })
        .eq('id', checkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks-open', companyId] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-status', companyId] });
      resetContext();
      toast({
        title: 'Comanda fechada',
        description: 'A comanda foi encerrada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao fechar comanda',
        description: 'Não foi possível fechar a comanda.',
        variant: 'destructive',
      });
      console.error('Error closing check:', error);
    },
  });

  // Cancel check
  const cancelCheck = useMutation({
    mutationFn: async ({ checkId, reason }: { checkId: string; reason: string }) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('checks')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.user?.id,
          cancel_reason: reason,
        })
        .eq('id', checkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checks-open', companyId] });
      queryClient.invalidateQueries({ queryKey: ['tables-with-status', companyId] });
      toast({
        title: 'Comanda cancelada',
        description: 'A comanda foi cancelada.',
      });
    },
  });

  return {
    openChecks,
    isLoading,
    useCheck,
    createCheck: createCheck.mutateAsync,
    addItemsToCheck: addItemsToCheck.mutate,
    addItemsToCheckAsync: addItemsToCheck.mutateAsync,
    updateCheckTotals: updateCheckTotals.mutate,
    updateCheckTotalsAsync: updateCheckTotals.mutateAsync,
    closeCheck: closeCheck.mutate,
    closeCheckAsync: closeCheck.mutateAsync,
    cancelCheck: cancelCheck.mutate,
    isCreating: createCheck.isPending,
    isAddingItems: addItemsToCheck.isPending,
  };
}
