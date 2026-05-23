// v1.0.0 — Agendamento de status WhatsApp (texto/imagem/vídeo)
// + Otimização client-side de mídia antes do upload
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Plus, Trash2, Image as ImageIcon, Video, Type, Calendar, Repeat,
  Loader2, CheckCircle2, XCircle, Clock, Send, Pencil,
} from "lucide-react";
import { optimizeImage, validateVideo, formatBytes } from "@/lib/media-optimizer";

type StatusType = "text" | "image" | "video";
type Recurrence = "once" | "daily" | "weekly";

interface StatusItem {
  id: string;
  type: StatusType;
  content: string | null;
  caption: string | null;
  media_url: string | null;
  background_color: string | null;
  font: number;
  schedule_at: string | null;
  recurrence_type: Recurrence;
  recurrence_time: string | null;
  recurrence_days: number[] | null;
  recurrence_until: string | null;
  status: "pending" | "sent" | "failed" | "disabled";
  sent_at: string | null;
  next_run_at: string | null;
  error_msg: string | null;
  channel: string;
  created_at: string;
}

const WEEKDAYS = [
  { v: 0, label: "Dom" }, { v: 1, label: "Seg" }, { v: 2, label: "Ter" },
  { v: 3, label: "Qua" }, { v: 4, label: "Qui" }, { v: 5, label: "Sex" }, { v: 6, label: "Sáb" },
];

const BG_COLORS = [
  { value: "#000000", name: "Preto" },
  { value: "#ff8c00", name: "Laranja" },
  { value: "#22c55e", name: "Verde" },
  { value: "#3b82f6", name: "Azul" },
  { value: "#ef4444", name: "Vermelho" },
  { value: "#a855f7", name: "Roxo" },
];

export function WhatsAppStatusTab() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  // v1.1.0 — Edição de status existente (null=criar novo)
  const [editingItem, setEditingItem] = useState<StatusItem | null>(null);

  const { data: items = [], isLoading } = useQuery<StatusItem[]>({
    queryKey: ["wa-status-schedule", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("whatsapp_status_schedule")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return (data || []) as StatusItem[];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_status_schedule").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-status-schedule"] });
      toast({ title: "Removido" });
    },
  });

  const toggleEnabled = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_status_schedule")
        .update({ status: enabled ? "pending" : "disabled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wa-status-schedule"] }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-500" />
              Status do WhatsApp Agendados
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Posta automaticamente no Status do WhatsApp da empresa. Suporta texto, imagem e vídeo.
              Recorrência diária ou semanal pra manter cliente engajado.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Status
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum status agendado ainda. Crie o primeiro!
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <StatusRow
                  key={item.id}
                  item={item}
                  onDelete={() => remove.mutate(item.id)}
                  onToggle={(enabled) => toggleEnabled.mutate({ id: item.id, enabled })}
                  onEdit={() => setEditingItem(item)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateStatusDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        companyId={companyId}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["wa-status-schedule"] })}
      />

      <CreateStatusDialog
        open={!!editingItem}
        onOpenChange={(v) => { if (!v) setEditingItem(null); }}
        companyId={companyId}
        editing={editingItem}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["wa-status-schedule"] })}
      />
    </div>
  );
}

