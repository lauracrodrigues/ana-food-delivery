import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Users as UsersIcon, UserPlus, Edit, Trash2, Shield, Search, Mail, UserCircle } from "lucide-react";
import { z } from "zod";

// Validation schema
const userSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  fullName: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
  role: z.enum(["company_admin", "company_staff"], { 
    errorMap: () => ({ message: "Role inválido" }) 
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: "",
    fullName: "",
    role: "company_staff",
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  // Get current user's company_id
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data, error } = await supabase
        .from("profiles")
        .select("company_id, id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch company users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["company-users", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      // Get all user_roles for this company
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("company_id", profile.company_id);

      if (rolesError) throw rolesError;

      if (!userRoles || userRoles.length === 0) return [];

      // Get profile information for these users
      const userIds = userRoles.map(ur => ur.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Get auth users for email
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching auth users:", authError);
        // Continue without email data if admin access is not available
      }

      // Combine data
      const combinedUsers: User[] = userRoles.map(ur => {
        const profile = profiles?.find((p: any) => p.id === ur.user_id);
        const authUser = authUsers?.find((u: any) => u.id === ur.user_id);
        
        return {
          id: ur.user_id,
          email: authUser?.email || "Email não disponível",
          full_name: profile?.full_name || null,
          role: ur.role as "company_admin" | "company_staff",
          created_at: authUser?.created_at || new Date().toISOString(),
        };
      });

      return combinedUsers;
    },
    enabled: !!profile?.company_id,
  });

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Create/Update user mutation
  const saveMutation = useMutation({
    mutationFn: async (data: UserFormData & { userId?: string }) => {
      if (!profile?.company_id) throw new Error("Company ID not found");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      if (data.userId) {
        // Update existing user via edge function
        const response = await supabase.functions.invoke('user-management', {
          body: {
            userId: data.userId,
            fullName: data.fullName,
            role: data.role,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });

        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
      } else {
        // Create new user via edge function
        const response = await supabase.functions.invoke('user-management', {
          body: {
            email: data.email,
            fullName: data.fullName,
            role: data.role,
            companyId: profile.company_id,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });

        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast({
        title: "Sucesso",
        description: selectedUser 
          ? "Usuário atualizado com sucesso" 
          : "Usuário criado com sucesso! Um email de confirmação foi enviado para o novo usuário.",
      });
      handleCloseModal();
    },
    onError: (error: any) => {
      console.error("Error saving user:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar usuário",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (userId === profile?.id) {
        throw new Error("Você não pode excluir sua própria conta");
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão não encontrada");

      // Delete user via edge function
      const response = await supabase.functions.invoke('user-management', {
        body: {
          userId,
          currentUserId: profile?.id,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-users"] });
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso",
      });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário",
        variant: "destructive",
      });
    },
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        email: user.email,
        fullName: user.full_name || "",
        role: user.role,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        email: "",
        fullName: "",
        role: "company_staff",
      });
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setFormData({
      email: "",
      fullName: "",
      role: "company_staff",
    });
    setFormErrors({});
  };

  const handleSave = () => {
    // Validate form
    const result = userSchema.safeParse(formData);
    
    if (!result.success) {
      const errors: Partial<Record<keyof UserFormData, string>> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as keyof UserFormData] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    saveMutation.mutate({
      ...formData,
      userId: selectedUser?.id,
    });
  };

  const handleDeleteClick = (user: User) => {
    if (user.id === profile?.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode excluir sua própria conta",
        variant: "destructive",
      });
      return;
    }
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "company_admin") {
      return <Badge variant="default" className="gap-1"><Shield className="w-3 h-3" /> Admin</Badge>;
    }
    return <Badge variant="secondary">Usuário</Badge>;
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <UsersIcon className="w-6 h-6" />
                  Gerenciamento de Usuários
                </h1>
                <p className="text-xs text-muted-foreground">
                  Gerencie os usuários e permissões da sua empresa
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Usuários da Empresa</CardTitle>
                <CardDescription>
                  {users.length} usuário(s) cadastrado(s)
                </CardDescription>
              </div>
              <Button onClick={() => handleOpenModal()} className="gap-2">
                <UserPlus className="w-4 h-4" />
                Adicionar Usuário
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Users Table */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando usuários...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">
                              {user.full_name || "Sem nome"}
                            </span>
                            {user.id === profile?.id && (
                              <Badge variant="outline" className="text-xs">Você</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(user)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(user)}
                              disabled={user.id === profile?.id}
                              title={user.id === profile?.id ? "Não pode excluir a si mesmo" : "Excluir"}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit User Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser 
                ? "Atualize as informações do usuário." 
                : "Preencha os dados para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!selectedUser}
              />
              {formErrors.email && (
                <p className="text-sm text-destructive">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo *</Label>
              <Input
                id="fullName"
                placeholder="João Silva"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
              {formErrors.fullName && (
                <p className="text-sm text-destructive">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Permissão *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "company_admin" | "company_staff") => 
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma permissão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company_admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">
                          Acesso total ao sistema
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="company_staff">
                    <div className="flex items-center gap-2">
                      <UserCircle className="w-4 h-4" />
                      <div>
                        <div className="font-medium">Usuário</div>
                        <div className="text-xs text-muted-foreground">
                          Acesso limitado ao sistema
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {formErrors.role && (
                <p className="text-sm text-destructive">{formErrors.role}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : selectedUser ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário <strong>{selectedUser?.full_name}</strong> será
              removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
