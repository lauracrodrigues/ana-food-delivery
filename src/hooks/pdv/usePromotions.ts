import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Promotion, PromotionProduct } from '@/types/pdv';
import { SaleType } from '@/types/pdv';

interface PromotionWithProducts extends Promotion {
  promotion_products: PromotionProduct[];
}

export interface AppliedPromotion {
  promotion_id: string;
  promotion_name: string;
  discount_amount: number; // valor descontado por unidade
  final_price: number;     // preço unitário após desconto
}

// Verifica se promoção está ativa agora (dia, horário, datas)
function isPromotionActive(promo: Promotion): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Dom, 6=Sáb
  const timeStr = now.toTimeString().slice(0, 5); // "HH:MM"
  const dateStr = now.toISOString().slice(0, 10);  // "YYYY-MM-DD"

  if (promo.days_of_week && !promo.days_of_week.includes(dayOfWeek)) return false;
  if (promo.start_date && dateStr < promo.start_date) return false;
  if (promo.end_date && dateStr > promo.end_date) return false;
  if (promo.start_time && timeStr < promo.start_time) return false;
  if (promo.end_time && timeStr > promo.end_time) return false;

  return true;
}

// Verifica se promoção se aplica ao tipo de venda
function promotionMatchesSaleType(promo: Promotion, saleType: SaleType): boolean {
  if (saleType === 'counter') return promo.apply_to_counter !== false;
  if (saleType === 'table') return promo.apply_to_table !== false;
  if (saleType === 'delivery') return promo.apply_to_delivery !== false;
  if (saleType === 'pickup') return promo.apply_to_counter !== false;
  return true;
}

// Calcula o desconto de uma promoção sobre um preço base
function calcDiscount(promo: Promotion, unitPrice: number, specialPrice?: number | null): AppliedPromotion {
  let final_price: number;
  let discount_amount: number;

  if (specialPrice != null) {
    // Preço especial definido diretamente no produto da promoção
    final_price = Math.max(0, specialPrice);
    discount_amount = Math.max(0, unitPrice - final_price);
  } else if (promo.discount_type === 'percent') {
    discount_amount = unitPrice * (promo.discount_value / 100);
    final_price = Math.max(0, unitPrice - discount_amount);
  } else {
    // fixed
    discount_amount = Math.min(promo.discount_value, unitPrice);
    final_price = Math.max(0, unitPrice - discount_amount);
  }

  return {
    promotion_id: promo.id,
    promotion_name: promo.name,
    discount_amount,
    final_price,
  };
}

export function usePromotions() {
  const { companyId } = useCompanyId();

  const { data: promotions = [] } = useQuery<PromotionWithProducts[]>({
    queryKey: ['promotions-active', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('promotions')
        .select('*, promotion_products(*)')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;
      return (data as PromotionWithProducts[]) || [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 min — promoções mudam pouco
  });

  // Encontra a melhor promoção para um produto/categoria+tipo de venda
  function findPromotion(
    productId: string,
    categoryId: string | null,
    unitPrice: number,
    saleType: SaleType,
  ): AppliedPromotion | null {
    const now = promotions
      .filter(p => p.is_active && isPromotionActive(p) && promotionMatchesSaleType(p, saleType))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)); // maior priority primeiro

    for (const promo of now) {
      // Promoção por produto específico
      if (promo.type === 'product') {
        const pp = promo.promotion_products.find(pp => pp.product_id === productId);
        if (pp) return calcDiscount(promo, unitPrice, pp.special_price);
      }

      // Promoção por categoria
      if (promo.type === 'category' && categoryId && promo.category_id === categoryId) {
        return calcDiscount(promo, unitPrice);
      }

      // Promoção geral (todos os produtos)
      if (promo.type === 'all') {
        return calcDiscount(promo, unitPrice);
      }
    }

    return null;
  }

  return { promotions, findPromotion };
}
