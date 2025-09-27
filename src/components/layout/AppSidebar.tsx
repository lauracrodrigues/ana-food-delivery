import { useState } from "react";
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
  Store,
  Mail,
  User
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
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

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Pedidos",
    url: "/orders",
    icon: ShoppingBag,
  },
  {
    title: "Cadastros",
    icon: Package,
    subItems: [
      { title: "Clientes", url: "/customers", icon: Users },
      { title: "Produtos", url: "/products", icon: ShoppingCart },
      { title: "Categorias", url: "/categories", icon: Tag },
      { title: "Adicionais", url: "/extras", icon: Plus },
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
      { title: "Dados da Empresa", url: "/settings/company", icon: Building2 },
      { title: "Bairros de Entrega", url: "/settings/delivery-areas", icon: MapPin },
      { title: "Outras Configurações", url: "/settings/general", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [openGroups, setOpenGroups] = useState<string[]>(["Cadastros", "Configurações"]);

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
          .select('name, fantasy_name, logo_url')
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

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border">
        <div className="p-4">
          {/* Company Logo and Name */}
          <div className="flex items-center gap-3 mb-4">
            {userInfo?.company?.logo_url ? (
              <img 
                src={userInfo.company.logo_url} 
                alt={userInfo.company.name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {userInfo?.company?.fantasy_name || userInfo?.company?.name || "AnaFood"}
                </p>
              </div>
            )}
          </div>

          {/* User Info */}
          {!isCollapsed && (
            <div className="space-y-1">
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
                              className={hasActiveSubItem ? "font-medium" : ""}
                            >
                              <item.icon className="h-4 w-4" />
                              {!isCollapsed && (
                                <>
                                  <span className="flex-1">{item.title}</span>
                                  <ChevronDown
                                    className={`h-4 w-4 transition-transform ${
                                      isGroupOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </>
                              )}
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          {!isCollapsed && (
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {item.subItems?.map((subItem) => (
                                  <SidebarMenuSubItem key={subItem.url}>
                                    <SidebarMenuSubButton
                                      asChild
                                      className={getNavItemClass(isActive(subItem.url))}
                                    >
                                      <NavLink to={subItem.url}>
                                        {subItem.icon && <subItem.icon className="h-4 w-4 mr-2" />}
                                        <span>{subItem.title}</span>
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
                        className={getNavItemClass(isItemActive)}
                      >
                        <NavLink to={item.url!}>
                          <item.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{item.title}</span>}
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
        <div className="p-4">
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "default"}
            onClick={handleLogout}
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}