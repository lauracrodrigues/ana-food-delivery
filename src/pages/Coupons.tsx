// v1.0.0 — CRUD de cupons de desconto
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { formatCurrency } from "@/lib/currency-formatter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Ticket, Plus, Pencil, Trash2, Copy } from "lucide-react";
import { WEEKDAYS } from "@/lib/weekday-utils";
import { Checkbox } from "@/components/ui/checkbox";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_uses: number | null;
  uses_count: number | null;
  valid_until: string | null;
  is_active: boolean | null;
  min_order_value: number | null;
  discount_limit: number | null;
  free_shipping: boolean | null;
  valid_days_of_week: number[] | null;
  valid_start_time: string | null;
  valid_end_time: string | null;
}

const emptyForm = {
  code: "",
  discount_type: "percentage",
  discount_value: "",
  max_uses: "",
  valid_until: "",
  is_active: true,
  min_order_value: "",
  discount_limit: "",
  free_shipping: false,
  valid_days_of_week: [] as number[],
  valid_start_time: "",
  valid_end_time: "",
};

export default function Coupons() {
  const { companyId } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Coupon[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      if (!form.code.trim()) throw new Error("Código do cupom é obrigatório");
      const discountValue = parseFloat(form.discount_value);
      if (isNaN(discountValue) || discountValue <= 0) throw new Error("Valor de desconto inválido");

      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: discountValue,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
        is_active: form.is_active,
        min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : null,
        discount_limit: form.discount_limit ? parseFloat(form.discount_limit) : null,
        free_shipping: form.free_shipping,
        valid_days_of_week: form.valid_days_of_week.length > 0 ? form.valid_days_of_week : null,
        valid_start_time: form.valid_start_time || null,
        valid_end_time: form.valid_end_time || null,
        company_id: companyId,
      };

      if (editingCoupon) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert({ ...payload, uses_count: 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast({ title: editingCoupon ? "Cupom atualizado!" : "Cupom criado!" });
      closeDialog();
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast({ title: "Cupom removido" });
    },
    onError: () => toast({ title: "Erro ao remover cupom", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("coupons").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coupons"] }),
  });

  const openNew = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      max_uses: coupon.max_uses?.toString() ?? "",
      valid_until: coupon.valid_until ? coupon.valid_until.slice(0, 10) : "",
      is_active: coupon.is_active ?? true,
      min_order_value: coupon.min_order_value?.toString() ?? "",
      discount_limit: coupon.discount_limit?.toString() ?? "",
      free_shipping: coupon.free_shipping ?? false,
      valid_days_of_week: coupon.valid_days_of_week ?? [],
      valid_start_time: coupon.valid_start_time?.slice(0, 5) ?? "",
      valid_end_time: coupon.valid_end_time?.slice(0, 5) ?? "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCoupon(null);
    setForm(emptyForm);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Código copiado!" });
  };

  const toggleWeekday = (day: number) => {
    const current = form.valid_days_of_week;
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
    setForm({ ...form, valid_days_of_week: updated });
  };

  // Dias de semana em formato numérico (0=Dom, 1=Seg, ..., 6=Sab)
  const WEEKDAY_NUMS = [
    { value: 0, label: "Dom" }, { value: 1, label: "Seg" }, { value: 2, label: "Ter" },
    { value: 3, label: "Qua" }, { value: 4, label: "Qui" }, { value: 5, label: "Sex" },
    { value: 6, label: "Sab" },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Ticket className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Cupons de Desconto</h1>
            <p className="text-sm text-muted-foreground">Crie cupons para seus clientes</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cupom
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Ticket className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>Nenhum cupom cadastrado</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => {
              const expired = c.valid_until && new Date(c.valid_until) < new Date();
              const exhausted = c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{c.code}</span>
                      <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {c.free_shipping && (
                      <span className="text-xs text-green-600">+ frete grátis</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      {c.discount_type === "percentage"
                        ? `${c.discount_value}%`
                        : formatCurrency(c.discount_value)}
                      {c.discount_limit && (
                        <span className="text-xs text-muted-foreground block">
                          Máx {formatCurrency(c.discount_limit)}
                        </span>
                      )}
                      {c.min_order_value && (
                        <span className="text-xs text-muted-foreground block">
                          Mín {formatCurrency(c.min_order_value)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={exhausted ? "text-destructive font-medium" : ""}>
                      {c.uses_count ?? 0}
                      {c.max_uses != null ? `/${c.max_uses}` : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    {c.valid_until ? (
                      <span className={expired ? "text-destructive text-sm" : "text-sm"}>
                        {new Date(c.valid_until).toLocaleDateString("pt-BR")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sem limite</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.is_active ?? true}
                        onCheckedChange={(v) => toggleActiveMutation.mutate({ id: c.id, is_active: v })}
                        disabled={expired || exhausted}
                      />
                      {expired && <Badge variant="destructive" className="text-xs">Expirado</Badge>}
                      {exhausted && !expired && <Badge variant="secondary" className="text-xs">Esgotado</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                        onClick={() => { if (confirm("Remover cupom?")) deleteMutation.mutate(c.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Dialog criar/editar cupom */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Editar Cupom" : "Novo Cupom"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Código */}
            <div className="space-y-1.5">
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Ex: BEMVINDO10"
                className="uppercase font-mono"
              />
            </div>

            {/* Tipo + valor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de desconto</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm({ ...form, discount_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === "percentage" ? "Ex: 10" : "Ex: 5.00"}
                />
              </div>
            </div>

            {/* Limite de desconto (só para %) */}
            {form.discount_type === "percentage" && (
              <div className="space-y-1.5">
                <Label>Desconto máximo (R$) <span className="text-muted-foreground text-xs">opcional</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.discount_limit}
                  onChange={(e) => setForm({ ...form, discount_limit: e.target.value })}
                  placeholder="Ex: 20.00"
                />
              </div>
            )}

            {/* Pedido mínimo */}
            <div className="space-y-1.5">
              <Label>Valor mínimo do pedido (R$) <span className="text-muted-foreground text-xs">opcional</span></Label>
              <Input
                type="number"
                step="0.01"
                value={form.min_order_value}
                onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                placeholder="Ex: 30.00"
              />
            </div>

            {/* Frete grátis */}
            <div className="flex items-center justify-between">
              <Label>Frete grátis</Label>
              <Switch
                checked={form.free_shipping}
                onCheckedChange={(v) => setForm({ ...form, free_shipping: v })}
              />
            </div>

            {/* Usos + validade */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Limite de usos <span className="text-muted-foreground text-xs">opcional</span></Label>
                <Input
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Sem limite"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Válido até <span className="text-muted-foreground text-xs">opcional</span></Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
            </div>

            {/* Dias da semana */}
            <div className="space-y-2">
              <Label>Válido nos dias <span className="text-muted-foreground text-xs">(deixe em branco = todos)</span></Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_NUMS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all border ${
                      form.valid_days_of_week.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horário */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Horário início <span className="text-muted-foreground text-xs">opcional</span></Label>
                <Input
                  type="time"
                  value={form.valid_start_time}
                  onChange={(e) => setForm({ ...form, valid_start_time: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Horário fim <span className="text-muted-foreground text-xs">opcional</span></Label>
                <Input
                  type="time"
                  value={form.valid_end_time}
                  onChange={(e) => setForm({ ...form, valid_end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Ativo */}
            <div className="flex items-center justify-between">
              <Label>Cupom ativo</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : editingCoupon ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
