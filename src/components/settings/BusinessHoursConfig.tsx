// src/components/settings/BusinessHoursConfig.tsx — v1.0.0
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── TIPOS ───────────────────────────────────────────────────────

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
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
  DAYS.map(({ key }) => [key, { enabled: true, open: "08:00", close: "22:00" }])
);

// ─── COMPONENTE ──────────────────────────────────────────────────

interface BusinessHoursConfigProps {
  companyId: string;
}

export function BusinessHoursConfig({ companyId }: BusinessHoursConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);

  // Busca schedule atual da empresa
  const { data, isLoading } = useQuery({
    queryKey: ["business-hours", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("schedule")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return (data?.schedule as WeekSchedule) || DEFAULT_SCHEDULE;
    },
    enabled: !!companyId,
  });

  // Sincroniza state local quando dados chegam do banco
  useEffect(() => {
    if (data) {
      setSchedule({ ...DEFAULT_SCHEDULE, ...data });
    }
  }, [data]);

  // Salva schedule no banco
  const saveMutation = useMutation({
    mutationFn: async (newSchedule: WeekSchedule) => {
      const { error } = await supabase
        .from("companies")
        .update({ schedule: newSchedule })
        .eq("id", companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours", companyId] });
      toast({ title: "Horários salvos com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar horários", variant: "destructive" });
    },
  });

  const updateDay = (day: string, field: keyof DaySchedule, value: string | boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  // Aplica horário de um dia para todos os dias habilitados
  const applyToAll = (sourceDay: string) => {
    const source = schedule[sourceDay];
    setSchedule(prev => {
      const next = { ...prev };
      DAYS.forEach(({ key }) => {
        if (next[key].enabled) {
          next[key] = { ...next[key], open: source.open, close: source.close };
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
          Configure os dias e horários em que sua loja aceita pedidos pelo WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Cabeçalho grid */}
        <div className="grid grid-cols-[140px_60px_1fr_1fr_auto] gap-3 items-center px-2 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <span>Dia</span>
          <span className="text-center">Aberto</span>
          <span>Abertura</span>
          <span>Fechamento</span>
          <span className="w-24" />
        </div>

        {/* Linhas por dia */}
        {DAYS.map(({ key, label }) => {
          const day = schedule[key] || { enabled: false, open: "08:00", close: "22:00" };
          return (
            <div
              key={key}
              className={`grid grid-cols-[140px_60px_1fr_1fr_auto] gap-3 items-center p-2 rounded-lg transition-colors ${
                day.enabled ? "bg-muted/30" : "opacity-50"
              }`}
            >
              {/* Nome do dia */}
              <Label className="font-medium text-sm">{label}</Label>

              {/* Toggle aberto/fechado */}
              <div className="flex justify-center">
                <Switch
                  checked={day.enabled}
                  onCheckedChange={(v) => updateDay(key, "enabled", v)}
                />
              </div>

              {/* Hora abertura */}
              <input
                type="time"
                value={day.open}
                disabled={!day.enabled}
                onChange={(e) => updateDay(key, "open", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />

              {/* Hora fechamento */}
              <input
                type="time"
                value={day.close}
                disabled={!day.enabled}
                onChange={(e) => updateDay(key, "close", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />

              {/* Aplicar a todos */}
              <Button
                variant="ghost"
                size="sm"
                disabled={!day.enabled}
                onClick={() => applyToAll(key)}
                className="w-24 text-xs"
                title="Aplicar este horário a todos os dias abertos"
              >
                Aplicar todos
              </Button>
            </div>
          );
        })}

        {/* Botão salvar */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={() => saveMutation.mutate(schedule)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Horários
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
