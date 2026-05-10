// v1.0.0 — Gestão de banners do cardápio: upload, link, ordem, templates
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload, Trash2, Pencil, ChevronUp, ChevronDown, Plus, ImageIcon, Link2, ExternalLink,
} from "lucide-react";

// ── Templates de banners pré-prontos (SVG inline como data URL) ──────────────

const TEMPLATES = [
  {
    id: "promo",
    label: "Promoção",
    description: "Destaque ofertas especiais",
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ef4444"/><stop offset="100%" style="stop-color:#f97316"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/><circle cx="900" cy="200" r="260" fill="rgba(255,255,255,0.06)"/><circle cx="1050" cy="50" r="150" fill="rgba(255,255,255,0.05)"/><text x="100" y="150" font-family="Arial,sans-serif" font-size="72" font-weight="bold" fill="white">🔥 Promoção Especial!</text><text x="100" y="230" font-family="Arial,sans-serif" font-size="40" fill="rgba(255,255,255,0.9)">Descontos imperdíveis hoje</text><rect x="100" y="280" width="260" height="64" rx="32" fill="white"/><text x="230" y="322" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="#ef4444" text-anchor="middle">Ver ofertas →</text></svg>`)}`,
  },
  {
    id: "frete",
    label: "Frete Grátis",
    description: "Incentive pedidos maiores",
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#16a34a"/><stop offset="100%" style="stop-color:#059669"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/><circle cx="200" cy="350" r="200" fill="rgba(255,255,255,0.06)"/><circle cx="1100" cy="80" r="180" fill="rgba(255,255,255,0.05)"/><text x="100" y="140" font-family="Arial,sans-serif" font-size="72" font-weight="bold" fill="white">🚀 Frete Grátis</text><text x="100" y="215" font-family="Arial,sans-serif" font-size="42" fill="rgba(255,255,255,0.95)">Pedidos acima de R$ 50</text><rect x="100" y="270" width="340" height="64" rx="32" fill="white"/><text x="270" y="312" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="#16a34a" text-anchor="middle">Aproveitar agora →</text></svg>`)}`,
  },
  {
    id: "novidade",
    label: "Novidades",
    description: "Apresente novos itens do cardápio",
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7c3aed"/><stop offset="100%" style="stop-color:#db2777"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/><circle cx="1000" cy="300" r="300" fill="rgba(255,255,255,0.06)"/><circle cx="150" cy="50" r="120" fill="rgba(255,255,255,0.05)"/><text x="100" y="140" font-family="Arial,sans-serif" font-size="72" font-weight="bold" fill="white">✨ Novidade no cardápio!</text><text x="100" y="215" font-family="Arial,sans-serif" font-size="40" fill="rgba(255,255,255,0.9)">Experimente nossos novos pratos</text><rect x="100" y="270" width="300" height="64" rx="32" fill="white"/><text x="250" y="312" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="#7c3aed" text-anchor="middle">Ver cardápio →</text></svg>`)}`,
  },
];

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Banner {
  id: string;
  company_id: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  link_type: string | null;
  link_value: string | null;
}

interface EditState {
  id: string | null; // null = novo
  image_url: string;
  link_type: string;
  link_value: string;
  is_active: boolean;
}

const EMPTY_EDIT: EditState = {
  id: null,
  image_url: "",
  link_type: "none",
  link_value: "",
  is_active: true,
};

const LINK_TYPES = [
  { value: "none", label: "Sem link" },
  { value: "url", label: "URL externa" },
  { value: "category", label: "Categoria do cardápio" },
  { value: "product", label: "Produto específico" },
  { value: "whatsapp", label: "Abrir WhatsApp" },
];

// ── Componente principal ───────────────────────────────────────────────────

interface Props {
  companyId: string;
}

