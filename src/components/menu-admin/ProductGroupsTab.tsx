import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, X, Trash2 } from "lucide-react";
import { GroupEditDialog } from "./GroupEditDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductGroupsTabProps {
  productId: string;
  companyId: string;
}

export function ProductGroupsTab({ productId, companyId }: ProductGroupsTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch available groups
  const { data: allGroups = [] } = useQuery({
    queryKey: ["product-groups", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_groups")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch product's linked groups
  const { data: linkedGroups = [] } = useQuery({
    queryKey: ["product-group-links", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_group_links")
        .select(`
          *,
          group:product_groups(*)
        `)
        .eq("product_id", productId)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Add group to product
  const addGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const maxOrder = Math.max(...linkedGroups.map((lg: any) => lg.display_order), -1);
      const { error } = await supabase.from("product_group_links").insert({
        product_id: productId,
        group_id: groupId,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-group-links"] });
      toast({ title: "Agrupamento adicionado com sucesso!" });
      setSelectedGroupId("");
    },
  });

  // Remove group from product
  const removeGroupMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from("product_group_links")
        .delete()
        .eq("id", linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-group-links"] });
      toast({ title: "Agrupamento removido com sucesso!" });
    },
  });

  const linkedGroupIds = linkedGroups.map((lg: any) => lg.group_id);
  const availableGroups = allGroups.filter((g: any) => !linkedGroupIds.includes(g.id));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select
          value={selectedGroupId}
          onValueChange={setSelectedGroupId}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione um agrupamento existente" />
          </SelectTrigger>
          <SelectContent>
            {availableGroups.map((group: any) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => selectedGroupId && addGroupMutation.mutate(selectedGroupId)}
          disabled={!selectedGroupId || addGroupMutation.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => setIsCreating(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Criar novo agrupamento
      </Button>

      <div className="space-y-2">
        {linkedGroups.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">
            Nenhum agrupamento adicionado ainda
          </p>
        ) : (
          linkedGroups.map((link: any) => (
            <Card key={link.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{link.group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Min: {link.group.min_selection} | Max: {link.group.max_selection || "Ilimitado"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeGroupMutation.mutate(link.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {isCreating && (
        <GroupEditDialog
          companyId={companyId}
          open={isCreating}
          onOpenChange={setIsCreating}
          onSuccess={(groupId) => {
            addGroupMutation.mutate(groupId);
            setIsCreating(false);
          }}
        />
      )}
    </div>
  );
}
