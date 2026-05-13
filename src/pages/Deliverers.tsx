// v1.4.0 — convite por email + botão WhatsApp + campo diária do entregador
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Phone, Search, KeyRound, Send } from "lucide-react";
import { MotoIcon } from "@/components/ui/moto-icon";

interface Deliverer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  active: boolean;
  company_id: string;
  created_at: string;
  daily_rate?: number;
}

const emptyForm = { name: "", phone: "", email: "", password: "", active: true, daily_rate: "" };

// Formata número para exibição: 5562999999999 → (62) 9 9999-9999
function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d[2]} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}


export function Deliverers() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Deliverer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null); // deliverer id sendo convidado

  // Lista entregadores da empresa
  const { data: deliverers = [], isLoading } = useQuery({
    queryKey: ["deliverers", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("deliverers")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      return data as Deliverer[];
    },
    enabled: !!companyId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const phone = payload.phone.replace(/\D/g, ""); // salva só dígitos
      const email = payload.email?.trim() || null;

      // Salva dados do entregador
      const dailyRate = payload.daily_rate ? parseFloat(String(payload.daily_rate).replace(",", ".")) : 0;

      if (editTarget) {
        const { error } = await supabase
          .from("deliverers")
          .update({ name: payload.name, phone, email, active: payload.active, daily_rate: dailyRate, updated_at: new Date().toISOString() })
          .eq("id", editTarget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("deliverers")
          .insert({ company_id: companyId, name: payload.name, phone, email, active: payload.active, daily_rate: dailyRate });
        if (error) throw error;
      }

      // Se senha informada, cria/atualiza usuário no Supabase Auth
      if (email && payload.password.trim()) {
        const res = await fetch(`/v1/deliverers/${companyId}/set-auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: payload.password.trim() }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Erro ao configurar acesso");
        }
      }

      return { email, phone, name: payload.name };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["deliverers", companyId] });
      closeDialog();

      toast({ title: editTarget ? "Entregador atualizado" : "Entregador cadastrado" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  // Envia convite via API (backend gera link + dispara WhatsApp via Evolution)
  const handleSendInvite = async (email: string, phone: string, name: string) => {
    setSendingInvite(email);
    try {
      const res = await fetch(`/v1/deliverers/${companyId}/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Falha ao enviar convite");
      toast({ title: "Convite enviado por WhatsApp" });
    } catch (err: any) {
      toast({ title: "Erro ao enviar convite", description: err.message, variant: "destructive" });
    } finally {
      setSendingInvite(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deliverers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliverers", companyId] });
      toast({ title: "Entregador removido" });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (d: Deliverer) => {
    setEditTarget(d);
    setForm({ name: d.name, phone: d.phone, email: d.email || "", password: "", active: d.active, daily_rate: d.daily_rate ? String(d.daily_rate) : "" });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
    setForm(emptyForm);
  };

  const filtered = deliverers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search.replace(/\D/g, ""))
  );

  return (
    <TooltipProvider>
    <PageLayout title="Entregadores" description="Cadastre entregadores e vincule-os aos pedidos de delivery">
      <div className="space-y-4">
        {/* Barra superior */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar entregador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Novo Entregador
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Email (login)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <MotoIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nenhum entregador cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5 text-sm">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {formatPhone(d.phone)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {d.email || <span className="italic opacity-50">não definido</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          d.active
                            ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          {d.active ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botão enviar convite via WhatsApp — só aparece se tem email e telefone */}
                          {d.email && d.phone && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700"
                                  disabled={sendingInvite === d.email}
                                  onClick={() => handleSendInvite(d.email!, d.phone, d.name)}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Enviar link de acesso via WhatsApp</TooltipContent>
                            </Tooltip>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(d)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Remover entregador "${d.name}"?`)) deleteMutation.mutate(d.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={open => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Entregador" : "Novo Entregador"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: João Silva"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email (para login no app de entregas)</Label>
              <Input
                type="email"
                placeholder="Ex: joao@email.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Ao logar com este email, o sistema abre direto o módulo de entregas
              </p>
            </div>

            {/* Campo senha — aparece só quando email preenchido */}
            {form.email.trim() && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  {editTarget ? "Nova senha (deixe vazio para manter)" : "Senha de acesso"}
                </Label>
                <Input
                  type="password"
                  placeholder={editTarget ? "••••••  (não alterar)" : "Mínimo 6 caracteres"}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                {!editTarget && (
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para enviar um link de acesso pelo WhatsApp após salvar
                  </p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>WhatsApp (com DDI e DDD)</Label>
              <Input
                placeholder="Ex: 5562999999999"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Formato: 55 + DDD + número (ex: 5562912345678)
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Valor da Diária (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 80.00"
                value={form.daily_rate}
                onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Usado para calcular ganhos no relatório de entregas do entregador
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.active}
                onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
              />
              <Label>{form.active ? "Ativo" : "Inativo"}</Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>

            {/* Reenviar convite — só no modo edição, se já tem email e telefone */}
            {editTarget && form.email.trim() && form.phone.trim() && (
              <Button
                variant="secondary"
                disabled={sendingInvite === form.email}
                onClick={() => handleSendInvite(form.email, form.phone, form.name)}
              >
                <Send className="w-4 h-4 mr-2" />
                {sendingInvite === form.email ? "Gerando..." : "Reenviar Convite"}
              </Button>
            )}

            {/* Salvar e enviar convite — novo entregador, sem senha */}
            {!editTarget && form.email.trim() && form.phone.trim() && !form.password.trim() && (
              <Button
                variant="secondary"
                disabled={!form.name.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate(form)}
              >
                <Send className="w-4 h-4 mr-2" />
                Salvar e Enviar Convite
              </Button>
            )}

            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={!form.name.trim() || !form.phone.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
    </TooltipProvider>
  );
}
