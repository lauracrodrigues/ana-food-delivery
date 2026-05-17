// v1.0.0 — Form de avaliação pós-venda (1-5 estrelas + comentário opcional)
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Star, CheckCircle2, Loader2 } from "lucide-react";

interface OrderReviewFormProps {
  orderId: string;
  customerPhone?: string | null;
}

interface ExistingReview {
  rating?: number;
  comment?: string | null;
  food_quality?: number | null;
  delivery_time?: number | null;
}

export function OrderReviewForm({ orderId, customerPhone }: OrderReviewFormProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [foodQuality, setFoodQuality] = useState(0);
  const [deliveryTime, setDeliveryTime] = useState(0);
  const [hoverRating, setHoverRating] = useState(0); // hover effect estrelas principais
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<ExistingReview | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Checa se já avaliou no mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_order_review" as any, { p_order_id: orderId });
      if (data && typeof data === "object" && (data as any).rating) {
        const existingData = data as ExistingReview;
        setExisting(existingData);
        setRating(existingData.rating || 0);
        setComment(existingData.comment || "");
        setFoodQuality(existingData.food_quality || 0);
        setDeliveryTime(existingData.delivery_time || 0);
      }
      setLoaded(true);
    })();
  }, [orderId]);

  const handleSubmit = async () => {
    if (rating < 1) {
      toast({ title: "Selecione uma nota de 1 a 5 estrelas", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("submit_order_review" as any, {
      p_order_id: orderId,
      p_phone: customerPhone || "",
      p_rating: rating,
      p_comment: comment.trim() || null,
      p_food_quality: foodQuality || null,
      p_delivery_time: deliveryTime || null,
    });
    setSubmitting(false);

    if (error || !data || !(data as any).success) {
      toast({
        title: "Erro ao enviar avaliação",
        description: (data as any)?.error || error?.message || "Tente novamente",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Avaliação enviada! Obrigado 🙏" });
    setExisting({ rating, comment, food_quality: foodQuality, delivery_time: deliveryTime });
  };

  if (!loaded) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
        <h3 className="font-bold text-sm">
          {existing ? "Sua avaliação" : "Como foi seu pedido?"}
        </h3>
        {existing && <CheckCircle2 className="h-4 w-4 text-green-600 ml-auto" />}
      </div>

      {/* Estrelas principais (rating geral) */}
      <div className="flex items-center justify-center gap-1 py-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hoverRating || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  filled ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Sub-ratings opcionais (compactos) — só aparecem após rating geral */}
      {rating > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <SubRating label="Comida" value={foodQuality} onChange={setFoodQuality} />
          <SubRating label="Entrega" value={deliveryTime} onChange={setDeliveryTime} />
        </div>
      )}

      {/* Comentário opcional */}
      {rating > 0 && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Deixe um comentário (opcional)"
          rows={2}
          maxLength={500}
          className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}

      {/* Botão enviar */}
      {rating > 0 && (
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
          size="sm"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {existing ? "Atualizar avaliação" : "Enviar avaliação"}
        </Button>
      )}
    </div>
  );
}

// Sub-rating compacto (5 estrelinhas pequenas)
function SubRating({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)} // click no atual = remove
            className="p-0.5"
            aria-label={`${label}: ${n}`}
          >
            <Star
              className={`h-4 w-4 ${
                value >= n ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
