// v1.0.0 — Sheet de conta do cliente: identificação, histórico de pedidos, favoritos
import { useState } from "react";
import { formatCurrency } from "@/lib/currency-formatter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, ShoppingBag, Heart, LogOut, RefreshCw, Eye } from "lucide-react";
import type { CustomerSession } from "@/hooks/useCustomerSession";
import type { OrderHistoryItem } from "@/hooks/useOrderHistory";

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
  onIdentify: (name: string, phone: string) => void;
  onClearSession: () => void;
  onRefreshHistory: () => void;
  onRepeatOrder: (items: OrderHistoryItem["items"]) => void;
  onViewOrder: (orderId: string) => void;
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
  session, history, favorites, products,
  onIdentify, onClearSession, onRefreshHistory, onRepeatOrder, onViewOrder,
}: CustomerSheetProps) {
  const [open, setOpen] = useState(false);
  const [identifyForm, setIdentifyForm] = useState({ name: "", phone: "" });
  const [refreshing, setRefreshing] = useState(false);

  const handleIdentify = () => {
    if (!identifyForm.name.trim() || !identifyForm.phone.trim()) return;
    onIdentify(identifyForm.name.trim(), identifyForm.phone.trim());
    setIdentifyForm({ name: "", phone: "" });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshHistory();
    setRefreshing(false);
  };

  const favoritedProducts = products.filter(p => favorites.includes(p.id));

  return (
    <>
      <CustomerSheetTrigger
        session={session}
        favoritesCount={favorites.length}
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl px-0">
          <SheetHeader className="px-4 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {session ? `Olá, ${session.name.split(" ")[0]}!` : "Minha Conta"}
            </SheetTitle>
          </SheetHeader>

          {!session ? (
            /* Formulário de identificação */
            <div className="px-4 py-6 space-y-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground text-center">
                Identifique-se para ver seu histórico de pedidos
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Seu nome"
                    value={identifyForm.name}
                    onChange={e => setIdentifyForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={identifyForm.phone}
                    onChange={e => setIdentifyForm(prev => ({ ...prev, phone: e.target.value }))}
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
            /* Conta identificada: tabs Pedidos + Favoritos */
            <Tabs defaultValue="orders" className="flex flex-col h-[calc(80vh-80px)]">
              <TabsList className="mx-4 mt-3 grid grid-cols-2">
                <TabsTrigger value="orders" className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Pedidos {history.length > 0 && `(${history.length})`}
                </TabsTrigger>
                <TabsTrigger value="favorites" className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" />
                  Favoritos {favorites.length > 0 && `(${favorites.length})`}
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
                      <p className="text-sm">Nenhum pedido ainda</p>
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
              <TabsContent value="favorites" className="flex-1 overflow-hidden mt-0">
                <ScrollArea className="h-full px-4 pt-2">
                  {favoritedProducts.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
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
                </ScrollArea>
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