function StatusRow({ item, onDelete, onToggle, onEdit }: { item: StatusItem; onDelete: () => void; onToggle: (v: boolean) => void; onEdit: () => void }) {
  const Icon = item.type === "text" ? Type : item.type === "image" ? ImageIcon : Video;
  const statusColor =
    item.status === "sent" ? "bg-emerald-500" :
    item.status === "failed" ? "bg-red-500" :
    item.status === "disabled" ? "bg-gray-400" : "bg-blue-500";
  const next = item.next_run_at ? new Date(item.next_run_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : null;
  const sent = item.sent_at ? new Date(item.sent_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : null;

  // v1.1.1 — Preview thumbnail no avatar pra image/video (com fundo de status color)
  const isMedia = item.type === "image" || item.type === "video";

  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className={`relative w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${statusColor} text-white overflow-hidden`}>
        {isMedia && item.media_url ? (
          item.type === "image" ? (
            <img src={item.media_url} alt="preview" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <video src={item.media_url} className="w-full h-full object-cover" muted preload="metadata" />
          )
        ) : item.type === "text" ? (
          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold p-1 text-center leading-tight" style={{ backgroundColor: item.background_color || "#000" }}>
            {(item.content || "").substring(0, 12)}
          </div>
        ) : (
          <Icon className="h-5 w-5" />
        )}
        {isMedia && (
          <div className="absolute bottom-0 right-0 bg-black/60 rounded-tl p-0.5">
            <Icon className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{item.type.toUpperCase()}</Badge>
          {item.recurrence_type === "daily" && <Badge variant="secondary" className="gap-1 text-[10px]"><Repeat className="h-3 w-3" />Diário</Badge>}
          {item.recurrence_type === "weekly" && <Badge variant="secondary" className="gap-1 text-[10px]"><Repeat className="h-3 w-3" />Semanal</Badge>}
          {item.recurrence_type === "once" && <Badge variant="secondary" className="gap-1 text-[10px]"><Calendar className="h-3 w-3" />Único</Badge>}
          <span className={`text-[10px] uppercase font-semibold px-2 rounded ${statusColor} text-white`}>{item.status}</span>
        </div>
        <p className="text-sm mt-1 line-clamp-2">
          {item.type === "text" ? item.content : (item.caption || `[${item.type}] sem legenda`)}
        </p>
        <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
          {next && item.status === "pending" && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Próximo: {next}</span>}
          {sent && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Último: {sent}</span>}
          {item.error_msg && <span className="text-red-500 flex items-center gap-1"><XCircle className="h-3 w-3" />{item.error_msg}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Switch checked={item.status !== "disabled"} onCheckedChange={onToggle} />
        <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete} title="Apagar">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CreateStatusDialog({ open, onOpenChange, companyId, onCreated, editing }: {
  open: boolean; onOpenChange: (v: boolean) => void; companyId: string | undefined;
  onCreated: () => void;
  editing?: StatusItem | null;  // v1.1.0 — se fornecido, modo EDIT
}) {
  const { toast } = useToast();
  const isEdit = !!editing;
  const [type, setType] = useState<StatusType>("text");
  const [content, setContent] = useState("");
  const [caption, setCaption] = useState("");
  const [bgColor, setBgColor] = useState("#000000");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedInfo, setOptimizedInfo] = useState<string>("");
  const [recurrence, setRecurrence] = useState<Recurrence>("once");
  const [scheduleAt, setScheduleAt] = useState("");
  const [recurrenceTime, setRecurrenceTime] = useState("09:00");
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);

  // v1.1.0 — Prefill ao entrar em modo edit
  useEffect(() => {
    if (editing && open) {
      setType(editing.type);
      setContent(editing.content || "");
      setCaption(editing.caption || "");
      setBgColor(editing.background_color || "#000000");
      setRecurrence(editing.recurrence_type);
      setRecurrenceTime(editing.recurrence_time || "09:00");
      setRecurrenceDays(editing.recurrence_days || [1,2,3,4,5]);
      setRecurrenceUntil(editing.recurrence_until || "");
      if (editing.schedule_at) {
        // datetime-local format YYYY-MM-DDTHH:MM
        const d = new Date(editing.schedule_at);
        const pad = (n: number) => String(n).padStart(2, "0");
        setScheduleAt(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setScheduleAt("");
      }
      setMediaFile(null);
      setOptimizedBlob(null);
      setOptimizedInfo(editing.media_url ? "Mídia atual mantida (não enviado novo arquivo)" : "");
    } else if (!editing && open) {
      reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, open]);

  const reset = () => {
    setType("text"); setContent(""); setCaption(""); setBgColor("#000000");
    setMediaFile(null); setOptimizedBlob(null); setOptimizedInfo("");
    setRecurrence("once"); setScheduleAt("");
    setRecurrenceTime("09:00"); setRecurrenceDays([1,2,3,4,5]); setRecurrenceUntil("");
  };

  const onFileSelect = async (file: File) => {
    setMediaFile(file);
    setOptimizing(true);
    setOptimizedInfo("");
    setOptimizedBlob(null);
    try {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) throw new Error("Tipo não suportado");

      const result = isImage ? await optimizeImage(file) : await validateVideo(file);
      setOptimizedBlob(result.blob);
      const saved = result.originalSize - result.optimizedSize;
      setOptimizedInfo(
        isImage
          ? `${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)} (${Math.round((1 - result.ratio) * 100)}% menor) · ${result.width}×${result.height}px`
          : `${formatBytes(result.originalSize)} · ${Math.round(result.durationSec || 0)}s — vídeo validado`
      );
    } catch (err: any) {
      toast({ title: "Erro ao processar", description: err.message, variant: "destructive" });
      setMediaFile(null);
    } finally {
      setOptimizing(false);
    }
  };

  const submit = async () => {
    if (!companyId) return;
    setSubmitting(true);
    try {
      // v1.1.0 — Upload novo media só se houver blob otimizado (em edit, opcional)
      let mediaUrl: string | null = editing?.media_url || null;
      let mediaPath: string | null = null;

      if (type !== "text" && optimizedBlob) {
        const ext = type === "image" ? "jpg" : "mp4";
        mediaPath = `${companyId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("whatsapp-status")
          .upload(mediaPath, optimizedBlob, { upsert: false, contentType: optimizedBlob.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("whatsapp-status").getPublicUrl(mediaPath);
        mediaUrl = pub.publicUrl;
      }

      // Validação: tipo != text exige media (nova ou existente em edit)
      if (type !== "text" && !mediaUrl) {
        throw new Error("Envie um arquivo de mídia");
      }

      // Calcula next_run_at
      let nextRun: string | null = null;
      if (recurrence === "once") {
        if (!scheduleAt) throw new Error("Selecione data/hora");
        nextRun = new Date(scheduleAt).toISOString();
      } else {
        const [h, m] = recurrenceTime.split(":").map(Number);
        const next = new Date();
        next.setHours(h, m, 0, 0);
        if (next <= new Date()) next.setDate(next.getDate() + 1);
        if (recurrence === "weekly" && recurrenceDays.length > 0) {
          for (let i = 0; i < 7; i++) {
            const candidate = new Date(next);
            candidate.setDate(next.getDate() + i);
            if (recurrenceDays.includes(candidate.getDay())) { nextRun = candidate.toISOString(); break; }
          }
        } else {
          nextRun = next.toISOString();
        }
      }

      const payload: any = {
        company_id: companyId,
        type,
        content: type === "text" ? content : null,
        caption: type !== "text" ? caption : null,
        media_url: mediaUrl,
        // media_storage_path: só seta se for upload novo
        ...(mediaPath ? { media_storage_path: mediaPath } : {}),
        background_color: type === "text" ? bgColor : null,
        font: 1,
        recurrence_type: recurrence,
        recurrence_time: recurrence !== "once" ? recurrenceTime : null,
        recurrence_days: recurrence === "weekly" ? recurrenceDays : null,
        recurrence_until: recurrenceUntil || null,
        schedule_at: recurrence === "once" ? nextRun : null,
        next_run_at: nextRun,
        // status: em edit, preserva o atual (mas reseta error_msg pra tentar de novo se falhou)
        ...(isEdit ? { error_msg: null, attempts: 0 } : { status: "pending", channel: "whatsapp_status" }),
        updated_at: new Date().toISOString(),
      };

      if (isEdit && editing) {
        // Se mudou pra disabled antes e agora salvando, mantém disabled
        if (editing.status === "disabled") payload.status = "disabled";
        else payload.status = "pending";

        const { error } = await supabase
          .from("whatsapp_status_schedule")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Status atualizado ✓" });
      } else {
        const { error } = await supabase.from("whatsapp_status_schedule").insert(payload);
        if (error) throw error;
        toast({ title: "Status agendado ✓" });
      }

      reset();
      onCreated();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Editar Status" : "Novo Status Agendado"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <Label className="text-sm font-semibold">Tipo</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Button variant={type === "text" ? "default" : "outline"} onClick={() => setType("text")} className="gap-2"><Type className="h-4 w-4" />Texto</Button>
              <Button variant={type === "image" ? "default" : "outline"} onClick={() => setType("image")} className="gap-2"><ImageIcon className="h-4 w-4" />Foto</Button>
              <Button variant={type === "video" ? "default" : "outline"} onClick={() => setType("video")} className="gap-2"><Video className="h-4 w-4" />Vídeo</Button>
            </div>
          </div>

          {/* Conteúdo por tipo */}
          {type === "text" ? (
            <>
              <div>
                <Label className="text-sm font-semibold">Texto do status</Label>
                <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Ex: 🍛 Cardápio do dia: peça já pelo WhatsApp!" />
              </div>
              <div>
                <Label className="text-sm font-semibold">Cor de fundo</Label>
                <div className="grid grid-cols-6 gap-2 mt-1">
                  {BG_COLORS.map(c => (
                    <button key={c.value} onClick={() => setBgColor(c.value)}
                      className={`h-10 rounded-lg border-2 ${bgColor === c.value ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: c.value }} title={c.name} />
                  ))}
                </div>
              </div>
              {/* Preview */}
              <div className="rounded-lg p-4 text-center text-white font-bold min-h-24 flex items-center justify-center" style={{ backgroundColor: bgColor }}>
                {content || <span className="opacity-50">Preview do status...</span>}
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-sm font-semibold">{type === "image" ? "Foto" : "Vídeo"}</Label>
                <Input
                  type="file"
                  accept={type === "image" ? "image/*" : "video/*"}
                  onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
                />
                {optimizing && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {type === "image" ? "Otimizando imagem (resize + JPEG 75%)..." : "Validando vídeo..."}
                  </p>
                )}
                {optimizedInfo && <p className="text-xs text-emerald-600 mt-1">✓ {optimizedInfo}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {type === "image" ? "Máx 1080×1920px, JPEG 75% (compressão automática)" : "Máx 16MB, 30s — limite do Status WhatsApp"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Legenda (opcional)</Label>
                <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} placeholder="Legenda da mídia..." />
              </div>
            </>
          )}

          {/* Recorrência */}
          <div>
            <Label className="text-sm font-semibold">Quando postar</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Uma vez (data/hora específica)</SelectItem>
                <SelectItem value="daily">Todo dia</SelectItem>
                <SelectItem value="weekly">Dias específicos da semana</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrence === "once" ? (
            <div>
              <Label className="text-sm font-semibold">Data e hora</Label>
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="mt-1" />
            </div>
          ) : (
            <>
              <div>
                <Label className="text-sm font-semibold">Horário</Label>
                <Input type="time" value={recurrenceTime} onChange={(e) => setRecurrenceTime(e.target.value)} className="mt-1 max-w-[140px]" />
              </div>
              {recurrence === "weekly" && (
                <div>
                  <Label className="text-sm font-semibold">Dias</Label>
                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {WEEKDAYS.map(d => (
                      <Button key={d.v} variant={recurrenceDays.includes(d.v) ? "default" : "outline"} size="sm"
                        onClick={() => setRecurrenceDays(prev => prev.includes(d.v) ? prev.filter(x => x !== d.v) : [...prev, d.v])}>
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-sm font-semibold">Termina em (opcional)</Label>
                <Input type="date" value={recurrenceUntil} onChange={(e) => setRecurrenceUntil(e.target.value)} className="mt-1" />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting || optimizing || (type !== "text" && !optimizedBlob && !editing?.media_url)}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar Alterações" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
