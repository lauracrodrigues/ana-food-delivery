// v1.0.0 — Contas + Categorias + Lançamentos + Transferências (CRUD financeiro)
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { useToast } from "@/hooks/use-toast";
import { financeiroService, FinConta, FinCategoria } from "@/services/financeiroService";
import { formatCurrency } from "@/lib/currency-formatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, FolderTree, ListChecks, ArrowRightLeft, Plus, Loader2 } from "lucide-react";

export default function ContasFin() {
  const { companyId } = useUserRole();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [openConta, setOpenConta] = useState(false);
  const [openCat, setOpenCat] = useState(false);
  const [openLanc, setOpenLanc] = useState(false);
  const [openTransf, setOpenTransf] = useState(false);

  const [contaForm, setContaForm] = useState({ nome: "", tipo: "caixa" as FinConta["tipo"] });
  const [catForm, setCatForm] = useState({ nome: "", tipo: "despesa" as "receita" | "despesa", parent_id: "" });
  const [lancForm, setLancForm] = useState({ conta_id: "", categoria_id: "", tipo: "saida" as "entrada" | "saida", valor: "", descricao: "", data: new Date().toISOString().slice(0, 10) });
  const [transfForm, setTransfForm] = useState({ origem: "", destino: "", valor: "", descricao: "" });

  const { data: contas = [] } = useQuery({ queryKey: ["fin-contas", companyId], queryFn: () => financeiroService.listContas(companyId!), enabled: !!companyId });
  const { data: categorias = [] } = useQuery({ queryKey: ["fin-categorias", companyId], queryFn: () => financeiroService.listCategorias(companyId!), enabled: !!companyId });
  const { data: lancamentos = [] } = useQuery({ queryKey: ["fin-lancamentos", companyId], queryFn: () => financeiroService.listLancamentos(companyId!, { limit: 50 }), enabled: !!companyId });

  const createConta = useMutation({
    mutationFn: async () => financeiroService.createConta({ company_id: companyId!, ...contaForm }),
    onSuccess: () => { toast({ title: "Conta criada" }); qc.invalidateQueries({ queryKey: ["fin-contas"] }); setOpenConta(false); setContaForm({ nome: "", tipo: "caixa" }); },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const createCat = useMutation({
    mutationFn: async () => financeiroService.createCategoria({ company_id: companyId!, nome: catForm.nome, tipo: catForm.tipo, parent_id: catForm.parent_id || null } as any),
    onSuccess: () => { toast({ title: "Categoria criada" }); qc.invalidateQueries({ queryKey: ["fin-categorias"] }); setOpenCat(false); setCatForm({ nome: "", tipo: "despesa", parent_id: "" }); },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const createLanc = useMutation({
    mutationFn: async () => financeiroService.createLancamento({
      company_id: companyId!, conta_id: lancForm.conta_id, categoria_id: lancForm.categoria_id || null,
      tipo: lancForm.tipo, valor: parseFloat(lancForm.valor), descricao: lancForm.descricao,
      data_competencia: lancForm.data, data_caixa: lancForm.data, origem: "manual",
    } as any),
    onSuccess: () => { toast({ title: "Lançamento criado" }); qc.invalidateQueries({ queryKey: ["fin-lancamentos"] }); qc.invalidateQueries({ queryKey: ["fin-contas"] }); setOpenLanc(false); setLancForm({ conta_id: "", categoria_id: "", tipo: "saida", valor: "", descricao: "", data: new Date().toISOString().slice(0, 10) }); },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  const createTransf = useMutation({
    mutationFn: async () => financeiroService.criarTransferencia(companyId!, transfForm.origem, transfForm.destino, parseFloat(transfForm.valor), transfForm.descricao),
    onSuccess: () => { toast({ title: "Transferência registrada" }); qc.invalidateQueries({ queryKey: ["fin-contas"] }); qc.invalidateQueries({ queryKey: ["fin-lancamentos"] }); setOpenTransf(false); setTransfForm({ origem: "", destino: "", valor: "", descricao: "" }); },
    onError: (e: any) => toast({ title: "Erro", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Financeiro</h1>
      </div>

      <Tabs defaultValue="contas">
        <TabsList>
          <TabsTrigger value="contas"><Wallet className="h-3 w-3 mr-1" />Contas</TabsTrigger>
          <TabsTrigger value="cats"><FolderTree className="h-3 w-3 mr-1" />Categorias</TabsTrigger>
          <TabsTrigger value="lanc"><ListChecks className="h-3 w-3 mr-1" />Lançamentos</TabsTrigger>
          <TabsTrigger value="transf"><ArrowRightLeft className="h-3 w-3 mr-1" />Transferências</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-3 mt-4">
          <div className="flex justify-end"><Button onClick={() => setOpenConta(true)} className="gap-1"><Plus className="h-4 w-4" />Nova conta</Button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {contas.map(c => (
              <Card key={c.id}><CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase text-muted-foreground">{c.tipo}</span>
                  {c.is_default && <span className="text-xs bg-primary/10 text-primary px-1.5 rounded">padrão</span>}
                </div>
                <p className="font-semibold">{c.nome}</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(c.saldo)}</p>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cats" className="space-y-3 mt-4">
          <div className="flex justify-end"><Button onClick={() => setOpenCat(true)} className="gap-1"><Plus className="h-4 w-4" />Nova categoria</Button></div>
          <div className="grid grid-cols-2 gap-3">
            <Card><CardHeader><CardTitle className="text-base text-green-600">Receitas</CardTitle></CardHeader><CardContent className="space-y-1">
              {categorias.filter(c => c.tipo === 'receita').map(c => (
                <div key={c.id} className="text-sm border-b py-1">
                  {c.codigo && <span className="text-xs text-muted-foreground mr-2">{c.codigo}</span>}{c.nome}
                  {c.is_system && <span className="text-xs bg-muted px-1 ml-1 rounded">sistema</span>}
                </div>
              ))}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base text-red-600">Despesas</CardTitle></CardHeader><CardContent className="space-y-1">
              {categorias.filter(c => c.tipo === 'despesa').map(c => (
                <div key={c.id} className="text-sm border-b py-1">
                  {c.codigo && <span className="text-xs text-muted-foreground mr-2">{c.codigo}</span>}{c.nome}
                  {c.is_system && <span className="text-xs bg-muted px-1 ml-1 rounded">sistema</span>}
                </div>
              ))}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="lanc" className="space-y-3 mt-4">
          <div className="flex justify-end"><Button onClick={() => setOpenLanc(true)} className="gap-1"><Plus className="h-4 w-4" />Novo lançamento</Button></div>
          <Card><CardContent className="p-0">
            <div className="divide-y">
              {lancamentos.map((l: any) => (
                <div key={l.id} className="p-3 flex justify-between items-center text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{l.descricao || '—'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(l.data_competencia).toLocaleDateString("pt-BR")} · {l.conta?.nome || ''} · {l.categoria?.nome || ''}</p>
                  </div>
                  <span className={`font-bold ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>{l.tipo === 'entrada' ? '+' : '-'}{formatCurrency(l.valor)}</span>
                </div>
              ))}
              {lancamentos.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Sem lançamentos.</p>}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="transf" className="space-y-3 mt-4">
          <div className="flex justify-end"><Button onClick={() => setOpenTransf(true)} className="gap-1"><Plus className="h-4 w-4" />Nova transferência</Button></div>
          <Card><CardContent className="p-4 text-sm text-muted-foreground">Transferências entre contas geram 2 lançamentos espelhados (saída origem + entrada destino).</CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={openConta} onOpenChange={setOpenConta}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={contaForm.nome} onChange={e => setContaForm({...contaForm, nome: e.target.value})} placeholder="Ex: Banco Itaú principal" /></div>
            <div><Label>Tipo</Label>
              <Select value={contaForm.tipo} onValueChange={(v: any) => setContaForm({...contaForm, tipo: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="caixa">Caixa (dinheiro físico)</SelectItem>
                  <SelectItem value="cofre">Cofre</SelectItem>
                  <SelectItem value="banco">Banco</SelectItem>
                  <SelectItem value="carteira">Carteira digital</SelectItem>
                  <SelectItem value="cartao_credito">Cartão crédito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenConta(false)}>Cancelar</Button><Button onClick={() => createConta.mutate()} disabled={!contaForm.nome || createConta.isPending}>{createConta.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openCat} onOpenChange={setOpenCat}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={catForm.nome} onChange={e => setCatForm({...catForm, nome: e.target.value})} /></div>
            <div><Label>Tipo</Label>
              <Select value={catForm.tipo} onValueChange={(v: any) => setCatForm({...catForm, tipo: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Categoria pai (opcional)</Label>
              <Select value={catForm.parent_id} onValueChange={(v) => setCatForm({...catForm, parent_id: v})}>
                <SelectTrigger><SelectValue placeholder="Sem pai (raiz)" /></SelectTrigger>
                <SelectContent>
                  {categorias.filter(c => c.tipo === catForm.tipo).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenCat(false)}>Cancelar</Button><Button onClick={() => createCat.mutate()} disabled={!catForm.nome || createCat.isPending}>{createCat.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openLanc} onOpenChange={setOpenLanc}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Tipo</Label>
                <Select value={lancForm.tipo} onValueChange={(v: any) => setLancForm({...lancForm, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Valor</Label><Input type="number" step="0.01" value={lancForm.valor} onChange={e => setLancForm({...lancForm, valor: e.target.value})} /></div>
            </div>
            <div><Label>Conta</Label>
              <Select value={lancForm.conta_id} onValueChange={(v) => setLancForm({...lancForm, conta_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Categoria</Label>
              <Select value={lancForm.categoria_id} onValueChange={(v) => setLancForm({...lancForm, categoria_id: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{categorias.filter(c => c.tipo === (lancForm.tipo === 'entrada' ? 'receita' : 'despesa')).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição</Label><Input value={lancForm.descricao} onChange={e => setLancForm({...lancForm, descricao: e.target.value})} /></div>
            <div><Label>Data</Label><Input type="date" value={lancForm.data} onChange={e => setLancForm({...lancForm, data: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenLanc(false)}>Cancelar</Button><Button onClick={() => createLanc.mutate()} disabled={!lancForm.conta_id || !lancForm.valor || createLanc.isPending}>{createLanc.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openTransf} onOpenChange={setOpenTransf}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova transferência</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Origem</Label>
              <Select value={transfForm.origem} onValueChange={(v) => setTransfForm({...transfForm, origem: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} ({formatCurrency(c.saldo)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Destino</Label>
              <Select value={transfForm.destino} onValueChange={(v) => setTransfForm({...transfForm, destino: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{contas.filter(c => c.id !== transfForm.origem).map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Valor</Label><Input type="number" step="0.01" value={transfForm.valor} onChange={e => setTransfForm({...transfForm, valor: e.target.value})} /></div>
            <div><Label>Descrição</Label><Input value={transfForm.descricao} onChange={e => setTransfForm({...transfForm, descricao: e.target.value})} placeholder="Ex: fim de turno" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenTransf(false)}>Cancelar</Button><Button onClick={() => createTransf.mutate()} disabled={!transfForm.origem || !transfForm.destino || !transfForm.valor || createTransf.isPending}>{createTransf.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Transferir</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
