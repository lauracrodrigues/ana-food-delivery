// Hook que encapsula todos os cálculos de métricas do dashboard.
// Recebe pedidos filtrados + parâmetros de período e retorna dados prontos para renderização.
import { useMemo } from "react";

interface Order {
  status: string;
  total?: number | string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  payment_method?: string;
  items?: Array<{ name?: string; quantity?: number; price?: number }> | null;
}

interface UseDashboardMetricsParams {
  filteredOrders: Order[] | undefined;
  showTodayOnly: boolean;
  startDate?: Date;
  endDate?: Date;
}

export function useDashboardMetrics({
  filteredOrders,
  showTodayOnly,
  startDate,
  endDate,
}: UseDashboardMetricsParams) {
  const metrics = useMemo(() => {
    if (!filteredOrders) return { totalOrders: 0, totalRevenue: 0, averageTicket: 0, pendingOrders: 0 };
    const totalOrders = filteredOrders.length;
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const pendingOrders = filteredOrders.filter(o => ['pending', 'preparing'].includes(o.status)).length;
    return { totalOrders, totalRevenue, averageTicket: totalOrders > 0 ? totalRevenue / totalOrders : 0, pendingOrders };
  }, [filteredOrders]);

  const revenueData = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }), revenue: 0 };
      });
    }
    const byDay: Record<string, number> = {};
    for (const order of filteredOrders) {
      if (order.status === 'cancelled') continue;
      const key = new Date(order.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
      byDay[key] = (byDay[key] || 0) + Number(order.total || 0);
    }
    if (showTodayOnly) {
      const key = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
      return [{ date: key, revenue: byDay[key] || 0 }];
    }
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    const diff = Math.min(Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1, 90);
    return Array.from({ length: diff }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
      return { date: key, revenue: byDay[key] || 0 };
    });
  }, [filteredOrders, showTodayOnly, startDate, endDate]);

  const paymentMethodsData = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];
    const colors: Record<string, string> = {
      dinheiro: 'hsl(var(--success))',
      pix: 'hsl(var(--warning))',
      credito: 'hsl(var(--primary))',
      debito: 'hsl(142, 76%, 36%)',
    };
    const counts: Record<string, number> = {};
    for (const order of filteredOrders) {
      const method = (order.payment_method || 'outro').toLowerCase();
      counts[method] = (counts[method] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: colors[name] || 'hsl(var(--muted-foreground))',
      }));
  }, [filteredOrders]);

  const topProducts = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];
    const map: Record<string, { quantity: number; revenue: number }> = {};
    for (const order of filteredOrders) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items || []) {
        const name = item.name || 'Sem nome';
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        if (!map[name]) map[name] = { quantity: 0, revenue: 0 };
        map[name].quantity += qty;
        map[name].revenue += price * qty;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
  }, [filteredOrders]);

  const topCustomers = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) return [];
    const map: Record<string, { orders: number; totalSpent: number }> = {};
    for (const order of filteredOrders) {
      const name = order.customer_name || order.customer_phone || 'Anônimo';
      if (!map[name]) map[name] = { orders: 0, totalSpent: 0 };
      map[name].orders += 1;
      map[name].totalSpent += Number(order.total || 0);
    }
    return Object.entries(map)
      .sort((a, b) => b[1].orders - a[1].orders)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
  }, [filteredOrders]);

  return { metrics, revenueData, paymentMethodsData, topProducts, topCustomers };
}
