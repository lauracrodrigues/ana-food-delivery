// v1.0.0 — Definição de items do menu da sidebar (separado pra reduzir AppSidebar.tsx)
import {
  ShoppingBag, Settings, Package, Users, Tag, MessageSquare, Building2, MapPin,
  Store, CreditCard, Menu, LayoutGrid, Wallet, Receipt, Clock,
  TrendingUp, Truck, Ticket, BarChart3, Sparkles, Megaphone, LayoutDashboard, Gift, Calendar,
  ShoppingCart, Coffee, Bike,
} from "lucide-react";
import { MotoIcon } from "@/components/ui/moto-icon";

export interface SubMenuItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: SubMenuItem[];
}

export interface MenuItemsConfig {
  isAdmin?: boolean;
}

export function getMenuItems({ isAdmin = false }: MenuItemsConfig = {}): MenuItem[] {
  return [
    { title: "Dashboard",  url: "/dashboard",  icon: LayoutDashboard },
    {
      // PDV + Caixa removidos — substituídos por seção "Vendas" (caixa fica como tab interna do PDV)
      title: "Vendas", icon: ShoppingCart,
      subItems: [
        { title: "Balcão",          url: "/vendas/balcao",   icon: Coffee },
        { title: "Mesas",           url: "/vendas/mesa",     icon: LayoutGrid },
        { title: "Entrega",         url: "/vendas/entrega",  icon: Bike },
        { title: "Histórico Caixa", url: "/caixa/historico", icon: Clock },
      ],
    },
    { title: "Financeiro", url: "/financeiro", icon: TrendingUp },
    { title: "Pedidos",    url: "/orders",     icon: ShoppingBag },
    { title: "Cardápio",   url: "/menu",       icon: Menu }, // tabs internas: Visual, Cardápio do Dia, Analytics, Fidelidade, Marketing
    {
      title: "Cadastros", icon: Package,
      subItems: [
        { title: "Produtos",            url: "/products",         icon: Package },
        { title: "Categorias",          url: "/categories",       icon: Tag },
        { title: "Fornecedores",        url: "/distribuidoras",   icon: Truck },
        ...(isAdmin ? [{ title: "Usuários", url: "/users", icon: Users }] : []),
        { title: "Clientes",            url: "/customers",        icon: Users },
        { title: "Entregadores",        url: "/entregadores",     icon: MotoIcon },
        { title: "Taxas de Entrega",    url: "/delivery-fees",    icon: MapPin },
        { title: "Formas de Pagamento", url: "/payment-methods",  icon: CreditCard },
        { title: "Cupons",              url: "/coupons",          icon: Ticket },
        { title: "Campanhas",           url: "/campaigns",        icon: Sparkles },
        { title: "Combos",              url: "/combos",           icon: Gift },
      ],
    },
    {
      title: "WhatsApp", icon: MessageSquare,
      subItems: [
        { title: "Conversas",     url: "/whatsapp-chat", icon: MessageSquare },
        { title: "Configurações", url: "/whatsapp",      icon: Settings },
      ],
    },
    {
      title: "Configurações", icon: Settings,
      subItems: [
        { title: "Perfil da Empresa", url: "/company-profile", icon: Building2 },
        { title: "Assinatura",        url: "/billing",         icon: CreditCard },
        { title: "Gerais",            url: "/settings",        icon: Settings },
      ],
    },
  ];
}
