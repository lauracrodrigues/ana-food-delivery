// v1.0.0 — Painel admin: uso de IA por cliente, modelo, tipo (texto/áudio/imagem)
// Realtime via postgres_changes em token_logs
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, DollarSign, MessageCircle, Mic, Volume2, Image as ImageIcon,
  Building2, Cpu, Activity, Zap
} from "lucide-react";

// USD → BRL aproximado (fixo, server-side ideal teria FX live)
const USD_TO_BRL = 5.5;

function fmtUSD(v: number): string {
  return `$${(v || 0).toFixed(v < 1 ? 4 : 2)}`;
}
function fmtBRL(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((v || 0) * USD_TO_BRL);
}
function fmtNum(v: number): string {
  return new Intl.NumberFormat("pt-BR").format(v || 0);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface TokenLog {
  id: number;
  phone: string;
  company_id: string | null;
  provider: string;
  model: string;
  kind: "text" | "audio_in" | "audio_out" | "image";
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  tool_calls: number;
  audio_seconds: number | null;
  char_count: number | null;
  custo_usd: number;
  criado_em: string;
}

interface Company {
  id: string;
  name: string;
  fantasy_name: string | null;
}

const KIND_LABEL: Record<string, { label: string; icon: any; color: string }> = {
  text:      { label: "Texto",     icon: MessageCircle, color: "bg-blue-500" },
  audio_in:  { label: "Áudio In",  icon: Mic,           color: "bg-purple-500" },
  audio_out: { label: "Áudio Out", icon: Volume2,       color: "bg-pink-500" },
  image:     { label: "Imagem",    icon: ImageIcon,     color: "bg-green-500" },
};

export function AIUsageTab() {
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState<"today" | "7d" | "30d">("today");
  const [liveCount, setLiveCount] = useState(0);

  // Calcula data início baseado em período
  const sinceDate = (() => {
    const now = new Date();
    if (periodo === "today") {
      now.setHours(0, 0, 0, 0);
    } else if (periodo === "7d") {
      now.setDate(now.getDate() - 7);
    } else {
      now.setDate(now.getDate() - 30);
    }
    return now.toISOString();
  })();

  // Companies pra resolver nome
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["companies-for-ai"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name, fantasy_name");
      return data || [];
    },
  });

  // Logs do período (sem limite — agregação local)
  const { data: logs = [], isLoading } = useQuery<TokenLog[]>({
    queryKey: ["ai-usage", periodo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_logs")
        .select("*")
        .gte("criado_em", sinceDate)
        .order("criado_em", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as TokenLog[];
    },
    staleTime: 10_000,
  });

  // Realtime: invalida query a cada INSERT
  useEffect(() => {
    const ch = supabase
      .channel("token_logs_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "token_logs" },
        () => {
          setLiveCount((c) => c + 1);
          queryClient.invalidateQueries({ queryKey: ["ai-usage"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  // ── Agregações ────────────────────────────────────────────
  const totalCusto = logs.reduce((s, l) => s + (Number(l.custo_usd) || 0), 0);
  const totalChamadas = logs.length;
  const totalTokens = logs.reduce((s, l) => s + (l.input_tokens || 0) + (l.output_tokens || 0), 0);
  const totalCached = logs.reduce((s, l) => s + (l.cached_tokens || 0), 0);
  const cacheHitPct = totalTokens > 0 ? (totalCached / totalTokens) * 100 : 0;

  // Por tipo (kind)
  const porTipo: Record<string, { custo: number; chamadas: number; tokens: number }> = {};
  for (const l of logs) {
    const k = l.kind || "text";
    if (!porTipo[k]) porTipo[k] = { custo: 0, chamadas: 0, tokens: 0 };
    porTipo[k].custo += Number(l.custo_usd) || 0;
    porTipo[k].chamadas += 1;
    porTipo[k].tokens += (l.input_tokens || 0) + (l.output_tokens || 0);
  }

  // Por modelo
  const porModelo: Record<string, { custo: number; chamadas: number; provider: string }> = {};
  for (const l of logs) {
    const m = l.model || "?";
    if (!porModelo[m]) porModelo[m] = { custo: 0, chamadas: 0, provider: l.provider || "?" };
    porModelo[m].custo += Number(l.custo_usd) || 0;
    porModelo[m].chamadas += 1;
  }
  const modelos = Object.entries(porModelo).sort((a, b) => b[1].custo - a[1].custo);

  // v1.1.0 — Por provider (OpenAI, Google, Anthropic, Gemini, Groq, etc)
  const porProvider: Record<string, { custo: number; chamadas: number; modelos: Set<string>; kinds: Set<string> }> = {};
  for (const l of logs) {
    const p = l.provider || "?";
    if (!porProvider[p]) porProvider[p] = { custo: 0, chamadas: 0, modelos: new Set(), kinds: new Set() };
    porProvider[p].custo += Number(l.custo_usd) || 0;
    porProvider[p].chamadas += 1;
    porProvider[p].modelos.add(l.model || "?");
    porProvider[p].kinds.add(l.kind || "text");
  }
  const providers = Object.entries(porProvider).sort((a, b) => b[1].custo - a[1].custo);
  // Cores por provider (consistência visual)
  const PROVIDER_COLOR: Record<string, string> = {
    openai: "bg-emerald-500",
    google: "bg-blue-500",
    anthropic: "bg-orange-500",
    gemini: "bg-purple-500",
    groq: "bg-amber-500",
  };

  // Por empresa (top 10)
  const porEmpresa: Record<string, { custo: number; chamadas: number; tokens: number; audio_seconds: number }> = {};
  for (const l of logs) {
    const cid = l.company_id || "sem-empresa";
    if (!porEmpresa[cid]) porEmpresa[cid] = { custo: 0, chamadas: 0, tokens: 0, audio_seconds: 0 };
    porEmpresa[cid].custo += Number(l.custo_usd) || 0;
    porEmpresa[cid].chamadas += 1;
    porEmpresa[cid].tokens += (l.input_tokens || 0) + (l.output_tokens || 0);
    porEmpresa[cid].audio_seconds += Number(l.audio_seconds || 0);
  }
  const empresas = Object.entries(porEmpresa)
    .map(([cid, agg]) => {
      const co = companies.find((c) => c.id === cid);
      return { cid, nome: co?.fantasy_name || co?.name || (cid === "sem-empresa" ? "—" : cid.slice(0, 8)), ...agg };
    })
    .sort((a, b) => b.custo - a.custo)
    .slice(0, 10);

  // Live feed (últimos 20)
  const recent = logs.slice(0, 20);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com período + indicador live */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Cpu className="h-5 w-5" /> Uso de IA — Painel Geral
          </h3>
          <Badge variant="outline" className="gap-1 font-mono text-xs">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            Live{liveCount > 0 && ` · ${liveCount} eventos`}
          </Badge>
        </div>
        <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI title="Custo (USD)" value={fmtUSD(totalCusto)} subtitle={fmtBRL(totalCusto)} icon={DollarSign} accent="text-emerald-500" />
        <KPI title="Chamadas" value={fmtNum(totalChamadas)} subtitle="requisições à IA" icon={Zap} accent="text-blue-500" />
        <KPI title="Tokens" value={fmtNum(totalTokens)} subtitle={`${cacheHitPct.toFixed(1)}% cacheados`} icon={Activity} accent="text-purple-500" />
        <KPI title="Empresas Ativas" value={String(empresas.length)} subtitle="consumindo IA no período" icon={Building2} accent="text-orange-500" />
      </div>

      {/* Breakdown por tipo */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Por tipo de mídia</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {(["text", "audio_in", "audio_out", "image"] as const).map((k) => {
              const cfg = KIND_LABEL[k];
              const agg = porTipo[k] || { custo: 0, chamadas: 0, tokens: 0 };
              const pct = totalCusto > 0 ? (agg.custo / totalCusto) * 100 : 0;
              const Icon = cfg.icon;
              return (
                <div key={k} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center text-white ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {cfg.label}
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{fmtUSD(agg.custo)}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {agg.chamadas} chamadas · {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* v1.1.0 — Por provider de IA */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Por provider de IA</CardTitle></CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem dados no período</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {providers.map(([prov, agg]) => {
                const pct = totalCusto > 0 ? (agg.custo / totalCusto) * 100 : 0;
                const color = PROVIDER_COLOR[prov] || "bg-slate-500";
                return (
                  <div key={prov} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium capitalize">
                      <div className={`h-2 w-2 rounded-full ${color}`} />
                      {prov}
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{fmtUSD(agg.custo)}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {fmtNum(agg.chamadas)} chamadas · {pct.toFixed(1)}%
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Array.from(agg.kinds).map((k) => (
                        <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {KIND_LABEL[k]?.label || k}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground pt-0.5">
                      {agg.modelos.size} modelo{agg.modelos.size !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Por modelo */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Por modelo de IA</CardTitle></CardHeader>
        <CardContent>
          {modelos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem dados no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Custo USD</TableHead>
                  <TableHead className="text-right">Equivalente BRL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modelos.map(([model, agg]) => (
                  <TableRow key={model}>
                    <TableCell className="font-mono text-xs">{model}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{agg.provider}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(agg.chamadas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtUSD(agg.custo)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtBRL(agg.custo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top empresas */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 — consumo por empresa</CardTitle></CardHeader>
        <CardContent>
          {empresas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sem dados no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Áudio (s)</TableHead>
                  <TableHead className="text-right">Custo USD</TableHead>
                  <TableHead className="text-right">BRL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empresas.map((e) => (
                  <TableRow key={e.cid}>
                    <TableCell>
                      <div className="font-medium text-sm">{e.nome}</div>
                      <div className="text-xs text-muted-foreground font-mono">{e.cid.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(e.chamadas)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(e.tokens)}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.audio_seconds.toFixed(0)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtUSD(e.custo)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{fmtBRL(e.custo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Live feed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" /> Live feed — últimas 20 chamadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aguardando atividade…</p>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {recent.map((l) => {
                const cfg = KIND_LABEL[l.kind || "text"];
                const Icon = cfg.icon;
                const co = companies.find((c) => c.id === l.company_id);
                const nome = co?.fantasy_name || co?.name || "—";
                return (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-1 px-2 rounded hover:bg-muted text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-6 w-6 shrink-0 rounded flex items-center justify-center text-white ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="font-mono text-muted-foreground shrink-0">{fmtDate(l.criado_em)}</span>
                      <span className="truncate"><b>{nome}</b> · {l.phone || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-muted-foreground">{l.model}</span>
                      {l.kind === "text" && (
                        <span className="tabular-nums text-muted-foreground">
                          {fmtNum(l.input_tokens)} in / {fmtNum(l.output_tokens)} out
                        </span>
                      )}
                      {(l.kind === "audio_in" || l.kind === "audio_out") && (
                        <span className="tabular-nums text-muted-foreground">
                          {l.audio_seconds ? `${l.audio_seconds.toFixed(1)}s` : ""}
                          {l.char_count ? ` · ${l.char_count} chars` : ""}
                        </span>
                      )}
                      <span className="tabular-nums font-medium">{fmtUSD(l.custo_usd)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ title, value, subtitle, icon: Icon, accent }: any) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{title}</span>
          <Icon className={`h-4 w-4 ${accent}`} />
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  );
}
