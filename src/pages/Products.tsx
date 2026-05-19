// v2.0.0 — Produtos: SKU/barcode, upload imagem, toggle inline, duplicar, filtro categoria, delete dialog
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { optimizeImage } from "@/lib/image-optimizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Edit, Trash2, Upload, Copy, ImageIcon, Loader2, X, FileText, RefreshCw } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { MenuImportDialog } from "@/components/products/MenuImportDialog";
import { ProductModifierGroupsSection } from "@/components/products/ProductModifierGroupsSection";
import { formatCurrency } from "@/lib/currency-formatter";
import { cn } from "@/lib/utils";
import { SkeletonTable } from "@/components/loading";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  company_id: string;
  category_id: string | null;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  on_off: boolean | null;
  internal_code: string | null;
  print_sector: string | null;
  display_order: number | null;
  categories?: { name: string } | null;
}

const PRINT_SECTORS = [
  { value: "cozinha", label: "Cozinha" },
  { value: "bar", label: "Bar" },
  { value: "balcao", label: "Balcão" },
  { value: "confeitaria", label: "Confeitaria" },
];

const emptyForm = (): Partial<Product> => ({
  name: "",
  price: 0,
  description: "",
  category_id: null,
  image_url: null,
  on_off: true,
  internal_code: null,
  print_sector: null,
});

