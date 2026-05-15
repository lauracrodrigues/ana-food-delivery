// v1.0.0 — Editor de mensagens de boas-vindas (cliente novo + recorrente)
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, MessageSquare, UserPlus, UserCheck, ExternalLink, Info } from "lucide-react";
import { Link } from "react-router-dom";

const DEFAULT_NEW = `Olá! Seja bem-vindo(a) ao {empresa} 👋

Hoje nosso cardápio é:

{cardapio_dia}

Para fazer seu pedido, nos informe:
🍱 Tamanho da marmita
📍 Seu endereço completo
💳 Forma de pagamento

Logo iremos te atender!`;

const DEFAULT_RETURNING = `Olá, {nome}! Que bom te ver de novo no {empresa} 👋

Hoje nosso cardápio é:

{cardapio_dia}

Qual marmita você quer hoje?`;

interface WelcomeForm {
  welcome_message_new: string;
  welcome_message_returning: string;
}

export function WelcomeMessageEditor() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: companyId } = useQuery({
    queryKey: ["my-company-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      return data?.company_id ?? null;
    },
  });

  const { data: company } = useQuery({
    queryKey: ["welcome-config", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies")
        .select("welcome_message_new, welcome_message_returning, fantasy_name, name")
        .eq("id", companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState<WelcomeForm>({ welcome_message_new: "", welcome_message_returning: "" });

  useEffect(() => {
    if (!company) return;
    setForm({
      welcome_message_new: (company as any).welcome_message_new || DEFAULT_NEW,
      welcome_message_returning: (company as any).welcome_message_returning || DEFAULT_RETURNING,
    });
  }, [company]);

  const save = async () => {
    if (!companyId) return;
    const { error } = await supabase.from("companies").update({
      welcome_message_new: form.welcome_message_new || null,
      welcome_message_returning: form.welcome_message_returning || null,
    }).eq("id", companyId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mensagens salvas" });
    qc.invalidateQueries({ queryKey: ["welcome-config", companyId] });
  };

  return (
    <div className="space-y-4">
      {/* Aviso sobre integração com agente externo */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950/20">
        <CardContent className="p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-blue-900 mb-1">Como funciona</p>
            <p className="text-blue-800">
              O agente Ana Food usa estas mensagens automaticamente ao receber o primeiro contato
              do dia de um cliente. Ele detecta se é cliente novo ou recorrente via lookup de pedidos
              pelo telefone, substitui as variáveis e envia.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cliente novo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-green-600" />
            Cliente novo (primeiro contato)
          </CardTitle>
          <CardDescription>
            Enviada quando o telefone do cliente não tem pedidos anteriores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={form.welcome_message_new}
            onChange={e => setForm({ ...form, welcome_message_new: e.target.value })}
            rows={10}
            placeholder={DEFAULT_NEW}
            className="font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Variáveis disponíveis:</p>
            <code className="bg-muted px-1 rounded">{"{empresa}"}</code> — nome fantasia ou razão social<br/>
            <code className="bg-muted px-1 rounded">{"{cardapio_dia}"}</code> — cardápio do dia formatado (gerencie em <Link to="/daily-menu" className="text-primary underline">Cardápio do Dia <ExternalLink className="h-3 w-3 inline" /></Link>)
          </div>
        </CardContent>
      </Card>

      {/* Cliente recorrente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-blue-600" />
            Cliente recorrente
          </CardTitle>
          <CardDescription>
            Enviada quando o cliente já tem pedidos anteriores na loja
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={form.welcome_message_returning}
            onChange={e => setForm({ ...form, welcome_message_returning: e.target.value })}
            rows={10}
            placeholder={DEFAULT_RETURNING}
            className="font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Variáveis adicionais:</p>
            <code className="bg-muted px-1 rounded">{"{nome}"}</code> — nome do contato no WhatsApp<br/>
            <code className="bg-muted px-1 rounded">{"{ultimo_pedido}"}</code> — descrição do último pedido (se quiser sugerir "repetir")
          </div>
        </CardContent>
      </Card>

      {/* Comando /reset */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-amber-600" />
            Comando /reset
          </CardTitle>
          <CardDescription>
            Qualquer cliente pode digitar <code className="bg-muted px-1 rounded">/reset</code> pra limpar dados da sessão
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground">Fluxo configurado no agente Ana Food:</p>
          <ol className="list-decimal pl-5 space-y-1 text-xs">
            <li>Cliente digita <code className="bg-muted px-1 rounded">/reset</code></li>
            <li>Bot pergunta: <em>"Confirma reset dos dados? Responda SIM ou NÃO"</em></li>
            <li>Se <strong>SIM</strong>: limpa <code>msg_history</code>, <code>customers.preferences</code>, <code>pending_order</code>. Confirma com mensagem.</li>
            <li>Se <strong>NÃO</strong>: ignora + responde "Reset cancelado, vamos continuar"</li>
          </ol>
          <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-800">
            ⚙️ Implementação no agente externo (<code>agentHarness.js</code>). Veja
            <Link to="/whatsapp" className="text-primary underline ml-1">specs/whatsapp/tasks.md</Link>.
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} className="gap-2">
          <Save className="h-4 w-4" /> Salvar mensagens
        </Button>
      </div>
    </div>
  );
}
