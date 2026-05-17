// v1.0.0 — Página admin: avaliações dos clientes (NPS + lista)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Star, MessageSquare, TrendingUp, TrendingDown } from "lucide-react";

interface ReviewStats {
  total: number;
  avg_rating: number;
  avg_food: number | null;
  avg_delivery: number | null;
  distribution: Record<string, number>;
}

interface Review {
  id: string;
  order_id: string;
  customer_phone: string | null;
  rating: number;
  comment: string | null;
  food_quality: number | null;
  delivery_time: number | null;
  created_at: string;
}

export default function Reviews() {
  const { companyId } = useUserRole();

  // Stats agregadas via RPC
  const { data: stats } = useQuery({
    queryKey: ["reviews-stats", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.rpc("get_company_reviews_stats" as any, { p_company_id: companyId });
      return data as ReviewStats | null;
    },
    enabled: !!companyId,
  });

  // Lista de reviews (SELECT direto — RLS já filtra por company)
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("order_reviews" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as Review[];
    },
    enabled: !!companyId,
  });

  const renderStars = (n: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= n ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-sm text-muted-foreground">Feedback dos seus clientes</p>
        </div>
      </div>

      {/* Cards de stats */}
      {stats && stats.total > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Média geral */}
          <div className="bg-card border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Nota média</p>
            <p className="text-3xl font-bold text-amber-600">
              {stats.avg_rating?.toFixed(1) ?? "—"}
            </p>
            <div className="flex justify-center mt-1">{renderStars(Math.round(stats.avg_rating || 0))}</div>
          </div>
          {/* Total */}
          <div className="bg-card border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avaliações</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          {/* Comida */}
          <div className="bg-card border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Comida</p>
            <p className="text-2xl font-bold text-orange-600">
              {stats.avg_food?.toFixed(1) ?? "—"}
            </p>
          </div>
          {/* Entrega */}
          <div className="bg-card border rounded-xl p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Entrega</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.avg_delivery?.toFixed(1) ?? "—"}
            </p>
          </div>
        </div>
      ) : null}

      {/* Distribuição de notas */}
      {stats && stats.total > 0 && stats.distribution && (
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm font-medium mb-3">Distribuição de notas</p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((n) => {
              const qty = stats.distribution[String(n)] || 0;
              const pct = stats.total > 0 ? (qty / stats.total) * 100 : 0;
              return (
                <div key={n} className="flex items-center gap-2 text-sm">
                  <span className="w-8 flex items-center gap-0.5">
                    {n} <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  </span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${n >= 4 ? "bg-green-500" : n === 3 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs text-muted-foreground">{qty}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de reviews */}
      <div className="bg-card border rounded-xl divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma avaliação ainda</p>
            <p className="text-xs mt-1">Clientes vão avaliar após receberem os pedidos</p>
          </div>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderStars(r.rating)}
                  {r.rating >= 4 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : r.rating <= 2 ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("pt-BR", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              {r.comment && (
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-2.5">
                  "{r.comment}"
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {r.food_quality && <span>🍽️ Comida: {r.food_quality}</span>}
                {r.delivery_time && <span>🚴 Entrega: {r.delivery_time}</span>}
                {r.customer_phone && <span>📱 {r.customer_phone}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
