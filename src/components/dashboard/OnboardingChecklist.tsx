// v1.2.0 — Checklist de onboarding — Fix: WhatsApp conta como ok quando sessão existe (não exige open) + refetch on focus
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle, Circle, Package, CreditCard, MessageSquare,
  MapPin, Settings, X, Rocket
} from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: typeof Package;
  route: string;
  check: (data: CheckData) => boolean;
}

interface CheckData {
  hasProducts: boolean;
  hasCategories: boolean;
  hasDeliveryFees: boolean;
  hasPaymentMethods: boolean;
  hasWhatsapp: boolean;
  hasStoreSettings: boolean;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "categories",
    label: "Criar categorias",
    description: "Organize seus produtos em categorias",
    icon: Settings,
    route: "/categories",
    check: (d) => d.hasCategories,
  },
  {
    id: "products",
    label: "Cadastrar produtos",
    description: "Adicione pelo menos um produto ao cardápio",
    icon: Package,
    route: "/products",
    check: (d) => d.hasProducts,
  },
  {
    id: "delivery",
    label: "Configurar taxas de entrega",
    description: "Opcional — só se faz delivery",
    icon: MapPin,
    route: "/delivery-fees",
    check: (d) => d.hasDeliveryFees,
  },
  {
    id: "payment",
    label: "Formas de pagamento",
    description: "Ative PIX, cartão, dinheiro etc.",
    icon: CreditCard,
    route: "/payment-methods",
    check: (d) => d.hasPaymentMethods,
  },
  {
    id: "whatsapp",
    label: "Cadastrar WhatsApp",
    description: "Configure ao menos uma sessão (conexão pode ser depois)",
    icon: MessageSquare,
    route: "/whatsapp",
    check: (d) => d.hasWhatsapp,
  },
];

// Scope por company — empresas diferentes podem ter onboarding em estados diferentes
const dismissedKey = (companyId: string) => `onboarding_dismissed_${companyId}`;

export function OnboardingChecklist({ companyId }: { companyId: string }) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(dismissedKey(companyId)) === "true";
  });

  // Busca dados para checar progresso
  const { data: checkData, isLoading } = useQuery<CheckData>({
    queryKey: ["onboarding-check", companyId],
    queryFn: async () => {
      const [products, categories, deliveryFees, paymentMethods, whatsapp] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("categories").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("delivery_fees").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        supabase.from("payment_methods").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("is_active", true),
        // WhatsApp: aceita qualquer sessão cadastrada (não exige connection_status="open" — sessão pode oscilar)
        supabase.from("whatsapp_config").select("id,connection_status,session_name").eq("company_id", companyId).eq("config_type", "session").limit(1),
      ]);

      return {
        hasProducts: (products.count ?? 0) > 0,
        hasCategories: (categories.count ?? 0) > 0,
        hasDeliveryFees: (deliveryFees.count ?? 0) > 0,
        hasPaymentMethods: (paymentMethods.count ?? 0) > 0,
        // Conta como ok se sessão WhatsApp existe (qualquer status). Conexão real é estado volátil que não deve travar onboarding.
        hasWhatsapp: !!(whatsapp.data && whatsapp.data.length > 0),
        hasStoreSettings: true,
      };
    },
    enabled: !!companyId,
    staleTime: 10_000,        // 10s — detecta mudanças mais rápido quando user volta ao dashboard
    refetchOnWindowFocus: true, // re-checa quando user volta de outra aba/página
  });

  const completedCount = checkData
    ? CHECKLIST_ITEMS.filter((item) => item.check(checkData)).length
    : 0;
  const totalCount = CHECKLIST_ITEMS.length;
  const allDone = completedCount === totalCount;
  const progressPercent = (completedCount / totalCount) * 100;

  // Auto-dismiss IMEDIATO quando tudo completo (persiste no localStorage por company)
  // Sem timer 5s — esconde direto e não volta a aparecer
  useEffect(() => {
    if (allDone && !dismissed && companyId) {
      localStorage.setItem(dismissedKey(companyId), "true");
      setDismissed(true);
    }
  }, [allDone, dismissed, companyId]);

  // Esconde se: já dismissed OU loading OU tudo done (extra-segurança)
  if (dismissed || isLoading || !checkData || allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissedKey(companyId), "true");
    setDismissed(true);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">
              {allDone ? "Tudo pronto! 🎉" : "Configure sua loja"}
            </CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {completedCount}/{totalCount}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const done = item.check(checkData);
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  done
                    ? "bg-green-50 dark:bg-green-950/20"
                    : "hover:bg-muted/50 cursor-pointer"
                }`}
                onClick={() => !done && navigate(item.route)}
                disabled={done}
              >
                {done ? (
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                {!done && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
