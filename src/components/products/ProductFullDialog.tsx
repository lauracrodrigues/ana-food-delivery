// v1.0.0 — Ficha completa de produto (extraída de Products.tsx)
// Reutilizada por /menu e onde mais precisar editar produto
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/image-optimizer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ProductModifierGroupsSection } from "@/components/products/ProductModifierGroupsSection";
import { Loader2, X, ImageIcon } from "lucide-react";

interface Product {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  on_off: boolean | null;
  show_in_whatsapp_greeting?: boolean | null;
  internal_code: string | null;
  print_sector: string | null;
  display_order: number | null;
}

interface Category {
  id: string;
  name: string;
  print_sector?: string | null;
}

interface Props {
  product?: Product | null;
  companyId?: string;
  defaultCategoryId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// v1.1.0 — Cozinha 3 adicionada (canonical: cozinha_1/cozinha_2/cozinha_3/copa_bar)
const PRINT_SECTORS = [
  { value: "caixa",     label: "Caixa" },
  { value: "cozinha_1", label: "Cozinha 1" },
  { value: "cozinha_2", label: "Cozinha 2" },
  { value: "cozinha_3", label: "Cozinha 3" },
  { value: "copa_bar",  label: "Copa/Bar" },
  { value: "none",      label: "Nenhum (não imprime)" },
];

const emptyForm = (defaultCat?: string | null): Partial<Product> => ({
  name: "",
  price: 0,
  description: "",
  category_id: defaultCat ?? null,
  image_url: null,
  on_off: true,
  internal_code: null,
  print_sector: null, // null = herda categoria
  show_in_whatsapp_greeting: false,
});

export function ProductFullDialog({ product, companyId, defaultCategoryId, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>(emptyForm(defaultCategoryId));

  const isEditing = !!product;

  // Reseta form ao abrir
  useEffect(() => {
    if (open) {
      setFormData(product ? { ...product } : emptyForm(defaultCategoryId));
    }
  }, [open, product, defaultCategoryId]);

  // Categories pra Select
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories-full", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, print_sector")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!companyId && open,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      if (!companyId) throw new Error("Empresa não identificada");
      const payload = {
        name: data.name || "",
        price: Number(data.price) || 0,
        description: data.description || null,
        category_id: data.category_id || null,
        image_url: data.image_url || null,
        on_off: data.on_off ?? true,
        internal_code: data.internal_code || null,
        print_sector: data.print_sector || null,
        show_in_whatsapp_greeting: data.show_in_whatsapp_greeting ?? false,
      };
      if (isEditing && product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({ ...payload, company_id: companyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: isEditing ? "Produto atualizado" : "Produto cadastrado" });
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Selecione uma imagem", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Imagem > 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const optimized = await optimizeImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      const ext = optimized.type === "image/webp" ? "webp" : optimized.type === "image/png" ? "png" : "jpg";
      const fileName = `${companyId}/products/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-logos")
        .upload(fileName, optimized, { upsert: true, contentType: optimized.type, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("company-logos").getPublicUrl(fileName);
      setFormData(f => ({ ...f, image_url: publicUrl }));
      toast({ title: "Imagem enviada ✓" });
    } catch (err: any) {
      toast({ title: "Erro upload", description: err?.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = () => {
    if (!formData.name?.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  // Setor herdado da categoria selecionada (label informativo)
  const inheritedSector = categories.find(c => c.id === formData.category_id)?.print_sector;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Imagem + nome/SKU */}
          <div className="flex items-center gap-4">
            <label
              htmlFor="product-image-upload"
              className={`w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30 shrink-0 ${
                uploading ? "cursor-wait opacity-70" : "cursor-pointer hover:border-primary hover:bg-muted/50"
              }`}
            >
              {formData.image_url ? (
                <div className="relative w-full h-full">
                  <img src={formData.image_url} className="w-full h-full object-cover rounded-lg pointer-events-none" alt="" />
                  <button
                    type="button"
                    className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center z-10"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setFormData(f => ({ ...f, image_url: null })); }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : uploading ? (
                <Loader2 className="h-6 w-6 animate-spin pointer-events-none" />
              ) : (
                <div className="text-center pointer-events-none">
                  <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto" />
                  <p className="text-[10px] text-muted-foreground mt-1">Foto</p>
                </div>
              )}
            </label>
            <input
              id="product-image-upload"
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploading}
            />

            <div className="flex-1 space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input
                  autoFocus
                  value={formData.name ?? ""}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: X-Burguer"
                />
              </div>
              <div>
                <Label>SKU / Código de barras</Label>
                <Input
                  value={formData.internal_code ?? ""}
                  onChange={e => setFormData(f => ({ ...f, internal_code: e.target.value || null }))}
                  placeholder="Ex: 7891234567890"
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Preço + Categoria */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço *</Label>
              <CurrencyInput
                value={formData.price ?? 0}
                onChange={(v) => setFormData(f => ({ ...f, price: v }))}
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.category_id ?? "none"}
                onValueChange={v => setFormData(f => ({ ...f, category_id: v === "none" ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description ?? ""}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value || null }))}
              rows={2}
              placeholder="Ingredientes, observações..."
            />
          </div>

          {/* Setor de Impressão */}
          <div>
            <Label>Setor de Impressão</Label>
            <Select
              value={formData.print_sector === null || formData.print_sector === undefined ? "inherit" : formData.print_sector}
              onValueChange={v => setFormData(f => ({ ...f, print_sector: v === "inherit" ? null : v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">
                  Definido pela categoria{inheritedSector ? ` (${inheritedSector})` : ""}
                </SelectItem>
                {PRINT_SECTORS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Switches */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Produto Ativo</Label>
              <p className="text-xs text-muted-foreground">Exibir no cardápio e PDV</p>
            </div>
            <Switch
              checked={formData.on_off ?? true}
              onCheckedChange={v => setFormData(f => ({ ...f, on_off: v }))}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 bg-emerald-50/30 dark:bg-emerald-950/10">
            <div>
              <Label>📲 Mostrar na saudação do WhatsApp</Label>
              <p className="text-xs text-muted-foreground">
                Destaque na primeira mensagem do bot (recomendado 3-8 produtos)
              </p>
            </div>
            <Switch
              checked={formData.show_in_whatsapp_greeting ?? false}
              onCheckedChange={v => setFormData(f => ({ ...f, show_in_whatsapp_greeting: v }))}
            />
          </div>

          {/* Grupos de Opções — só aparece após produto existir */}
          {isEditing && product?.id && (
            <div className="pt-3 border-t">
              <ProductModifierGroupsSection productId={product.id} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Atualizar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
