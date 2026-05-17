// v1.2.0 — Sheet conta + lookup automático por telefone (reconhece em aparelho novo)
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCustomerLookup } from "@/hooks/useCustomerLookup";
import { formatCurrency } from "@/lib/currency-formatter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, ShoppingBag, Heart, LogOut, RefreshCw, Eye, Sparkles, MapPin, Plus, Trash2, Check, LocateFixed, Search, Loader2, Tag } from "lucide-react";
import { PromosContent } from "./PromosSheet";
import { masks } from "@/lib/masks";
import type { CustomerSession } from "@/hooks/useCustomerSession";
import type { OrderHistoryItem } from "@/hooks/useOrderHistory";
import type { LoyaltyConfig } from "@/hooks/useLoyaltyPoints";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
}

interface CustomerSheetProps {
  companyId: string;
  session: CustomerSession | null;
  history: OrderHistoryItem[];
  favorites: string[];
  products: Product[];
  loyaltyPoints?: number;
  loyaltyConfig?: LoyaltyConfig;
  // Controle externo opcional — quando setado, sobrescreve estado interno
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  defaultTab?: "orders" | "favorites" | "promos" | "addresses";
  onIdentify: (name: string, phone: string) => void;
  onClearSession: () => void;
  onRefreshHistory: () => void;
  onRepeatOrder: (items: OrderHistoryItem["items"]) => void;
  onViewOrder: (orderId: string) => void;
  onSaveAddress?: (address: string) => void;
  onRemoveAddress?: (address: string) => void;
  onSetDefaultAddress?: (address: string) => void;
  // Indicações — passado pra aba Promos > Indicar
  storeSubdomain?: string | null;
  storeName?: string;
  referralRewardPoints?: number;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando", confirmed: "Confirmado", preparing: "Preparando",
  ready: "Pronto", delivering: "Em entrega", delivered: "Entregue",
  cancelled: "Cancelado", archived: "Arquivado",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-amber-600 border-amber-300 bg-amber-50",
  confirmed: "text-blue-600 border-blue-300 bg-blue-50",
  preparing: "text-orange-600 border-orange-300 bg-orange-50",
  ready: "text-green-600 border-green-300 bg-green-50",
  delivering: "text-purple-600 border-purple-300 bg-purple-50",
  delivered: "text-green-700 border-green-400 bg-green-100",
  cancelled: "text-red-600 border-red-300 bg-red-50",
  archived: "text-gray-500 border-gray-300 bg-gray-50",
};

export function CustomerSheetTrigger({ session, favoritesCount, onClick }: {
  session: CustomerSession | null;
  favoritesCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
      aria-label="Minha conta"
    >
      <User className="h-4 w-4 text-primary" />
      {favoritesCount > 0 && !session && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {favoritesCount > 9 ? "9+" : favoritesCount}
        </span>
      )}
    </button>
  );
}

