// Encapsula lógica de tempo/alerta de pedidos.
// Separado do componente para ser testável e reutilizável.
import { useMemo } from "react";
import { getStatusMaxTime } from "@/utils/orderStatusRules";

interface Order {
  created_at: string;
  status: string;
}

export function useOrderTimeAlert(order: Order, alertTime?: number) {
  return useMemo(() => {
    const elapsedMinutes = Math.floor(
      (Date.now() - new Date(order.created_at).getTime()) / 60000
    );
    const maxTime = getStatusMaxTime(order.status, alertTime);
    const pct = (elapsedMinutes / maxTime) * 100;
    return {
      elapsedMinutes,
      maxTime,
      pct,
      isOverdue: pct >= 100,
      isWarning: pct >= 75 && pct < 100,
    };
  }, [order.created_at, order.status, alertTime]);
}
