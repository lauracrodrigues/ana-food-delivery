import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Store, 
  Users, 
  TrendingUp, 
  Package, 
  Settings,
  LogOut,
  Eye,
  Ban,
  CheckCircle,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  Activity,
  CreditCard,
  Link2,
  History,
  UserPlus,
  RefreshCw,
  Download,
  CheckSquare,
  Square,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Clock,
  DollarSign,
  ShoppingBag,
  Wifi,
  WifiOff,
  Shield,
  Key,
  FileText,
  MessageSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Tenant {
  id: string;
  name: string;
  fantasy_name?: string;
  subdomain: string;
  cnpj: string;
  email?: string;
  phone?: string;
  address?: any;
  logo_url?: string;
  plan_id?: string;
  subscription_status?: string;
  is_active: boolean;
  trial_ends_at?: string;
  created_at: string;
  updated_at?: string;
  owner_id?: string;
  segment?: string;
}

interface UserFormData {
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
  state?: string;
  city?: string;
  password?: string;
  passwordConfirm?: string;
}

const userFormSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").optional().or(z.literal("")),
  passwordConfirm: z.string().optional(),
}).refine((data) => {
  if (data.password && data.password !== data.passwordConfirm) {
    return false;
  }
  return true;
}, {
  message: "As senhas não coincidem",
  path: ["passwordConfirm"],
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      documentType: "cpf",
      documentNumber: "",
      state: "",
      city: "",
      password: "",
      passwordConfirm: "",
    },
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao carregar lojas",
        description: "Não foi possível carregar a lista de lojas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matchesSearch = 
          t.name.toLowerCase().includes(q) || 
          (t.fantasy_name || "").toLowerCase().includes(q) ||
          (t.cnpj || "").includes(q) || 
          (t.subdomain || "").toLowerCase().includes(q) ||
          (t.email || "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }
      
      if (statusFilter !== "all") {
        if (statusFilter === "active" && !t.is_active) return false;
        if (statusFilter === "inactive" && t.is_active) return false;
        if (statusFilter === "trial" && t.subscription_status !== "trial") return false;
      }
      
      return true;
    });
  }, [tenants, search, statusFilter]);

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => t.is_active).length,
    trialTenants: tenants.filter(t => t.subscription_status === 'trial').length,
    suspendedTenants: tenants.filter(t => !t.is_active).length,
  };

  function toggleSelect(id: string) {
    setBulkSelected(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSelectAll() {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    const newBulkSelected: Record<string, boolean> = {};
    if (newSelectAll) {
      filteredTenants.forEach(t => {
        newBulkSelected[t.id] = true;
      });
    }
    setBulkSelected(newBulkSelected);
  }

  function openDetails(tenant: Tenant) {
    setSelectedTenant(tenant);
    setShowDetailsPanel(true);
  }

  async function handleImpersonate(tenant: Tenant) {
    toast({
      title: "Acessando como lojista",
      description: `Entrando na loja ${tenant.fantasy_name || tenant.name}...`,
    });
    
    // Store admin session for later restoration
    localStorage.setItem('admin_return', 'true');
    
    // Navigate to tenant dashboard
    navigate("/dashboard");
  }

  async function toggleTenantStatus(tenant: Tenant) {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: !tenant.is_active })
        .eq('id', tenant.id);

      if (error) throw error;

      const action = tenant.is_active ? 'desativada' : 'ativada';
      toast({
        title: `Loja ${action}`,
        description: `${tenant.fantasy_name || tenant.name} foi ${action} com sucesso.`,
      });
      
      fetchTenants();
    } catch (err) {
      toast({
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status da loja.",
        variant: "destructive",
      });
    }
  }

  async function handleBulkAction(action: 'activate' | 'suspend' | 'export') {
    const selectedIds = Object.keys(bulkSelected).filter(id => bulkSelected[id]);
    
    if (selectedIds.length === 0) {
      toast({
        title: "Nenhuma loja selecionada",
        description: "Selecione pelo menos uma loja para executar a ação.",
        variant: "destructive",
      });
      return;
    }

    if (action === 'export') {
      const selectedTenants = tenants.filter(t => bulkSelected[t.id]);
      const csv = [
        ['Nome', 'CNPJ', 'Subdomínio', 'Email', 'Telefone', 'Status', 'Plano', 'Criado em'],
        ...selectedTenants.map(t => [
          t.name,
          t.cnpj,
          t.subdomain,
          t.email || '',
          t.phone || '',
          t.is_active ? 'Ativo' : 'Inativo',
          t.subscription_status || '',
          new Date(t.created_at).toLocaleDateString('pt-BR')
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lojas_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      toast({
        title: "Exportação concluída",
        description: `${selectedIds.length} lojas exportadas com sucesso.`,
      });
    } else {
      try {
        const { error } = await supabase
          .from('companies')
          .update({ is_active: action === 'activate' })
          .in('id', selectedIds);

        if (error) throw error;

        toast({
          title: `Lojas ${action === 'activate' ? 'ativadas' : 'suspensas'}`,
          description: `${selectedIds.length} lojas foram ${action === 'activate' ? 'ativadas' : 'suspensas'} com sucesso.`,
        });
        
        fetchTenants();
        setBulkSelected({});
        setSelectAll(false);
      } catch (err) {
        toast({
          title: "Erro na ação em lote",
          description: "Não foi possível executar a ação nas lojas selecionadas.",
          variant: "destructive",
        });
      }
    }
  }

  async function onSubmitUser(data: UserFormData) {
    try {
      // Here you would create/update the user
      console.log('User data:', data);
      
      toast({
        title: "Usuário salvo",
        description: "Os dados do usuário foram salvos com sucesso.",
      });
      
      setShowUserModal(false);
      form.reset();
    } catch (err) {
      toast({
        title: "Erro ao salvar usuário",
        description: "Não foi possível salvar os dados do usuário.",
        variant: "destructive",
      });
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_return');
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/login");
  };

  const getStatusBadge = (tenant: Tenant) => {
    if (!tenant.is_active) {
      return <Badge variant="destructive">Suspensa</Badge>;
    }
    if (tenant.subscription_status === 'trial') {
      return <Badge className="bg-warning/20 text-warning border-warning/30">Trial</Badge>;
    }
    return <Badge className="bg-success/20 text-success border-success/30">Ativa</Badge>;
  };

  const getTrialDaysLeft = (trialEndsAt?: string) => {
    if (!trialEndsAt) return null;
    const daysLeft = Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AnaFood Master</h1>
                <p className="text-xs text-muted-foreground">Painel Administrativo Central</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Store className="w-4 h-4" />
                Total de Lojas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastradas na plataforma
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Lojas Ativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.activeTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalTenants > 0 ? Math.round((stats.activeTenants / stats.totalTenants) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-warning" />
                Em Trial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.trialTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Período de teste
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-destructive" />
                Suspensas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.suspendedTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Necessitam atenção
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome, CNPJ, subdomínio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Suspensas</SelectItem>
                <SelectItem value="trial">Em Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            {Object.values(bulkSelected).some(v => v) && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('activate')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Ativar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('suspend')}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Suspender
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </>
            )}
            <Button onClick={() => setShowEditModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Loja
            </Button>
          </div>
        </div>

        {/* Tenants Table */}
        <Card className="bg-gradient-card border-0 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gerenciar Lojas</CardTitle>
                <CardDescription>
                  {filteredTenants.length} de {tenants.length} lojas listadas
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTenants}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1 hover:bg-muted rounded"
                      >
                        {selectAll ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Loja</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Subdomínio</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">CNPJ</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plano</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Criado em</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Carregando lojas...
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-muted-foreground">
                        Nenhuma loja encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr 
                        key={tenant.id} 
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => openDetails(tenant)}
                      >
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleSelect(tenant.id)}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {bulkSelected[tenant.id] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {tenant.logo_url ? (
                              <img 
                                src={tenant.logo_url} 
                                alt={tenant.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{tenant.fantasy_name || tenant.name}</p>
                              <p className="text-xs text-muted-foreground">{tenant.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <a 
                            href={`https://${tenant.subdomain}.anafood.vip`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tenant.subdomain}.anafood.vip
                          </a>
                        </td>
                        <td className="py-4 px-4 text-sm font-mono">{tenant.cnpj}</td>
                        <td className="py-4 px-4">
                          {getStatusBadge(tenant)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm">
                            {tenant.subscription_status || 'Free'}
                            {tenant.subscription_status === 'trial' && tenant.trial_ends_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {getTrialDaysLeft(tenant.trial_ends_at)} dias restantes
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleImpersonate(tenant)}
                              className="h-8 px-2"
                              title="Acessar como lojista"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleTenantStatus(tenant)}
                              className="h-8 px-2"
                              title={tenant.is_active ? 'Suspender' : 'Ativar'}
                            >
                              {tenant.is_active ? (
                                <Ban className="w-4 h-4 text-destructive" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-success" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              title="Configurações"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Details Panel */}
      <Sheet open={showDetailsPanel} onOpenChange={setShowDetailsPanel}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedTenant && (
            <>
              <SheetHeader>
                <SheetTitle>Detalhes da Loja</SheetTitle>
                <SheetDescription>
                  Informações completas e ações disponíveis
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="users">Usuários</TabsTrigger>
                  <TabsTrigger value="integrations">Integrações</TabsTrigger>
                  <TabsTrigger value="financial">Financeiro</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="flex items-start gap-4">
                    {selectedTenant.logo_url ? (
                      <img 
                        src={selectedTenant.logo_url} 
                        alt={selectedTenant.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{selectedTenant.fantasy_name || selectedTenant.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedTenant.name}</p>
                      <div className="mt-2">{getStatusBadge(selectedTenant)}</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">CNPJ:</span>
                      <span className="text-sm font-mono">{selectedTenant.cnpj}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Subdomínio:</span>
                      <a 
                        href={`https://${selectedTenant.subdomain}.anafood.vip`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {selectedTenant.subdomain}.anafood.vip
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Email:</span>
                      <span className="text-sm">{selectedTenant.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Telefone:</span>
                      <span className="text-sm">{selectedTenant.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Criado em:</span>
                      <span className="text-sm">
                        {new Date(selectedTenant.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {selectedTenant.trial_ends_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Trial expira em:</span>
                        <span className="text-sm">
                          {new Date(selectedTenant.trial_ends_at).toLocaleDateString('pt-BR')} ({getTrialDaysLeft(selectedTenant.trial_ends_at)} dias)
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Ações Rápidas</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImpersonate(selectedTenant)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Impersonate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Abrir Portal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTenantStatus(selectedTenant)}
                      >
                        {selectedTenant.is_active ? (
                          <>
                            <Ban className="w-4 h-4 mr-2" />
                            Suspender
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Forçar Sync
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Reset Senha
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Usuários da Loja</h4>
                    <Button 
                      size="sm"
                      onClick={() => setShowUserModal(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Funcionalidade em desenvolvimento
                  </div>
                </TabsContent>

                <TabsContent value="integrations" className="space-y-4">
                  <h4 className="text-sm font-medium">Status das Integrações</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="w-5 h-5 text-success" />
                        <div>
                          <p className="text-sm font-medium">WhatsApp</p>
                          <p className="text-xs text-muted-foreground">Evolution API</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-success" />
                        <span className="text-xs text-success">Conectado</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">QZ Tray</p>
                          <p className="text-xs text-muted-foreground">Impressão</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <WifiOff className="w-4 h-4 text-destructive" />
                        <span className="text-xs text-destructive">Desconectado</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-success" />
                        <div>
                          <p className="text-sm font-medium">Mercado Pago</p>
                          <p className="text-xs text-muted-foreground">Pagamentos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-success" />
                        <span className="text-xs text-success">Conectado</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <h4 className="text-sm font-medium">Informações Financeiras</h4>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Plano Atual:</span>
                      <span className="text-sm font-medium">{selectedTenant.subscription_status || 'Free'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Último Pagamento:</span>
                      <span className="text-sm">-</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Fatura Pendente:</span>
                      <span className="text-sm">Não</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                  <h4 className="text-sm font-medium">Últimas Atividades</h4>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">Login realizado</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date().toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            IP: 192.168.1.1 | User: admin@loja.com
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* User Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Usuário</DialogTitle>
            <DialogDescription>
              Adicione um novo usuário responsável pela loja
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitUser)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="João da Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="joao@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Documento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cpf">CPF</SelectItem>
                          <SelectItem value="cnpj">CNPJ</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="São Paulo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormDescription>Mínimo 8 caracteres</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passwordConfirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowUserModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Usuário
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}