export function CustomerSheet({
  companyId, session, history, favorites, products, loyaltyPoints = 0, loyaltyConfig,
  open: externalOpen, onOpenChange: externalOnOpenChange, hideTrigger, defaultTab = "orders",
  onIdentify, onClearSession, onRefreshHistory, onRepeatOrder, onViewOrder,
  onSaveAddress, onRemoveAddress, onSetDefaultAddress,
  storeSubdomain, storeName, referralRewardPoints,
}: CustomerSheetProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  // Modo controlado se props externas presentes
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(v);
    else setInternalOpen(v);
  };
  const [identifyForm, setIdentifyForm] = useState({ name: "", phone: "" });
  const [refreshing, setRefreshing] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [newAddress, setNewAddress] = useState(""); // input de novo endereço na aba Endereços
  const [cepInput, setCepInput] = useState(""); // input CEP pra busca ViaCEP
  const [cepLoading, setCepLoading] = useState(false); // loading busca CEP
  const [geoLoading, setGeoLoading] = useState(false); // loading geolocation
  const [addressNumber, setAddressNumber] = useState(""); // número opcional após CEP/GPS
  const { toast } = useToast();
  const { lookupByPhone } = useCustomerLookup(companyId);

  // Auto-lookup: ao completar 11 dígitos (DDD + celular BR), dispara busca imediata
  useEffect(() => {
    if (lookupDone) return;
    const phoneDigits = identifyForm.phone.replace(/\D/g, "");
    // 11 = celular (DDD 2 + 9 dígitos); aceita 10 também (fixo) como fallback
    if (phoneDigits.length < 10) return;

    // Sem debounce quando já tem 11 dígitos (input completo); 500ms se só 10 (pode estar digitando)
    const delay = phoneDigits.length >= 11 ? 0 : 500;
    const timer = setTimeout(async () => {
      const result = await lookupByPhone(identifyForm.phone);
      setLookupDone(true);
      if (!result.found) return;
      // Popula nome mesmo se user já digitou algo (servidor é fonte da verdade)
      setIdentifyForm(prev => ({ ...prev, name: result.name || prev.name }));
      toast({
        title: `Bem-vindo de volta! 👋`,
        description: `${result.name} — ${result.totalOrders} pedido(s) anteriores`,
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [identifyForm.phone, lookupDone, lookupByPhone, toast]);

  const handleIdentify = () => {
    if (!identifyForm.name.trim() || !identifyForm.phone.trim()) return;
    onIdentify(identifyForm.name.trim(), identifyForm.phone.trim());
    setIdentifyForm({ name: "", phone: "" });
    setLookupDone(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshHistory();
    setRefreshing(false);
  };

  const favoritedProducts = products.filter(p => favorites.includes(p.id));

  return (
    <>
      {!hideTrigger && (
        <CustomerSheetTrigger
          session={session}
          favoritesCount={favorites.length}
          onClick={() => setOpen(true)}
        />
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl px-0">
          <SheetHeader className="px-4 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {session ? `Olá, ${session.name.split(" ")[0]}!` : "Minha Conta"}
            </SheetTitle>
          </SheetHeader>

          {!session ? (
            /* Formulário de identificação — telefone PRIMEIRO (lookup auto popula nome se cliente existir) */
            <div className="px-4 py-6 space-y-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground text-center">
                Digite seu telefone — se já comprou aqui, busco seus dados
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    placeholder="(00) 00000-0000"
                    value={identifyForm.phone}
                    onChange={e => {
                      // Aplica máscara (XX) XXXXX-XXXX — limita 15 chars
                      const masked = masks.phone(e.target.value);
                      setIdentifyForm(prev => ({ ...prev, phone: masked }));
                      setLookupDone(false);
                    }}
                    onKeyDown={e => e.key === "Enter" && handleIdentify()}
                    maxLength={15}
                    autoFocus
                  />
                  {/* Feedback visual quando lookup encontrou cliente */}
                  {lookupDone && identifyForm.name && (
                    <p className="text-xs text-green-700 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Cliente encontrado: dados preenchidos
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Seu nome"
                    value={identifyForm.name}
                    onChange={e => setIdentifyForm(prev => ({ ...prev, name: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && handleIdentify()}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleIdentify}
                  disabled={!identifyForm.name.trim() || !identifyForm.phone.trim()}
                >
                  Entrar
                </Button>
              </div>
              {favoritedProducts.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                    {favoritedProducts.length} favorito(s) neste dispositivo
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Conta identificada: tabs Pedidos + Favoritos + Pontos */
            <Tabs defaultValue={defaultTab} className="flex flex-col h-[calc(80vh-80px)]">
              <TabsList className="mx-4 mt-3 grid grid-cols-4">
                <TabsTrigger value="orders" className="flex items-center gap-1 text-xs">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Pedidos</span>
                  {history.length > 0 && ` (${history.length})`}
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex items-center gap-1 text-xs">
                  <Heart className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Favoritos</span>
                  {favorites.length > 0 && ` (${favorites.length})`}
                </TabsTrigger>
                <TabsTrigger value="addresses" className="flex items-center gap-1 text-xs">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Endereços</span>
                </TabsTrigger>
                <TabsTrigger value="promos" className="flex items-center gap-1 text-xs">
                  <Tag className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Promos</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab: Histórico de pedidos */}
              <TabsContent value="orders" className="flex-1 flex flex-col overflow-hidden mt-0">
                <div className="flex items-center justify-between px-4 py-2">
                  <p className="text-xs text-muted-foreground">Pedidos neste dispositivo</p>
                  <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-7 gap-1 text-xs">
                    <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                    Atualizar
                  </Button>
                </div>
                <ScrollArea className="flex-1 px-4">
                  {history.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">Você ainda não fez nenhum pedido</p>
                      <p className="text-xs mb-4">Que tal experimentar nosso cardápio?</p>
                      <Button onClick={() => setOpen(false)} size="sm" className="gap-1.5">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Adicionar produtos
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 pb-4">
                      {history.map(order => (
                        <div key={order.orderId} className="border rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">
                                {order.orderNumber ? `Pedido #${order.orderNumber}` : `Pedido ${order.orderId.slice(-6).toUpperCase()}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            {/* Badge de status com cor semântica */}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[order.status] || STATUS_COLOR.pending}`}>
                              {STATUS_LABEL[order.status] || order.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.items.slice(0, 2).map((i, idx) => (
                              <span key={idx}>{i.quantity}x {i.name}{idx < Math.min(order.items.length, 2) - 1 ? ", " : ""}</span>
                            ))}
                            {order.items.length > 2 && <span> +{order.items.length - 2} itens</span>}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-primary">{formatCurrency(order.total)}</span>
                            <div className="flex gap-1.5">
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                                onClick={() => { setOpen(false); onViewOrder(order.orderId); }}>
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                                onClick={() => { setOpen(false); onRepeatOrder(order.items); }}>
                                Repetir
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Tab: Favoritos */}
              <TabsContent value="favorites" className="flex-1 overflow-y-auto mt-0 px-4 pt-2">
                  {favoritedProducts.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Heart className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum favorito ainda</p>
                      <p className="text-xs mt-1">Toque no coração nos produtos</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pb-4">
                      {favoritedProducts.map(p => (
                        <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-primary font-semibold">{formatCurrency(p.price)}</p>
                          </div>
                          <Heart className="h-4 w-4 text-red-500 fill-red-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
              </TabsContent>

              {/* Tab: Endereços salvos do cliente */}
              <TabsContent value="addresses" className="flex-1 overflow-y-auto mt-0 px-4 pt-2">
                  <div className="space-y-3 pb-4">
                    {/* Adicionar novo endereço — 3 modos: CEP, GPS, manual */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Adicionar novo endereço</p>

                      {/* Linha 1: CEP — busca por código postal via ViaCEP */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={cepInput}
                          onChange={(e) => setCepInput(e.target.value.replace(/\D/g, "").slice(0, 8))}
                          placeholder="CEP (apenas números)"
                          className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          maxLength={8}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={cepInput.length !== 8 || cepLoading}
                          onClick={async () => {
                            // Busca endereço via ViaCEP
                            setCepLoading(true);
                            try {
                              const res = await fetch(`https://viacep.com.br/ws/${cepInput}/json/`);
                              const data = await res.json();
                              if (data?.erro) {
                                toast({ title: "CEP não encontrado", variant: "destructive" });
                                return;
                              }
                              const parts = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean);
                              setNewAddress(parts.join(", "));
                              toast({ title: "Endereço preenchido", description: "Complete com o número" });
                            } catch {
                              toast({ title: "Erro ao buscar CEP", variant: "destructive" });
                            } finally {
                              setCepLoading(false);
                            }
                          }}
                          className="h-9 px-3 gap-1.5"
                          type="button"
                        >
                          {cepLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                          Buscar CEP
                        </Button>
                      </div>

                      {/* Linha 2: GPS — geolocation + reverse Nominatim + extrai CEP */}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={geoLoading}
                        onClick={() => {
                          if (!navigator.geolocation) {
                            toast({ title: "Navegador não suporta GPS", variant: "destructive" });
                            return;
                          }
                          setGeoLoading(true);
                          navigator.geolocation.getCurrentPosition(
                            async (pos) => {
                              try {
                                const { latitude, longitude } = pos.coords;
                                const res = await fetch(
                                  `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                                  { headers: { "Accept-Language": "pt-BR" } }
                                );
                                const data = await res.json();
                                const a = data?.address || {};
                                const parts = [
                                  a.road,
                                  a.house_number,
                                  a.suburb || a.neighbourhood,
                                  a.city || a.town || a.village,
                                  a.state,
                                ].filter(Boolean);
                                if (parts.length === 0) {
                                  toast({ title: "Endereço não identificado", variant: "destructive" });
                                  return;
                                }
                                setNewAddress(parts.join(", "));
                                // Nominatim retorna postcode em alguns resultados — preenche CEP campo
                                if (a.postcode) {
                                  const cep = String(a.postcode).replace(/\D/g, "").slice(0, 8);
                                  if (cep.length === 8) setCepInput(cep);
                                  toast({ title: "Endereço + CEP preenchidos pela localização" });
                                } else {
                                  toast({ title: "Endereço preenchido", description: "CEP não disponível na localização" });
                                }
                              } catch {
                                toast({ title: "Erro ao identificar endereço", variant: "destructive" });
                              } finally {
                                setGeoLoading(false);
                              }
                            },
                            () => {
                              toast({ title: "Não foi possível obter localização", variant: "destructive" });
                              setGeoLoading(false);
                            },
                            { enableHighAccuracy: true, timeout: 8000 }
                          );
                        }}
                        className="w-full h-9 gap-1.5"
                        type="button"
                      >
                        {geoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                        {geoLoading ? "Localizando..." : "Usar minha localização (GPS)"}
                      </Button>

                      {/* Linha 2: campo livre + número + salvar */}
                      <textarea
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="Rua, bairro, cidade..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                        maxLength={300}
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={addressNumber}
                          onChange={(e) => setAddressNumber(e.target.value)}
                          placeholder="Nº / complemento"
                          className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          maxLength={60}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const base = newAddress.trim();
                            if (!base || !onSaveAddress) return;
                            // Concatena número/complemento se informado
                            const full = addressNumber.trim() ? `${base}, ${addressNumber.trim()}` : base;
                            onSaveAddress(full);
                            setNewAddress("");
                            setAddressNumber("");
                            setCepInput("");
                            toast({ title: "Endereço salvo", description: "Disponível no checkout." });
                          }}
                          disabled={!newAddress.trim() || (session.addresses?.length ?? 0) >= 10}
                          className="gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Salvar
                        </Button>
                      </div>
                      {(session.addresses?.length ?? 0) >= 10 && (
                        <p className="text-xs text-amber-600">Limite de 10 endereços atingido. Remova algum para adicionar.</p>
                      )}
                    </div>

                    {/* Lista de endereços salvos */}
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Meus endereços</p>
                      {!session.addresses || session.addresses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhum endereço salvo ainda</p>
                          <p className="text-xs mt-1">Adicione um endereço acima ou faça um pedido</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {session.addresses.map((addr, idx) => {
                            const isDefault = addr === session.lastAddress;
                            return (
                              <div
                                key={`${addr}-${idx}`}
                                className={`border rounded-lg p-3 flex items-start gap-2 ${
                                  isDefault ? "border-primary bg-primary/5" : ""
                                }`}
                              >
                                <MapPin className={`h-4 w-4 shrink-0 mt-0.5 ${isDefault ? "text-primary" : "text-muted-foreground"}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm break-words">{addr}</p>
                                  {isDefault && (
                                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-primary font-medium">
                                      <Check className="h-3 w-3" /> Padrão
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 shrink-0">
                                  {!isDefault && onSetDefaultAddress && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => {
                                        onSetDefaultAddress(addr);
                                        toast({ title: "Endereço padrão atualizado" });
                                      }}
                                    >
                                      Tornar padrão
                                    </Button>
                                  )}
                                  {onRemoveAddress && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        onRemoveAddress(addr);
                                        toast({ title: "Endereço removido" });
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
              </TabsContent>

              {/* Tab: Promoções unificadas (cupons + combos + pontos/cashback) */}
              <TabsContent value="promos" className="flex-1 flex flex-col min-h-0 mt-0">
                <PromosContent
                  companyId={companyId}
                  customerPhone={session.phone}
                  loyaltyPoints={loyaltyPoints}
                  loyaltyConfig={loyaltyConfig}
                  storeSubdomain={storeSubdomain}
                  storeName={storeName}
                  referralRewardPoints={referralRewardPoints}
                />
              </TabsContent>

              {/* Footer: sair da conta */}
              <div className="px-4 py-3 border-t">
                <Button variant="ghost" size="sm" onClick={onClearSession} className="text-muted-foreground gap-1.5 text-xs">
                  <LogOut className="h-3.5 w-3.5" />
                  Sair ({session.phone})
                </Button>
              </div>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
