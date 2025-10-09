import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductEditDialogProps {
  product: any;
  companyId?: string;
  defaultCategoryId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductEditDialog({
  product,
  companyId,
  defaultCategoryId,
  open,
  onOpenChange,
}: ProductEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    name: product?.name || "",
    price: product?.price?.toString() || "",
    description: product?.description || "",
    category_id: product?.category_id || defaultCategoryId || "",
    print_sector: product?.print_sector || "",
    image_url: product?.image_url || "",
    on_off: product?.on_off ?? true,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price?.toString() || "",
        description: product.description || "",
        category_id: product.category_id || defaultCategoryId || "",
        print_sector: product.print_sector || "",
        image_url: product.image_url || "",
        on_off: product.on_off ?? true,
      });
    }
  }, [product, defaultCategoryId]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId && open,
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const price = parseFloat(formData.price);
      if (isNaN(price)) {
        throw new Error("Preço inválido");
      }

      const dataToSave = {
        ...formData,
        price,
        company_id: companyId,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("products")
          .update(dataToSave)
          .eq("id", product.id);
        if (error) throw error;
      } else {
        const { data: products } = await supabase
          .from("products")
          .select("display_order")
          .eq("company_id", companyId)
          .order("display_order", { ascending: false })
          .limit(1);

        const maxOrder = products && products.length > 0 ? products[0].display_order : -1;

        const { error } = await supabase.from("products").insert({
          ...dataToSave,
          display_order: maxOrder + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: isEditing
          ? "Produto atualizado com sucesso!"
          : "Produto criado com sucesso!",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar produto",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do produto
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Dados Principais</TabsTrigger>
            <TabsTrigger value="groups">Agrupamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Pizza Margherita"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva o produto..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, category_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="print_sector">Setor de Impressão</Label>
              <Select
                value={formData.print_sector}
                onValueChange={(value) =>
                  setFormData({ ...formData, print_sector: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="cozinha1">Cozinha 1</SelectItem>
                  <SelectItem value="cozinha2">Cozinha 2</SelectItem>
                  <SelectItem value="bar">Copa/Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">URL da Imagem</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="status">Produto Ativo</Label>
              <Switch
                id="status"
                checked={formData.on_off}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, on_off: checked })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-4 py-4">
            <div className="text-center py-8 text-muted-foreground">
              Funcionalidade de agrupamentos em desenvolvimento
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.name || !formData.price}
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
