import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit, Trash2 } from "lucide-react";

interface Category {
  id: string;
  company_id: string;
  name: string;
  on_off?: boolean;
  created_at?: string;
}

export function Categories() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: "",
    on_off: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get company ID from user profile
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      
      return data;
    },
  });

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!profile?.company_id,
  });

  // Count products per category
  const { data: productCounts = {} } = useQuery({
    queryKey: ["product-counts", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return {};
      
      const { data, error } = await supabase
        .from("products")
        .select("category_id")
        .eq("company_id", profile.company_id);
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(product => {
        if (product.category_id) {
          counts[product.category_id] = (counts[product.category_id] || 0) + 1;
        }
      });
      
      return counts;
    },
    enabled: !!profile?.company_id,
  });

  // Create/Update category
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Category>) => {
      if (!profile?.company_id) throw new Error("Company ID not found");
      
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(data)
          .eq("id", editingCategory.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([{ 
            name: data.name || '',
            on_off: data.on_off,
            company_id: profile.company_id 
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: editingCategory ? "Categoria atualizada" : "Categoria cadastrada",
        description: "Operação realizada com sucesso.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["product-counts"] });
      toast({
        title: "Categoria excluída",
        description: "Categoria removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData(category);
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        on_off: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: "",
      on_off: true,
    });
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Campo obrigatório",
        description: "Nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Categorias</CardTitle>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar categorias..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Nenhuma categoria encontrada." : "Nenhuma categoria cadastrada."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {productCounts[category.id] || 0} produtos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.on_off ? "default" : "secondary"}>
                        {category.on_off ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {category.created_at && new Date(category.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const count = productCounts[category.id] || 0;
                          if (count > 0) {
                            toast({
                              title: "Não é possível excluir",
                              description: `Esta categoria possui ${count} produto(s) associado(s).`,
                              variant: "destructive",
                            });
                          } else if (confirm("Deseja realmente excluir esta categoria?")) {
                            deleteMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="on_off">Categoria Ativa</Label>
              <Switch
                id="on_off"
                checked={formData.on_off}
                onCheckedChange={(checked) => setFormData({ ...formData, on_off: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCategory ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}