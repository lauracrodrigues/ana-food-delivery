// v1.0.0 — Card admin: mensagem de ausência WhatsApp Business
// Texto pronto + botão copiar + tutorial print
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Moon, Copy, CheckCircle2, Info } from "lucide-react";

export function AbsenceMessageCard() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: company } = useQuery({
    queryKey: ["company-absence-msg", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from("companies")
        .select("fantasy_name, subdomain")
        .eq("id", companyId)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const subdomain = (company as any)?.subdomain || "sua-loja";
  const fantasyName = (company as any)?.fantasy_name || "nossa loja";
  const cardapioUrl = `https://${subdomain}.anafood.vip`;

  const defaultMessage = `Olá! 👋

Obrigado pela mensagem! Estamos fechados no momento.

📱 *Faça seu pedido pelo nosso cardápio digital:*
${cardapioUrl}

Seu pedido será preparado assim que abrirmos. 🍽️

Atenciosamente,
${fantasyName}`;

  const [text, setText] = useState(defaultMessage);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copiado!", description: "Cole no WhatsApp Business" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-indigo-500" />
          Mensagem de Ausência (WhatsApp Business)
        </CardTitle>
        <CardDescription>
          Resposta automática quando você não está atendendo. Aponta cliente pro cardápio digital — pedidos noturnos viram agendados.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm flex gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">Como funciona:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Configurada UMA VEZ no app WhatsApp Business (celular do dono)</li>
              <li>Dispara automática quando alguém manda msg fora do horário</li>
              <li>Cliente acessa o link e faz pedido — vira pedido agendado pra próxima abertura</li>
              <li>Requer celular do dono online (com internet)</li>
            </ul>
          </div>
        </div>

        <div className="space-y-1.5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Link do cardápio: <code className="bg-muted px-1 rounded">{cardapioUrl}</code>
          </p>
        </div>

        <Button onClick={handleCopy} className="w-full gap-2">
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado!" : "Copiar mensagem"}
        </Button>

        <Accordion type="single" collapsible>
          <AccordionItem value="tutorial">
            <AccordionTrigger className="text-sm">
              Como configurar no WhatsApp Business
            </AccordionTrigger>
            <AccordionContent>
              <ol className="list-decimal list-inside text-sm space-y-2 text-muted-foreground">
                <li>Abra o app <strong>WhatsApp Business</strong> no celular</li>
                <li>Toque nos três pontos (⋮) no canto superior direito</li>
                <li>Toque em <strong>Ferramentas comerciais</strong></li>
                <li>Toque em <strong>Mensagem de ausência</strong></li>
                <li>Ative o switch <strong>Enviar mensagem de ausência</strong></li>
                <li>Toque em <strong>Mensagem</strong> e cole o texto acima</li>
                <li>Em <strong>Programar</strong>, escolha <strong>Horário personalizado</strong> e configure quando você não está atendendo</li>
                <li>Em <strong>Destinatários</strong>, deixe <strong>Todos</strong></li>
                <li>Salve</li>
              </ol>
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                ⚠ Funciona <strong>apenas no WhatsApp Business</strong> (não no comum). Não configurável pelo WhatsApp Web.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
