// v1.0.0 — DRE + Fluxo Caixa (relatórios financeiros)
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { financeiroService } from "@/services/financeiroService";
import { formatCurrency } from "@/lib/currency-formatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, FileText } from "lucide-react";

function inicioMesISO(offsetMonths = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths, 1);
  d.setHours(0,0,0,0);
  return d.toISOString();
}

export default function DRE() {
  const { companyId } = useUserRole();
  const [offset, setOffset] = useState(0);

  const mesISO = inicioMesISO(offset);
  const mesLabel = new Date(mesISO).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const { data: dre = [] } = useQuery({
    queryKey: ["dre", companyId, mesISO],
    queryFn: () => financeiroService.getDRE(companyId!, mesISO),
    enabled: !!companyId,
  });

  const { data: fluxo = [] } = useQuery({
    queryKey: ["fluxo-caixa", companyId, offset],
    queryFn: () => {
      const from = new Date(inicioMesISO(offset)).toISOString().slice(0, 10);
      const to = new Date(inicioMesISO(offset + 1)).toISOString().slice(0, 10);
      return financeiroService.getFluxoCaixa(companyId!, from, to);
    },
    enabled: !!companyId,
  });

  const receitas = dre.filter(d => d.tipo_categoria === 'receita');
  const despesas = dre.filter(d => d.tipo_categoria === 'despesa');
  const totalReceita = receitas.reduce((s, d) => s + Number(d.total || 0), 0);
  const totalDespesa = despesas.reduce((s, d) => s + Number(d.total || 0), 0);
  const lucro = totalReceita - totalDespesa;

  const totalEntradasFx = fluxo.reduce((s, f) => s + Number(f.entradas || 0), 0);
  const totalSaidasFx = fluxo.reduce((s, f) => s + Number(f.saidas || 0), 0);
  const saldoFx = totalEntradasFx - totalSaidasFx;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4 print:p-2">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios Financeiros</h1>
            <p className="text-sm text-muted-foreground">DRE + Fluxo de Caixa</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setOffset(o => o - 1)} className="px-2 py-1 border rounded text-sm">◀</button>
          <span className="px-3 py-1 bg-muted rounded text-sm font-medium capitalize">{mesLabel}</span>
          <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset >= 0} className="px-2 py-1 border rounded text-sm disabled:opacity-30">▶</button>
          <button onClick={() => window.print()} className="px-3 py-1 border rounded text-sm ml-2">🖨️ Imprimir</button>
        </div>
      </div>

      <Tabs defaultValue="dre">
        <TabsList>
          <TabsTrigger value="dre">DRE (Competência)</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo Caixa (Regime caixa)</TabsTrigger>
        </TabsList>

        <TabsContent value="dre" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceita)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesa)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Resultado</p>
              <p className={`text-2xl font-bold ${lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(lucro)}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" />Receitas</CardTitle></CardHeader>
            <CardContent>
              {receitas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">Sem receita no mês.</p> : (
                <div className="space-y-1">
                  {receitas.map((r, i) => (
                    <div key={i} className="flex justify-between text-sm border-b py-1">
                      <span>{r.codigo && <span className="text-muted-foreground text-xs mr-2">{r.codigo}</span>}{r.categoria}</span>
                      <span className="font-semibold">{formatCurrency(r.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 text-green-600">
                    <span>Total Receitas</span><span>{formatCurrency(totalReceita)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" />Despesas</CardTitle></CardHeader>
            <CardContent>
              {despesas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">Sem despesa no mês.</p> : (
                <div className="space-y-1">
                  {despesas.map((d, i) => (
                    <div key={i} className="flex justify-between text-sm border-b py-1">
                      <span>{d.codigo && <span className="text-muted-foreground text-xs mr-2">{d.codigo}</span>}{d.categoria}</span>
                      <span className="font-semibold">{formatCurrency(d.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 text-red-600">
                    <span>Total Despesas</span><span>{formatCurrency(totalDespesa)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary">
            <CardContent className="p-4 flex justify-between items-center">
              <span className="text-lg font-bold">Resultado do período</span>
              <span className={`text-3xl font-bold ${lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(lucro)}</span>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fluxo" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalEntradasFx)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalSaidasFx)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">Saldo período</p>
              <p className={`text-2xl font-bold ${saldoFx >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(saldoFx)}</p>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Movimentação diária por conta</CardTitle></CardHeader>
            <CardContent>
              {fluxo.length === 0 ? <p className="text-sm text-muted-foreground text-center py-3">Sem movimento no período.</p> : (
                <div className="space-y-1">
                  {fluxo.map((f, i) => (
                    <div key={i} className="flex justify-between text-sm border-b py-1 gap-2">
                      <span className="text-xs text-muted-foreground w-20">{new Date(f.dia).toLocaleDateString("pt-BR")}</span>
                      <span className="flex-1 truncate">{f.conta}</span>
                      <span className="text-green-600 w-24 text-right">+{formatCurrency(f.entradas)}</span>
                      <span className="text-red-600 w-24 text-right">-{formatCurrency(f.saidas)}</span>
                      <span className={`w-24 text-right font-semibold ${f.saldo_dia >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(f.saldo_dia)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
