// v4.0.0 — Phase 4: PWA install prompt, programa fidelidade, analytics tracking
import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { MenuCategories } from "@/components/menu/MenuCategories";
import { MenuProducts } from "@/components/menu/MenuProducts";
import { MenuSections } from "@/components/menu/MenuSections";
import { MenuCart } from "@/components/menu/MenuCart";
import { CartBottomBar } from "@/components/menu/CartBottomBar";
import { MenuCheckout } from "@/components/menu/MenuCheckout";
import { OrderTracking } from "@/components/menu/OrderTracking";
import { ProductAddModal, SelectedExtra } from "@/components/menu/ProductAddModal";
import { CustomerSheet } from "@/components/menu/CustomerSheet";
import { InstallPrompt } from "@/components/menu/InstallPrompt";
import { MenuThemeToggle } from "@/components/menu/MenuThemeToggle";
import { MenuBottomNav, type MenuView } from "@/components/menu/MenuBottomNav";
import { PromosSheet } from "@/components/menu/PromosSheet";
import { StoreProfileSheet } from "@/components/menu/StoreProfileSheet";
import { TrackingScripts, trackEvent } from "@/components/menu/TrackingScripts";
import { useAbandonedCartReminder } from "@/hooks/useAbandonedCartReminder";
import { useExitConfirmation } from "@/hooks/useExitConfirmation";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import { MenuProvider } from "@/contexts/MenuContext";
import { CallWaiterButton } from "@/components/menu/CallWaiterButton";
import { Loader2, ChefHat, Search, X } from "lucide-react";
import { resetPalette, initializeColorPalette } from "@/hooks/use-color-palette";
import { useCustomerSession } from "@/hooks/useCustomerSession";
import { useFavorites } from "@/hooks/useFavorites";
import { useOrderHistory } from "@/hooks/useOrderHistory";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useProductViewTracker } from "@/hooks/useProductViewTracker";
import { useActiveCampaigns } from "@/hooks/useActiveCampaigns";
import { usePopularProducts } from "@/hooks/usePopularProducts";
import { OrderAgainSection } from "@/components/menu/OrderAgainSection";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface Company {
  id: string;
  name: string;
  fantasy_name: string;
  logo_url: string | null;
  banner_url: string | null;
  phone: string;
  whatsapp: string;
  description: string;
  schedule: any;
  is_active: boolean;
  delivery_mode: string;
  delivery_fee?: number | null;
  avg_delivery_minutes?: number | null;
  rating?: number | null;
  instagram?: string | null;
  min_order_value?: number | null;
  loyalty_points_per_real?: number | null;
  loyalty_min_redeem?: number | null;
  loyalty_redeem_value?: number | null;
  google_analytics_id?: string | null;
  facebook_pixel_id?: string | null;
  meta_verification_tags?: Array<{ name: string; content: string }> | null;
  custom_domain?: string | null;
  custom_domain_status?: string | null;
  subdomain?: string | null;
  google_maps_url?: string | null;
  address?: any;
}

interface Category {
  id: string;
  name: string;
  on_off: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  category_id: string;
  on_off: boolean;
  promotional_price?: number | null;
  badges?: string[] | null;
  tags?: string[] | null;
  is_featured?: boolean;
}

interface CartItem {
  cartItemId: string;
  product: Product;
  quantity: number;
  observations?: string;
  extras: SelectedExtra[];
  extrasTotal: number;
}

interface PublicMenuProps {
  subdomainOverride?: string;
  customDomainOverride?: string;
}

