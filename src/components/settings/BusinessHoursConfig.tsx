// src/components/settings/BusinessHoursConfig.tsx — v2.0.0
// Suporta múltiplos períodos por dia (ex: 11:00-14:00 e 18:00-22:00)
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── TIPOS ───────────────────────────────────────────────────────

interface TimeSlot {
  open: string;
  close: string;
}

interface DaySchedule {
  enabled: boolean;
  periods: TimeSlot[];
}

type WeekSchedule = Record<string, DaySchedule>;

const DAYS = [
  { key: "monday",    label: "Segunda-feira" },
  { key: "tuesday",   label: "Terça-feira" },
  { key: "wednesday", label: "Quarta-feira" },
  { key: "thursday",  label: "Quinta-feira" },
  { key: "friday",    label: "Sexta-feira" },
  { key: "saturday",  label: "Sábado" },
  { key: "sunday",    label: "Domingo" },
];

const DEFAULT_SCHEDULE: WeekSchedule = Object.fromEntries(
  DAYS.map(({ key }) => [key, { enabled: true, periods: [{ open: "08:00", close: "22:00" }] }])
);

// Migra formato antigo { open, close } → novo { periods: [...] }
function normalize(raw: any): WeekSchedule {
  const result: WeekSchedule = {};
  for (const { key } of DAYS) {
    const day = raw?.[key];
    if (!day) {
      result[key] = DEFAULT_SCHEDULE[key];
    } else if (Array.isArray(day.periods)) {
      result[key] = day; // já no novo formato
    } else {
      // formato antigo: { enabled, open, close }
      result[key] = {
        enabled: day.enabled ?? true,
        periods: [{ open: day.open ?? "08:00", close: day.close ?? "22:00" }],
      };
    }
  }
  return result;
}

// ─── COMPONENTE ──────────────────────────────────────────────────

interface BusinessHoursConfigProps {
  companyId: string;
}

export function BusinessHoursConfig({ companyId }: BusinessHoursConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  // v3.0.0 — Toggle "aceitar pedidos fora do horário (agendar pra abertura)"
  const [windowEnabled, setWindowEnabled] = useState(false);

  // Lê store_settings.delivery_window_enabled
  const { data: storeSet } = useQuery({
    queryKey: ["store-settings-window", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_settings")
        .select("delivery_window_enabled")
        .eq("company_id", companyId)
        .maybeSingle();
      return data as any;
    },
  });
  useEffect(() => {
    if (storeSet) setWindowEnabled(!!storeSet.delivery_window_enabled);
  }, [storeSet]);

  const { data, isLoading } = useQuery({
    queryKey: ["business-hours", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("schedule")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      return normalize(data?.schedule);
    },
    enabled: !!companyId,
  });

  useEffect(() => {
    if (data) setSchedule(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (newSchedule: WeekSchedule) => {
      // v3.0.0 — Salva schedule + flag window_enabled em paralelo
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("companies").update({ schedule: newSchedule }).eq("id", companyId),
        supabase.from("store_settings").upsert(
          { company_id: companyId, delivery_window_enabled: windowEnabled },
          { onConflict: "company_id" }
        ),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours", companyId] });
      queryClient.invalidateQueries({ queryKey: ["store-settings-window", companyId] });
      toast({ title: "Horários salvos com sucesso" });
    },
    onError: () => toast({ title: "Erro ao salvar horários", variant: "destructive" }),
  });

  const toggleDay = (day: string, enabled: boolean) => {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], enabled } }));
  };

  const updateSlot = (day: string, idx: number, field: "open" | "close", value: string) => {
    setSchedule(prev => {
      const periods = [...prev[day].periods];
      periods[idx] = { ...periods[idx], [field]: value };
      return { ...prev, [day]: { ...prev[day], periods } };
    });
  };

  const addSlot = (day: string) => {
    setSchedule(prev => {
      const last = prev[day].periods.at(-1);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          periods: [...prev[day].periods, { open: last?.close ?? "18:00", close: "22:00" }],
        },
      };
    });
  };

  const removeSlot = (day: string, idx: number) => {
    setSchedule(prev => {
      const periods = prev[day].periods.filter((_, i) => i !== idx);
      return { ...prev, [day]: { ...prev[day], periods: periods.length ? periods : [{ open: "08:00", close: "22:00" }] } };
    });
  };

  // Copia todos os períodos do dia fonte para os dias habilitados
  const applyToAll = (sourceDay: string) => {
    const source = schedule[sourceDay];
    setSchedule(prev => {
      const next = { ...prev };
      DAYS.forEach(({ key }) => {
        if (next[key].enabled) {
          next[key] = { ...next[key], periods: source.periods.map(p => ({ ...p })) };
        }
      });
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horário de Funcionamento
        </CardTitle>
        <CardDescription>
          Configure os dias e horários. Adicione múltiplos períodos por dia (ex: almoço e jantar).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* v3.0.0 — Toggle agendamento automático fora do horário */}
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-start justify-between gap-3">
          <div className="flex-1">
            <Label className="font-semibold text-sm">⏰ Aceitar pedidos fora do horário (agendados)</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Cliente pede antes da abertura → sistema confirma e agenda pro horário de abertura.
              Cozinha começa o preparo automaticamente quando chegar a hora.
              <br />Sem isso: pedido fora do horário é bloqueado.
            </p>
          </div>
          <Switch checked={windowEnabled} onCheckedChange={setWindowEnabled} />
        </div>

        {DAYS.map(({ key, label }) => {
          const day = schedule[key] ?? { enabled: false, periods: [{ open: "08:00", close: "22:00" }] };
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 transition-colors ${day.enabled ? "bg-muted/30" : "opacity-50"}`}
            >
              {/* Cabeçalho do dia */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={day.enabled}
                    onCheckedChange={(v) => toggleDay(key, v)}
                  />
                  <Label className="font-medium text-sm cursor-pointer" onClick={() => toggleDay(key, !day.enabled)}>
                    {label}
                  </Label>
                </div>
                <div className="flex gap-2">
                  {day.enabled && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => applyToAll(key)}
                        title="Copiar horários para todos os dias abertos"
                      >
                        Aplicar a todos
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 px-2 gap-1"
                        onClick={() => addSlot(key)}
                      >
                        <Plus className="w-3 h-3" /> Período
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Períodos do dia */}
              {day.enabled && (
                <div className="space-y-2 pl-9">
                  {day.periods.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-14 shrink-0">
                        {idx === 0 ? "Abertura" : `Período ${idx + 1}`}
                      </span>
                      <input
                        type="time"
                        value={slot.open}
                        onChange={(e) => updateSlot(key, idx, "open", e.target.value)}
                        className="h-8 w-28 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground">até</span>
                      <input
                        type="time"
                        value={slot.close}
                        onChange={(e) => updateSlot(key, idx, "close", e.target.value)}
                        className="h-8 w-28 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      {day.periods.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeSlot(key, idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="flex justify-end pt-2">
          <Button onClick={() => saveMutation.mutate(schedule)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Horários
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