export function Products() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [regeneratingPdf, setRegeneratingPdf] = useState(false); // loading do botão regenerar PDF cardápio

  // Regenera PDF do cardápio (força hash novo) + faz download
  const handleRegenerateMenuPDF = async (downloadAfter = false) => {
    if (!companyId) return;
    setRegeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-menu-document", {
        body: { company_id: companyId, force: true },
      });
      if (error || !data?.success) throw new Error(data?.error || error?.message || "Falha");
      toast({
        title: "Cardápio PDF atualizado!",
        description: `${data.stats?.categories ?? 0} categorias · ${data.stats?.products ?? 0} produtos`,
      });
      // Faz download direto (cliente solicita)
      if (downloadAfter && data.pdf_base64) {
        const blob = new Blob([Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0))], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || "cardapio.pdf";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao gerar PDF", variant: "destructive" });
    } finally {
      setRegeneratingPdf(false);
    }
  };
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>(emptyForm());
  const [uploading, setUploading] = useState(false);

  // ── Queries

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!companyId,
  });

  // ── Mutations

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      if (!companyId) throw new Error("Company ID não encontrado");
      const payload = {
        name: data.name || "",
        price: data.price || 0,
        description: data.description || null,
        category_id: data.category_id || null,
        image_url: data.image_url || null,
        on_off: data.on_off ?? true,
        internal_code: data.internal_code || null,
        print_sector: data.print_sector || null,
      };
      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert({ ...payload, company_id: companyId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", companyId] });
      toast({ title: editingProduct ? "Produto atualizado" : "Produto cadastrado" });
      closeModal();
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, on_off }: { id: string; on_off: boolean }) => {
      const { error } = await supabase.from("products").update({ on_off }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products", companyId] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", companyId] });
      toast({ title: "Produto excluído" });
      setDeletingProduct(null);
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!companyId) throw new Error("Company ID não encontrado");
      const { error } = await supabase.from("products").insert({
        company_id: companyId,
        name: `${product.name} (cópia)`,
        price: product.price,
        description: product.description,
        category_id: product.category_id,
        image_url: product.image_url,
        on_off: false, // inicia desativado para revisão
        internal_code: null,
        print_sector: product.print_sector,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", companyId] });
      toast({ title: "Produto duplicado", description: "Cópia criada como inativa para revisão." });
    },
    onError: (e: any) => toast({ title: "Erro ao duplicar", description: e.message, variant: "destructive" }),
  });

  // ── Image upload

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!companyId) {
      toast({ title: "Aguarde", description: "Empresa carregando...", variant: "destructive" });
      return;
    }
    // Validações pré-upload
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Selecione uma imagem.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Imagem muito grande", description: "Máximo 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Confirma sessão antes do upload (RLS exige authenticated)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
        return;
      }

      const optimized = await optimizeImage(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.85 });
      // Extensão robusta: usa MIME-type → ext (não confia em filename)
      const mimeExt = optimized.type === "image/webp" ? "webp"
        : optimized.type === "image/png" ? "png"
        : optimized.type === "image/gif" ? "gif"
        : "jpg";
      const fileName = `${companyId}/products/${Date.now()}.${mimeExt}`;

      const { error: upErr } = await supabase.storage
        .from("company-logos")
        .upload(fileName, optimized, {
          upsert: true,
          contentType: optimized.type,
          cacheControl: "3600",
        });

      if (upErr) {
        console.error("[upload] supabase error:", upErr);
        throw upErr;
      }

      const { data: { publicUrl } } = supabase.storage.from("company-logos").getPublicUrl(fileName);
      setFormData(f => ({ ...f, image_url: publicUrl }));
      toast({ title: "Imagem enviada ✓" });
    } catch (err: any) {
      console.error("[upload] exception:", err);
      const msg = err?.message || err?.error_description || err?.statusText || "Erro desconhecido";
      toast({
        title: "Erro ao enviar imagem",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Helpers

  const openModal = (product?: Product) => {
    setEditingProduct(product ?? null);
    setFormData(product ? { ...product } : emptyForm());
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData(emptyForm());
  };

  const handleSave = () => {
    if (!formData.name?.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!formData.price || formData.price <= 0) {
      toast({ title: "Preço deve ser maior que zero", variant: "destructive" });
      return;
    }
    saveMutation.mutate(formData);
  };

  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.internal_code?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (p.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCategory = filterCategory === null || p.category_id === filterCategory;
    return matchSearch && matchCategory;
  });

  return (
    <PageLayout
      title="Produtos"
      actions={
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar Cardápio
          </Button>
          {/* Regenera + baixa PDF cardápio (também atualiza cache pra bot WhatsApp) */}
          <Button variant="outline" onClick={() => handleRegenerateMenuPDF(true)} disabled={regeneratingPdf} title="Regenera o PDF do cardápio enviado pelo bot WhatsApp e baixa cópia">
            {regeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            {regeneratingPdf ? "Gerando..." : "Cardápio PDF"}
          </Button>
          <Button onClick={() => openModal()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, SKU ou descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro categoria */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-1">
              <Button
                variant={filterCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterCategory(null)}
              >
                Todos ({products.length})
              </Button>
              {categories.map(cat => {
                const count = products.filter(p => p.category_id === cat.id).length;
                return (
                  <Button
                    key={cat.id}
                    variant={filterCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterCategory(cat.id)}
                  >
                    {cat.name} ({count})
                  </Button>
                );
              })}
            </div>
          </ScrollArea>

          {isLoading ? (
            <SkeletonTable rows={8} cols={5} />
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              {search || filterCategory ? "Nenhum resultado para os filtros." : "Nenhum produto cadastrado."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Nome</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(product => (
                  <TableRow key={product.id}>
                    {/* Thumbnail */}
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-9 h-9 object-cover rounded"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium max-w-[180px]">
                      <p className="truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[160px]">{product.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {product.internal_code ?? "—"}
                    </TableCell>
                    <TableCell>
                      {product.categories?.name && (
                        <Badge variant="secondary">{product.categories.name}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.price)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">
                      {product.print_sector ?? "—"}
                    </TableCell>
                    {/* Toggle on_off inline */}
                    <TableCell>
                      <Switch
                        checked={product.on_off ?? false}
                        onCheckedChange={checked => toggleMutation.mutate({ id: product.id, on_off: checked })}
                        disabled={toggleMutation.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicateMutation.mutate(product)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openModal(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Excluir" onClick={() => setDeletingProduct(product)}>
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

      {/* ── Dialog: Criar/Editar */}
      <Dialog open={showModal} onOpenChange={v => !v && closeModal()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Imagem */}
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary transition-colors bg-muted/30 shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.image_url ? (
                  <div className="relative w-full h-full">
                    <img src={formData.image_url} className="w-full h-full object-cover rounded-lg" alt="preview" />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center"
                      onClick={e => { e.stopPropagation(); setFormData(f => ({ ...f, image_url: null })); }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto" />
                    <p className="text-[10px] text-muted-foreground mt-1">Foto</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price ?? 0}
                  onChange={e => setFormData(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select
                  value={formData.category_id ?? "none"}
                  onValueChange={v => setFormData(f => ({ ...f, category_id: v === "none" ? null : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description ?? ""}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value || null }))}
                rows={2}
                placeholder="Ingredientes, informações..."
              />
            </div>

            <div>
              <Label>Setor de Impressão</Label>
              <Select
                value={formData.print_sector ?? "none"}
                onValueChange={v => setFormData(f => ({ ...f, print_sector: v === "none" ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem setor</SelectItem>
                  {PRINT_SECTORS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {/* Acompanhamentos — só aparece após produto criado (precisa de ID) */}
            {editingProduct?.id && (
              <div className="pt-3 border-t">
                <ProductModifierGroupsSection productId={editingProduct.id} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProduct ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deletingProduct}
        onOpenChange={v => !v && setDeletingProduct(null)}
        title="Excluir produto?"
        description={`"${deletingProduct?.name}" será removido permanentemente. Esta ação não pode ser desfeita.`}
        onConfirm={() => deletingProduct && deleteMutation.mutate(deletingProduct.id)}
        isPending={deleteMutation.isPending}
      />

      {/* ── Importar cardápio via IA */}
      <MenuImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        companyId={companyId ?? null}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ["products", companyId] });
          queryClient.invalidateQueries({ queryKey: ["categories", companyId] });
        }}
      />
    </PageLayout>
  );
}
