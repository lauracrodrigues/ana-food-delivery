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
