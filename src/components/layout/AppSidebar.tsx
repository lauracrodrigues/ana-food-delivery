import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  Package, 
  Users,
  ShoppingCart,
  Tag,
  Plus,
  MessageSquare,
  Building2,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Store,
  Mail,
  User,
  CreditCard,
  Pin,
  PinOff,
  X,
  Menu,
  LayoutGrid,
  Wallet,
  Receipt,
  Clock
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: {
    title: string;
    url: string;
    icon?: React.ComponentType<{ className?: string }>;
  }[];
}

interface MenuItemsProps {
  isAdmin?: boolean;
}

const getMenuItems = ({ isAdmin = false }: MenuItemsProps = {}): MenuItem[] => [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "PDV",
    icon: Receipt,
    subItems: [
      { title: "Vendas", url: "/pdv", icon: ShoppingCart },
      { title: "Mesas", url: "/mesas", icon: LayoutGrid },
      { title: "Caixa", url: "/caixa", icon: Wallet },
      { title: "Histórico Caixas", url: "/caixa/historico", icon: Clock },
    ],
  },
  {
    title: "Pedidos",
    url: "/orders",
    icon: ShoppingBag,
  },
  {
    title: "Cardápio",
    url: "/menu",
    icon: Menu,
  },
  {
    title: "Cadastros",
    icon: Package,
    subItems: [
      ...(isAdmin ? [{ title: "Usuários", url: "/users", icon: Users }] : []),
      { title: "Clientes", url: "/customers", icon: Users },
      { title: "Taxas de Entrega", url: "/delivery-fees", icon: MapPin },
      { title: "Formas de Pagamento", url: "/payment-methods", icon: CreditCard },
    ],
  },
  {
    title: "WhatsApp",
    url: "/whatsapp",
    icon: MessageSquare,
  },
  {
    title: "Configurações",
    icon: Settings,
    subItems: [
      { title: "Perfil da Empresa", url: "/company-profile", icon: Building2 },
      { title: "Gerais", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state, toggleSidebar, setOpen } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Get menu items based on user role
  const menuItems = getMenuItems({ isAdmin });

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load user and company info
  const { data: userInfo } = useQuery({
    queryKey: ["user-info"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      // Get profile info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, company_id')
        .eq('id', user.id)
        .single();

      // Get company info
      let companyData = null;
      if (profile?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name, fantasy_name, logo_url, cnpj')
          .eq('id', profile.company_id)
          .single();
        companyData = company;
      }

      return {
        email: user.email,
        fullName: profile?.full_name || 'Usuário',
        company: companyData,
      };
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;
  
  const getNavItemClass = (isActive: boolean) => {
    return isActive 
      ? "bg-primary/10 text-primary font-medium hover:bg-primary/15" 
      : "hover:bg-muted/50";
  };

  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    );
  };

  const isExpanded = isPinned || (isHovered && !isMobile);
  const showContent = isExpanded;
  
  // Update sidebar state when hover or pin changes
  useEffect(() => {
    if (isPinned || (isHovered && !isMobile)) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isHovered, isPinned, isMobile, setOpen]);

  // Mobile menu toggle button for screens < 1024px
  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-[250px] bg-background border-r border-border z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-border">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(false)}
              className="absolute right-2 top-2 h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Logo and Company Info */}
            <div className="mb-4">
              {userInfo?.company?.logo_url ? (
                <img 
                  src={userInfo.company.logo_url} 
                  alt={userInfo.company.name}
                  className="w-[150px] h-[100px] object-contain mx-auto mb-3"
                />
              ) : (
                <div className="w-[150px] h-[100px] rounded-lg bg-gradient-primary flex items-center justify-center mx-auto mb-3">
                  <Store className="w-12 h-12 text-primary-foreground" />
                </div>
              )}
              <h2 className="text-lg font-semibold text-center">
                {userInfo?.company?.fantasy_name || userInfo?.company?.name || "AnaFood"}
              </h2>
              {userInfo?.company?.cnpj && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  CNPJ: {userInfo.company.cnpj}
                </p>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          <ScrollArea className="h-[calc(100%-200px)]">
            <nav className="p-4 space-y-1">
              {menuItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isGroupOpen = openGroups.includes(item.title);
                const isItemActive = item.url ? isActive(item.url) : false;

                if (hasSubItems) {
                  return (
                    <div key={item.title}>
                      <button
                        onClick={() => toggleGroup(item.title)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isGroupOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      {isGroupOpen && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.subItems?.map((subItem) => (
                            <NavLink
                              key={subItem.url}
                              to={subItem.url}
                              onClick={() => setIsMobileOpen(false)}
                              className={getNavItemClass(isActive(subItem.url)) + " block p-2 rounded-lg transition-colors duration-200"}
                            >
                              <div className="flex items-center gap-2">
                                {subItem.icon && <subItem.icon className="h-4 w-4" />}
                                <span className="text-sm">{subItem.title}</span>
                              </div>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.title}
                    to={item.url!}
                    onClick={() => setIsMobileOpen(false)}
                    className={getNavItemClass(isItemActive) + " flex items-center gap-3 p-3 rounded-lg transition-colors duration-200"}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Mobile Logout Button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Sair</span>
            </Button>
          </div>
        </aside>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <div
      onMouseEnter={() => !isPinned && setIsHovered(true)}
      onMouseLeave={() => !isPinned && setIsHovered(false)}
      className="relative"
    >
      <Sidebar 
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? "w-[250px]" : "w-[60px]"
        } h-screen border-r border-border shadow-lg`}
        collapsible="icon"
      >
        <SidebarHeader className="border-b border-border">
          <div className={`${!showContent ? "p-2" : "p-4"} transition-all duration-300`}>
            {/* Pin/Unpin Button - positioned differently when collapsed */}
            {showContent && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPinned(!isPinned)}
                className="absolute right-2 top-2 h-8 w-8 z-10 hover:bg-muted/50 transition-colors duration-200"
                title={isPinned ? "Desfixar" : "Fixar"}
              >
                {isPinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {/* Company Logo and Name */}
            <div className="flex flex-col items-center relative">
              {userInfo?.company?.logo_url ? (
                <img 
                  src={userInfo.company.logo_url} 
                  alt={userInfo.company.name}
                  className={`${
                    !showContent 
                      ? "w-10 h-8" 
                      : "w-[150px] h-[100px]"
                  } object-contain transition-all duration-300 mb-3`}
                />
              ) : (
                <div className={`${
                  !showContent 
                    ? "w-10 h-10" 
                    : "w-[150px] h-[100px]"
                } rounded-lg bg-gradient-primary flex items-center justify-center transition-all duration-300 mb-3`}>
                  <Store className={`${
                    !showContent 
                      ? "w-5 h-5" 
                      : "w-12 h-12"
                  } text-primary-foreground transition-all duration-300`} />
                </div>
              )}
              
              {showContent && (
                <div className="text-center space-y-1 animate-fade-in">
                  <h2 className="text-base font-semibold truncate max-w-[200px]">
                    {userInfo?.company?.fantasy_name || userInfo?.company?.name || "AnaFood"}
                  </h2>
                  {userInfo?.company?.cnpj && (
                    <p className="text-xs text-muted-foreground">
                      CNPJ: {userInfo.company.cnpj}
                    </p>
                  )}
                </div>
              )}
              
              {/* Pin button when collapsed - below logo */}
              {!showContent && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPinned(!isPinned)}
                  className="h-8 w-8 mt-2 hover:bg-muted/50 transition-colors duration-200"
                  title={isPinned ? "Desfixar" : "Fixar"}
                >
                  {isPinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* User Info */}
            {showContent && (
              <div className="mt-4 space-y-1 animate-fade-in">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{userInfo?.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{userInfo?.email}</span>
                </div>
              </div>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <ScrollArea className="flex-1">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const hasSubItems = item.subItems && item.subItems.length > 0;
                    const isGroupOpen = openGroups.includes(item.title);
                    const isItemActive = item.url ? isActive(item.url) : false;
                    const hasActiveSubItem = item.subItems?.some(sub => isActive(sub.url));

                    if (hasSubItems) {
                      return (
                        <Collapsible
                          key={item.title}
                          open={isGroupOpen}
                          onOpenChange={() => toggleGroup(item.title)}
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                className={`transition-all duration-300 ${
                                  hasActiveSubItem ? "font-medium bg-primary/10" : "hover:bg-muted/50"
                                }`}
                                title={item.title}
                              >
                                <item.icon className="h-5 w-5 min-w-[20px]" />
                                {showContent && (
                                  <>
                                    <span className="flex-1 animate-fade-in">{item.title}</span>
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform duration-300 ${
                                        isGroupOpen ? "rotate-180" : ""
                                      }`}
                                    />
                                  </>
                                )}
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            {showContent && (
                              <CollapsibleContent className="transition-all duration-300">
                                <SidebarMenuSub>
                                  {item.subItems?.map((subItem) => (
                                    <SidebarMenuSubItem key={subItem.url}>
                                      <SidebarMenuSubButton
                                        asChild
                                        className={`transition-all duration-200 ${getNavItemClass(isActive(subItem.url))}`}
                                      >
                                        <NavLink to={subItem.url} title={subItem.title}>
                                          {subItem.icon && <subItem.icon className="h-4 w-4 mr-2" />}
                                          <span className="animate-fade-in">{subItem.title}</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            )}
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    }

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`transition-all duration-300 ${getNavItemClass(isItemActive)}`}
                          title={item.title}
                        >
                          <NavLink to={item.url!}>
                            <item.icon className="h-5 w-5 min-w-[20px]" />
                            {showContent && (
                              <span className="animate-fade-in">{item.title}</span>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="border-t border-border">
          <div className={`${!showContent ? "p-2" : "p-4"} transition-all duration-300`}>
            <Button
              variant="ghost"
              size={!showContent ? "icon" : "default"}
              onClick={handleLogout}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              title="Sair"
            >
              <LogOut className={`${!showContent ? "h-5 w-5" : "h-4 w-4"}`} />
              {showContent && <span className="ml-2 animate-fade-in">Sair</span>}
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}