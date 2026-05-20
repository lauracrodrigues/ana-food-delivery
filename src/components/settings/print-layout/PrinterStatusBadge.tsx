// v2.0.0 — Status agentes Ana Food Print (substitui QZ Tray)
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Printer, CheckCircle2, XCircle, Download, RefreshCw } from "lucide-react";

interface Device {
  id: string;
  device_name: string | null;
  hostname: string | null;
  status: "online" | "offline" | "error";
  last_seen_at: string | null;
}

export function PrinterStatusBadge() {
  const { data: devices = [], refetch, isFetching } = useQuery<Device[]>({
    queryKey: ["printer-devices-badge"],
    queryFn: async () => {
      const { data } = await supabase
        .from("printer_devices")
        .select("id, device_name, hostname, status, last_seen_at")
        .eq("enabled", true)
        .order("paired_at", { ascending: false });
      return (data || []) as Device[];
    },
    refetchInterval: 15_000,
  });

  const onlineCount = devices.filter(d => d.status === "online").length;
  const total = devices.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          {total === 0 ? (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
          ) : onlineCount > 0 ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className="text-xs hidden sm:inline">
            {total === 0 ? "Sem agente"
              : onlineCount > 0 ? `${onlineCount}/${total} online`
              : `${total} offline`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <h4 className="font-semibold text-sm">Ana Food Print</h4>
          </div>

          {total === 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                Nenhum computador conectado. Baixe e instale o agente Ana Food Print no computador da loja.
              </p>
              <Button asChild variant="default" size="sm" className="w-full gap-2">
                <a href="/agente/download" target="_blank" rel="noopener">
                  <Download className="h-3.5 w-3.5" /> Baixar agente
                </a>
              </Button>
            </>
          ) : (
            <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
              {devices.map(d => (
                <div key={d.id} className="flex items-center justify-between gap-2 py-1">
                  <span className="truncate">{d.device_name || d.hostname || "—"}</span>
                  <Badge variant={d.status === "online" ? "secondary" : "outline"} className="text-[10px]">
                    {d.status === "online" ? "🟢 online" : "⚪ offline"}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => refetch()} disabled={isFetching} variant="outline" size="sm" className="w-full gap-2">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
