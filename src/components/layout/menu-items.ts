// v2.0.0 — Menu lateral reorganizado
// - Financeiro vira grupo (Visão Geral + Contas + Receitas + Despesas + Títulos + DRE/Fluxo)
// - Caixa expediente movido pra dentro de Vendas (histórico) — caixa em si é tab do PDV
// - Movimentações condicional (só aparece se modules_enabled.distribuidoras=true)
// - Removidos items soltos (Caixa, Títulos, DRE, Contas Fin, Estoque)
import {
  ShoppingBag, Settings, Package, Users, Tag, MessageSquare, Building2, MapPin,
  Store, CreditCard, Menu, LayoutGrid, Wallet, Receipt, Clock,
  TrendingUp, Truck, Ticket, BarChart3, Sparkles, Megaphone, LayoutDashboard, Gift, Calendar,
  ShoppingCart, Coffee, Bike, Flame, FileText,
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
  isDistribuidora?: boolean;
  // Módulos habilitados pelo AnaFood Master (modules_enabled jsonb)
  hasFinanceiro?: boolean;
  hasPdv?: boolean;
  hasWhatsapp?: boolean;
  hasCardapioDigital?: boolean;
}

export function getMenuItems({
  isAdmin = false,
  isDistribuidora = false,
  hasFinanceiro = true,
  hasPdv = true,
  hasWhatsapp = true,
  hasCardapioDigital = true,
}: MenuItemsConfig = {}): MenuItem[] {
  return [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },

    // Vendas (PDV) — só aparece se módulo pdv habilitado
    ...(hasPdv ? [{
      title: "Vendas", icon: ShoppingCart,
      subItems: [
        { title: "Balcão",          url: "/vendas/balcao",   icon: Coffee },
        { title: "Mesas",           url: "/vendas/mesa",     icon: LayoutGrid },
        { title: "Entrega",         url: "/vendas/entrega",  icon: Bike },
        { title: "Histórico Caixa", url: "/caixa/historico", icon: Clock },
      ],
    }] : []),

    // Movimentações: distribuidora (módulo extra)
    ...(isDistribuidora ? [{
      title: "Movimentações", icon: FileText,
      subItems: [
        { title: "Pedidos de Venda", url: "/movimentos?tab=pedidos",    icon: ShoppingBag },
        { title: "Orçamentos",       url: "/movimentos?tab=orcamentos", icon: FileText },
        { title: "Faturados",        url: "/movimentos?tab=faturados",  icon: CreditCard },
        { title: "Estoque + Lotes",  url: "/estoque",                   icon: Package },
      ],
    }] : []),

    { title: "Pedidos", url: "/orders", icon: ShoppingBag },

    // Financeiro — só aparece se módulo financeiro habilitado
    ...(hasFinanceiro ? [{
      title: "Financeiro", icon: TrendingUp,
      subItems: [
        { title: "Visão Geral", url: "/financeiro",          icon: BarChart3 },
        { title: "Contas",      url: "/financeiro/contas",   icon: Wallet },
        { title: "Receitas",    url: "/financeiro/receitas", icon: TrendingUp },
        { title: "Despesas",    url: "/financeiro/despesas", icon: TrendingUp },
        { title: "Títulos",     url: "/titulos",             icon: Receipt },
        { title: "DRE / Fluxo", url: "/dre",                 icon: FileText },
      ],
    }] : []),

    // Cardápio digital — só se módulo habilitado
    ...(hasCardapioDigital ? [{ title: "Cardápio", url: "/menu", icon: Menu }] : []),

    {
      title: "Cadastros", icon: Package,
      subItems: [
        // v1.0.1 — Produtos/Categorias/Grupos unificados em "Cardápio" (/menu)
        { title: "Fornecedores",        url: "/distribuidoras",   icon: Truck },
        ...(isAdmin ? [{ title: "Usuários", url: "/users", icon: Users }] : []),
        { title: "Clientes",            url: "/customers",        icon: Users },
        { title: "Entregadores",        url: "/entregadores",     icon: MotoIcon },
        { title: "Taxas de Entrega",    url: "/delivery-fees",    icon: MapPin },
        { title: "Formas de Pagamento", url: "/payment-methods",  icon: CreditCard },
        { title: "Cupons",              url: "/coupons",          icon: Ticket },
        { title: "Campanhas",           url: "/campaigns",        icon: Sparkles },
        { title: "Combos",              url: "/combos",           icon: Gift },
        { title: "Avaliações",          url: "/reviews",          icon: MessageSquare },
      ],
    },

    // WhatsApp — só se módulo habilitado
    ...(hasWhatsapp ? [{
      title: "WhatsApp", icon: MessageSquare,
      subItems: [
        { title: "Configurações", url: "/whatsapp",      icon: Settings },
      ],
    }] : []),

    {
      title: "Configurações", icon: Settings,
      subItems: [
        { title: "Perfil da Empresa", url: "/company-profile", icon: Building2 },
        { title: "Assinatura",        url: "/billing",         icon: CreditCard },
        { title: "Gerais",            url: "/settings",        icon: Settings },
        // Retenção (LGPD) movida pra dentro de Settings/Gerais como aba
      ],
    },
  ];
}
