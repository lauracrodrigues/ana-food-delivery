// v1.0.0 — Entregador escolhe loja quando atende mais de 1 empresa
// Salva escolha em localStorage e navega pro dashboard com escopo da loja escolhida
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Store, LogOut } from "lucide-react";

interface DelivererRow {
  id: string;
  company_id: string;
  name: string;
  active: boolean;
  pending_count?: number;  // v1.0.1 — contagem de entregas ativas nessa loja
  companies?: {
    id: string;
    name: string;
    fantasy_name: string | null;
    logo_url: string | null;
  } | null;
}

export const DELIVERER_COMPANY_KEY = "anafood-deliverer-company-id";

export default function DelivererCompanySelect() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [deliverers, setDeliverers] = useState<DelivererRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        navigate("/login");
        return;
      }
      // @ts-expect-error -- generated types missing
      const { data } = await supabase
        .from("deliverers")
        .select("id, company_id, name, active, companies(id, name, fantasy_name, logo_url)")
        .eq("email", user.email)
        .eq("active", true);

      const rows = (data || []) as DelivererRow[];

      // v1.0.1 — Buscar pendentes por loja em paralelo (deixa user escolher loja certa)
      const ACTIVE_STATUSES = ['preparing', 'ready', 'out_for_delivery', 'delivering'];
      await Promise.all(rows.map(async (r) => {
        // @ts-expect-error -- types
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("deliverer_id", r.id)
          .in("status", ACTIVE_STATUSES);
        r.pending_count = count || 0;
      }));

      setDeliverers(rows);

      // Auto-resolve: 0 → login, 1 → salva e vai pro dashboard
      if (rows.length === 0) {
        localStorage.removeItem(DELIVERER_COMPANY_KEY);
        navigate("/login");
        return;
      }
      if (rows.length === 1) {
        localStorage.setItem(DELIVERER_COMPANY_KEY, rows[0].company_id);
        navigate("/entregador");
        return;
      }
      // 2+ lojas: ordena por pending_count DESC pra loja com pedidos aparecer primeiro
      rows.sort((a, b) => (b.pending_count || 0) - (a.pending_count || 0));
      setDeliverers([...rows]);
      setLoading(false);
    })();
  }, [navigate]);

  const choose = (companyId: string) => {
    localStorage.setItem(DELIVERER_COMPANY_KEY, companyId);
    navigate("/entregador");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(DELIVERER_COMPANY_KEY);
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Escolha a loja
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Você atende {deliverers.length} lojas. Selecione em qual vai trabalhar agora.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {deliverers.map((d) => {
              const c = d.companies;
              const display = c?.fantasy_name || c?.name || "Loja";
              return (
                <button
                  key={d.id}
                  onClick={() => choose(d.company_id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                >
                  {c?.logo_url ? (
                    <img
                      src={c.logo_url}
                      alt={display}
                      className="w-12 h-12 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{display}</p>
                    <p className="text-xs text-muted-foreground">Entrar como {d.name}</p>
                  </div>
                  {/* v1.0.1 — Badge com qtd de entregas ativas nessa loja */}
                  {(d.pending_count || 0) > 0 && (
                    <div className="flex flex-col items-center bg-emerald-500 text-white rounded-lg px-2 py-1 min-w-[44px]">
                      <span className="text-lg font-bold leading-none">{d.pending_count}</span>
                      <span className="text-[9px] uppercase">pendente{(d.pending_count || 0) > 1 ? "s" : ""}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>
        <Button variant="ghost" onClick={logout} className="w-full gap-2">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}
