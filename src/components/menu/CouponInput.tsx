// v1.0.0 — Input de cupom com validação em tempo real
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency-formatter";
import { validateCoupon, CouponData, CouponValidationResult } from "@/lib/coupon-validator";
import { Tag, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface CouponInputProps {
  companyId: string;
  cartTotal: number;
  onApply: (coupon: CouponData, result: CouponValidationResult) => void;
  onRemove: () => void;
  appliedCoupon: CouponData | null;
  appliedResult: CouponValidationResult | null;
}

export function CouponInput({
  companyId,
  cartTotal,
  onApply,
  onRemove,
  appliedCoupon,
  appliedResult,
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("coupons")
        .select("*")
        .eq("company_id", companyId)
        .eq("code", trimmed)
        .maybeSingle();

      if (dbError) throw dbError;
      if (!data) {
        setError("Cupom não encontrado");
        return;
      }

      const coupon = data as unknown as CouponData;
      const result = validateCoupon(coupon, cartTotal);

      if (!result.valid) {
        setError(result.error ?? "Cupom inválido");
        return;
      }

      onApply(coupon, result);
      setCode("");
    } catch {
      setError("Erro ao verificar cupom");
    } finally {
      setLoading(false);
    }
  };

  // Cupom aplicado — mostra chip com detalhes
  if (appliedCoupon && appliedResult) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-800">{appliedCoupon.code}</p>
          <p className="text-xs text-green-700">
            {appliedResult.freeShipping && "Frete grátis + "}
            {appliedResult.discount > 0 && `-${formatCurrency(appliedResult.discount)}`}
          </p>
        </div>
        <button
          onClick={onRemove}
          className="text-green-600 hover:text-green-800 shrink-0"
          type="button"
          aria-label="Remover cupom"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Código do cupom"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            className="pl-9 uppercase"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleApply}
          disabled={loading || !code.trim()}
          className="shrink-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
