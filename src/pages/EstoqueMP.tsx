// v1.0.0 — Cadastro Matérias-Primas + Lotes + Composição
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { useToast } from "@/hooks/use-toast";
import { estoqueService, MateriaPrima, Lote } from "@/services/estoqueService";
import { formatCurrency } from "@/lib/currency-formatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Package, Plus, Loader2, Truck, AlertTriangle } from "lucide-react";

export default function EstoqueMP() {
  const { companyId } = useUserRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [openMP, setOpenMP] = useState(false);
  const [openLote, setOpenLote] = useState<MateriaPrima | null>(null);
  const [balancoLote, setBalancoLote] = useState<Lote | null>(null);
  const [balancoData, setBalancoData] = useState<any>(null);

  const [mpForm, setMpForm] = useState({ nome: "", unidade_estoque: "UN" as "UN" | "KG" | "L" | "G" | "ML", controla_lote: false, estoque_minimo: "" });
  const [loteForm, setLoteForm] = useState({ codigo: "", fornecedor_nome: "", caminhao: "", qtd_esperada: "", qtd_recebida: "", custo_total: "" });

  const { data: mps = [] } = useQuery({
    queryKey: ["estoque-mp", companyId],
    queryFn: () => estoqueService.listMateriaPrima(companyId!),
    enabled: !!companyId,
  });

  const { data: lotes = [] } = useQuery({
    queryKey: ["estoque-lotes", companyId],
    queryFn: () => estoqueService.listLotes(companyId!),
    enabled: !!companyId,
  });

  const createMP = useMutation({
    mutationFn: async () => estoqueService.createMateriaPrima({
      company_id: companyId!,
      nome: mpForm.nome,
      unidade_estoque: mpForm.unidade_estoque,
      controla_lote: mpForm.controla_lote,
      estoque_minimo: mpForm.estoque_minimo ? parseFloat(mpForm.estoque_minimo) : null,
    } as any),
    onSuccess: () => {
      toast({ title: "Matéria-prima criada" });
      qc.invalidateQueries({ queryKey: ["estoque-mp"] });
      setOpenMP(false);
      setMpForm({ nome: "", unidade_estoque: "UN", controla_lote: false, estoque_minimo: "" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const createLote = useMutation({
    mutationFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.from("estoque_lotes" as any).insert({
        company_id: companyId!,
        materia_prima_id: openLote!.id,
        codigo: loteForm.codigo || null,
        fornecedor_nome: loteForm.fornecedor_nome || null,
        caminhao: loteForm.caminhao || null,
        qtd_esperada: parseFloat(loteForm.qtd_esperada),
        qtd_recebida: parseFloat(loteForm.qtd_recebida),
        custo_total: parseFloat(loteForm.custo_total || "0"),
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Lote recebido" });
      qc.invalidateQueries({ queryKey: ["estoque-lotes"] });
      setOpenLote(null);
      setLoteForm({ codigo: "", fornecedor_nome: "", caminhao: "", qtd_esperada: "", qtd_recebida: "", custo_total: "" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const handleVerBalanco = async (lote: Lote) => {
    setBalancoLote(lote);
    const data = await estoqueService.balancoLote(lote.id);
    setBalancoData(data);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Package className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-muted-foreground">Matérias-primas, lotes (FIFO) e balanço</p>
        </div>
      </div>

      <Tabs defaultValue="mp">
        <TabsList>
          <TabsTrigger value="mp">Matérias-Primas</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
        </TabsList>

        <TabsContent value="mp" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => setOpenMP(true)} className="gap-1"><Plus className="h-4 w-4" />Nova MP</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {mps.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma matéria-prima cadastrada.</p>
              ) : (
                <div className="divide-y">
                  {mps.map(mp => {
                    const lowStock = mp.estoque_minimo && !mp.controla_lote && mp.saldo < mp.estoque_minimo;
                    return (
                      <div key={mp.id} className="p-3 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold flex items-center gap-2">
                            {mp.nome}
                            {mp.controla_lote && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded">com lote</span>}
                            {lowStock && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mp.controla_lote
                              ? `Estoque via lotes`
                              : `Saldo: ${mp.saldo} ${mp.unidade_estoque}`}
                            {mp.estoque_minimo && ` · mín: ${mp.estoque_minimo}`}
                          </p>
                        </div>
                        {mp.controla_lote && (
                          <Button size="sm" variant="outline" onClick={() => setOpenLote(mp)} className="gap-1">
                            <Truck className="h-3 w-3" />Receber lote
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lotes" className="space-y-3 mt-4">
          <Card>
            <CardContent className="p-0">
              {lotes.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">Nenhum lote ainda.</p>
              ) : (
                <div className="divide-y">
                  {lotes.map(l => {
                    const saldo = l.qtd_recebida - l.qtd_vendida - l.qtd_perda;
                    return (
                      <div key={l.id} className="p-3 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold flex items-center gap-2">
                            {l.codigo || `Lote ${l.id.slice(0, 6)}`}
                            <span className={`text-xs px-1.5 rounded ${
                              l.status === 'aberto' ? 'bg-green-100 text-green-700' :
                              l.status === 'esgotado' ? 'bg-gray-200 text-gray-700' :
                              'bg-red-100 text-red-700'
                            }`}>{l.status}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {l.fornecedor_nome || '—'} · esperado {l.qtd_esperada} · recebido {l.qtd_recebida} · saldo {saldo}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleVerBalanco(l)}>Balanço</Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog nova MP */}
      <Dialog open={openMP} onOpenChange={setOpenMP}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Matéria-Prima</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={mpForm.nome} onChange={e => setMpForm({...mpForm, nome: e.target.value})} placeholder="Ex: Frango congelado" /></div>
            <div><Label>Unidade</Label>
              <Select value={mpForm.unidade_estoque} onValueChange={(v: any) => setMpForm({...mpForm, unidade_estoque: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UN">UN — Unidade</SelectItem>
                  <SelectItem value="KG">KG — Quilograma</SelectItem>
                  <SelectItem value="G">G — Grama</SelectItem>
                  <SelectItem value="L">L — Litro</SelectItem>
                  <SelectItem value="ML">ML — Mililitro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={mpForm.controla_lote} onCheckedChange={(v) => setMpForm({...mpForm, controla_lote: v})} />
              <Label>Controla lote (FIFO — distribuidora)</Label>
            </div>
            <div><Label>Estoque mínimo (opcional, alerta)</Label>
              <Input type="number" step="0.01" value={mpForm.estoque_minimo} onChange={e => setMpForm({...mpForm, estoque_minimo: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMP(false)}>Cancelar</Button>
            <Button onClick={() => createMP.mutate()} disabled={!mpForm.nome || createMP.isPending}>
              {createMP.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog receber lote */}
      <Dialog open={!!openLote} onOpenChange={(o) => !o && setOpenLote(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Receber Lote — {openLote?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Código</Label><Input value={loteForm.codigo} onChange={e => setLoteForm({...loteForm, codigo: e.target.value})} placeholder="LOTE-001" /></div>
            <div><Label>Fornecedor</Label><Input value={loteForm.fornecedor_nome} onChange={e => setLoteForm({...loteForm, fornecedor_nome: e.target.value})} /></div>
            <div><Label>Caminhão / NF</Label><Input value={loteForm.caminhao} onChange={e => setLoteForm({...loteForm, caminhao: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Qtd esperada</Label><Input type="number" step="0.01" value={loteForm.qtd_esperada} onChange={e => setLoteForm({...loteForm, qtd_esperada: e.target.value})} /></div>
              <div><Label>Qtd recebida</Label><Input type="number" step="0.01" value={loteForm.qtd_recebida} onChange={e => setLoteForm({...loteForm, qtd_recebida: e.target.value})} /></div>
            </div>
            <div><Label>Custo total (R$)</Label><Input type="number" step="0.01" value={loteForm.custo_total} onChange={e => setLoteForm({...loteForm, custo_total: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenLote(null)}>Cancelar</Button>
            <Button onClick={() => createLote.mutate()} disabled={!loteForm.qtd_recebida || createLote.isPending}>
              {createLote.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Receber
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog balanço lote */}
      <Dialog open={!!balancoLote} onOpenChange={(o) => !o && (setBalancoLote(null), setBalancoData(null))}>
        <DialogContent>
          <DialogHeader><DialogTitle>Balanço — {balancoData?.codigo || ''}</DialogTitle></DialogHeader>
          {balancoData && (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 p-2 rounded"><p className="text-xs text-muted-foreground">Esperado</p><p className="font-bold">{balancoData.esperado}</p></div>
                <div className="bg-muted/50 p-2 rounded"><p className="text-xs text-muted-foreground">Recebido</p><p className="font-bold">{balancoData.recebido}</p></div>
                <div className="bg-green-50 p-2 rounded"><p className="text-xs">Vendido</p><p className="font-bold text-green-700">{balancoData.vendido}</p></div>
                <div className="bg-red-50 p-2 rounded"><p className="text-xs">Perda</p><p className="font-bold text-red-700">{balancoData.perda}</p></div>
                <div className="bg-blue-50 p-2 rounded col-span-2"><p className="text-xs">Saldo atual</p><p className="text-xl font-bold text-blue-700">{balancoData.saldo_atual}</p></div>
              </div>
              {balancoData.diferenca_recebimento !== 0 && (
                <div className={`p-2 rounded text-xs ${balancoData.diferenca_recebimento < 0 ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>
                  Diferença recebimento: {balancoData.diferenca_recebimento} ({balancoData.diferenca_recebimento < 0 ? 'recebeu menos' : 'recebeu mais'} que esperado)
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Custo total: {formatCurrency(balancoData.custo_total)} · Custo unitário: {formatCurrency(balancoData.custo_unitario)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
