// v1.0.0 — Tab de gerenciamento de usuários da loja (admin SaaS)
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Key, Lock, Unlock, Trash2, Mail, Copy, Check } from "lucide-react";

interface TenantUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  blocked: boolean;
  created_at?: string;
  last_sign_in_at?: string;
}

interface Props {
  companyId: string;
}

export function TenantUsersTab({ companyId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state — create
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"company_admin" | "company_staff">("company_staff");
  const [newPassword, setNewPassword] = useState("");

  // Form state — reset
  const [resetMode, setResetMode] = useState<"manual" | "email">("manual");
  const [manualPassword, setManualPassword] = useState("");

  const callFn = async (action: string, body: any = {}) => {
    const { data, error } = await supabase.functions.invoke(`user-management?action=${action}`, { body });
    if (error) throw new Error(error.message || "Erro na requisição");
    if (data?.error) throw new Error(data.error);
    return data;
  };

  // Listar usuários
  const { data: users = [], isLoading } = useQuery<TenantUser[]>({
    queryKey: ["tenant-users", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        `user-management?action=list&company_id=${companyId}`,
        { method: "POST", body: {} }
      );
      if (error) throw error;
      return data?.users || [];
    },
    enabled: !!companyId,
  });

  // Criar usuário
  const createMut = useMutation({
    mutationFn: async () => callFn("create", {
      email: newEmail,
      fullName: newName,
      role: newRole,
      companyId,
      password: newPassword || undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", companyId] });
      if (data?.tempPassword) {
        setTempPassword(data.tempPassword);
      } else {
        setCreateOpen(false);
        toast({ title: "Usuário criado" });
      }
      setNewEmail(""); setNewName(""); setNewPassword("");
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Reset password
  const resetMut = useMutation({
    mutationFn: async () => callFn("reset_password", {
      userId: resetUserId,
      newPassword: resetMode === "manual" ? manualPassword : undefined,
      sendEmail: resetMode === "email",
    }),
    onSuccess: (data) => {
      toast({ title: data?.message || "Senha alterada" });
      setResetUserId(null);
      setManualPassword("");
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Block/unblock
  const blockMut = useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) =>
      callFn("toggle_block", { userId, block }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", companyId] });
      toast({ title: data?.message });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Delete
  const deleteMut = useMutation({
    mutationFn: async (userId: string) => callFn("delete", { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-users", companyId] });
      toast({ title: "Usuário excluído" });
      setDeleteUserId(null);
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const copyPwd = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Usuários da Loja ({users.length})</h4>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário cadastrado</p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{u.full_name || "Sem nome"}</p>
                  <Badge variant={u.role === "company_admin" ? "default" : "secondary"} className="text-xs">
                    {u.role === "company_admin" ? "Admin" : "Staff"}
                  </Badge>
                  {u.blocked && <Badge variant="destructive" className="text-xs">Bloqueado</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                {u.last_sign_in_at && (
                  <p className="text-xs text-muted-foreground">
                    Último login: {new Date(u.last_sign_in_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button size="sm" variant="ghost" onClick={() => setResetUserId(u.id)} title="Reset senha">
                  <Key className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => blockMut.mutate({ userId: u.id, block: !u.blocked })}
                  title={u.blocked ? "Desbloquear" : "Bloquear"}
                >
                  {u.blocked ? <Unlock className="w-4 h-4 text-success" /> : <Lock className="w-4 h-4 text-warning" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteUserId(u.id)} title="Excluir">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Usuário</DialogTitle>
            <DialogDescription>
              {tempPassword ? "Senha temporária gerada — copie e envie ao usuário." : "Crie um novo usuário para esta loja"}
            </DialogDescription>
          </DialogHeader>

          {tempPassword ? (
            <div className="space-y-3">
              <Label>Senha temporária</Label>
              <div className="flex gap-2">
                <Input value={tempPassword} readOnly className="font-mono" />
                <Button size="icon" variant="outline" onClick={copyPwd}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Esta senha não será mostrada novamente.</p>
              <DialogFooter>
                <Button onClick={() => { setTempPassword(null); setCreateOpen(false); }}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Nome completo</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="João Silva" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="joao@empresa.com" />
              </div>
              <div>
                <Label>Função</Label>
                <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_admin">Administrador</SelectItem>
                    <SelectItem value="company_staff">Funcionário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Senha (opcional)</Label>
                <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Deixe vazio para gerar automaticamente" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={() => createMut.mutate()} disabled={!newEmail || !newName || createMut.isPending}>
                  {createMut.isPending ? "Criando..." : "Criar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog reset */}
      <Dialog open={!!resetUserId} onOpenChange={() => setResetUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={resetMode === "manual" ? "default" : "outline"}
                size="sm"
                onClick={() => setResetMode("manual")}
              >
                Definir senha manual
              </Button>
              <Button
                variant={resetMode === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setResetMode("email")}
              >
                <Mail className="w-4 h-4 mr-2" /> Enviar email
              </Button>
            </div>
            {resetMode === "manual" && (
              <div>
                <Label>Nova senha</Label>
                <Input type="text" value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetUserId(null)}>Cancelar</Button>
            <Button
              onClick={() => resetMut.mutate()}
              disabled={resetMut.isPending || (resetMode === "manual" && manualPassword.length < 6)}
            >
              {resetMut.isPending ? "Aguarde..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário perderá acesso permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteMut.mutate(deleteUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