export default function PublicMenu({ subdomainOverride, customDomainOverride }: PublicMenuProps = {}) {
  const params = useParams();
  const subdomain = subdomainOverride || params.subdomain;
  const customDomain = customDomainOverride;
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [activeOrderBanner, setActiveOrderBanner] = useState<{ orderId: string; status: string } | null>(null);
  const [banners, setBanners] = useState<{ id: string; image_url: string; link_type: string | null; link_value: string | null }[]>([]);
  const [activeBanner, setActiveBanner] = useState(0);
  const [quickAddProduct, setQuickAddProduct] = useState<Product | null>(null);
  // Navegação 4 abas estilo Anota.AI (mobile)
  const [activeView, setActiveView] = useState<MenuView>("home");
  const [showCustomerSheet, setShowCustomerSheet] = useState(false);
  const [showPromosSheet, setShowPromosSheet] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [showStoreProfile, setShowStoreProfile] = useState(false);

  const tableNumber = searchParams.get('mesa');
  // Cupom pré-aplicado via link compartilhado (?cupom=CODE)
  const prefilledCoupon = searchParams.get('cupom') ?? searchParams.get('coupon') ?? null;

  // Feedback imediato: avisa user que cupom será aplicado no checkout
  useEffect(() => {
    if (!prefilledCoupon || !company) return;
    toast({
      title: `Cupom ${prefilledCoupon.toUpperCase()} pronto pra usar! 🎟️`,
      description: "Será aplicado automaticamente no checkout.",
    });
  }, [prefilledCoupon, company?.id]);
  const [tableInfo, setTableInfo] = useState<{ id: string; table_number: string } | null>(null);

  // Sessão do cliente, favoritos, histórico e fidelidade (company.id disponível após load)
  const { session, identify, saveAddress, removeAddress, setDefaultAddress, syncAddressesFromServer, clearSession } = useCustomerSession();
  const { favorites, toggle: toggleFavorite } = useFavorites(company?.id ?? "");
  const { history, addOrder, refreshStatuses, loadFromServer } = useOrderHistory(company?.id ?? "");

  // Carrega histórico + endereços do servidor quando session disponível (pega pedidos de outros devices + WhatsApp)
  useEffect(() => {
    if (company?.id && session?.phone) {
      loadFromServer(session.phone);
      syncAddressesFromServer(company.id);
    }
  }, [company?.id, session?.phone, loadFromServer, syncAddressesFromServer]);

  // Trava back/exit acidental — só ativa quando cardápio carregado
  useExitConfirmation(!!company?.id, "Tem certeza que deseja sair do cardápio?");

  // Captura ?ref=PHONE do URL (programa de indicações)
  const { referrerPhone, clearReferral } = useReferralCapture();
  const { points: loyaltyPoints, fetchPoints: refreshLoyalty } = useLoyaltyPoints(company?.id ?? "", session?.phone);
  const { trackView } = useProductViewTracker(company?.id ?? "");
  const { getDiscount: getCampaignDiscount } = useActiveCampaigns(company?.id ?? "");
  const { popularIds } = usePopularProducts(company?.id ?? "");

  // Push de carrinho abandonado: agenda 10min após última mudança no cart
  useAbandonedCartReminder({
    hasItems: cart.length > 0,
    customerPhone: session?.phone,
    companyId: company?.id,
    companySubdomain: company?.subdomain ?? undefined,
  });

  // Meta tags pra SEO + WhatsApp/social preview
  useDocumentMeta({
    title: company ? `${company.fantasy_name || company.name} — Cardápio Online` : "Cardápio",
    description: company?.description || `Faça seu pedido online em ${company?.fantasy_name || company?.name || "AnaFood"}`,
    image: company?.banner_url || company?.logo_url || null,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    type: "website",
    siteName: "AnaFood",
  });

  // Decora produtos com desconto de campanha (sobrescreve promotional_price + badge happy_hour)
  const decoratedProducts = useMemo(() => {
    return products.map(p => {
      const disc = getCampaignDiscount(p);
      if (!disc) return p;
      return {
        ...p,
        promotional_price: disc.effectivePrice,
        badges: ["happy_hour", ...(p.badges?.filter(b => b !== "happy_hour") || [])],
      };
    });
  }, [products, getCampaignDiscount]);

  // Config fidelidade extraída da empresa
  const loyaltyConfig = company ? {
    loyalty_points_per_real: company.loyalty_points_per_real,
    loyalty_min_redeem: company.loyalty_min_redeem,
    loyalty_redeem_value: company.loyalty_redeem_value,
  } : undefined;

  useEffect(() => {
    resetPalette();
    return () => initializeColorPalette();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setActiveBanner(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  useEffect(() => {
    loadMenuData();
  }, [subdomain, customDomain]);

  const loadMenuData = async () => {
    try {
      setLoading(true);

      // Resolve empresa por subdomain OU custom_domain (Caminho C VPS proxy)
      let companyQuery = supabase.from('companies').select('*');
      if (customDomain) {
        companyQuery = companyQuery
          .eq('custom_domain', customDomain)
          .eq('custom_domain_status', 'active');
      } else {
        companyQuery = companyQuery.eq('subdomain', subdomain);
      }
      const { data: companyData, error: companyError } = await companyQuery.maybeSingle();

      if (companyError) throw companyError;
      if (!companyData) {
        toast({ title: "Erro", description: "Estabelecimento não encontrado", variant: "destructive" });
        return;
      }

      setCompany(companyData);

      // Verifica pedido ativo salvo para este cliente/empresa
      const storageKey = `anafood_order_${companyData.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const { orderId } = JSON.parse(saved);
          const { data: orderStatus } = await supabase.rpc("get_order_tracking", { p_order_id: orderId });
          if (orderStatus && !["delivered", "cancelled"].includes(orderStatus.status)) {
            setActiveOrderBanner({ orderId, status: orderStatus.status });
          } else {
            localStorage.removeItem(storageKey);
          }
        } catch {
          localStorage.removeItem(storageKey);
        }
      }

      if (tableNumber) {
        const { data: tableData } = await supabase
          .from('tables')
          .select('id, table_number')
          .eq('company_id', companyData.id)
          .eq('table_number', tableNumber)
          .maybeSingle();
        if (tableData) setTableInfo(tableData);
      }

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('on_off', true)
        .order('name');

      setCategories(categoriesData || []);

      const { data: productsData } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyData.id)
        .eq('on_off', true)
        .order('name');

      setProducts(productsData || []);

      const { data: bannersData } = await supabase
        .from('menu_banners')
        .select('id, image_url, link_type, link_value')
        .eq('company_id', companyData.id)
        .eq('is_active', true)
        .order('display_order');
      setBanners(bannersData || []);
    } catch (error) {
      console.error('Error loading menu:', error);
      toast({ title: "Erro", description: "Erro ao carregar cardápio", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, quantity: number = 1, observations?: string, extras: SelectedExtra[] = []) => {
    const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
    // Preço efetivo: usa promotional_price quando definido (cobre promo normal + campanha happy hour)
    const effectivePrice = product.promotional_price != null && product.promotional_price < product.price
      ? product.promotional_price
      : product.price;
    setCart(prev => [...prev, {
      cartItemId: crypto.randomUUID(),
      product: { ...product, price: effectivePrice },
      quantity,
      observations,
      extras,
      extrasTotal,
    }]);
    toast({ title: "Produto adicionado", description: `${product.name} foi adicionado ao carrinho` });
    // GA/FB: evento add_to_cart com valor e items
    trackEvent("add_to_cart", {
      currency: "BRL",
      value: effectivePrice * quantity,
      items: [{ item_id: product.id, item_name: product.name, price: effectivePrice, quantity }],
    });
    // Analytics interno: registra add_to_cart (fire-and-forget, não bloqueia UX)
    if (company?.id) {
      supabase.from("product_events" as any).insert({
        company_id: company.id,
        product_id: product.id,
        event_type: "add_to_cart",
      }).then(({ error }) => { if (error) console.warn("track add_to_cart failed", error); });
    }
  };

  const updateCartItem = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(cartItemId); return; }
    setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity } : item));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => setCart([]);

  const getCartTotal = () =>
    cart.reduce((total, item) => total + (item.product.price + item.extrasTotal) * item.quantity, 0);

  // Repetir pedido: re-adiciona itens ao carrinho cruzando com produtos atuais
  const handleRepeatOrder = (items: Array<{ name: string; quantity: number; price: number }>) => {
    let added = 0;
    items.forEach(item => {
      const product = products.find(p => p.name === item.name);
      if (product) {
        addToCart(product, item.quantity);
        added++;
      }
    });
    if (added > 0) {
      toast({ title: "Itens adicionados!", description: `${added} produto(s) adicionado(s) ao carrinho` });
    } else {
      toast({ title: "Produtos indisponíveis", description: "Nenhum item do pedido anterior está disponível", variant: "destructive" });
    }
  };

  // Salva pedido no histórico local após confirmação
  const handleOrderSuccess = (orderId?: string) => {
    // Captura dados do carrinho ANTES de limpar
    const orderTotal = getCartTotal();
    const orderItems = cart.map(i => ({ name: i.product.name, quantity: i.quantity, price: i.product.price + i.extrasTotal }));
    // GA/FB: evento purchase com valor e itens
    trackEvent("purchase", {
      transaction_id: orderId,
      currency: "BRL",
      value: orderTotal,
      items: cart.map(i => ({
        item_id: i.product.id,
        item_name: i.product.name,
        price: i.product.price + i.extrasTotal,
        quantity: i.quantity,
      })),
    });
    clearCart();
    setShowCheckout(false);
    if (orderId && company) {
      localStorage.setItem(`anafood_order_${company.id}`, JSON.stringify({ orderId }));
      setTrackingOrderId(orderId);
      addOrder({
        orderId,
        date: new Date().toISOString(),
        total: orderTotal,
        items: orderItems,
        status: "pending",
      });
    }
  };

  const handleBannerClick = (banner: typeof banners[0]) => {
    if (!banner.link_type || banner.link_type === "none") return;
    if (banner.link_type === "url" && banner.link_value) {
      window.open(banner.link_value, "_blank");
    } else if (banner.link_type === "whatsapp" && banner.link_value) {
      window.open(`https://wa.me/${banner.link_value.replace(/\D/g, "")}`, "_blank");
    } else if (banner.link_type === "category" && banner.link_value) {
      // Anchor-based: scroll to section instead of filtering
      const cat = categories.find(c => c.id === banner.link_value || c.name === banner.link_value);
      if (cat) {
        const el = document.getElementById(`section-${cat.id}`);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  // Produto para adição rápida (MenuSections — sem modal de extras, abre ProductAddModal)
  const handleQuickAdd = (product: Product) => {
    setQuickAddProduct(product);
  };

  // Handler do menu inferior — cada aba abre sheet correspondente
  const handleBottomNavChange = (view: MenuView) => {
    setActiveView(view);
    if (view === "home") {
      // Fecha sheets abertos + scroll topo
      setShowCustomerSheet(false);
      setShowPromosSheet(false);
      setShowCartSheet(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (view === "orders") {
      setShowCustomerSheet(true);
      setShowPromosSheet(false);
      setShowCartSheet(false);
    } else if (view === "promos") {
      // Unificado dentro do CustomerSheet (aba "promos") — não abre Sheet separado
      setShowCustomerSheet(true);
      setShowPromosSheet(false);
      setShowCartSheet(false);
    } else if (view === "cart") {
      setShowCartSheet(true);
      setShowCustomerSheet(false);
      setShowPromosSheet(false);
    }
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Estabelecimento não encontrado</h1>
          <p className="text-muted-foreground">Verifique se o link está correto</p>
        </div>
      </div>
    );
  }

  const activeCategories = categories.filter(c => c.on_off);

  // Context value memoizado — evita re-render desnecessário em subscribers
  const menuContextValue = useMemo(() => ({
    companyId: company.id,
    storeSubdomain: company.subdomain ?? null,
    storeName: company.fantasy_name || company.name,
    referralRewardPoints: (company as any).referral_reward_points ?? 100,
    session,
    history,
    favorites,
    products,
    loyaltyPoints,
    loyaltyConfig,
    referrerPhone,
    onIdentify: identify,
    onClearSession: clearSession,
    onRefreshHistory: async () => {
      if (session?.phone) await loadFromServer(session.phone);
      await refreshStatuses();
    },
    onRepeatOrder: handleRepeatOrder,
    onViewOrder: (orderId: string) => setTrackingOrderId(orderId),
    onSaveAddress: saveAddress,
    onRemoveAddress: removeAddress,
    onSetDefaultAddress: setDefaultAddress,
    onClearReferral: clearReferral,
  }), [
    company.id, company.subdomain, company.fantasy_name, company.name,
    session, history, favorites, products, loyaltyPoints, loyaltyConfig,
    referrerPhone, identify, clearSession, handleRepeatOrder,
    saveAddress, removeAddress, setDefaultAddress, clearReferral,
    loadFromServer, refreshStatuses,
  ]);

  return (
    <MenuProvider value={menuContextValue}>
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <MenuHeader
        company={company}
        themeSlot={<MenuThemeToggle />}
        onProfileClick={() => setShowStoreProfile(true)}
        customerSlot={
          <CustomerSheet
            companyId={company.id}
            session={session}
            history={history}
            favorites={favorites}
            products={products}
            loyaltyPoints={loyaltyPoints}
            loyaltyConfig={loyaltyConfig}
            onIdentify={identify}
            onClearSession={clearSession}
            onRefreshHistory={async () => {
              if (session?.phone) await loadFromServer(session.phone);
              await refreshStatuses();
            }}
            onRepeatOrder={handleRepeatOrder}
            onViewOrder={(orderId) => setTrackingOrderId(orderId)}
            onSaveAddress={saveAddress}
            onRemoveAddress={removeAddress}
            onSetDefaultAddress={setDefaultAddress}
            open={showCustomerSheet}
            onOpenChange={(o) => { setShowCustomerSheet(o); if (!o && (activeView === "orders" || activeView === "promos")) setActiveView("home"); }}
            defaultTab={activeView === "promos" ? "promos" : "orders"}
            storeSubdomain={company.subdomain}
            storeName={company.fantasy_name || company.name}
            referralRewardPoints={(company as any).referral_reward_points ?? 100}
          />
        }
      />

      {/* Banner de mesa via QR Code */}
      {tableInfo && (
        <div className="bg-primary text-primary-foreground py-2 px-4 text-center">
          <span className="font-medium">Mesa {tableInfo.table_number}</span>
          <span className="ml-2 text-sm opacity-80">Pedido via QR Code</span>
        </div>
      )}

      {/* Botão chamar garçom — só se vier por QR code de mesa */}
      {tableInfo && company && (
        <CallWaiterButton companyId={company.id} tableNumber={tableInfo.table_number} />
      )}

      {/* Banners do cardápio */}
      {banners.length > 0 && (
        <div className="relative w-full overflow-hidden">
          <div className="relative aspect-[3/1] max-h-48">
            {banners.map((banner, idx) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-500 ${idx === activeBanner ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                <img
                  src={banner.image_url}
                  alt="Banner promocional"
                  className={`w-full h-full object-cover ${banner.link_type && banner.link_type !== "none" ? "cursor-pointer" : ""}`}
                  onClick={() => handleBannerClick(banner)}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
          </div>
          {banners.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveBanner(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${idx === activeBanner ? "bg-white scale-125" : "bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Barra de busca */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur px-4 py-2 border-b border-border">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm bg-muted rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navegação de categorias sticky */}
      <MenuCategories
        categories={activeCategories}
        searchActive={!!searchQuery}
      />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Seções de destaque — só no modo normal */}
            {!searchQuery && (
              <>
                {/* Peça novamente — só pra clientes com histórico */}
                {session && history.length > 0 && (
                  <OrderAgainSection
                    history={history}
                    allProducts={decoratedProducts}
                    onAdd={handleQuickAdd}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                  />
                )}
                <MenuSections
                  products={decoratedProducts}
                  onAdd={handleQuickAdd}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  onProductView={trackView}
                  popularProductIds={popularIds}
                />
              </>
            )}

            <MenuProducts
              products={decoratedProducts}
              categories={activeCategories}
              companyId={company.id}
              searchQuery={searchQuery}
              onAddToCart={addToCart}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onProductView={trackView}
            />
          </div>

          {/* Carrinho desktop (escondido em mobile — CartBottomBar cuida do mobile) */}
          <div className="hidden lg:block lg:col-span-1">
            <MenuCart
              cart={cart}
              onUpdateQuantity={updateCartItem}
              onRemoveItem={removeFromCart}
              onClearCart={clearCart}
              onCheckout={() => { trackEvent("begin_checkout", { currency: "BRL", value: getCartTotal() }); setShowCheckout(true); }}
              total={getCartTotal()}
              allProducts={decoratedProducts}
              onUpsellSelect={handleQuickAdd}
            />
          </div>
        </div>
      </div>

      {/* Barra do carrinho fixa no rodapé (mobile only) */}
      <CartBottomBar
        cart={cart}
        total={getCartTotal()}
        minOrderValue={company.min_order_value}
        onUpdateQuantity={updateCartItem}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckout={() => setShowCheckout(true)}
        allProducts={decoratedProducts}
        onUpsellSelect={handleQuickAdd}
        open={showCartSheet}
        onOpenChange={(o) => { setShowCartSheet(o); if (!o && activeView === "cart") setActiveView("home"); }}
        hideBar
        companyId={company.id}
      />

      {/* Promoções unificadas dentro do CustomerSheet (aba promos) — PromosSheet standalone removido */}

      {/* Menu inferior fixo (4 abas, mobile-only) */}
      <MenuBottomNav
        active={activeView}
        cartCount={totalCartItems}
        onChange={handleBottomNavChange}
      />

      {/* Modal de extras para adição rápida (MenuSections) */}
      <ProductAddModal
        product={quickAddProduct}
        companyId={company.id}
        open={!!quickAddProduct}
        onOpenChange={(open) => { if (!open) setQuickAddProduct(null); }}
        onAddToCart={(extras, quantity, observations) => {
          if (quickAddProduct) addToCart(quickAddProduct, quantity, observations || undefined, extras);
        }}
      />

      {/* Injeta scripts de tracking (GA, FB Pixel, meta verification) */}
      <TrackingScripts
        googleAnalyticsId={company.google_analytics_id}
        facebookPixelId={company.facebook_pixel_id}
        metaVerificationTags={company.meta_verification_tags}
      />

      {showCheckout && (
        <MenuCheckout
          cart={cart}
          total={getCartTotal()}
          company={company}
          tableInfo={tableInfo}
          requireCustomerInfo={!!tableInfo}
          session={session}
          loyaltyPoints={loyaltyPoints}
          loyaltyConfig={loyaltyConfig}
          prefilledCouponCode={prefilledCoupon}
          onClose={() => setShowCheckout(false)}
          onSuccess={handleOrderSuccess}
          onSaveAddress={saveAddress}
          onLoyaltyChange={refreshLoyalty}
          referrerPhone={referrerPhone}
          onReferralUsed={clearReferral}
        />
      )}

      {/* PWA install prompt — só aparece após 8s, dispensável */}
      <InstallPrompt companyName={company.fantasy_name || company.name} />

      {/* Sheet perfil da loja */}
      <StoreProfileSheet
        open={showStoreProfile}
        onOpenChange={setShowStoreProfile}
        company={company}
      />

      {/* Banner de pedido ativo */}
      {activeOrderBanner && !trackingOrderId && (
        <div
          className="fixed bottom-20 left-0 right-0 z-40 mx-4 cursor-pointer"
          onClick={() => setTrackingOrderId(activeOrderBanner.orderId)}
        >
          <div className="bg-primary text-primary-foreground rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3 animate-bounce-once">
            <div className="w-9 h-9 bg-primary-foreground/20 rounded-full flex items-center justify-center shrink-0">
              <ChefHat className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Você tem um pedido ativo!</p>
              <p className="text-xs opacity-80">Toque para acompanhar</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
          </div>
        </div>
      )}

      {trackingOrderId && (
        <div className="fixed inset-0 z-50">
          <OrderTracking
            orderId={trackingOrderId}
            company={{ ...company, id: company.id }}
            onClose={() => {
              setTrackingOrderId(null);
              const storageKey = `anafood_order_${company.id}`;
              const saved = localStorage.getItem(storageKey);
              if (!saved) setActiveOrderBanner(null);
            }}
          />
        </div>
      )}

      <footer className="mt-12 py-4 text-center border-t border-border">
        <a href="/login" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          Área do lojista
        </a>
      </footer>
    </div>
    </MenuProvider>
  );
}
