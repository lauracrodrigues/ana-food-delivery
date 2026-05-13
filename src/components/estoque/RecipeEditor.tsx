// RecipeEditor.tsx — v1.0.0
// Associa ingredientes + quantidades a um produto (receita/ficha técnica)
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Ingredient } from "./IngredientDialog";

interface Product { id: string; name: string; }
interface RecipeRow { id: string; ingredient_id: string; quantity: number; ingredients: { name: string; unit: string }; }

interface Props {
  companyId: string;
  ingredients: Ingredient[];
  products: Product[];
}

export function RecipeEditor({ companyId, ingredients, products }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState<number>(0);

  const { data: recipe = [] } = useQuery<RecipeRow[]>({
    queryKey: ["recipe", selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const { data, error } = await (supabase as any)
        .from("recipes")
        .select("id, ingredient_id, quantity, ingredients(name, unit)")
        .eq("product_id", selectedProduct);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProduct,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("recipes").insert({
        company_id: companyId,
        product_id: selectedProduct,
        ingredient_id: newIngredientId,
        quantity: newQty,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe", selectedProduct] });
      setNewIngredientId(""); setNewQty(0);
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("recipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recipe", selectedProduct] }),
  });

  const usedIds = recipe.map(r => r.ingredient_id);
  const availableIngredients = ingredients.filter(i => !usedIds.includes(i.id!));

  return (
    <div className="space-y-4">
      {/* Seletor de produto */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Produto</label>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-80">
            <SelectValue placeholder="Selecione um produto para editar sua receita..." />
          </SelectTrigger>
          <SelectContent>
            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {selectedProduct && (
        <>
          {/* Lista de ingredientes da receita */}
          {recipe.length > 0 ? (
            <div className="border rounded-lg divide-y">
              {recipe.map(row => (
                <div key={row.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm">
                    {row.ingredients.name}
                    <span className="text-muted-foreground ml-2">
                      {row.quantity} {row.ingredients.unit}
                    </span>
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => deleteMutation.mutate(row.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum ingrediente cadastrado neste produto.</p>
          )}

          {/* Adicionar ingrediente à receita */}
          {availableIngredients.length > 0 && (
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium">Ingrediente</label>
                <Select value={newIngredientId} onValueChange={setNewIngredientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {availableIngredients.map(i => (
                      <SelectItem key={i.id} value={i.id!}>{i.name} ({i.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-1">
                <label className="text-sm font-medium">Quantidade</label>
                <Input
                  type="number" step="0.001" min="0.001"
                  value={newQty || ""}
                  onChange={e => setNewQty(parseFloat(e.target.value) || 0)}
                />
              </div>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!newIngredientId || newQty <= 0 || addMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
