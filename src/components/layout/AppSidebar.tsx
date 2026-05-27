// v1.7.0 — Sidebar passa flag isDistribuidora pra menu (gera "Movimentações" condicional)
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  LogOut, ChevronDown, Store, Mail, User, Pin, PinOff, X, Menu, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { saveUserTheme } from "@/components/layout/UserThemeSync";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUserRole } from "@/hooks/use-user-role";
import { useModules } from "@/hooks/useModules";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { getMenuItems } from "@/components/layout/menu-items";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function AppSidebar() {
  const { state, open, setOpen } = useSidebar();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  // No Electron (systemView), sidebar fica colapsada para não conflitar com o sidebar Electron
  const isElectronView = typeof window !== 'undefined' && !!(window as any).__IN_SYSTEM_VIEW;

  // Toggle dark mode — persiste por usuário (localStorage + DB), não global
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    saveUserTheme(next); // async, não bloqueia UI
  };
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const { isEnabled } = useModules(); // checa modules_enabled da empresa (override admin)
  const { hasExtra } = usePlanFeatures(); // checa feature_flags do plano contratado
  const [openGroups, setOpenGroups] = useLocalStorage<string[]>("sidebar:openGroups", []);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useLocalStorage<boolean>("sidebar:pinned", false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Menu respeita módulos habilitados via AnaFood Master (modules_enabled)
  // distribuidoras: plano + módulo. Demais: apenas módulo (são padrão liberados).
  const distribuidorasOK = hasExtra("distribuidoras") && isEnabled("distribuidoras");
  const menuItems = getMenuItems({
    isAdmin,
    isDistribuidora: distribuidorasOK,
    hasFinanceiro:      isEnabled("financeiro"),
    hasPdv:             isEnabled("pdv"),
    hasWhatsapp:        isEnabled("whatsapp"),
    hasCardapioDigital: isEnabled("cardapio_digital"),
  });

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
          .select('id, name, fantasy_name, logo_url, cnpj, email, whatsapp, phone, subdomain')
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

  // Sync Supabase merchant session to Electron local settings.json
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && !!(window as any).require;
    if (isElectron && userInfo?.company) {
      try {
        const { ipcRenderer } = (window as any).require("electron");
        const company = userInfo.company;
        ipcRenderer.invoke("sync-merchant-session", {
          companyId: company.id,
          companyName: company.fantasy_name || company.name || "Sem Nome",
          companyEmail: company.email || userInfo.email || "",
          companyPhone: company.whatsapp || company.phone || "",
          companySubdomain: company.subdomain || "",
        }).then((res) => {
          console.log("[Electron Sync] Merchant session synced:", res);
        }).catch((err) => {
          console.error("[Electron Sync] Failed to sync session:", err);
        });
      } catch (e) {
        console.error("[Electron Sync] Error in sync-merchant-session:", e);
      }
    }
  }, [userInfo]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // v2.0.0 — Logout sem erro intermediário: usa window.location.replace pra
  // sair da árvore React ANTES dos useQuery refazerem fetch com user=null
  const handleLogout = async () => {
    try {
      // Clear Electron session
      const isElectron = typeof window !== 'undefined' && !!(window as any).require;
      if (isElectron) {
        try {
          const { ipcRenderer } = (window as any).require("electron");
          await ipcRenderer.invoke("logout-merchant");
        } catch (e) {
          console.error("Failed to call logout-merchant in Electron:", e);
        }
      }

      // Limpa storage primeiro (evita autoLogin de cache stale)
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("anafood_") || k.startsWith("user_theme_") || k.startsWith("sb-")) {
            localStorage.removeItem(k);
          }
        });
        sessionStorage.clear();
      } catch { /* noop */ }

      // SignOut em paralelo (não bloqueia redirect)
      supabase.auth.signOut().catch(() => { /* noop */ });

      // Hard redirect: força reload da app + limpa todo estado React/queries
      // Evita "erro depois volta" porque componentes não chegam a renderizar com user=null
      window.location.replace("/login");
    } catch (err) {
      window.location.replace("/login");
    }
  };

  const isActive = (path: string) => location.pathname === path;
  
  const getNavItemClass = (isActive: boolean) => {
    return isActive 
      ? "bg-primary/10 text-primary font-medium hover:bg-primary/15" 
      : "hover:bg-muted/50";
  };

  // Accordion: abre o grupo clicado, fecha todos os outros automaticamente
  const toggleGroup = (groupTitle: string) => {
    setOpenGroups(prev =>
      prev.includes(groupTitle) ? [] : [groupTitle]
    );
  };

  const isExpanded = isPinned || (isHovered && !isMobile);
  const showContent = isExpanded;
  
  // Sync open state with isPinned on trigger click
  useEffect(() => {
    if (isMobile) return;
    const expectedOpen = isPinned || isHovered;
    if (open !== expectedOpen) {
      setIsPinned(open);
    }
  }, [open, isPinned, isHovered, isMobile, setIsPinned]);

  useEffect(() => {
    if (isPinned || (isHovered && !isMobile)) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isHovered, isPinned, isMobile, setOpen]);

  // Sync with Electron main process when expanded state changes
  useEffect(() => {
    const isElectron = typeof window !== 'undefined' && !!(window as any).require;
    if (isElectron) {
      try {
        const { ipcRenderer } = (window as any).require("electron");
        ipcRenderer.send("sidebar-toggled", isExpanded);
      } catch (e) {
        console.error("[Electron Sync] Error sending sidebar-toggled:", e);
      }
    }
  }, [isExpanded]);

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

          {/* Mobile footer: toggle tema + sair */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border space-y-1">
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span>{theme === "dark" ? "Escuro" : "Claro"}</span>
              </div>
              <button
                onClick={() => toggleTheme()}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  theme === "dark" ? "bg-primary" : "bg-input"
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg transition-transform duration-200 ${
                  theme === "dark" ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowLogoutConfirm(true)}
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

        {/* No Electron: footer oculto — logout fica no sidebar Electron, tema não é necessário aqui */}
        <SidebarFooter className={`border-t border-border${isElectronView ? ' hidden' : ''}`}>
          <div className={`${!showContent ? "p-2" : "p-4"} space-y-1 transition-all duration-300`}>
            {/* Toggle dark/light — padrão GitHub/Linear/Notion: bottom of sidebar */}
            {showContent ? (
              <div className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span className="animate-fade-in">{theme === "dark" ? "Escuro" : "Claro"}</span>
                </div>
                <button
                  onClick={() => toggleTheme()}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    theme === "dark" ? "bg-primary" : "bg-input"
                  }`}
                  title="Alternar tema"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ${
                      theme === "dark" ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleTheme()}
                className="w-full hover:bg-muted/50"
                title={theme === "dark" ? "Mudar para claro" : "Mudar para escuro"}
              >
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </Button>
            )}

            <Button
              variant="ghost"
              size={!showContent ? "icon" : "default"}
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
              title="Sair"
            >
              <LogOut className={`${!showContent ? "h-5 w-5" : "h-4 w-4"}`} />
              {showContent && <span className="ml-2 animate-fade-in">Sair</span>}
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Confirmação de logout */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do sistema?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado e redirecionado para a tela de login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}