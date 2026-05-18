// v1.0.0 — Movimentos: orçamentos + pedidos venda + faturados
// Substitui kanban delivery quando empresa = distribuidora
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { useToast } from "@/hooks/use-toast";
import { movimentoService } from "@/services/movimentoService";
import { formatCurrency } from "@/lib/currency-formatter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, ShoppingBag, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function Movimentos() {
  const { companyId } = useUserRole();
  const { toast } = useToast();
  const [tab, setTab] = useState<'orcamentos' | 'pedidos' | 'faturados'>('orcamentos');

  const { data: orcamentos = [], refetch: refetchOrc } = useQuery({
    queryKey: ["movimentos-orcamentos", companyId],
    queryFn: () => movimentoService.listOrcamentos(companyId!),
    enabled: !!companyId,
  });

  const { data: pedidos = [], refetch: refetchPed } = useQuery({
    queryKey: ["movimentos-pedidos", companyId],
    queryFn: () => movimentoService.listPedidosAtivos(companyId!),
    enabled: !!companyId,
  });

  const { data: faturados = [], refetch: refetchFat } = useQuery({
    queryKey: ["movimentos-faturados", companyId],
    queryFn: () => movimentoService.listFaturados(companyId!, 30),
    enabled: !!companyId,
  });

  const handleConverter = async (id: string) => {
    try {
      await movimentoService.converterOrcamentoEmPedido(id);
      toast({ title: "Orçamento convertido em pedido" });
      refetchOrc(); refetchPed();
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }); }
  };

  const handleFaturar = async (id: string) => {
    try {
      const r = await movimentoService.faturar(id);
      if ((r as any)?.error) { toast({ title: "Erro", description: (r as any).message || (r as any).error, variant: "destructive" }); return; }
      toast({ title: "Pedido faturado", description: "Estoque baixado + lançamento financeiro criado" });
      refetchPed(); refetchFat();
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }); }
  };

  const handleCancelar = async (id: string) => {
    if (!confirm("Cancelar movimento?")) return;
    try {
      await movimentoService.cancelar(id);
      toast({ title: "Movimento cancelado" });
      refetchOrc(); refetchPed(); refetchFat();
    } catch (e: any) { toast({ title: "Erro", description: e?.message, variant: "destructive" }); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <FileText className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Movimentações</h1>
          <p className="text-sm text-muted-foreground">Orçamentos, pedidos de venda e faturados (distribuidora)</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="orcamentos"><FileText className="h-3 w-3 mr-1" />Orçamentos ({orcamentos.length})</TabsTrigger>
          <TabsTrigger value="pedidos"><ShoppingBag className="h-3 w-3 mr-1" />Pedidos Venda ({pedidos.length})</TabsTrigger>
          <TabsTrigger value="faturados"><CheckCircle2 className="h-3 w-3 mr-1" />Faturados ({faturados.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orcamentos" className="mt-4">
          <Lista lista={orcamentos} actionLabel="Converter em pedido" onAction={handleConverter} onCancelar={handleCancelar} actionIcon={<ArrowRight className="h-3 w-3" />} />
        </TabsContent>
        <TabsContent value="pedidos" className="mt-4">
          <Lista lista={pedidos} actionLabel="Faturar" onAction={handleFaturar} onCancelar={handleCancelar} actionIcon={<CheckCircle2 className="h-3 w-3" />} actionVariant="default" />
        </TabsContent>
        <TabsContent value="faturados" className="mt-4">
          <Lista lista={faturados} actionLabel={null} onAction={() => {}} onCancelar={handleCancelar} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Lista({ lista, actionLabel, onAction, onCancelar, actionIcon, actionVariant = "outline" as any }: any) {
  if (lista.length === 0) {
    return <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">Nenhum item.</CardContent></Card>;
  }
  return (
    <Card><CardContent className="p-0">
      <div className="divide-y">
        {lista.map((o: any) => (
          <div key={o.id} className="p-3 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {o.customer_name || 'Cliente'}
                {o.order_number && <span className="text-xs text-muted-foreground ml-2">#{o.order_number}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                {o.origin && ` · ${o.origin}`} · {o.payment_method || '—'}
              </p>
            </div>
            <span className="text-lg font-bold text-primary whitespace-nowrap">{formatCurrency(o.total)}</span>
            <div className="flex gap-1">
              {actionLabel && (
                <Button size="sm" variant={actionVariant} onClick={() => onAction(o.id)} className="gap-1">
                  {actionIcon}{actionLabel}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onCancelar(o.id)}>×</Button>
            </div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}
