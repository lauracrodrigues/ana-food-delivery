// AgentBehaviorConfig.tsx — v1.0.0
// Configuração de comportamento do agente IA: personalidade + regras customizadas

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, Plus, X, Lightbulb, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

// Personalidades disponíveis para o agente
const PERSONALITIES = [
  {
    id: "amigavel",
    label: "Amigável",
    description: "Warm, usa emojis, linguagem próxima e informal mas respeitosa",
    example: "Oi! Que ótimo te ver por aqui 😊 O que vai querer hoje?",
  },
  {
    id: "descontraido",
    label: "Descontraído",
    description: "Casual e divertido, gírias leves, trata como amigo",
    example: "Eee, chegou a hora! 🎉 Me fala o que tá na vibe hoje?",
  },
  {
    id: "formal",
    label: "Formal",
    description: "Profissional, sem emojis excessivos, linguagem educada e clara",
    example: "Olá! Bem-vindo(a). Como posso auxiliá-lo(a) hoje?",
  },
] as const;

type PersonalityId = (typeof PERSONALITIES)[number]["id"];

// Templates prontos de regras de comportamento
const RULE_TEMPLATES = [
  { category: "Vendas", text: "Sempre ofereça uma bebida se o cliente não pedir" },
  { category: "Vendas", text: "Sugira sobremesa ao final do pedido" },
  { category: "Vendas", text: "Informe sobre o combo do dia se disponível" },
  { category: "Operação", text: "Informe que a entrega pode demorar 15 minutos a mais em dias de chuva" },
  { category: "Operação", text: "Peça confirmação do endereço antes de fechar o pedido" },
  { category: "Operação", text: "Nunca aceite pedidos fora do horário de funcionamento" },
  { category: "Atendimento", text: "Se o cliente reclamar, peça desculpas e ofereça uma solução antes de qualquer explicação" },
  { category: "Atendimento", text: "Responda em no máximo 2 parágrafos curtos — nunca textos longos" },
  { category: "Atendimento", text: "Se o cliente perguntar algo fora do cardápio, redirecione com simpatia" },
  { category: "Fidelidade", text: "Mencione o programa de pontos ao fechar o pedido" },
  { category: "Pagamento", text: "Confirme a forma de pagamento antes de finalizar" },
  { category: "Pagamento", text: "Informe o valor do troco necessário se pagamento em dinheiro" },
];

export interface AgentBehaviorData {
  agent_personality: PersonalityId;
  behavior_rules: string[];
}

interface AgentBehaviorConfigProps {
  sessionId: string;
  agentName: string;
  initialData: AgentBehaviorData;
  onSave: (data: AgentBehaviorData) => void;
  isSaving?: boolean;
}

export function AgentBehaviorConfig({
  sessionId,
  agentName,
  initialData,
  onSave,
  isSaving = false,
}: AgentBehaviorConfigProps) {
  const [personality, setPersonality] = useState<PersonalityId>(
    initialData.agent_personality ?? "amigavel"
  );
  const [rules, setRules] = useState<string[]>(initialData.behavior_rules ?? []);
  const [newRule, setNewRule] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Adiciona regra personalizada
  const addRule = () => {
    const trimmed = newRule.trim();
    if (!trimmed || rules.includes(trimmed)) return;
    setRules((prev) => [...prev, trimmed]);
    setNewRule("");
  };

  // Adiciona regra de template (toggle — remove se já existe)
  const toggleTemplate = (text: string) => {
    setRules((prev) =>
      prev.includes(text) ? prev.filter((r) => r !== text) : [...prev, text]
    );
  };

  // Remove regra da lista
  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  // Monta preview do prompt assembelado
  const buildPromptPreview = () => {
    const p = PERSONALITIES.find((p) => p.id === personality);
    const personalityDesc = {
      amigavel: "amigável e acolhedor",
      descontraido: "descontraído e divertido",
      formal: "formal e profissional",
    }[personality];

    let prompt = `Você é ${agentName || "o assistente virtual"}, um atendente de WhatsApp ${personalityDesc}.\n`;
    prompt += `Seu objetivo é atender os clientes, tirar dúvidas sobre o cardápio e processar pedidos.\n`;

    if (rules.length > 0) {
      prompt += `\nRegras de comportamento:\n`;
      rules.forEach((rule) => {
        prompt += `- ${rule}\n`;
      });
    }

    return prompt;
  };

  // Agrupar templates por categoria
  const templateCategories = [...new Set(RULE_TEMPLATES.map((t) => t.category))];

  const hasChanges =
    personality !== initialData.agent_personality ||
    JSON.stringify(rules) !== JSON.stringify(initialData.behavior_rules);

  return (
    <div className="space-y-4">
      {/* Personalidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            Personalidade do Agente
          </CardTitle>
          <CardDescription>
            Define o tom e estilo de comunicação de <strong>{agentName || "seu agente"}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PERSONALITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPersonality(p.id)}
                className={cn(
                  "text-left p-3 rounded-lg border-2 transition-all space-y-1",
                  personality === p.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div className="font-medium text-sm">{p.label}</div>
                <div className="text-xs text-muted-foreground">{p.description}</div>
                <div className="text-xs italic text-muted-foreground/80 mt-1 border-t pt-1">
                  "{p.example}"
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regras de Comportamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4" />
            Regras de Comportamento
          </CardTitle>
          <CardDescription>
            Instrua o agente com regras específicas do seu negócio. Ele vai seguir à risca.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de regras ativas */}
          {rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50 group"
                >
                  <span className="text-sm flex-1 pt-0.5">{rule}</span>
                  <button
                    onClick={() => removeRule(i)}
                    className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma regra definida. Adicione abaixo ou use os templates.
            </p>
          )}

          {/* Input para nova regra */}
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Sempre ofereça uma bebida se o cliente não pedir"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRule()}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addRule} disabled={!newRule.trim()}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <Separator />

          {/* Templates prontos */}
          <div>
            <button
              onClick={() => setShowTemplates((v) => !v)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showTemplates ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {showTemplates ? "Ocultar" : "Ver"} templates prontos
            </button>

            {showTemplates && (
              <div className="mt-3 space-y-3">
                {templateCategories.map((cat) => (
                  <div key={cat}>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                      {cat}
                    </Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {RULE_TEMPLATES.filter((t) => t.category === cat).map((t) => (
                        <button
                          key={t.text}
                          onClick={() => toggleTemplate(t.text)}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full border transition-all",
                            rules.includes(t.text)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {rules.includes(t.text) && (
                            <span className="mr-1">✓</span>
                          )}
                          {t.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview do prompt */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full text-left"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? "Ocultar" : "Ver"} preview do prompt enviado ao agente
          </button>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <pre className="text-xs bg-muted/50 rounded p-3 whitespace-pre-wrap font-mono text-muted-foreground">
              {buildPromptPreview()}
            </pre>
          </CardContent>
        )}
      </Card>

      {/* Salvar */}
      <div className="flex justify-end gap-2">
        {hasChanges && (
          <Badge variant="outline" className="text-xs">
            Alterações não salvas
          </Badge>
        )}
        <Button
          onClick={() => onSave({ agent_personality: personality, behavior_rules: rules })}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? "Salvando..." : "Salvar Comportamento"}
        </Button>
      </div>
    </div>
  );
}
