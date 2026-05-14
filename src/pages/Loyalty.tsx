// v1.0.0 — Dashboard admin do programa de fidelidade (regras + saldos + transações)
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/currency-formatter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Users, TrendingUp, TrendingDown, Save, Search } from "lucide-react";

interface LoyaltyPoint {
  id: string;
  customer_phone: string;
  points: number;
  updated_at: string;
}

interface LoyaltyTransaction {
  id: string;
  customer_phone: string;
  order_id: string;
  points_earned: number;
  points_redeemed: number;
  balance_after: number;
  created_at: string;
}

interface CompanyLoyaltyConfig {
  loyalty_points_per_real: number;
  loyalty_min_redeem: number;
  loyalty_redeem_value: number;
}

export default function Loyalty() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  // Company ID
  const { data: companyId } = useQuery({
    queryKey: ["my-company-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      return data?.company_id ?? null;
    },
  });

  // Config da empresa
  const { data: config } = useQuery({
    queryKey: ["company-loyalty-config", companyId],
    queryFn: async (): Promise<CompanyLoyaltyConfig | null> => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies")
        .select("loyalty_points_per_real, loyalty_min_redeem, loyalty_redeem_value")
        .eq("id", companyId).single();
      return data as any;
    },
    enabled: !!companyId,
  });

  // Estado local da config (editável)
  const [editConfig, setEditConfig] = useState<CompanyLoyaltyConfig>({
    loyalty_points_per_real: 1,
    loyalty_min_redeem: 100,
    loyalty_redeem_value: 1,
  });
  useEffect(() => {
    if (config) setEditConfig(config);
  }, [config]);

  // Saldos dos clientes
  const { data: balances = [], isLoading: loadingBalances } = useQuery({
    queryKey: ["loyalty-balances", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("loyalty_points" as any)
        .select("*").eq("company_id", companyId).order("points", { ascending: false });
      return (data as LoyaltyPoint[]) || [];
    },
    enabled: !!companyId,
  });

  // Últimas transações
  const { data: transactions = [] } = useQuery({
    queryKey: ["loyalty-transactions", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("loyalty_transactions" as any)
        .select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(50);
      return (data as LoyaltyTransaction[]) || [];
    },
    enabled: !!companyId,
  });

  // KPIs derivados
  const totalActiveCustomers = balances.filter(b => b.points > 0).length;
  const totalPointsCirculating = balances.reduce((sum, b) => sum + b.points, 0);
  const totalEarned = transactions.reduce((sum, t) => sum + t.points_earned, 0);
  const totalRedeemed = transactions.reduce((sum, t) => sum + t.points_redeemed, 0);

  const filteredBalances = balances.filter(b =>
    !search || b.customer_phone.includes(search)
  );

  const saveConfig = async () => {
    if (!companyId) return;
    const { error } = await supabase.from("companies").update(editConfig).eq("id", companyId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Configurações salvas" });
    qc.invalidateQueries({ queryKey: ["company-loyalty-config", companyId] });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          Fidelidade
        </h1>
        <p className="text-sm text-muted-foreground">Programa de pontos dos clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Clientes ativos</span>
            </div>
            <p className="text-2xl font-bold">{totalActiveCustomers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs">Pontos em circulação</span>
            </div>
            <p className="text-2xl font-bold">{totalPointsCirculating.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-xs">Pontos emitidos (50 últ.)</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{totalEarned.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              <span className="text-xs">Pontos resgatados (50 últ.)</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{totalRedeemed.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        {/* Tab: Saldos dos clientes */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="text-base">Saldos por cliente</CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar telefone..." className="pl-8 h-8 text-sm" />
              </div>
            </CardHeader>
            <CardContent>
              {loadingBalances ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : filteredBalances.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum cliente com pontos ainda
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredBalances.map((b, idx) => (
                    <div key={b.id} className="flex items-center gap-3 py-2 px-3 border rounded-lg">
                      <span className="text-xs font-bold text-muted-foreground w-6">{idx + 1}º</span>
                      <span className="flex-1 font-mono text-sm">{b.customer_phone}</span>
                      <span className="text-sm font-bold text-primary">{b.points} pts</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(b.updated_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Transações */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimas 50 transações</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">
                  Sem transações ainda
                </div>
              ) : (
                <div className="space-y-1">
                  {transactions.map(t => (
                    <div key={t.id} className="flex items-center gap-3 py-2 px-3 border rounded-lg text-sm">
                      <span className="font-mono text-xs">{t.customer_phone}</span>
                      <span className="flex-1 text-xs text-muted-foreground">
                        Pedido {t.order_id.slice(-6).toUpperCase()}
                      </span>
                      {t.points_earned > 0 && (
                        <span className="text-green-600 font-medium">+{t.points_earned}</span>
                      )}
                      {t.points_redeemed > 0 && (
                        <span className="text-amber-600 font-medium">-{t.points_redeemed}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        saldo: {t.balance_after}
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configurações */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regras do programa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Pontos por R$ 1,00 gasto</Label>
                <Input type="number" min="0" step="0.1"
                  value={editConfig.loyalty_points_per_real}
                  onChange={e => setEditConfig({ ...editConfig, loyalty_points_per_real: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">
                  Ex: 1 ponto = pedido de R$ 50 gera 50 pontos
                </p>
              </div>

              <div className="space-y-2">
                <Label>Pontos mínimos para resgate</Label>
                <Input type="number" min="0"
                  value={editConfig.loyalty_min_redeem}
                  onChange={e => setEditConfig({ ...editConfig, loyalty_min_redeem: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">
                  Cliente precisa ter ao menos isso pra resgatar
                </p>
              </div>

              <div className="space-y-2">
                <Label>Valor do resgate (R$)</Label>
                <Input type="number" min="0" step="0.01"
                  value={editConfig.loyalty_redeem_value}
                  onChange={e => setEditConfig({ ...editConfig, loyalty_redeem_value: Number(e.target.value) })} />
                <p className="text-xs text-muted-foreground">
                  A cada {editConfig.loyalty_min_redeem} pontos = {formatCurrency(editConfig.loyalty_redeem_value)} de desconto
                </p>
              </div>

              <div className="border-t pt-4">
                <Button onClick={saveConfig} className="gap-2">
                  <Save className="h-4 w-4" /> Salvar configurações
                </Button>
              </div>

              {/* Preview da regra */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-900 mb-1">Como funciona:</p>
                <p className="text-amber-800">
                  • Cada R$ 1,00 = <strong>{editConfig.loyalty_points_per_real} pts</strong>
                </p>
                <p className="text-amber-800">
                  • A cada <strong>{editConfig.loyalty_min_redeem} pts</strong> resgatáveis
                </p>
                <p className="text-amber-800">
                  • Resgate vale <strong>{formatCurrency(editConfig.loyalty_redeem_value)}</strong> de desconto
                </p>
                <p className="text-amber-800 mt-2 text-xs">
                  Exemplo: cliente com 250 pts pode resgatar {Math.floor(250 / editConfig.loyalty_min_redeem)}x ={" "}
                  {formatCurrency(Math.floor(250 / editConfig.loyalty_min_redeem) * editConfig.loyalty_redeem_value)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
