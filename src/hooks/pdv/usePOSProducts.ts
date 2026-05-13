// Hooks compartilhados de produtos/categorias para PDV.
// Usados por POSCounter, POSDelivery e qualquer futuro módulo de venda.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePOSCategories(companyId: string | null) {
  return useQuery({
    queryKey: ["categories", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", companyId)
        .eq("on_off", true)
        .order("display_order");
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePOSProducts(
  companyId: string | null,
  categoryId: string | null,
  searchTerm: string
) {
  return useQuery({
    queryKey: ["products", companyId, categoryId, searchTerm],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .eq("on_off", true)
        .order("name");

      if (categoryId) query = query.eq("category_id", categoryId);
      if (searchTerm) query = query.ilike("name", `%${searchTerm}%`);

      const { data } = await query;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}
