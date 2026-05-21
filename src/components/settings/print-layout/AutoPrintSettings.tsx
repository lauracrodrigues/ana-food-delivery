// v1.0.0 — Configura quando imprimir automaticamente
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Printer } from "lucide-react";

type AutoPrintMode = "off" | "confirmed" | "out_for_delivery";

const OPTIONS: { value: AutoPrintMode; label: string; desc: string }[] = [
  {
    value: "confirmed",
    label: "🟢 Quando aceitar o pedido",
    desc: "Imprime na hora que clicar em 'Aceitar' no kanban (recomendado pra cozinha começar logo)",
  },
  {
    value: "out_for_delivery",
    label: "🛵 Só quando sair pra entrega",
    desc: "Imprime quando passar pra 'Saiu pra entrega'. Útil pra retiradas/balcão antes",
  },
  {
    value: "off",
    label: "❌ Desativado",
    desc: "Imprime só manual (botão de impressora no kanban)",
  },
];

export function AutoPrintSettings({ companyId }: { companyId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<{ auto_print_on: AutoPrintMode } | null>({
    queryKey: ["store-settings-autoprint", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("store_settings")
        .select("auto_print_on")
        .eq("company_id", companyId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!companyId,
  });

  const update = useMutation({
    mutationFn: async (value: AutoPrintMode) => {
      if (!companyId) throw new Error("Sem company");
      const { error } = await supabase
        .from("store_settings")
        .update({ auto_print_on: value })
        .eq("company_id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings-autoprint"] });
      toast({ title: "Configuração salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const current = settings?.auto_print_on ?? "confirmed";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Printer className="h-5 w-5 text-emerald-500" />
          Quando imprimir automaticamente
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={current}
          onValueChange={(v) => update.mutate(v as AutoPrintMode)}
          className="space-y-3"
        >
          {OPTIONS.map((opt) => (
            <div
              key={opt.value}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                current === opt.value ? "border-emerald-500 bg-emerald-500/5" : "border-border hover:bg-muted/30"
              }`}
              onClick={() => update.mutate(opt.value)}
            >
              <RadioGroupItem value={opt.value} id={`ap-${opt.value}`} className="mt-1" />
              <div className="flex-1">
                <Label htmlFor={`ap-${opt.value}`} className="text-sm font-medium cursor-pointer">
                  {opt.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
