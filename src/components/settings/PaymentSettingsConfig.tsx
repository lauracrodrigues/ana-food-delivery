// Configuração de gateways de pagamento por empresa
// Salva credenciais em payment_integrations (service role via Edge Function)
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, ExternalLink } from "lucide-react";

interface MpCredentials {
  access_token: string;
  public_key: string;
  is_active: boolean;
  sandbox_mode: boolean;
}

export function PaymentSettingsConfig() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState<MpCredentials>({
    access_token: "",
    public_key: "",
    is_active: true,
    sandbox_mode: false,
  });

  // Busca integração existente
  const { data: integration, isLoading } = useQuery({
    queryKey: ["payment-integration", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("payment_integrations")
        .select("*")
        .eq("company_id", companyId)
        .eq("gateway", "mercadopago")
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  // Popula form quando carrega dados existentes
  useEffect(() => {
    if (integration) {
      setForm({
        access_token: integration.access_token ?? "",
        public_key:   integration.public_key ?? "",
        is_active:    integration.is_active ?? true,
        sandbox_mode: integration.sandbox_mode ?? false,
      });
    }
  }, [integration]);

  const saveMutation = useMutation({
    mutationFn: async (values: MpCredentials) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      if (!values.access_token.trim()) throw new Error("Access Token é obrigatório");

      const payload = {
        company_id:   companyId,
        gateway:      "mercadopago",
        access_token: values.access_token.trim(),
        public_key:   values.public_key.trim() || null,
        is_active:    values.is_active,
        sandbox_mode: values.sandbox_mode,
        updated_at:   new Date().toISOString(),
      };

      const { error } = await supabase
        .from("payment_integrations")
        .upsert(payload, { onConflict: "company_id,gateway" });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Configurações de pagamento salvas ✓" });
      queryClient.invalidateQueries({ queryKey: ["payment-integration", companyId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      // Testa via edge function para evitar CORS (MP bloqueia chamadas diretas do browser)
      const { data, error } = await supabase.functions.invoke("test-mp-token", {
        body: { access_token: form.access_token },
      });
      if (error) throw new Error("Erro ao testar token");
      if (!data?.valid) throw new Error(data?.error ?? "Token inválido");
      return data;
    },
    onSuccess: () => toast({ title: "Token válido! ✅", description: "Conexão com Mercado Pago OK" }),
    onError:  (err: any) => toast({ title: "Token inválido", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const isConfigured = !!integration?.access_token;

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center gap-3">
        {isConfigured ? (
          <Badge className="gap-1.5 bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Mercado Pago Configurado
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <XCircle className="w-3.5 h-3.5" /> Não Configurado
          </Badge>
        )}
        {integration?.sandbox_mode && (
          <Badge variant="outline" className="text-amber-600 border-amber-300">Sandbox (Teste)</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <img src="https://www.mercadopago.com/favicon.ico" className="w-5 h-5" alt="MP" onError={e => (e.currentTarget.style.display='none')} />
                Mercado Pago
              </CardTitle>
              <CardDescription>PIX e Cartão de Crédito via Mercado Pago</CardDescription>
            </div>
            <a
              href="https://www.mercadopago.com.br/developers/pt/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Documentação <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Switches de controle */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Habilitar Mercado Pago</Label>
                <p className="text-xs text-muted-foreground">Exibe opção de PIX automático no checkout</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Modo Sandbox (Testes)</Label>
                <p className="text-xs text-muted-foreground">Use credenciais de teste sem cobranças reais</p>
              </div>
              <Switch
                checked={form.sandbox_mode}
                onCheckedChange={v => setForm(f => ({ ...f, sandbox_mode: v }))}
              />
            </div>
          </div>

          {/* Credenciais */}
          <div className="space-y-4 pt-2 border-t">
            <div className="space-y-2">
              <Label htmlFor="access_token">
                Access Token {form.sandbox_mode ? "(Teste)" : "(Produção)"} *
              </Label>
              <div className="relative">
                <Input
                  id="access_token"
                  type={showToken ? "text" : "password"}
                  placeholder={form.sandbox_mode ? "TEST-..." : "APP_USR-..."}
                  value={form.access_token}
                  onChange={e => setForm(f => ({ ...f, access_token: e.target.value }))}
                  className="pr-10 font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Encontre em: Mercado Pago → Seu negócio → Configurações → Credenciais
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="public_key">Public Key (opcional — necessária para cartão)</Label>
              <Input
                id="public_key"
                placeholder={form.sandbox_mode ? "TEST-..." : "APP_USR-..."}
                value={form.public_key}
                onChange={e => setForm(f => ({ ...f, public_key: e.target.value }))}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={!form.access_token || testMutation.isPending}
            >
              {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Testar Conexão
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="pt-5 space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Como configurar:</p>
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Acesse <strong>mercadopago.com.br</strong> → Seu negócio → Configurações → Credenciais</li>
            <li>Copie o <strong>Access Token</strong> de Produção (começa com APP_USR)</li>
            <li>Cole acima e clique em <strong>Testar Conexão</strong></li>
            <li>Salve — PIX automático aparecerá no checkout dos clientes</li>
          </ol>
          <p className="pt-1">⚠️ O webhook do MP deve apontar para: <br />
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {`https://jgdyklzrxygvwuhlnbat.supabase.co/functions/v1/mp-webhook`}
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
