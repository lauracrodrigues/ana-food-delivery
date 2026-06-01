// v1.0.0 — Selector backend WhatsApp (Fase 5 ecossistema)
// Flag flip: evolution | injection (Electron) | cloud_api (Meta oficial)
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Zap, ServerCog, Building2, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";

type Backend = "evolution" | "injection" | "cloud_api";

interface Config {
  whatsapp_backend: Backend;
  cloud_api_token: string | null;
  cloud_api_phone_id: string | null;
  cloud_api_business_id: string | null;
}

const BACKEND_INFO: Record<Backend, { title: string; desc: string; icon: any; color: string; risk: string }> = {
  evolution: {
    title: "Evolution API (atual)",
    desc: "Servidor próprio com Baileys. Funciona mas tem risco de ban.",
    icon: ServerCog,
    color: "text-amber-600",
    risk: "Médio-alto",
  },
  injection: {
    title: "Electron + WhatsApp Web",
    desc: "Sessão WhatsApp Web no PC da loja. Menor risco que datacenter.",
    icon: Zap,
    color: "text-blue-600",
    risk: "Médio",
  },
  cloud_api: {
    title: "WhatsApp Cloud API (oficial Meta)",
    desc: "API oficial. Zero risco de ban. Custo: $0.0075–0.05/conversa após 1000/mês free.",
    icon: Building2,
    color: "text-green-600",
    risk: "Zero",
  },
};

export function WhatsAppBackendSelector() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: cfg, isLoading } = useQuery({
    queryKey: ["whatsapp-backend", companyId],
    queryFn: async (): Promise<Config | null> => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("companies")
        .select("whatsapp_backend, cloud_api_token, cloud_api_phone_id, cloud_api_business_id")
        .eq("id", companyId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!companyId,
  });

  const [pendingBackend, setPendingBackend] = useState<Backend | null>(null);
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [businessId, setBusinessId] = useState("");

  const current = (cfg?.whatsapp_backend || "evolution") as Backend;
  const selected = pendingBackend || current;

  const switchMutation = useMutation({
    mutationFn: async (backend: Backend) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const patch: any = { whatsapp_backend: backend };
      if (backend === "cloud_api") {
        if (!token || !phoneId) throw new Error("Token e Phone ID obrigatórios pra Cloud API");
        patch.cloud_api_token = token;
        patch.cloud_api_phone_id = phoneId;
        patch.cloud_api_business_id = businessId || null;
      }
      const { error } = await supabase.from("companies").update(patch).eq("id", companyId);
      if (error) throw error;

      // Invalida cache backend
      const apiBase = import.meta.env.VITE_API_BASE_URL || "https://api.anafood.vip";
      const apiKey = import.meta.env.VITE_ELECTRON_API_KEY;
      if (apiKey) {
        await fetch(`${apiBase}/electron/cache-invalidate`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Electron-Key": apiKey },
          body: JSON.stringify({ company_id: companyId }),
        }).catch(() => { /* noop */ });
      }
    },
    onSuccess: (_, backend) => {
      toast({
        title: "Backend alterado ✓",
        description: `WhatsApp agora opera via ${BACKEND_INFO[backend].title}`,
      });
      qc.invalidateQueries({ queryKey: ["whatsapp-backend", companyId] });
      setPendingBackend(null);
      setToken("");
      setPhoneId("");
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Backend WhatsApp
          <Badge variant="outline" className="ml-auto">
            Atual: {BACKEND_INFO[current].title.split(" ")[0]}
          </Badge>
        </CardTitle>
        <CardDescription>
          Escolha como o sistema envia mensagens WhatsApp. Pode trocar sem perder dados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selected} onValueChange={(v) => setPendingBackend(v as Backend)}>
          {(Object.keys(BACKEND_INFO) as Backend[]).map((key) => {
            const info = BACKEND_INFO[key];
            const Icon = info.icon;
            const isCurrent = key === current;
            return (
              <label
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                  selected === key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value={key} id={key} className="mt-0.5" />
                <Icon className={`h-5 w-5 ${info.color} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{info.title}</span>
                    {isCurrent && <Badge variant="secondary" className="text-xs">ativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{info.desc}</p>
                  <p className="text-xs mt-1">
                    Risco de ban: <strong className={info.color}>{info.risk}</strong>
                  </p>
                </div>
              </label>
            );
          })}
        </RadioGroup>

        {/* Form Cloud API */}
        {selected === "cloud_api" && (
          <div className="space-y-3 border-t pt-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 rounded-lg p-3 text-sm flex gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Antes de ativar:</p>
                <ol className="list-decimal list-inside text-xs space-y-0.5">
                  <li>Criar app em <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></li>
                  <li>Adicionar produto "WhatsApp Business Platform"</li>
                  <li>Copiar Permanent Access Token, Phone Number ID e Business Account ID</li>
                  <li>Configurar webhook URL abaixo (Meta envia inbound aqui)</li>
                  <li>Submeter templates pra aprovação</li>
                </ol>
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium text-emerald-900 dark:text-emerald-100">Webhook (configure no Meta):</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-emerald-800 dark:text-emerald-200 break-all">https://api.anafood.vip/v1/whatsapp/cloud-webhook</span>
              </div>
              <p className="text-emerald-800 dark:text-emerald-200">Verify Token: peça pro suporte (gerado por instalação)</p>
              <p className="text-emerald-800 dark:text-emerald-200">Campos: messages, message_status</p>
            </div>

            <div className="space-y-1.5">
              <Label>Permanent Access Token *</Label>
              <Input
                type="password"
                value={token || (cfg?.cloud_api_token ? "••••••••" : "")}
                onChange={(e) => setToken(e.target.value)}
                placeholder="EAAxxxxxxxx..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone Number ID *</Label>
              <Input
                value={phoneId || cfg?.cloud_api_phone_id || ""}
                onChange={(e) => setPhoneId(e.target.value)}
                placeholder="123456789012345"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Business Account ID (opcional)</Label>
              <Input
                value={businessId || cfg?.cloud_api_business_id || ""}
                onChange={(e) => setBusinessId(e.target.value)}
                placeholder="987654321098765"
              />
            </div>

            <a
              href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Documentação completa <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {selected === "injection" && (
          <div className="border-t pt-4 text-sm">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-900 dark:text-amber-100 text-xs">
                Requer <strong>Ana Food Desktop</strong> instalado e WhatsApp Web logado no PC da loja. Disponível após Fase 2 do ecossistema.
              </p>
            </div>
          </div>
        )}

        {pendingBackend && pendingBackend !== current && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => { setPendingBackend(null); setToken(""); setPhoneId(""); }}
              disabled={switchMutation.isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => switchMutation.mutate(pendingBackend)}
              disabled={switchMutation.isPending}
              className="flex-1"
            >
              {switchMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Ativar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
