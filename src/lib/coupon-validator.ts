// Validação de cupons no lado cliente — verifica todas as regras sem expor lógica de negócio crítica
export interface CouponData {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses?: number | null;
  uses_count?: number | null;
  valid_until?: string | null;
  is_active?: boolean | null;
  min_order_value?: number | null;
  discount_limit?: number | null;
  free_shipping?: boolean | null;
  valid_days_of_week?: number[] | null; // 0=Dom, 1=Seg, ..., 6=Sab
  valid_start_time?: string | null;     // "HH:MM:SS"
  valid_end_time?: string | null;
}

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  freeShipping: boolean;
  error?: string;
}

export function validateCoupon(coupon: CouponData, cartTotal: number): CouponValidationResult {
  if (coupon.is_active === false) {
    return { valid: false, discount: 0, freeShipping: false, error: "Cupom inativo" };
  }

  if (coupon.valid_until) {
    const expires = new Date(coupon.valid_until);
    if (expires < new Date()) {
      return { valid: false, discount: 0, freeShipping: false, error: "Cupom expirado" };
    }
  }

  if (coupon.max_uses != null && (coupon.uses_count ?? 0) >= coupon.max_uses) {
    return { valid: false, discount: 0, freeShipping: false, error: "Cupom esgotado" };
  }

  if (coupon.min_order_value != null && cartTotal < coupon.min_order_value) {
    return {
      valid: false,
      discount: 0,
      freeShipping: false,
      error: `Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2).replace(".", ",")} para este cupom`,
    };
  }

  if (coupon.valid_days_of_week && coupon.valid_days_of_week.length > 0) {
    const today = new Date().getDay();
    if (!coupon.valid_days_of_week.includes(today)) {
      return { valid: false, discount: 0, freeShipping: false, error: "Cupom inválido hoje" };
    }
  }

  if (coupon.valid_start_time && coupon.valid_end_time) {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    if (hhmm < coupon.valid_start_time.slice(0, 5) || hhmm > coupon.valid_end_time.slice(0, 5)) {
      return { valid: false, discount: 0, freeShipping: false, error: "Cupom válido apenas em horários específicos" };
    }
  }

  // Calcula desconto
  let discount = 0;
  if (coupon.discount_type === "percentage") {
    discount = (cartTotal * coupon.discount_value) / 100;
    if (coupon.discount_limit != null) {
      discount = Math.min(discount, coupon.discount_limit);
    }
  } else {
    discount = Math.min(coupon.discount_value, cartTotal);
  }

  return {
    valid: true,
    discount: Math.round(discount * 100) / 100,
    freeShipping: coupon.free_shipping ?? false,
  };
}
