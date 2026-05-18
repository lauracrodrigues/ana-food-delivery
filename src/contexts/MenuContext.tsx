// v1.0.0 — Context unificado pro cardápio público
// Elimina prop drilling: CustomerSheet, PromosContent, ReferralCard consomem via hook
import { createContext, useContext, ReactNode } from "react";
import type { CustomerSession } from "@/hooks/useCustomerSession";
import type { OrderHistoryItem } from "@/hooks/useOrderHistory";
import type { LoyaltyConfig } from "@/hooks/useLoyaltyPoints";

interface MenuContextValue {
  // Store info
  companyId: string;
  storeSubdomain: string | null;
  storeName: string;
  referralRewardPoints: number;

  // Customer session + dados
  session: CustomerSession | null;
  history: OrderHistoryItem[];
  favorites: string[];
  products: any[];
  loyaltyPoints: number;
  loyaltyConfig?: LoyaltyConfig;

  // Referral
  referrerPhone: string | null;

  // Actions
  onIdentify: (name: string, phone: string) => void;
  onClearSession: () => void;
  onRefreshHistory: () => Promise<void>;
  onRepeatOrder: (items: OrderHistoryItem["items"]) => void;
  onViewOrder: (orderId: string) => void;
  onSaveAddress: (address: string) => void;
  onRemoveAddress: (address: string) => void;
  onSetDefaultAddress: (address: string) => void;
  onClearReferral: () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

interface MenuProviderProps {
  value: MenuContextValue;
  children: ReactNode;
}

export function MenuProvider({ value, children }: MenuProviderProps) {
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

/**
 * Hook pra consumir contexto do cardápio.
 * Lança erro se usado fora do MenuProvider — força composição correta.
 */
export function useMenuContext(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error("useMenuContext deve ser usado dentro de <MenuProvider>");
  }
  return ctx;
}

/**
 * Versão opcional — não lança erro se fora do provider (retorna null)
 * Útil pra componentes que podem ser usados em outros contextos
 */
export function useMenuContextOptional(): MenuContextValue | null {
  return useContext(MenuContext);
}
