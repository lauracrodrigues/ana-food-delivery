import { formatCurrency } from "@/lib/currency-formatter";
// Estoque.tsx — v1.0.0
// Controle de estoque: ingredientes, receitas, movimentações, entradas
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, PackagePlus, Search, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { IngredientDialog, type Ingredient } from "@/components/estoque/IngredientDialog";
import { StockEntryDialog } from "@/components/estoque/StockEntryDialog";
import { RecipeEditor } from "@/components/estoque/RecipeEditor";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface StockMovement {
  id: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  reason: string | null;
  created_at: string;
  ingredients: { name: string; unit: string };
}

function stockColor(stock: number, min: number) {
  if (stock === 0) return "text-destructive font-semibold";
  if (stock < min) return "text-orange-500 font-semibold";
  return "text-green-600";
}

function StockBadge({ stock, min }: { stock: number; min: number }) {
  if (stock === 0) return <Badge variant="destructive">Zerado</Badge>;
  if (stock < min) return <Badge className="bg-orange-500 text-white">Abaixo do mínimo</Badge>;
  return <Badge variant="secondary" className="text-green-700">OK</Badge>;
}

export default function Estoque() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [showIngredientDialog, setShowIngredientDialog] = useState(false);
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [preselectedIngredientId, setPreselectedIngredientId] = useState<string | undefined>();

  // Ingredientes
  const { data: ingredients = [], isLoading } = useQuery<Ingredient[]>({
    queryKey: ["ingredients", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ingredients")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Produtos (para RecipeEditor)
  const { data: products = [] } = useQuery({
    queryKey: ["products-names", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!companyId,
  });

  // Movimentações recentes (últimas 100)
  const { data: movements = [] } = useQuery<StockMovement[]>({
    queryKey: ["stock-movements", companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("stock_movements")
        .select("id, type, quantity, reason, created_at, ingredients(name, unit)")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // Salvar ingrediente (create ou update)
  const saveMutation = useMutation({
    mutationFn: async (data: Ingredient) => {
      if (data.id) {
        const { error } = await (supabase as any)
          .from("ingredients")
          .update({ name: data.name, unit: data.unit, stock: data.stock, min_stock: data.min_stock, cost_price: data.cost_price, updated_at: new Date().toISOString() })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("ingredients")
          .insert({ company_id: companyId, ...data });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients", companyId] });
      setShowIngredientDialog(false);
      setEditingIngredient(null);
      toast({ title: "Ingrediente salvo" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // Deletar ingrediente
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("ingredients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients", companyId] });
      toast({ title: "Ingrediente removido" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  // Registrar entrada/ajuste
  const entryMutation = useMutation({
    mutationFn: async (entry: { ingredient_id: string; type: "in" | "adjustment"; quantity: number; reason: string }) => {
      // Busca estoque atual
      const { data: ing } = await (supabase as any)
        .from("ingredients")
        .select("stock")
        .eq("id", entry.ingredient_id)
        .single();

      const newStock = entry.type === "in"
        ? (ing?.stock || 0) + entry.quantity
        : entry.quantity; // adjustment = define valor absoluto

      await (supabase as any)
        .from("ingredients")
        .update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq("id", entry.ingredient_id);

      await (supabase as any).from("stock_movements").insert({
        company_id: companyId,
        ingredient_id: entry.ingredient_id,
        type: entry.type,
        quantity: entry.quantity,
        reason: entry.reason || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients", companyId] });
      queryClient.invalidateQueries({ queryKey: ["stock-movements", companyId] });
      setShowEntryDialog(false);
      toast({ title: "Estoque atualizado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const filtered = ingredients.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  const alertCount = ingredients.filter(i => i.stock < i.min_stock).length;

  return (
    <PageLayout
      title="Estoque"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setPreselectedIngredientId(undefined); setShowEntryDialog(true); }}>
            <PackagePlus className="h-4 w-4 mr-2" />
            Registrar Entrada
          </Button>
          <Button onClick={() => { setEditingIngredient(null); setShowIngredientDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Ingrediente
          </Button>
        </div>
      }
    >
      {/* Alertas de estoque baixo */}
      {alertCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4 text-sm text-orange-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span><strong>{alertCount} ingrediente{alertCount > 1 ? "s" : ""}</strong> abaixo do estoque mínimo</span>
        </div>
      )}

      <Tabs defaultValue="ingredientes">
        <TabsList>
          <TabsTrigger value="ingredientes">
            Ingredientes
            {alertCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 text-xs flex items-center justify-center rounded-full">
                {alertCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        {/* ABA: Ingredientes */}
        <TabsContent value="ingredientes">
          <Card>
            <CardContent className="pt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar ingrediente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {search ? "Nenhum resultado" : "Nenhum ingrediente cadastrado ainda."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrediente</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Custo unit.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(ing => (
                      <TableRow key={ing.id}>
                        <TableCell className="font-medium">{ing.name}</TableCell>
                        <TableCell>{ing.unit}</TableCell>
                        <TableCell className={cn("text-right", stockColor(ing.stock, ing.min_stock))}>
                          {ing.stock}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{ing.min_stock}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {ing.cost_price != null ? `R$ ${ing.cost_price.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell><StockBadge stock={ing.stock} min={ing.min_stock} /></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost" size="icon"
                              title="Registrar entrada"
                              onClick={() => {
                                setPreselectedIngredientId(ing.id);
                                setShowEntryDialog(true);
                              }}
                            >
                              <PackagePlus className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => { setEditingIngredient(ing); setShowIngredientDialog(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => deleteMutation.mutate(ing.id!)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: Receitas */}
        <TabsContent value="receitas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ficha Técnica por Produto</CardTitle>
            </CardHeader>
            <CardContent>
              <RecipeEditor
                companyId={companyId!}
                ingredients={ingredients}
                products={products}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: Movimentações */}
        <TabsContent value="movimentacoes">
          <Card>
            <CardContent className="pt-4">
              {movements.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma movimentação registrada.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ingrediente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(m.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">{m.ingredients?.name}</TableCell>
                        <TableCell>
                          {m.type === "in" ? (
                            <span className="flex items-center gap-1 text-green-600 text-sm">
                              <TrendingUp className="h-3.5 w-3.5" /> Entrada
                            </span>
                          ) : m.type === "out" ? (
                            <span className="flex items-center gap-1 text-orange-600 text-sm">
                              <TrendingDown className="h-3.5 w-3.5" /> Saída
                            </span>
                          ) : (
                            <span className="text-blue-600 text-sm">Ajuste</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.quantity} {m.ingredients?.unit}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{m.reason || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <IngredientDialog
        open={showIngredientDialog}
        onOpenChange={setShowIngredientDialog}
        initial={editingIngredient}
        onSave={data => saveMutation.mutate(data)}
        isSaving={saveMutation.isPending}
      />

      <StockEntryDialog
        open={showEntryDialog}
        onOpenChange={setShowEntryDialog}
        ingredients={ingredients}
        onSave={data => entryMutation.mutate(data)}
        isSaving={entryMutation.isPending}
        preselectedId={preselectedIngredientId}
      />
    </PageLayout>
  );
}
