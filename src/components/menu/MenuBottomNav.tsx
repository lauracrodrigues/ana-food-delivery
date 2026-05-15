// v1.0.0 — Menu inferior fixo 4 abas (mobile-first) estilo Anota.AI
import { Home, ShoppingBag, Tag, ShoppingCart } from "lucide-react";

export type MenuView = "home" | "orders" | "promos" | "cart";

interface MenuBottomNavProps {
  active: MenuView;
  cartCount: number;
  promosCount?: number;
  hasUnreadPromos?: boolean;
  onChange: (view: MenuView) => void;
}

interface TabConfig {
  key: MenuView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabConfig[] = [
  { key: "home",   label: "Início",   icon: Home },
  { key: "orders", label: "Pedidos",  icon: ShoppingBag },
  { key: "promos", label: "Promos",   icon: Tag },
  { key: "cart",   label: "Carrinho", icon: ShoppingCart },
];

export function MenuBottomNav({
  active, cartCount, promosCount = 0, hasUnreadPromos = false, onChange,
}: MenuBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border lg:hidden pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className="flex">
        {TABS.map(tab => {
          const isActive = active === tab.key;
          const Icon = tab.icon;
          // Badges contextuais por aba
          const showCartBadge = tab.key === "cart" && cartCount > 0;
          const showPromosBadge = tab.key === "promos" && (hasUnreadPromos || promosCount > 0);
          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors relative
                ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Ícone com badge */}
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                {showCartBadge && (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center leading-none">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
                {showPromosBadge && !showCartBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className={`text-[11px] font-medium ${isActive ? "font-semibold" : ""}`}>
                {tab.label}
              </span>
              {/* Indicador de aba ativa: barra no topo */}
              {isActive && (
                <span className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
