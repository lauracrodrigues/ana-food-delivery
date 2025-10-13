import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useCompanyId = () => {
  const { data: companyId, isLoading } = useQuery({
    queryKey: ['companyId'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      
      return profile?.company_id ?? null;
    },
    staleTime: Infinity, // company_id doesn't change during session
  });
  
  return { companyId, isLoadingCompany: isLoading };
};
