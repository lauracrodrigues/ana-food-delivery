// v1.1.0 — Input cupom + validação async first_order_only
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
  customerPhone?: string | null; // pra validar first_order_only
  onApply: (coupon: CouponData, result: CouponValidationResult) => void;
  onRemove: () => void;
  appliedCoupon: CouponData | null;
  appliedResult: CouponValidationResult | null;
}

export function CouponInput({
  companyId,
  cartTotal,
  customerPhone,
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

      const coupon = data as unknown as CouponData & { first_order_only?: boolean };

      // Validação async: cupom de primeira compra
      if (coupon.first_order_only) {
        if (!customerPhone) {
          setError("Cupom só pra primeira compra — identifique-se primeiro");
          return;
        }
        const phoneDigits = customerPhone.replace(/\D/g, "");
        const { data: previousOrders } = await supabase
          .from("orders")
          .select("id")
          .eq("company_id", companyId)
          .ilike("customer_phone", `%${phoneDigits}%`)
          .not("status", "eq", "cancelled")
          .limit(1);
        if (previousOrders && previousOrders.length > 0) {
          setError("Cupom válido apenas pra primeira compra");
          return;
        }
      }

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
