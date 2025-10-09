import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuCategoriesList } from "@/components/menu-admin/MenuCategoriesList";
import { MenuProductsList } from "@/components/menu-admin/MenuProductsList";
import { MenuBannersManager } from "@/components/menu-admin/MenuBannersManager";

export default function Menu() {
  const { toast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Fetch company
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Cardápio</h2>
      </div>

      <Tabs defaultValue="menu" className="space-y-4">
        <TabsList>
          <TabsTrigger value="menu">Produtos e Categorias</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lado esquerdo - Categorias */}
            <div className="lg:col-span-4">
              <MenuCategoriesList
                companyId={profile?.company_id}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
              />
            </div>

            {/* Lado direito - Produtos */}
            <div className="lg:col-span-8">
              <MenuProductsList
                companyId={profile?.company_id}
                selectedCategoryId={selectedCategoryId}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="banners" className="space-y-4">
          <MenuBannersManager companyId={profile?.company_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
