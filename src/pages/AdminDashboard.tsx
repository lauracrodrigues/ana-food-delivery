import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Store, 
  Users, 
  TrendingUp, 
  Package, 
  Settings,
  LogOut,
  Eye,
  Ban,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Tenant {
  id: string;
  name: string;
  fantasyName: string;
  subdomain: string;
  cnpj: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
  totalOrders: number;
  revenue: number;
}

const mockTenants: Tenant[] = [
  {
    id: "1",
    name: "Pizza Express LTDA",
    fantasyName: "Pizza Express",
    subdomain: "pizzaexpress",
    cnpj: "12.345.678/0001-90",
    email: "contato@pizzaexpress.com",
    status: "active",
    createdAt: "2024-01-15",
    totalOrders: 1234,
    revenue: 45670.50
  },
  {
    id: "2",
    name: "Burger King Fast Food",
    fantasyName: "Burger Master",
    subdomain: "burgermaster",
    cnpj: "98.765.432/0001-10",
    email: "admin@burgermaster.com",
    status: "active",
    createdAt: "2024-02-20",
    totalOrders: 890,
    revenue: 32100.00
  },
  {
    id: "3",
    name: "Açaí Natural LTDA",
    fantasyName: "Açaí do Brasil",
    subdomain: "acaidobrasil",
    cnpj: "45.678.901/0001-23",
    email: "contato@acaidobrasil.com",
    status: "inactive",
    createdAt: "2024-03-10",
    totalOrders: 456,
    revenue: 12340.75
  }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenants] = useState<Tenant[]>(mockTenants);

  const stats = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter(t => t.status === 'active').length,
    totalRevenue: tenants.reduce((sum, t) => sum + t.revenue, 0),
    totalOrders: tenants.reduce((sum, t) => sum + t.totalOrders, 0),
  };

  const handleLogout = () => {
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/login");
  };

  const handleImpersonate = (tenant: Tenant) => {
    toast({
      title: "Acessando como lojista",
      description: `Entrando na loja ${tenant.fantasyName}...`,
    });
    // In real app, would generate magic link here
    navigate("/dashboard");
  };

  const toggleTenantStatus = (tenant: Tenant) => {
    const action = tenant.status === 'active' ? 'desativada' : 'ativada';
    toast({
      title: `Loja ${action}`,
      description: `${tenant.fantasyName} foi ${action} com sucesso.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AnaFood Master</h1>
                <p className="text-xs text-muted-foreground">Painel Administrativo</p>
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
                {stats.activeTenants} ativas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Lojas Ativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.activeTenants}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((stats.activeTenants / stats.totalTenants) * 100)}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Receita Total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Todas as lojas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total de Pedidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalOrders.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Em todas as lojas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tenants Table */}
        <Card className="bg-gradient-card border-0 shadow-xl">
          <CardHeader>
            <CardTitle>Gerenciar Lojas</CardTitle>
            <CardDescription>
              Visualize e gerencie todas as lojas cadastradas na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Loja</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Subdomínio</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">CNPJ</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pedidos</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Receita</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium">{tenant.fantasyName}</p>
                          <p className="text-xs text-muted-foreground">{tenant.email}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <a 
                          href={`https://${tenant.subdomain}.anafood.vip`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          {tenant.subdomain}.anafood.vip
                        </a>
                      </td>
                      <td className="py-4 px-4 text-sm">{tenant.cnpj}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          tenant.status === 'active' 
                            ? 'bg-success/20 text-success' 
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {tenant.status === 'active' ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              Ativa
                            </>
                          ) : (
                            <>
                              <Ban className="w-3 h-3" />
                              Inativa
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm">{tenant.totalOrders.toLocaleString('pt-BR')}</td>
                      <td className="py-4 px-4 text-sm">
                        R$ {tenant.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleImpersonate(tenant)}
                            className="h-8 px-2"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleTenantStatus(tenant)}
                            className="h-8 px-2"
                          >
                            {tenant.status === 'active' ? (
                              <Ban className="w-4 h-4 text-destructive" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-success" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}