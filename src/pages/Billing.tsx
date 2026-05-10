// v1.0.0 — Página de Billing/Assinatura do tenant
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Crown, Zap, Shield, AlertTriangle,
  CheckCircle, Clock, ExternalLink, BarChart3, Package
} from "lucide-react";

const API_URL = "";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  max_products: number | null;
  max_orders_per_month: number | null;
  stripe_price_id: string | null;
}

interface BillingStatus {
  subscription_status: string;
  plan: {
    name: string;
    price: number;
    max_orders: number | null;
  } | null;
  quota: {
    used: number;
    limit: number;
    percentual: number;
    nearLimit: boolean;
  };
  trial_ends_at: string | null;
  grace_ends_at: string | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  active: { label: "Ativo", variant: "default", icon: CheckCircle },
  trial: { label: "Trial", variant: "secondary", icon: Clock },
  grace: { label: "Período de Carência", variant: "outline", icon: AlertTriangle },
  blocked: { label: "Bloqueado", variant: "destructive", icon: Shield },
  cancelled: { label: "Cancelado", variant: "destructive", icon: Shield },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] || STATUS_MAP.blocked;
  const Icon = config.icon;
  return (
    <Badge variant={config.variant} className="gap-1.5 px-3 py-1">
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

function PlanCard({ plan, currentPlanName, onSelect, loading }: {
  plan: Plan;
  currentPlanName: string | null;
  onSelect: (planId: string) => void;
  loading: boolean;
}) {
  const isCurrent = plan.name === currentPlanName;
  const isPopular = plan.name === "Profissional";

  return (
    <Card className={`relative ${isCurrent ? "ring-2 ring-primary" : ""} ${isPopular ? "border-primary" : ""}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1">
            <Zap className="h-3 w-3" /> Popular
          </Badge>
        </div>
      )}
      {isCurrent && (
        <div className="absolute -top-3 right-4">
          <Badge variant="outline" className="bg-background gap-1">
            <CheckCircle className="h-3 w-3" /> Atual
          </Badge>
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
        <div className="pt-2">
          <span className="text-3xl font-bold">R$ {plan.price.toFixed(2)}</span>
          <span className="text-muted-foreground">/mês</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {plan.features.map((f, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span>{f}</span>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
          disabled={isCurrent || !plan.stripe_price_id || loading}
          onClick={() => onSelect(plan.id)}
        >
          {isCurrent ? "Plano Atual" : loading ? "Aguarde..." : "Assinar"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Billing() {
  const { companyId } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<BillingStatus>({
    queryKey: ["billing-status", companyId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/billing/status/${companyId}`);
      if (!res.ok) throw new Error("Erro ao buscar status");
      return res.json();
    },
    enabled: !!companyId,
  });

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/billing/plans`);
      if (!res.ok) throw new Error("Erro ao buscar planos");
      return res.json();
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/billing/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId }),
      });
      if (!res.ok) throw new Error("Erro ao abrir portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível abrir o portal de pagamento.", variant: "destructive" });
    },
  });

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const res = await fetch(`${API_URL}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: companyId, plan_id: planId }),
      });
      if (!res.ok) throw new Error("Erro ao criar checkout");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      toast({ title: "Erro", description: "Não foi possível iniciar o pagamento.", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const quotaPercent = status?.quota?.percentual ?? 0;
  const daysLeft = status?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(status.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <PageLayout
      title="Assinatura"
      subtitle="Gerencie seu plano e pagamentos"
      actions={
        status?.subscription_status === "active" ? (
          <Button variant="outline" size="sm" onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending}>
            <CreditCard className="h-4 w-4 mr-2" />
            Portal de Pagamento
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Status Atual */}
        {statusLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : status ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Crown className="h-4 w-4" /> Plano Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{status.plan?.name || "Sem plano"}</p>
                    {status.plan && (
                      <p className="text-sm text-muted-foreground">R$ {status.plan.price.toFixed(2)}/mês</p>
                    )}
                  </div>
                  <StatusBadge status={status.subscription_status} />
                </div>
                {daysLeft !== null && status.subscription_status === "trial" && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {daysLeft} dias restantes no trial
                  </p>
                )}
                {status.grace_ends_at && status.subscription_status === "grace" && (
                  <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Carência até {new Date(status.grace_ends_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Uso Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {status.quota.used}
                  <span className="text-base font-normal text-muted-foreground">
                    /{status.quota.limit === 999999 ? "∞" : status.quota.limit}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mb-2">pedidos este mês</p>
                <Progress
                  value={Math.min(quotaPercent, 100)}
                  className={`h-2 ${quotaPercent >= 80 ? "[&>div]:bg-amber-500" : ""} ${quotaPercent >= 100 ? "[&>div]:bg-red-500" : ""}`}
                />
                {status.quota.nearLimit && (
                  <p className="text-xs text-amber-600 mt-1">Próximo do limite ({Math.round(quotaPercent)}%)</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Limite de Produtos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {status.plan?.max_orders ? status.plan.max_orders : "∞"}
                </p>
                <p className="text-sm text-muted-foreground">pedidos/mês no plano</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Alerta se bloqueado */}
        {status?.subscription_status === "blocked" && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Conta Bloqueada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sua conta está suspensa por falha no pagamento. Assine um plano abaixo para reativar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Planos Disponíveis */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Planos Disponíveis</h2>
          {plansLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-80" />)}
            </div>
          ) : plans ? (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlanName={status?.plan?.name || null}
                  onSelect={handleCheckout}
                  loading={checkoutLoading === plan.id}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}
