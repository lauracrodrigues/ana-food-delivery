// v1.0.0 — Página Caixa: abertura, sangria, fechamento
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { useToast } from "@/hooks/use-toast";
import { caixaService } from "@/services/caixaService";
import { formatCurrency } from "@/lib/currency-formatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Wallet, Plus, Minus, Lock, Unlock, Loader2, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle } from "lucide-react";

export default function Caixa() {
  const { companyId } = useUserRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [openAbertura, setOpenAbertura] = useState(false);
  const [openFechamento, setOpenFechamento] = useState(false);
  const [openMovimento, setOpenMovimento] = useState<null | 'suprimento' | 'sangria_despesa' | 'sangria_cofre'>(null);

  const [valorInicial, setValorInicial] = useState("");
  const [operadorNome, setOperadorNome] = useState("");
  const [valorMov, setValorMov] = useState("");
  const [motivoMov, setMotivoMov] = useState("");
  const [valorContado, setValorContado] = useState("");

  const { data: caixa, isLoading } = useQuery({
    queryKey: ["caixa-atual", companyId],
    queryFn: () => caixaService.getAtual(companyId!),
    enabled: !!companyId,
    refetchInterval: 10000,
  });

  const abrirMutation = useMutation({
    mutationFn: async () => caixaService.abrir(companyId!, parseFloat(valorInicial) || 0, operadorNome),
    onSuccess: (res: any) => {
      if (res?.error) { toast({ title: "Erro", description: res.message || res.error, variant: "destructive" }); return; }
      toast({ title: "Caixa aberto!" });
      qc.invalidateQueries({ queryKey: ["caixa-atual"] });
      setOpenAbertura(false); setValorInicial(""); setOperadorNome("");
    },
  });

  const movMutation = useMutation({
    mutationFn: async () => caixaService.registrarMovimento(companyId!, openMovimento!, parseFloat(valorMov), motivoMov),
    onSuccess: (res: any) => {
      if (res?.error) { toast({ title: "Erro", description: res.message, variant: "destructive" }); return; }
      toast({ title: "Movimento registrado" });
      qc.invalidateQueries({ queryKey: ["caixa-atual"] });
      setOpenMovimento(null); setValorMov(""); setMotivoMov("");
    },
  });

  const fecharMutation = useMutation({
    mutationFn: async () => caixaService.fechar(caixa!.caixa_id!, parseFloat(valorContado)),
    onSuccess: (res: any) => {
      toast({
        title: `Caixa fechado — quebra ${res.quebra_status}`,
        description: `Sistema: ${formatCurrency(res.valor_sistema)} | Contado: ${formatCurrency(res.valor_contado)} | Quebra: ${formatCurrency(res.quebra)}`,
      });
      qc.invalidateQueries({ queryKey: ["caixa-atual"] });
      setOpenFechamento(false); setValorContado("");
    },
  });

  if (isLoading) return <div className="p-6"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const aberto = caixa?.aberto;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Caixa</h1>
          <p className="text-sm text-muted-foreground">Abertura, movimentos e fechamento com quebra</p>
        </div>
      </div>

      {!aberto ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
            <p className="text-lg font-semibold">Caixa fechado</p>
            <p className="text-sm text-muted-foreground">Abra o caixa antes de fazer movimentos.</p>
            <Button onClick={() => setOpenAbertura(true)} className="gap-2">
              <Unlock className="h-4 w-4" />
              Abrir caixa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Fundo inicial</p>
              <p className="text-xl font-bold">{formatCurrency(caixa.valor_inicial || 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-xl font-bold text-green-600">+{formatCurrency(caixa.total_entradas || 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="text-xl font-bold text-red-600">-{formatCurrency(caixa.total_saidas || 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Saldo esperado</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(caixa.saldo_esperado || 0)}</p>
            </CardContent></Card>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setOpenMovimento('suprimento')} variant="outline" className="gap-1">
              <Plus className="h-4 w-4 text-green-600" /> Suprimento
            </Button>
            <Button onClick={() => setOpenMovimento('sangria_despesa')} variant="outline" className="gap-1">
              <Minus className="h-4 w-4 text-red-600" /> Sangria (despesa)
            </Button>
            <Button onClick={() => setOpenMovimento('sangria_cofre')} variant="outline" className="gap-1">
              <ArrowUpRight className="h-4 w-4 text-purple-600" /> Sangria → cofre
            </Button>
            <Button onClick={() => setOpenFechamento(true)} variant="destructive" className="gap-1 ml-auto">
              <Lock className="h-4 w-4" /> Fechar caixa
            </Button>
          </div>

          {/* Movimentos */}
          <Card>
            <CardHeader><CardTitle className="text-base">Movimentos</CardTitle></CardHeader>
            <CardContent>
              {(caixa.movimentos || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum movimento ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {(caixa.movimentos || []).map(m => (
                    <div key={m.id} className="flex items-center justify-between text-sm border-b py-1.5">
                      <div className="flex items-center gap-2">
                        {m.sinal === 1 ? <ArrowDownRight className="h-4 w-4 text-green-600" /> : <ArrowUpRight className="h-4 w-4 text-red-600" />}
                        <span className="font-medium">{m.tipo.replace('_', ' ')}</span>
                        {m.motivo && <span className="text-muted-foreground text-xs">— {m.motivo}</span>}
                      </div>
                      <span className={`font-bold ${m.sinal === 1 ? 'text-green-600' : 'text-red-600'}`}>
                        {m.sinal === 1 ? '+' : '-'}{formatCurrency(m.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Abertura */}
      <Dialog open={openAbertura} onOpenChange={setOpenAbertura}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir caixa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Fundo de troco (R$)</Label>
              <Input type="number" step="0.01" value={valorInicial} onChange={e => setValorInicial(e.target.value)} placeholder="100.00" /></div>
            <div><Label>Operador</Label>
              <Input value={operadorNome} onChange={e => setOperadorNome(e.target.value)} placeholder="Seu nome" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAbertura(false)}>Cancelar</Button>
            <Button onClick={() => abrirMutation.mutate()} disabled={abrirMutation.isPending}>
              {abrirMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Movimento */}
      <Dialog open={!!openMovimento} onOpenChange={(o) => !o && setOpenMovimento(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{
            openMovimento === 'suprimento' ? 'Suprimento (entrada)' :
            openMovimento === 'sangria_despesa' ? 'Sangria — despesa em dinheiro' :
            'Sangria → cofre'
          }</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={valorMov} onChange={e => setValorMov(e.target.value)} /></div>
            <div><Label>Motivo</Label>
              <Input value={motivoMov} onChange={e => setMotivoMov(e.target.value)} placeholder="Ex: troco, compra água, transferência fim de turno" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMovimento(null)}>Cancelar</Button>
            <Button onClick={() => movMutation.mutate()} disabled={movMutation.isPending || !valorMov}>
              {movMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Fechamento */}
      <Dialog open={openFechamento} onOpenChange={setOpenFechamento}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar caixa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="font-semibold mb-1">Saldo esperado:</p>
              <p className="text-2xl font-bold">{formatCurrency(caixa?.saldo_esperado || 0)}</p>
            </div>
            <div><Label>Valor contado (R$)</Label>
              <Input type="number" step="0.01" value={valorContado} onChange={e => setValorContado(e.target.value)} placeholder={String(caixa?.saldo_esperado || 0)} /></div>
            {valorContado && (
              <div className="bg-muted/50 rounded p-2 text-sm">
                <p>Quebra: <strong className={
                  parseFloat(valorContado) - (caixa?.saldo_esperado || 0) === 0 ? 'text-green-600' :
                  parseFloat(valorContado) > (caixa?.saldo_esperado || 0) ? 'text-blue-600' : 'text-red-600'
                }>{formatCurrency(parseFloat(valorContado) - (caixa?.saldo_esperado || 0))}</strong></p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenFechamento(false)}>Cancelar</Button>
            <Button onClick={() => fecharMutation.mutate()} disabled={fecharMutation.isPending || !valorContado} variant="destructive">
              {fecharMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Fechar caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
