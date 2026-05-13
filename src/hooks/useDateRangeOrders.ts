// Busca pedidos filtrados por período. Reutilizável em dashboard, relatórios, etc.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseDateRangeOrdersParams {
  companyId: string | null;
  showTodayOnly: boolean;
  startDate?: Date;
  endDate?: Date;
  refetchInterval?: number;
}

export function useDateRangeOrders({
  companyId,
  showTodayOnly,
  startDate,
  endDate,
  refetchInterval = 30000,
}: UseDateRangeOrdersParams) {
  return useQuery({
    queryKey: ["filtered-orders", companyId, showTodayOnly, startDate, endDate],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from("orders")
        .select("*")
        .eq("company_id", companyId);

      if (showTodayOnly) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query = query.gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString());
      } else if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.gte("created_at", start.toISOString()).lte("created_at", end.toISOString());
      }

      const { data } = await query.order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval,
    staleTime: refetchInterval,
  });
}
