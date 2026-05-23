// v1.0.0 — Banner amarelo no topo do cardápio quando loja fechada
// mas aceita agendamentos automáticos
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isOpenNow, nextOpeningTime, formatOpeningLabel, formatScheduleSummary } from "@/lib/delivery-window";

interface Props {
  companyId: string;
  schedule: any;
}

export function SchedulingBanner({ companyId, schedule }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("delivery_window_enabled")
        .eq("company_id", companyId)
        .maybeSingle();
      setEnabled(!!(data as any)?.delivery_window_enabled);
    })();
  }, [companyId]);

  if (!enabled) return null;
  if (isOpenNow(schedule)) return null;

  const next = nextOpeningTime(schedule);
  if (!next) return null;
  const label = formatOpeningLabel(next);
  const summary = formatScheduleSummary(schedule);

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 px-4 py-3 mx-4 mt-3 rounded-r-lg flex items-start gap-3">
      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold text-amber-900 dark:text-amber-100">
          Estamos fechados agora — pedidos serão agendados
        </p>
        <p className="text-amber-800 dark:text-amber-200 mt-0.5">
          Você pode fazer seu pedido normalmente.{" "}
          {summary && <>Entregamos <strong>{summary}</strong>. </>}
          Começaremos seu pedido <strong>{label}</strong>.
        </p>
      </div>
    </div>
  );
}
