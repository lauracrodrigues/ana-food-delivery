import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { CashRegister, CashMovement, CashRegisterSummary } from '@/types/pdv';
import { useToast } from '@/hooks/use-toast';

export function useCashRegister() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get active cash register
  const { data: activeRegister, isLoading } = useQuery({
    queryKey: ['cash-register-active', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as CashRegister | null;
    },
    enabled: !!companyId,
  });

  // Get cash register summary with movements
  const { data: summary } = useQuery({
    queryKey: ['cash-register-summary', activeRegister?.id],
    queryFn: async () => {
      if (!activeRegister?.id) return null;

      // Get movements
      const { data: movements, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('cash_register_id', activeRegister.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get payments for this register
      const { data: payments } = await supabase
        .from('check_payments')
        .select('amount, payment_method_type')
        .eq('cash_register_id', activeRegister.id)
        .eq('status', 'completed');

      // Calculate totals
      const total_sales = payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
      const total_cash = payments?.filter(p => p.payment_method_type === 'cash').reduce((acc, p) => acc + p.amount, 0) || 0;
      const total_card = payments?.filter(p => ['credit', 'debit'].includes(p.payment_method_type || '')).reduce((acc, p) => acc + p.amount, 0) || 0;
      const total_pix = payments?.filter(p => p.payment_method_type === 'pix').reduce((acc, p) => acc + p.amount, 0) || 0;

      const total_withdrawals = movements?.filter(m => m.movement_type === 'withdrawal').reduce((acc, m) => acc + m.amount, 0) || 0;
      const total_deposits = movements?.filter(m => m.movement_type === 'deposit').reduce((acc, m) => acc + m.amount, 0) || 0;

      return {
        ...activeRegister,
        movements: movements || [],
        total_sales,
        total_cash,
        total_card,
        total_pix,
        total_withdrawals,
        total_deposits,
      } as CashRegisterSummary;
    },
    enabled: !!activeRegister?.id,
  });

  // Open cash register
  const openRegister = useMutation({
    mutationFn: async (data: { opening_amount: number; opening_notes?: string; terminal_name?: string }) => {
      if (!companyId) throw new Error('Company ID not found');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user.id)
        .single();

      const { data: register, error } = await supabase
        .from('cash_registers')
        .insert({
          company_id: companyId,
          operator_id: user.user.id,
          operator_name: profile?.full_name || 'Operador',
          opening_amount: data.opening_amount,
          opening_notes: data.opening_notes,
          terminal_name: data.terminal_name,
          status: 'open',
          opened_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return register;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-active', companyId] });
      toast({
        title: 'Caixa aberto',
        description: 'O caixa foi aberto com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao abrir caixa',
        description: 'Não foi possível abrir o caixa.',
        variant: 'destructive',
      });
      console.error('Error opening register:', error);
    },
  });

  // Close cash register
  const closeRegister = useMutation({
    mutationFn: async (data: { closing_amount: number; closing_notes?: string }) => {
      if (!activeRegister) throw new Error('No active register');

      const { data: user } = await supabase.auth.getUser();

      const expected_amount = 
        activeRegister.opening_amount + 
        (summary?.total_cash || 0) + 
        (summary?.total_deposits || 0) - 
        (summary?.total_withdrawals || 0);

      const { data: register, error } = await supabase
        .from('cash_registers')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user.user?.id,
          closing_amount: data.closing_amount,
          closing_notes: data.closing_notes,
          expected_amount,
          difference: data.closing_amount - expected_amount,
        })
        .eq('id', activeRegister.id)
        .select()
        .single();

      if (error) throw error;
      return register;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-active', companyId] });
      toast({
        title: 'Caixa fechado',
        description: 'O caixa foi fechado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao fechar caixa',
        description: 'Não foi possível fechar o caixa.',
        variant: 'destructive',
      });
      console.error('Error closing register:', error);
    },
  });

  // Add movement (withdrawal/deposit)
  const addMovement = useMutation({
    mutationFn: async (data: { movement_type: 'withdrawal' | 'deposit'; amount: number; reason?: string }) => {
      if (!activeRegister || !companyId) throw new Error('No active register');

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.user.id)
        .single();

      const { data: movement, error } = await supabase
        .from('cash_movements')
        .insert({
          cash_register_id: activeRegister.id,
          company_id: companyId,
          created_by: user.user.id,
          created_by_name: profile?.full_name || 'Operador',
          movement_type: data.movement_type,
          amount: data.amount,
          reason: data.reason,
        })
        .select()
        .single();

      if (error) throw error;
      return movement;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-summary', activeRegister?.id] });
      toast({
        title: variables.movement_type === 'withdrawal' ? 'Sangria registrada' : 'Suprimento registrado',
        description: `Valor: R$ ${variables.amount.toFixed(2)}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar movimentação',
        description: 'Não foi possível registrar a movimentação.',
        variant: 'destructive',
      });
      console.error('Error adding movement:', error);
    },
  });

  return {
    activeRegister,
    summary,
    isLoading,
    isRegisterOpen: !!activeRegister,
    openRegister: openRegister.mutate,
    closeRegister: closeRegister.mutate,
    addMovement: addMovement.mutate,
    isOpening: openRegister.isPending,
    isClosing: closeRegister.isPending,
  };
}
