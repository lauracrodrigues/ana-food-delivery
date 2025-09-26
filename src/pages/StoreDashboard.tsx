import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag,
  DollarSign,
  Users,
  TrendingUp,
  Package,
  Settings,
  LogOut,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function StoreDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const stats = {
    todayOrders: 23,
    todayRevenue: 1234.50,
    totalCustomers: 456,
    monthGrowth: 12.5,
    activeProducts: 42,
    pendingOrders: 5
  };

  const recentOrders = [
    { id: "#001", customer: "João Silva", items: 3, total: 45.90, status: "pending" },
    { id: "#002", customer: "Maria Santos", items: 2, total: 32.50, status: "preparing" },
    { id: "#003", customer: "Pedro Costa", items: 1, total: 18.90, status: "delivered" },
    { id: "#004", customer: "Ana Lima", items: 4, total: 67.40, status: "pending" },
  ];

  const handleLogout = () => {
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Pizza Express</h1>
                <p className="text-xs text-muted-foreground">pizzaexpress.anafood.vip</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Pedidos Hoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayOrders}</div>
              <p className="text-xs text-success mt-1">
                +15% em relação a ontem
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Faturamento Hoje
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                R$ {stats.todayRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-success mt-1">
                +8% em relação a ontem
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total de Clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCustomers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                +23 novos este mês
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Produtos Ativos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeProducts}</div>
              <p className="text-xs text-warning mt-1">
                {stats.pendingOrders} pedidos pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="bg-gradient-card border-0 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>
                Gerencie os pedidos mais recentes da sua loja
              </CardDescription>
            </div>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Novo Pedido
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pedido</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Itens</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-4 px-4 font-medium">{order.id}</td>
                      <td className="py-4 px-4">{order.customer}</td>
                      <td className="py-4 px-4">{order.items}</td>
                      <td className="py-4 px-4">
                        R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'pending' 
                            ? 'bg-warning/20 text-warning' 
                            : order.status === 'preparing'
                            ? 'bg-info/20 text-info'
                            : 'bg-success/20 text-success'
                        }`}>
                          {order.status === 'pending' ? 'Pendente' : 
                           order.status === 'preparing' ? 'Preparando' : 'Entregue'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Button size="sm" variant="outline">
                          Ver Detalhes
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Gerenciar Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Adicione, edite ou remova produtos do seu catálogo
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Relatórios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualize métricas e análises detalhadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-warning" />
                Configurações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure horários, taxas de entrega e mais
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}