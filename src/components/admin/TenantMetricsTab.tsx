// v1.0.0 — KPIs do tenant: faturamento, ticket médio, por tipo, cancelamentos
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShoppingBag, TrendingUp, XCircle, Banknote } from "lucide-react";

function fmtBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

interface Props { companyId: string; }

interface MetricsData {
  total: number;
  cancelled: number;
  faturamento: number;
  ticketMedio: number;
  porTipo: Record<string, { count: number; total: number }>;
  ultimos7dias: number;
}

export function TenantMetricsTab({ companyId }: Props) {
  const { data, isLoading } = useQuery<MetricsData>({
    queryKey: ["tenant-metrics", companyId],
    queryFn: async () => {
      const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: orders } = await supabase
        .from("orders")
        .select("status, total, type, created_at")
        .eq("company_id", companyId)
        .gte("created_at", sinceDate);

      const list = (orders || []) as any[];
      const validForRevenue = list.filter(o => !["cancelled", "cancelado", "archived"].includes(o.status));
      const cancelled = list.filter(o => ["cancelled", "cancelado"].includes(o.status)).length;
      const faturamento = validForRevenue.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const total = list.length;
      const ticketMedio = validForRevenue.length > 0 ? faturamento / validForRevenue.length : 0;

      const porTipo: Record<string, { count: number; total: number }> = {};
      for (const o of validForRevenue) {
        const tipo = o.type || "outro";
        if (!porTipo[tipo]) porTipo[tipo] = { count: 0, total: 0 };
        porTipo[tipo].count++;
        porTipo[tipo].total += Number(o.total) || 0;
      }

      const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const ultimos7dias = list.filter(o => o.created_at >= since7).length;

      return { total, cancelled, faturamento, ticketMedio, porTipo, ultimos7dias };
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (!data) return <p className="text-sm text-muted-foreground">Sem dados.</p>;

  const tipoLabels: Record<string, string> = {
    delivery: "Entrega 🛵",
    pickup: "Retirada 🏃",
    table: "Mesa 🪑",
    counter: "Balcão 💰",
    outro: "Outros",
  };
  const cancelPct = data.total > 0 ? ((data.cancelled / data.total) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Últimos 30 dias</p>

      {/* KPIs cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Faturamento</p>
                <p className="text-xl font-bold text-emerald-600">{fmtBRL(data.faturamento)}</p>
              </div>
              <Banknote className="h-8 w-8 text-emerald-500 opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold text-primary">{fmtBRL(data.ticketMedio)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Pedidos</p>
                <p className="text-xl font-bold">{data.total}</p>
                <p className="text-[10px] text-muted-foreground">Últimos 7d: {data.ultimos7dias}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-muted-foreground opacity-30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Cancelamentos</p>
                <p className="text-xl font-bold text-red-600">{data.cancelled}</p>
                <p className="text-[10px] text-muted-foreground">{cancelPct}% do total</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Por tipo */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold">Por tipo de pedido</p>
          {Object.keys(data.porTipo).length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem pedidos no período.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.porTipo).map(([tipo, info]) => (
                <div key={tipo} className="flex items-center justify-between text-sm">
                  <span>{tipoLabels[tipo] || tipo}</span>
                  <span className="font-medium">
                    {info.count} pedidos · <span className="text-emerald-600">{fmtBRL(info.total)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
