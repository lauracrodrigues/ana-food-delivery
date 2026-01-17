import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Table, TableArea, TableWithStatus } from '@/types/pdv';
import { useToast } from '@/hooks/use-toast';

export function useTables() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all areas
  const { data: areas = [] } = useQuery({
    queryKey: ['table-areas', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('table_areas')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as TableArea[];
    },
    enabled: !!companyId,
  });

  // Get all tables with status from view
  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables-with-status', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // First try to get from view
      const { data, error } = await supabase
        .from('v_tables_with_checks')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('table_number', { ascending: true });

      if (error) {
        // Fallback to basic table query
        const { data: basicTables, error: basicError } = await supabase
          .from('tables')
          .select('*, table_areas(name)')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('table_number', { ascending: true });

        if (basicError) throw basicError;

        return basicTables.map(t => ({
          ...t,
          area_name: t.table_areas?.name,
          active_check: null,
          check_items_count: 0,
          check_total: 0,
          idle_minutes: 0,
          idle_color: null,
          open_checks_count: 0,
          current_total: 0,
          minutes_idle: 0,
        })) as TableWithStatus[];
      }

      // Map view fields to component-expected fields
      return (data as any[]).map(t => ({
        ...t,
        // Map view fields for component compatibility
        check_total: t.current_total || 0,
        idle_minutes: t.minutes_idle || 0,
        check_items_count: t.open_checks_count || 0,
        active_check: t.open_checks_count > 0 ? {
          id: t.id,
          status: 'open',
        } : null,
      })) as TableWithStatus[];
    },
    enabled: !!companyId,
    refetchInterval: 30000, // Refresh every 30 seconds for idle time updates
  });

  // Create table
  const createTable = useMutation({
    mutationFn: async (data: { table_number: string; name?: string; capacity?: number; area_id?: string }) => {
      if (!companyId) throw new Error('Company ID not found');

      const { data: table, error } = await supabase
        .from('tables')
        .insert({
          company_id: companyId,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return table;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-with-status', companyId] });
      toast({
        title: 'Mesa criada',
        description: 'A mesa foi criada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar mesa',
        description: 'Não foi possível criar a mesa.',
        variant: 'destructive',
      });
      console.error('Error creating table:', error);
    },
  });

  // Update table
  const updateTable = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Table> & { id: string }) => {
      const { data: table, error } = await supabase
        .from('tables')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return table;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-with-status', companyId] });
    },
  });

  // Update table status (open/close check)
  const updateTableStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: table, error } = await supabase
        .from('tables')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return table;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-with-status', companyId] });
    },
  });

  // Get tables grouped by area
  const tablesByArea = areas.map(area => ({
    area,
    tables: tables.filter(t => t.area_id === area.id),
  }));

  // Tables without area
  const tablesWithoutArea = tables.filter(t => !t.area_id);

  return {
    tables,
    areas,
    tablesByArea,
    tablesWithoutArea,
    isLoading,
    createTable: createTable.mutate,
    updateTable: updateTable.mutate,
    updateTableStatus: updateTableStatus.mutate,
    isCreating: createTable.isPending,
  };
}
