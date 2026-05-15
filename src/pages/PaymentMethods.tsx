import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Edit2, Trash2, Plus, Save, X, Key, Eye, EyeOff } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { ConfirmDeleteDialog } from "@/components/common/ConfirmDeleteDialog";
import { SkeletonTable } from "@/components/loading";

type PaymentType = "cash" | "credit" | "debit" | "pix" | "voucher" | "other" | "credit_customer";

interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentType;
  is_active: boolean;
  show_pix_copy?: boolean | null;
  pix_key?: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<PaymentType, string> = {
  cash:            "💵 Dinheiro",
  credit:          "💳 Crédito",
  debit:           "💳 Débito",
  pix:             "📱 PIX",
  voucher:         "🎫 Vale",
  credit_customer: "📒 Fiado",
  other:           "📌 Outro",
};

const PaymentMethods = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [newMethod, setNewMethod] = useState("");
  const [newType, setNewType] = useState<PaymentType>("other");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Dialog completo de edição (necessário pra PIX com chave + toggle)
  const [editing, setEditing] = useState<PaymentMethod | null>(null);

  // Load company info
  useEffect(() => {
    async function loadCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      }
    }
    loadCompany();
  }, []);

  // Load payment methods
  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["payment-methods", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!companyId,
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async ({ name, type }: { name: string; type: PaymentType }) => {
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          company_id: companyId,
          name,
          type,
          // Default PIX: mostra chave pro cliente (compatível com fluxo atual)
          show_pix_copy: type === 'pix' ? true : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({
        title: "Forma de pagamento adicionada",
        description: "A forma de pagamento foi adicionada com sucesso.",
      });
      setNewMethod("");
      setNewType("other");
    },
    onError: () => {
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar a forma de pagamento.",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...rest }: { id: string } & Partial<PaymentMethod>) => {
      const updates: any = {};
      const allowed: (keyof PaymentMethod)[] = ['name','type','is_active','show_pix_copy','pix_key'];
      for (const k of allowed) {
        if ((rest as any)[k] !== undefined) updates[k] = (rest as any)[k];
      }

      const { error } = await supabase
        .from('payment_methods')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({
        title: "Forma de pagamento atualizada",
        description: "A forma de pagamento foi atualizada com sucesso.",
      });
      setEditingId(null);
      setEditing(null);
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a forma de pagamento.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({
        title: "Forma de pagamento removida",
        description: "A forma de pagamento foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a forma de pagamento.",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (newMethod.trim()) {
      addMutation.mutate({ name: newMethod.trim(), type: newType });
    }
  };

  const handleToggleActive = (id: string, is_active: boolean) => {
    updateMutation.mutate({ id, is_active });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    setDeleteId(null);
  };

  const saveEditing = () => {
    if (!editing) return;
    const cleanKey = (editing.pix_key || '').trim();
    updateMutation.mutate({
      id: editing.id,
      name: editing.name.trim(),
      type: editing.type,
      pix_key: editing.type === 'pix' ? (cleanKey || null) : null,
      show_pix_copy: editing.type === 'pix' ? (editing.show_pix_copy ?? true) : null,
    });
  };

  return (
    <PageLayout title="Formas de Pagamento">
      {/* Add new payment method */}
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Forma de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
            <Input
              placeholder="Nome (ex: PIX Itaú, Dinheiro, Cartão Crédito)"
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Select value={newType} onValueChange={(v) => setNewType(v as PaymentType)}>
              <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TYPE_LABELS) as PaymentType[]).map(t => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!newMethod.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            💡 Pra <strong>PIX</strong>, após adicionar clique no lápis pra cadastrar chave + escolher se mostra ela ao cliente
          </p>
        </CardContent>
      </Card>

      {/* Payment methods list */}
      <Card>
        <CardHeader>
          <CardTitle>Formas de Pagamento Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SkeletonTable rows={5} cols={4} />
          ) : methods.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma forma de pagamento cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Config</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {methods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell>{method.name}</TableCell>
                    <TableCell className="text-sm">{TYPE_LABELS[method.type] || method.type}</TableCell>
                    <TableCell>
                      {method.type === 'pix' && (
                        <div className="text-xs space-y-0.5">
                          {method.pix_key ? (
                            <div className="flex items-center gap-1 text-green-700">
                              <Key className="h-3 w-3" /> Chave cadastrada
                            </div>
                          ) : (
                            <span className="text-amber-700">⚠ Sem chave</span>
                          )}
                          {method.show_pix_copy ? (
                            <div className="flex items-center gap-1 text-blue-700">
                              <Eye className="h-3 w-3" /> Mostra chave ao cliente
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <EyeOff className="h-3 w-3" /> Chave oculta
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={method.is_active}
                        onCheckedChange={(checked) => handleToggleActive(method.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setEditing({ ...method })}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => setDeleteId(method.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Confirmar exclusão"
        description="Tem certeza que deseja remover esta forma de pagamento?"
        confirmLabel="Remover"
        onConfirm={() => deleteId && handleDelete(deleteId)}
      />

      {/* Dialog edição completa (suporta config PIX) */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar forma de pagamento</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as PaymentType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as PaymentType[]).map(t => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campos PIX só aparecem se type=pix */}
              {editing.type === 'pix' && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Key className="h-4 w-4" /> Configuração PIX
                  </p>
                  <div className="space-y-2">
                    <Label>Chave PIX</Label>
                    <Input
                      placeholder="email@empresa.com ou CPF/CNPJ ou telefone"
                      value={editing.pix_key || ''}
                      onChange={(e) => setEditing({ ...editing, pix_key: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Usada no fluxo de PIX Manual quando o agente envia a chave ao cliente
                    </p>
                  </div>
                  <div className="flex items-start justify-between gap-3 border rounded-lg p-3 bg-muted/30">
                    <div className="flex-1">
                      <Label className="cursor-pointer">Mostrar chave PIX ao cliente</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Quando ativado, agente envia mensagem com a chave em formato copy-paste pro cliente pagar.
                        Quando desativado, agente só pede "Faça o PIX e envie o comprovante" sem revelar chave.
                      </p>
                    </div>
                    <Switch
                      checked={editing.show_pix_copy ?? true}
                      onCheckedChange={(v) => setEditing({ ...editing, show_pix_copy: v })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
            <Button onClick={saveEditing}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default PaymentMethods;