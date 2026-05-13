// v2.1.0 — Billing com contagem real de pedidos do mês
import { useState } from "react";
import { formatCurrency } from "@/lib/currency-formatter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Crown, Zap, Shield, AlertTriangle,
  CheckCircle, Clock, BarChart3, Package, MessageSquare,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: string[] | null;
  max_products: number | null;
  max_orders_per_month: number | null;
}

interface CompanyBilling {
  plan_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  plan: Plan | null;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  active:    { label: "Ativo",              variant: "default",     icon: CheckCircle },
  trial:     { label: "Trial",              variant: "secondary",   icon: Clock },
  grace:     { label: "Período de Carência",variant: "outline",     icon: AlertTriangle },
  blocked:   { label: "Bloqueado",          variant: "destructive", icon: Shield },
  cancelled: { label: "Cancelado",          variant: "destructive", icon: Shield },
};

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_MAP[status ?? ""] ?? STATUS_MAP.blocked;
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1.5 px-3 py-1">
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </Badge>
  );
}

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent: boolean }) {
  const { toast } = useToast();
  const isPopular = plan.name === "Profissional";
  const features: string[] = Array.isArray(plan.features) ? plan.features : [];

  const handleSelect = () => {
    toast({
      title: "Entre em contato",
      description: "Para alterar seu plano, fale com o suporte pelo WhatsApp ou e-mail.",
    });
  };

  return (
    <Card className={`relative ${isCurrent ? "ring-2 ring-primary" : ""} ${isPopular ? "border-primary" : ""}`}>
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1"><Zap className="h-3 w-3" /> Popular</Badge>
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
          <span className="text-3xl font-bold">{formatCurrency(plan.price)}</span>
          <span className="text-muted-foreground">/mês</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {plan.max_orders_per_month && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span>Até {plan.max_orders_per_month === 999999 ? "ilimitados" : plan.max_orders_per_month} pedidos/mês</span>
          </div>
        )}
        {plan.max_products && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span>Até {plan.max_products === 999999 ? "ilimitados" : plan.max_products} produtos</span>
          </div>
        )}
        {features.map((f, i) => (
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
          disabled={isCurrent}
          onClick={handleSelect}
        >
          {isCurrent ? "Plano Atual" : "Solicitar Plano"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Billing() {
  const { companyId } = useCompanyId();

  const { data: billing, isLoading: billingLoading } = useQuery<CompanyBilling | null>({
    queryKey: ["company-billing", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("plan_id, subscription_status, trial_ends_at, plan:plans(id,name,description,price,features,max_products,max_orders_per_month)")
        .eq("id", companyId)
        .single();
      if (error) throw error;
      return data as unknown as CompanyBilling;
    },
    enabled: !!companyId,
  });

  // Contagem de pedidos do mês atual
  const { data: ordersUsed = 0 } = useQuery<number>({
    queryKey: ["billing-orders-used", companyId],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId!)
        .gte("created_at", startOfMonth.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!companyId,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["billing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  const status = billing?.subscription_status ?? null;
  const currentPlanId = billing?.plan_id ?? null;
  const trialEndsAt = billing?.trial_ends_at ?? null;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <PageLayout title="Assinatura" subtitle="Gerencie seu plano">
      <div className="space-y-6">
        {/* Status atual */}
        {billingLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : (
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
                    <p className="text-2xl font-bold">{billing?.plan?.name ?? "Sem plano"}</p>
                    {billing?.plan && (
                      <p className="text-sm text-muted-foreground">{formatCurrency(billing.plan.price)}/mês</p>
                    )}
                  </div>
                  <StatusBadge status={status} />
                </div>
                {daysLeft !== null && status === "trial" && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {daysLeft} dias restantes no trial
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" /> Uso Mensal de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const limit = billing?.plan?.max_orders_per_month ?? null;
                  const unlimited = limit === 999999 || limit === null;
                  const pct = unlimited ? 0 : Math.min(100, Math.round((ordersUsed / limit!) * 100));
                  const nearLimit = !unlimited && pct >= 80;
                  return (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{ordersUsed}</span>
                        <span className="text-muted-foreground text-sm">
                          / {unlimited ? "∞" : limit} pedidos
                        </span>
                      </div>
                      {!unlimited && (
                        <>
                          <Progress value={pct} className={`mt-2 h-2 ${nearLimit ? "[&>div]:bg-amber-500" : ""}`} />
                          <p className={`text-xs mt-1 ${nearLimit ? "text-amber-600" : "text-muted-foreground"}`}>
                            {nearLimit ? `⚠ ${pct}% do limite usado` : `${pct}% usado este mês`}
                          </p>
                        </>
                      )}
                      {unlimited && (
                        <p className="text-xs text-muted-foreground mt-1">pedidos ilimitados</p>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Suporte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Para alterar plano ou dúvidas sobre cobrança, fale com o suporte.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Falar com Suporte
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {status === "blocked" && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Conta Bloqueada</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sua conta está suspensa. Entre em contato com o suporte para reativar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Planos */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Planos Disponíveis</h2>
          {plansLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          ) : plans.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum plano disponível.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {plans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrent={plan.id === currentPlanId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