export function MenuBannersAdmin({ companyId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editState, setEditState] = useState<EditState>(EMPTY_EDIT);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  // Carregar banners
  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["menu-banners", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_banners")
        .select("*")
        .eq("company_id", companyId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["menu-banners", companyId] });

  // Salvar (criar ou atualizar)
  const saveMut = useMutation({
    mutationFn: async (state: EditState) => {
      const payload = {
        company_id: companyId,
        image_url: state.image_url,
        link_type: state.link_type === "none" ? null : state.link_type,
        link_value: state.link_type === "none" ? null : state.link_value,
        is_active: state.is_active,
      };
      if (state.id) {
        const { error } = await supabase.from("menu_banners").update(payload).eq("id", state.id);
        if (error) throw error;
      } else {
        const nextOrder = banners.length ? Math.max(...banners.map(b => b.display_order)) + 1 : 1;
        const { error } = await supabase.from("menu_banners").insert({ ...payload, display_order: nextOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      setEditOpen(false);
      toast({ title: editState.id ? "Banner atualizado" : "Banner adicionado" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Toggle ativo
  const toggleMut = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("menu_banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Reordenar
  const reorderMut = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: "up" | "down" }) => {
      const idx = banners.findIndex(b => b.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= banners.length) return;
      const a = banners[idx], b2 = banners[swapIdx];
      await supabase.from("menu_banners").update({ display_order: b2.display_order }).eq("id", a.id);
      await supabase.from("menu_banners").update({ display_order: a.display_order }).eq("id", b2.id);
    },
    onSuccess: invalidate,
  });

  // Excluir
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "Banner excluído" }); },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Upload de imagem
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${companyId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("menu-banners").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("menu-banners").getPublicUrl(path);
      setEditState(prev => ({ ...prev, image_url: publicUrl }));
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const openNew = () => { setEditState(EMPTY_EDIT); setEditOpen(true); };
  const openEdit = (b: Banner) => {
    setEditState({
      id: b.id,
      image_url: b.image_url,
      link_type: b.link_type || "none",
      link_value: b.link_value || "",
      is_active: b.is_active,
    });
    setEditOpen(true);
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setEditState({ ...EMPTY_EDIT, image_url: tpl.dataUrl, link_type: "none" });
    setTemplateOpen(false);
    setEditOpen(true);
  };

  const linkPlaceholder = (type: string) => {
    if (type === "url") return "https://exemplo.com/promo";
    if (type === "category") return "ID ou nome da categoria";
    if (type === "product") return "ID ou nome do produto";
    if (type === "whatsapp") return "Número do WhatsApp (com DDD)";
    return "";
  };

  return (
    <div className="space-y-4">
      {/* Ações */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button type="button" variant="outline" size="sm" onClick={() => setTemplateOpen(true)}>
          <ImageIcon className="w-4 h-4 mr-2" />
          Usar template
        </Button>
        <Button type="button" size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar banner
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
      ) : banners.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg py-10 text-center text-muted-foreground space-y-2">
          <ImageIcon className="w-10 h-10 mx-auto opacity-30" />
          <p className="text-sm">Nenhum banner cadastrado</p>
          <p className="text-xs">Adicione banners promocionais para exibir no topo do seu cardápio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, idx) => (
            <div key={banner.id} className="flex items-center gap-3 border rounded-lg p-3 bg-card">
              {/* Thumbnail */}
              <div className="w-32 h-16 rounded overflow-hidden bg-muted shrink-0">
                <img
                  src={banner.image_url}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {banner.link_type && banner.link_type !== "none" ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Link2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {LINK_TYPES.find(t => t.value === banner.link_type)?.label}
                      {banner.link_value ? `: ${banner.link_value}` : ""}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-1">Sem link</p>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={banner.is_active}
                    onCheckedChange={(v) => toggleMut.mutate({ id: banner.id, is_active: v })}
                    className="scale-75 origin-left"
                  />
                  <Badge variant={banner.is_active ? "default" : "secondary"} className="text-xs">
                    {banner.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  type="button" size="icon" variant="ghost"
                  className="h-7 w-7"
                  disabled={idx === 0}
                  onClick={() => reorderMut.mutate({ id: banner.id, direction: "up" })}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  type="button" size="icon" variant="ghost"
                  className="h-7 w-7"
                  disabled={idx === banners.length - 1}
                  onClick={() => reorderMut.mutate({ id: banner.id, direction: "down" })}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(banner)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(banner.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Dialog: Escolher template ── */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Escolher template de banner</DialogTitle>
            <DialogDescription>
              Selecione um modelo pronto. Você pode editá-lo depois.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.id}
                type="button"
                className="group relative overflow-hidden rounded-lg border-2 border-transparent hover:border-primary transition-all text-left"
                onClick={() => applyTemplate(tpl)}
              >
                <img src={tpl.dataUrl} alt={tpl.label} className="w-full h-28 object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-sm font-medium px-4 py-2 rounded-full shadow">
                    Usar este template
                  </span>
                </div>
                <div className="px-3 py-2 bg-card border-t">
                  <p className="text-sm font-medium">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground">{tpl.description}</p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar / Criar banner ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editState.id ? "Editar banner" : "Novo banner"}</DialogTitle>
            <DialogDescription>Configure a imagem e o link do banner</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            {editState.image_url ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img src={editState.image_url} alt="Preview" className="w-full h-36 object-cover" />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 right-2 text-xs"
                  onClick={() => fileRef.current?.click()}
                >
                  Trocar imagem
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-36 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm">{uploading ? "Enviando..." : "Clique para fazer upload da imagem"}</span>
                <span className="text-xs">JPG, PNG, WebP — máx. 5MB — recomendado 1200×400px</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            />

            {/* Link tipo */}
            <div>
              <Label>Ação ao clicar</Label>
              <Select
                value={editState.link_type}
                onValueChange={(v) => setEditState(prev => ({ ...prev, link_type: v, link_value: "" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINK_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link value */}
            {editState.link_type !== "none" && (
              <div>
                <Label>
                  {editState.link_type === "url" ? "URL de destino" :
                   editState.link_type === "whatsapp" ? "Número WhatsApp" :
                   editState.link_type === "category" ? "Nome ou ID da categoria" :
                   "Nome ou ID do produto"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={editState.link_value}
                    onChange={(e) => setEditState(prev => ({ ...prev, link_value: e.target.value }))}
                    placeholder={linkPlaceholder(editState.link_type)}
                  />
                  {editState.link_type === "url" && editState.link_value && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => window.open(editState.link_value, "_blank")}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Ativo */}
            <div className="flex items-center gap-3">
              <Switch
                checked={editState.is_active}
                onCheckedChange={(v) => setEditState(prev => ({ ...prev, is_active: v }))}
              />
              <Label>Exibir no cardápio</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              onClick={() => saveMut.mutate(editState)}
              disabled={!editState.image_url || saveMut.isPending}
            >
              {saveMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ── */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
