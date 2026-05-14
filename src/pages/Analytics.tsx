// v1.0.0 — Dashboard analytics: produtos mais vistos / adicionados / pedidos
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, ShoppingCart, Package, TrendingUp, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductStat {
  product_id: string;
  product_name: string;
  count: number;
}

interface EventRow {
  product_id: string;
  event_type: string;
  created_at: string;
}

interface ProductRow {
  id: string;
  name: string;
}

export default function Analytics() {
  // Pega company_id do usuário logado via profile
  const { data: companyId } = useQuery({
    queryKey: ["my-company-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      return data?.company_id ?? null;
    },
  });

  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("7");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);

  useEffect(() => {
    if (!companyId) return;
    loadData();
  }, [companyId, days]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const [eventsRes, productsRes] = await Promise.all([
      supabase
        .from("product_events" as any)
        .select("product_id, event_type, created_at")
        .eq("company_id", companyId)
        .gte("created_at", since.toISOString()),
      supabase
        .from("products")
        .select("id, name")
        .eq("company_id", companyId),
    ]);

    setEvents((eventsRes.data as any) || []);
    setProducts(productsRes.data || []);
    setLoading(false);
  };

  // Agrupa eventos por produto + tipo
  const stats = useMemo(() => {
    const productMap = new Map(products.map(p => [p.id, p.name]));
    const grouped: Record<string, Map<string, number>> = {
      view: new Map(),
      add_to_cart: new Map(),
      order: new Map(),
    };

    events.forEach(e => {
      if (!grouped[e.event_type]) return;
      grouped[e.event_type].set(e.product_id, (grouped[e.event_type].get(e.product_id) || 0) + 1);
    });

    const toList = (map: Map<string, number>): ProductStat[] =>
      Array.from(map.entries())
        .map(([product_id, count]) => ({
          product_id,
          product_name: productMap.get(product_id) || "Produto removido",
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

    return {
      views: toList(grouped.view),
      addToCarts: toList(grouped.add_to_cart),
      orders: toList(grouped.order),
      totalViews: events.filter(e => e.event_type === "view").length,
      totalAddToCarts: events.filter(e => e.event_type === "add_to_cart").length,
      totalOrders: events.filter(e => e.event_type === "order").length,
    };
  }, [events, products]);

  // Taxa de conversão: add_to_cart / view
  const conversionRate = stats.totalViews > 0
    ? ((stats.totalAddToCarts / stats.totalViews) * 100).toFixed(1)
    : "0";

  const StatTable = ({ data, icon: Icon, label }: { data: ProductStat[]; icon: any; label: string }) => (
    <div className="space-y-2">
      {data.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Icon className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sem dados no período</p>
        </div>
      ) : (
        data.map((stat, idx) => (
          <div key={stat.product_id} className="flex items-center gap-3 py-2 px-3 border rounded-lg hover:bg-muted/30">
            <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}º</span>
            <span className="flex-1 text-sm font-medium truncate">{stat.product_name}</span>
            <span className="text-sm font-bold text-primary">{stat.count}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">Comportamento dos clientes no cardápio</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Hoje</SelectItem>
            <SelectItem value="7">7 dias</SelectItem>
            <SelectItem value="30">30 dias</SelectItem>
            <SelectItem value="90">90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
              <span className="text-xs">Visualizações</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalViews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-xs">Adições ao carrinho</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalAddToCarts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs">Pedidos</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Conversão view→cart</span>
            </div>
            <p className="text-2xl font-bold">{conversionRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Rankings por tipo de evento */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cart">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="cart" className="gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" />
                Carrinho
              </TabsTrigger>
              <TabsTrigger value="views" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Mais vistos
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5">
                <Package className="h-3.5 w-3.5" />
                Pedidos
              </TabsTrigger>
            </TabsList>
            <TabsContent value="cart"><StatTable data={stats.addToCarts} icon={ShoppingCart} label="adições" /></TabsContent>
            <TabsContent value="views"><StatTable data={stats.views} icon={Eye} label="views" /></TabsContent>
            <TabsContent value="orders"><StatTable data={stats.orders} icon={Package} label="pedidos" /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
