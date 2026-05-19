import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/image-optimizer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input"; // v1.0.1 — máscara R$
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
import { Upload, X, Tag } from "lucide-react";
import { ProductGroupsTab } from "./ProductGroupsTab";
import { Checkbox } from "@/components/ui/checkbox";
import { WEEKDAYS, ALL_WEEKDAYS } from "@/lib/weekday-utils";
import { ProductTagsPicker } from "@/components/products/ProductTagsPicker";

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
    // v1.0.1 — null = herda categoria.print_sector; valor explícito = override
    print_sector: product?.print_sector ?? null,
    image_url: product?.image_url || "",
    internal_code: product?.internal_code || "",
    on_off: product?.on_off ?? true,
    available_weekdays: product?.available_weekdays || ALL_WEEKDAYS,
    promotional_price: product?.promotional_price?.toString() || "",
    badges: (product?.badges || []) as string[],
    tags: (product?.tags || []) as string[], // etiquetas pré-definidas (vegano, picante, etc)
  });
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price?.toString() || "",
        description: product.description || "",
        category_id: product.category_id || defaultCategoryId || "",
        print_sector: product.print_sector ?? null,
        image_url: product.image_url || "",
        internal_code: product.internal_code || "",
        on_off: product.on_off ?? true,
        available_weekdays: product.available_weekdays || ALL_WEEKDAYS,
        promotional_price: product.promotional_price?.toString() || "",
        badges: (product.badges || []) as string[],
        tags: (product.tags || []) as string[],
      });
      setImagePreview(product.image_url || null);
    }
  }, [product, defaultCategoryId]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;

    setUploading(true);
    try {
      // Otimiza foto do produto: até 1200px, JPEG comprimido
      const optimized = await optimizeImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });

      const fileExt = optimized.name.split(".").pop();
      const fileName = `${companyId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, optimized, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      setImagePreview(publicUrl);

      toast({ title: "Imagem enviada com sucesso!" });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" });
    setImagePreview(null);
  };

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

      if (!formData.available_weekdays || formData.available_weekdays.length === 0) {
        throw new Error("Selecione pelo menos um dia da semana");
      }

      const promoPrice = formData.promotional_price ? parseFloat(formData.promotional_price) : null;

      const dataToSave = {
        ...formData,
        price,
        promotional_price: promoPrice && !isNaN(promoPrice) ? promoPrice : null,
        badges: formData.badges.length > 0 ? formData.badges : null,
        tags: formData.tags.length > 0 ? formData.tags : [], // etiquetas (array vazio se nenhuma)
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
      <DialogContent className="sm:max-w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Produto" : "Novo Produto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações do produto." 
              : "Preencha os dados para criar um novo produto."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">Dados Principais</TabsTrigger>
            <TabsTrigger value="groups" disabled={!isEditing}>
              Agrupamentos {!isEditing && "(salve primeiro)"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Pizza Margherita"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço *</Label>
                {/* Máscara R$ — converte number↔string no formData */}
                <CurrencyInput
                  id="price"
                  value={parseFloat(formData.price) || 0}
                  onChange={(n) =>
                    setFormData({ ...formData, price: n > 0 ? String(n) : "" })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promotional_price">Preço Promocional</Label>
                <CurrencyInput
                  id="promotional_price"
                  value={parseFloat(formData.promotional_price) || 0}
                  onChange={(n) =>
                    setFormData({ ...formData, promotional_price: n > 0 ? String(n) : "" })
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_code">Código Interno</Label>
              <Input
                id="internal_code"
                value={formData.internal_code}
                onChange={(e) =>
                  setFormData({ ...formData, internal_code: e.target.value })
                }
                placeholder="Ex: P001"
              />
            </div>

            {/* Badges */}
            <div className="space-y-3 border-t pt-4">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" />
                Etiquetas (destaques visuais)
              </Label>
              <ProductTagsPicker
                value={formData.tags}
                onChange={(tags) => setFormData({ ...formData, tags })}
                label=""
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

            <div className="grid grid-cols-2 gap-4">
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
                {/* v1.0.1 — "inherit" = herda categoria (NULL no DB); valor explícito = override */}
                <Select
                  value={formData.print_sector === null ? "inherit" : formData.print_sector}
                  onValueChange={(value) =>
                    setFormData({ ...formData, print_sector: value === "inherit" ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Mostra o setor herdado da categoria selecionada */}
                    <SelectItem value="inherit">
                      Definido pela categoria
                      {(() => {
                        const cat = categories.find((c: any) => c.id === formData.category_id);
                        return cat?.print_sector ? ` (${cat.print_sector})` : "";
                      })()}
                    </SelectItem>
                    <SelectItem value="none">Nenhum (não imprime)</SelectItem>
                    <SelectItem value="caixa">Caixa</SelectItem>
                    <SelectItem value="cozinha1">Cozinha 1</SelectItem>
                    <SelectItem value="cozinha2">Cozinha 2</SelectItem>
                    <SelectItem value="bar">Copa/Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Imagem do Produto</Label>
              
              {imagePreview ? (
                <div className="relative w-[100px] h-[100px]">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg border-2 border-border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center w-[100px] h-[100px] flex flex-col items-center justify-center">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer text-xs text-primary hover:underline"
                  >
                    Upload
                  </Label>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Enviando...
                    </p>
                  )}
                </div>
              )}
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

            <div className="space-y-3 border-t pt-4">
              <div className="space-y-2">
                <Label>Disponibilidade *</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione os dias da semana em que este produto estará disponível
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {WEEKDAYS.map((day) => (
                  <div key={day.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`weekday-${day.value}`}
                      checked={formData.available_weekdays?.includes(day.value)}
                      onCheckedChange={(checked) => {
                        const current = formData.available_weekdays || [];
                        const updated = checked
                          ? [...current, day.value]
                          : current.filter((d) => d !== day.value);
                        setFormData({ ...formData, available_weekdays: updated });
                      }}
                    />
                    <Label
                      htmlFor={`weekday-${day.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {day.label}
                    </Label>
                  </div>
                ))}
              </div>
              {formData.available_weekdays?.length === 0 && (
                <p className="text-sm text-destructive">
                  Selecione pelo menos um dia da semana
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6 py-4">
            {isEditing ? (
              <ProductGroupsTab
                productId={product.id}
                companyId={companyId!}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Salve o produto primeiro para adicionar agrupamentos
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={
              saveMutation.isPending || 
              !formData.name || 
              !formData.price || 
              !formData.available_weekdays?.length
            }
          >
            {saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
