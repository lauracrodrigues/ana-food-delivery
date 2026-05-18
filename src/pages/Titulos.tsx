// v1.0.0 — Página Títulos (contas pagar/receber + fiado)
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { useToast } from "@/hooks/use-toast";
import { tituloService, FinTitulo } from "@/services/tituloService";
import { financeiroService } from "@/services/financeiroService";
import { formatCurrency } from "@/lib/currency-formatter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function Titulos() {
  const { companyId } = useUserRole();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'receber' | 'pagar'>('receber');
  const [baixaOpen, setBaixaOpen] = useState<FinTitulo | null>(null);
  const [valorBaixa, setValorBaixa] = useState("");
  const [contaBaixa, setContaBaixa] = useState("");

  const { data: titulos = [] } = useQuery({
    queryKey: ["titulos-abertos", companyId, tab],
    queryFn: () => tituloService.listAberto(companyId!, tab),
    enabled: !!companyId,
  });

  const { data: contas = [] } = useQuery({
    queryKey: ["fin-contas", companyId],
    queryFn: () => financeiroService.listContas(companyId!),
    enabled: !!companyId,
  });

  const baixaMutation = useMutation({
    mutationFn: async () => tituloService.baixar(baixaOpen!.id, parseFloat(valorBaixa), contaBaixa),
    onSuccess: (r) => {
      toast({ title: `Baixa registrada: ${formatCurrency(r.valor_baixado)}`, description: `Status: ${r.status}, saldo: ${formatCurrency(r.novo_saldo)}` });
      qc.invalidateQueries({ queryKey: ["titulos-abertos"] });
      qc.invalidateQueries({ queryKey: ["fin-contas"] });
      setBaixaOpen(null); setValorBaixa("");
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const totalAberto = titulos.reduce((s, t) => s + Number(t.saldo || 0), 0);
  const totalVencido = titulos.filter(t => t.status_real === 'vencido').reduce((s, t) => s + Number(t.saldo || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Receipt className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Títulos</h1>
          <p className="text-sm text-muted-foreground">Contas a pagar/receber + fiado</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="receber">A Receber</TabsTrigger>
          <TabsTrigger value="pagar">A Pagar</TabsTrigger>
        </TabsList>
        <TabsContent value="receber" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total em aberto</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAberto)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Vencido</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalVencido)}</p>
            </CardContent></Card>
          </div>
          <ListaTitulos titulos={titulos} onBaixar={setBaixaOpen} />
        </TabsContent>
        <TabsContent value="pagar" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Total a pagar</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalAberto)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Vencido</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalVencido)}</p>
            </CardContent></Card>
          </div>
          <ListaTitulos titulos={titulos} onBaixar={setBaixaOpen} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!baixaOpen} onOpenChange={(o) => !o && setBaixaOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Baixar título</DialogTitle></DialogHeader>
          {baixaOpen && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded p-3 text-sm space-y-1">
                <p><strong>{baixaOpen.contraparte_nome}</strong></p>
                <p>Valor original: {formatCurrency(baixaOpen.valor_original)}</p>
                <p>Saldo: <strong>{formatCurrency(baixaOpen.saldo)}</strong></p>
                <p className="text-xs text-muted-foreground">Vencimento: {new Date(baixaOpen.data_vencimento).toLocaleDateString("pt-BR")}</p>
              </div>
              <div><Label>Valor da baixa (R$)</Label>
                <Input type="number" step="0.01" value={valorBaixa} onChange={e => setValorBaixa(e.target.value)} placeholder={String(baixaOpen.saldo)} /></div>
              <div><Label>Conta destino</Label>
                <Select value={contaBaixa} onValueChange={setContaBaixa}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({formatCurrency(c.saldo)})</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaOpen(null)}>Cancelar</Button>
            <Button onClick={() => baixaMutation.mutate()} disabled={baixaMutation.isPending || !valorBaixa || !contaBaixa}>
              {baixaMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Confirmar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListaTitulos({ titulos, onBaixar }: { titulos: FinTitulo[]; onBaixar: (t: FinTitulo) => void }) {
  if (titulos.length === 0) {
    return <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Nenhum título em aberto.</CardContent></Card>;
  }
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {titulos.map(t => {
            const vencido = t.status_real === 'vencido';
            return (
              <div key={t.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{t.contraparte_nome || '—'}</p>
                    {vencido && <span className="text-xs bg-red-100 text-red-700 px-1.5 rounded">VENCIDO</span>}
                    {t.status === 'parcial' && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded">PARCIAL</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.descricao || t.numero_documento || ''}</p>
                  <p className="text-xs text-muted-foreground">Venc: {new Date(t.data_vencimento).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(t.saldo)}</p>
                  {t.valor_pago > 0 && <p className="text-xs text-muted-foreground">pago {formatCurrency(t.valor_pago)} de {formatCurrency(t.valor_original)}</p>}
                </div>
                <Button size="sm" onClick={() => onBaixar(t)} className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Baixar
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
