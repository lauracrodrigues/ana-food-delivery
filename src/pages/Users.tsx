// v2.0.0 — PageLayout, ações com ?action=, duplicata e verificação de dependências antes de excluir
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { UserPlus, Edit, Trash2, Shield, Search, UserCircle, AlertTriangle } from "lucide-react";
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  fullName: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
  role: z.enum(["company_admin", "company_staff"], {
    errorMap: () => ({ message: "Permissão inválida" }),
  }),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: "company_admin" | "company_staff";
  created_at: string;
}

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ email: "", fullName: "", role: "company_staff" });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não encontrado");
      const { data, error } = await supabase.from("profiles").select("company_id, id").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["company-users", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase.rpc("get_company_users", { _company_id: profile.company_id });
      if (error) throw error;
      return (data || []).map((u: any) => ({
        id: u.user_id,
        email: u.email || "Email não disponível",
        full_name: u.full_name || null,
        role: u.role as "company_admin" | "company_staff",
        created_at: u.created_at || new Date().toISOString(),
      })) as User[];
    },
    enabled: !!profile?.company_id,
  });

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Verifica dependências antes de excluir — impede exclusão se usuário tem movimentações
  const checkDeleteDependencies = async (userId: string): Promise<string | null> => {
    // Único admin: não pode excluir se for o último com role company_admin
    const admins = users.filter(u => u.role === "company_admin");
    const isTargetAdmin = users.find(u => u.id === userId)?.role === "company_admin";
    if (isTargetAdmin && admins.length <= 1) {
      return "Este usuário é o único administrador da empresa. Promova outro usuário a admin antes de excluí-lo.";
    }

    // Verifica se há pedidos vinculados ao usuário
    const { count: orderCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile?.company_id)
      .eq("created_by", userId);

    if (orderCount && orderCount > 0) {
      return `Este usuário registrou ${orderCount} pedido(s) no sistema. Não é possível excluí-lo pois isso afetaria o histórico de vendas. Desative-o ou altere a permissão para "Usuário" se quiser restringir o acesso.`;
    }

    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: UserFormData & { userId?: string }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      if (!data.userId) {
        // Verificar duplicata de email na empresa
        const emailExists = users.some(u => u.email.toLowerCase() === data.email.toLowerCase());
        if (emailExists) {
          throw new Error(`Já existe um usuário com o email ${data.email} nesta empresa.`);
        }

        // Criar via edge function — action=create
        const response = await supabase.functions.invoke('user-management?action=create', {
          body: { email: data.email, fullName: data.fullName, role: data.role, companyId: profile.company_id },
        });
        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
      } else {
        // Atualizar — action=update
        const response = await supabase.functions.invoke('user-management?action=update', {
          body: { userId: data.userId, fullName: data.fullName, role: data.role },
        });
        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast({
        title: selectedUser ? "Usuário atualizado" : "Usuário criado",
        description: selectedUser
          ? "Dados atualizados com sucesso."
          : "Usuário criado. Um convite será enviado por email.",
      });
      handleCloseModal();
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // action=delete na edge function
      const response = await supabase.functions.invoke('user-management?action=delete', {
        body: { userId },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast({ title: "Usuário excluído com sucesso" });
      setDeleteTarget(null);
      setDeleteBlockReason(null);
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setFormData({ email: user.email, fullName: user.full_name || "", role: user.role });
    } else {
      setSelectedUser(null);
      setFormData({ email: "", fullName: "", role: "company_staff" });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setFormData({ email: "", fullName: "", role: "company_staff" });
    setFormErrors({});
  };

  const handleSave = () => {
    const result = userSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof UserFormData, string>> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as keyof UserFormData] = err.message;
      });
      setFormErrors(errors);
      return;
    }
    saveMutation.mutate({ ...formData, userId: selectedUser?.id });
  };

  const handleDeleteClick = async (user: User) => {
    if (user.id === profile?.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode excluir sua própria conta.",
        variant: "destructive",
      });
      return;
    }

    // Verifica dependências antes de abrir dialog
    const blockReason = await checkDeleteDependencies(user.id);
    setDeleteTarget(user);
    setDeleteBlockReason(blockReason);
  };

  const getRoleBadge = (role: string) => {
    if (role === "company_admin") {
      return <Badge variant="default" className="gap-1"><Shield className="w-3 h-3" />Admin</Badge>;
    }
    return <Badge variant="secondary">Usuário</Badge>;
  };

  return (
    <PageLayout
      title="Usuários"
      description={`${users.length} usuário(s) cadastrado(s) nesta empresa`}
    >
      <div className="space-y-4">
        {/* Barra busca + ação */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </Button>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead className="text-right w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{user.full_name || "Sem nome"}</span>
                        {user.id === profile?.id && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenModal(user)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={user.id === profile?.id}
                          onClick={() => handleDeleteClick(user)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={isModalOpen} onOpenChange={open => !open && handleCloseModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {selectedUser ? "Atualize nome e permissão do usuário." : "Preencha os dados para criar o acesso."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                placeholder="usuario@exemplo.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                disabled={!!selectedUser}
              />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Nome Completo *</Label>
              <Input
                placeholder="João Silva"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
              />
              {formErrors.fullName && <p className="text-xs text-destructive">{formErrors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Permissão *</Label>
              <Select
                value={formData.role}
                onValueChange={(v: "company_admin" | "company_staff") => setFormData({ ...formData, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">Acesso total ao sistema</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="company_staff">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Usuário</div>
                        <div className="text-xs text-muted-foreground">Acesso limitado</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && <p className="text-xs text-destructive">{formErrors.role}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : selectedUser ? "Salvar" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog exclusão — bloqueia se tiver dependências */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) { setDeleteTarget(null); setDeleteBlockReason(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteBlockReason
                ? <><AlertTriangle className="w-5 h-5 text-amber-500" /> Exclusão bloqueada</>
                : "Confirmar exclusão"
              }
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {deleteBlockReason ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 text-amber-800 dark:text-amber-200">
                    {deleteBlockReason}
                  </div>
                ) : (
                  <p>
                    Tem certeza que deseja excluir o usuário{" "}
                    <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong>?
                    Esta ação não pode ser desfeita e removerá o acesso ao sistema.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
            {!deleteBlockReason && (
              <AlertDialogAction
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                className="bg-destructive hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
