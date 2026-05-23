// v4.0.0 — Bater Ponto + GPS só com pedido (economia bateria)
import { useState, useEffect, useRef, useMemo } from "react";
import { useDelivererGPS, WorkStatus } from "@/hooks/useDelivererGPS";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MotoIcon } from "@/components/ui/moto-icon";
import { QrScanDialog } from "@/components/deliverer/QrScanDialog";
import { AvailableOrdersTab } from "@/components/deliverer/AvailableOrdersTab";
import { PushNotificationBanner } from "@/components/deliverer/PushNotificationBanner";
import { ScanLine, Inbox } from "lucide-react";
import {
  MapPin, Navigation, CheckCircle2, LogOut, Phone, Package,
  ChevronDown, ChevronUp, Route, KeyRound, Eye, EyeOff,
  ArrowRightLeft, X, LocateFixed, GripVertical,
  BarChart3, Calendar, TrendingUp, XCircle, PhoneCall,
  Power, BatteryLow, Store,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  items?: Array<{ name?: string; quantity?: number }>;
  payment_method?: string;
  total?: number;
  delivery_fee?: number;
  status: string;
  deliverer_id?: string;
  customer_lat?: number | null;
  customer_lng?: number | null;
  customer_location_at?: string | null;
}

interface Deliverer {
  id: string;
  name: string;
  phone: string;
  company_id: string;
  email?: string;
  daily_rate?: number;
}

// ── Utilitários ─────────────────────────────────────────────────────────────

function fullAddress(order: Order): string {
  return [
    order.address && order.address_number
      ? `${order.address}, ${order.address_number}`
      : order.address,
    order.address_complement,
    order.neighborhood,
    order.city,
    order.state,
    "Brasil",
  ].filter(Boolean).join(", ");
}

// Retorna URL do mapa (GPS exato ou endereço textual)
function mapUrl(order: Order): string {
  if (order.customer_lat && order.customer_lng) {
    return `https://www.google.com/maps/search/?api=1&query=${order.customer_lat},${order.customer_lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(order))}`;
}

function routeUrl(orders: Order[]): string {
  const withAddr = orders.filter(o => o.address);
  if (withAddr.length === 0) return "";
  if (withAddr.length === 1) return mapUrl(withAddr[0]);
  const [last, ...rest] = [...withAddr].reverse();
  const waypoints = rest.map(o => encodeURIComponent(fullAddress(o))).join("|");
  const destination = encodeURIComponent(fullAddress(last));
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
}

function fmt(v?: number) {
  if (v == null) return "";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function paymentLabel(m?: string) {
  const map: Record<string, string> = {
    dinheiro: "💵 Dinheiro", pix: "📲 PIX", cartao: "💳 Cartão",
    credito: "💳 Crédito", debito: "💳 Débito",
  };
  return map[m?.toLowerCase() || ""] || m || "—";
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── LoginScreen ──────────────────────────────────────────────────────────────

function LoginScreen({ errorMsg }: { errorMsg?: string | null }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast({ title: "Email ou senha incorretos", variant: "destructive" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-6 space-y-6">
          <div className="text-center space-y-2">
            <MotoIcon className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-xl font-bold">Módulo de Entregas</h1>
            <p className="text-sm text-muted-foreground">Faça login para acessar suas entregas</p>
          </div>
          {errorMsg && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
              <p className="font-medium mb-1">Link de acesso expirado</p>
              <p>{errorMsg}</p>
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="seu@email.com" value={email}
                onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div className="space-y-1.5">
              <Label>Senha</Label>
              <div className="relative">
                <Input type={show ? "text" : "password"} placeholder="Sua senha" value={password}
                  onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
                  className="pr-10" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button onClick={handleLogin} disabled={loading || !email || !password} className="w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── SetPasswordScreen ────────────────────────────────────────────────────────

function SetPasswordScreen({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSet = async () => {
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo 6 caracteres.", variant: "destructive" }); return;
    }
    if (password !== confirm) {
      toast({ title: "Senhas não coincidem", variant: "destructive" }); return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } });
    setSaving(false);
    if (error) { toast({ title: "Erro ao definir senha", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Senha definida!", description: "Agora você pode acessar o sistema normalmente." });
    onDone();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-8 pb-6 space-y-6">
          <div className="text-center space-y-2">
            <MotoIcon className="w-10 h-10 mx-auto text-primary" />
            <h1 className="text-xl font-bold">Criar senha de acesso</h1>
            <p className="text-sm text-muted-foreground">Defina sua senha para acessar o módulo de entregas</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input type={show ? "text" : "password"} placeholder="Mínimo 6 caracteres"
                  value={password} onChange={e => setPassword(e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar senha</Label>
              <Input type={show ? "text" : "password"} placeholder="Repita a senha"
                value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSet()} />
            </div>
            <Button onClick={handleSet} disabled={saving} className="w-full gap-2">
              <KeyRound className="w-4 h-4" />
              {saving ? "Salvando..." : "Definir senha e entrar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── SortableOrderCard ────────────────────────────────────────────────────────

interface OrderCardProps {
  order: Order;
  idx: number;
  isDone: boolean;
  isExpanded: boolean;
  hasGPS: boolean;
  onToggleExpand: () => void;
  onComplete: () => void;
  onTransfer: () => void;
  completingId: boolean;
  sortable: boolean;
}

function SortableOrderCard({ order, idx, isDone, isExpanded, hasGPS, onToggleExpand, onComplete, onTransfer, completingId, sortable }: OrderCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: order.id, disabled: !sortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  const hasAddress = !!(order.address);

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`overflow-hidden transition-all duration-300 ${
        isDone
          ? "border-2 border-green-400 dark:border-green-600 shadow-green-100 dark:shadow-green-900/30 shadow-md"
          : isDragging ? "border-2 border-primary shadow-lg" : "border-border shadow-sm"
      }`}>
        <CardContent className="p-0">
          {/* Banner concluída */}
          {isDone && (
            <div className="bg-green-500 dark:bg-green-600 px-3 py-1.5 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-xs tracking-wide">ENTREGA CONCLUÍDA ✅</span>
            </div>
          )}

          {/* Header row: drag handle + número sequencial */}
          <div className={`px-3 py-1.5 text-xs font-bold flex items-center gap-2 ${
            isDone
              ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400"
              : "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400"
          }`}>
            {sortable && !isDone && (
              <button
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className="touch-none cursor-grab active:cursor-grabbing text-purple-400 dark:text-purple-600 hover:text-purple-600 dark:hover:text-purple-400 -ml-0.5"
                aria-label="Arrastar para reordenar"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            {isDone
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] flex items-center justify-center font-black">{idx + 1}</span>
            }
            {isDone ? "ENTREGUE" : `ENTREGA ${idx + 1}`}
            <span className="ml-auto text-gray-500 font-normal">#{order.order_number}</span>
          </div>

          <div className={`p-3 space-y-2 ${isDone ? "opacity-70" : ""}`}>
            {/* Cliente + valor (destaque) */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{order.customer_name}</p>
                {order.neighborhood && (
                  <p className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {order.neighborhood}
                  </p>
                )}
              </div>
              {/* Valor + forma de pagamento — lado direito, proeminente */}
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-gray-800 dark:text-gray-100 leading-tight">
                  {fmt(order.total)}
                </p>
                {order.payment_method && (
                  <p className="text-xs font-semibold text-primary mt-0.5">
                    {paymentLabel(order.payment_method)}
                  </p>
                )}
              </div>
            </div>

            {/* Botão ligar — só se tiver telefone */}
            {order.customer_phone && (
              <a
                href={`tel:${order.customer_phone}`}
                className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{order.customer_phone}</span>
                <span className="ml-auto text-xs text-emerald-500 dark:text-emerald-400">Toque para ligar</span>
              </a>
            )}

            {/* GPS do cliente — link nativo para não ser bloqueado no PWA */}
            {hasGPS && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${order.customer_lat},${order.customer_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
              >
                <LocateFixed className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">📍 Localização do cliente</p>
                  {order.customer_location_at && (
                    <p className="text-[10px] text-blue-500 dark:text-blue-400">
                      {new Date(order.customer_location_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                <Navigation className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              </a>
            )}

            {/* Endereço */}
            {hasAddress ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 space-y-0.5">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {order.address}{order.address_number ? `, ${order.address_number}` : ""}
                    </p>
                    {order.address_complement && (
                      <p className="text-muted-foreground text-xs">{order.address_complement}</p>
                    )}
                    <p className="text-muted-foreground text-xs">
                      {[order.neighborhood, order.city, order.state].filter(Boolean).join(" · ")}
                    </p>
                    {order.zip_code && <p className="text-muted-foreground text-xs">CEP {order.zip_code}</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs">
                <MapPin className="w-4 h-4 shrink-0" />
                Endereço incompleto — navegação não disponível
              </div>
            )}

            {/* Itens expandíveis */}
            {order.items && order.items.length > 0 && (
              <button
                onClick={onToggleExpand}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <Package className="w-3.5 h-3.5" />
                {order.items.length} {order.items.length === 1 ? "item" : "itens"}
                <span className="ml-auto">
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </span>
              </button>
            )}

            {isExpanded && order.items && (
              <ul className="space-y-1 text-sm border-t border-border pt-2">
                {order.items.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">{item.quantity}x</span>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Botões de ação */}
            <div className="flex gap-2 pt-1">
              {(hasAddress || hasGPS) && (
                <a
                  href={mapUrl(order)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border text-xs font-medium h-9 px-3 transition-colors
                    ${hasGPS
                      ? "border-blue-300 text-blue-700 dark:text-blue-400 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                      : "border-input text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                >
                  {hasGPS ? <LocateFixed className="w-3.5 h-3.5" /> : <Navigation className="w-3.5 h-3.5" />}
                  {hasGPS ? "Localização" : "Maps"}
                </a>
              )}
              {!isDone ? (
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                  onClick={onComplete}
                  disabled={completingId}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Concluir
                </Button>
              ) : (
                <div className="flex-1 flex items-center justify-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Entregue
                </div>
              )}
              {!isDone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 shrink-0"
                  onClick={onTransfer}
                  title="Transferir para outro entregador"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── ReportsTab ───────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
  return d.toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function ReportsTab({ deliverer }: { deliverer: Deliverer }) {
  // v1.0.1 — Default período: início do mês até hoje (cliente pediu)
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(todayStr());

  // Completions com dados do pedido
  const { data: completions = [], isLoading } = useQuery({
    queryKey: ["report-completions", deliverer.id, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_completions")
        .select(`
          id, completed_at,
          orders(id, order_number, customer_name, total, payment_method, neighborhood, customer_phone)
        `)
        .eq("deliverer_id", deliverer.id)
        .gte("completed_at", dateFrom + "T00:00:00")
        .lte("completed_at", dateTo + "T23:59:59")
        .order("completed_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!deliverer.id,
  });

  // Pedidos cancelados no período (info)
  const { data: cancelled = [] } = useQuery({
    queryKey: ["report-cancelled", deliverer.id, dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total, created_at")
        .eq("deliverer_id", deliverer.id)
        .eq("status", "cancelled")
        .gte("created_at", dateFrom + "T00:00:00")
        .lte("created_at", dateTo + "T23:59:59")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!deliverer.id,
  });

  // Cálculos
  const totalValue = completions.reduce((s: number, c: any) => s + (c.orders?.total || 0), 0);
  const uniqueDays = new Set(
    completions.map((c: any) => c.completed_at?.slice(0, 10))
  ).size;
  const dailyRate = deliverer.daily_rate || 0;
  const earnings = uniqueDays * dailyRate;

  const preset = (from: string, to: string) => { setDateFrom(from); setDateTo(to); };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Filtro de período */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => preset(todayStr(), todayStr())}>Hoje</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => preset(weekStart(), todayStr())}>Semana</Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => preset(monthStart(), todayStr())}>Mês</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">De</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-sm h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-sm h-8" />
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-3 border border-purple-100 dark:border-purple-900">
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">Entregas</p>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{completions.length}</p>
          <p className="text-xs text-purple-500 dark:text-purple-500">{uniqueDays} dia{uniqueDays !== 1 ? "s" : ""} trabalhado{uniqueDays !== 1 ? "s" : ""}</p>
        </div>
        <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 border border-green-100 dark:border-green-900">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total em pedidos</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-300">{fmt(totalValue)}</p>
          <p className="text-xs text-green-500">&nbsp;</p>
        </div>
      </div>

      {/* Ganhos com diária */}
      {dailyRate > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Seus ganhos no período</p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{fmt(earnings)}</p>
            <p className="text-xs text-amber-500 dark:text-amber-500">
              {uniqueDays} dia{uniqueDays !== 1 ? "s" : ""} × {fmt(dailyRate)}/dia
            </p>
          </div>
        </div>
      )}
      {dailyRate === 0 && (
        <div className="text-xs text-muted-foreground text-center p-2">
          Diária não configurada — peça ao administrador para definir no seu cadastro
        </div>
      )}

      {/* Lista de entregas concluídas */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : completions.length === 0 ? (
        <div className="text-center py-10">
          <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma entrega concluída neste período</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Entregas concluídas ({completions.length})
          </p>
          {completions.map((c: any) => {
            const order = c.orders;
            if (!order) return null;
            return (
              <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-border p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">#{order.order_number}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.completed_at ? new Date(c.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <p className="text-sm font-semibold">{order.customer_name}</p>
                {order.neighborhood && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {order.neighborhood}
                  </p>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-sm font-medium text-primary">{paymentLabel(order.payment_method)}</span>
                  <span className="text-base font-bold">{fmt(order.total)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancelados — info */}
      {cancelled.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">
            <XCircle className="w-4 h-4" />
            Cancelados no período ({cancelled.length}) — não contam nos ganhos
          </div>
          {cancelled.map((o: any) => (
            <div key={o.id} className="bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-red-500">#{o.order_number}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{o.customer_name}</p>
              </div>
              <span className="text-sm font-medium text-red-500 line-through">{fmt(o.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DelivererDashboard ───────────────────────────────────────────────────────

export default function DelivererDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [authState, setAuthState] = useState<'loading' | 'unauthenticated' | 'authenticated'>('loading');
  const [mustChangePassword, setMustChangePassword] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'available' | 'reports'>('deliveries');
  const [routeStatus, setRouteStatus] = useState<'idle' | 'collecting' | 'on_route'>('idle');
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [transferOrder, setTransferOrder] = useState<Order | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const prevOrderCountRef = useRef<number>(-1);
  // "Bater ponto": entregador escolhe ficar disponível ou offline. Persiste por device.
  const [punchedIn, setPunchedIn] = useLocalStorage<boolean>("deliverer:punchedIn", false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Injeta manifest PWA dedicado ao entregador
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const prev = link?.href ?? null;
    if (link) link.href = '/manifest-entregador.json';
    return () => { if (link && prev) link.href = prev; };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthState('authenticated');
        setMustChangePassword(!!session.user?.user_metadata?.must_change_password);
      } else {
        setAuthState('unauthenticated');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setAuthState('authenticated');
        setMustChangePassword(!!session.user?.user_metadata?.must_change_password);
      }
      if (event === 'SIGNED_OUT') { setAuthState('unauthenticated'); setMustChangePassword(null); }
    });
    return () => subscription.unsubscribe();
  }, []);  

  const dashboardActive = authState === 'authenticated' && mustChangePassword === false;

  // v1.0.2 — Entregador pode estar em 2+ lojas. localStorage guarda qual escolheu.
  // Sem seleção + múltiplas lojas → redireciona pro seletor. Sem cadastro → login.
  const { data: deliverer, isLoading: loadingDeliverer } = useQuery({
    queryKey: ["deliverer-me"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return null;
      const selectedCompany = localStorage.getItem("anafood-deliverer-company-id");

      // @ts-expect-error -- Supabase generated types don't include this table yet
      let q = supabase
        .from("deliverers")
        .select("id, name, phone, company_id, email, daily_rate, route_status")
        .eq("email", user.email)
        .eq("active", true);
      if (selectedCompany) q = q.eq("company_id", selectedCompany);

      const { data: rows } = await q;
      const list = (rows || []) as any[];

      if (list.length === 0) {
        // Selecionou loja que não existe mais → limpa e tenta achar outra
        if (selectedCompany) {
          localStorage.removeItem("anafood-deliverer-company-id");
          // @ts-expect-error -- types
          const { data: fallback } = await supabase
            .from("deliverers")
            .select("id, name, phone, company_id, email, daily_rate, route_status")
            .eq("email", user.email)
            .eq("active", true);
          const fbList = (fallback || []) as any[];
          if (fbList.length > 1) {
            window.location.href = "/entregador/escolher-loja";
            return null;
          }
          if (fbList.length === 1) {
            localStorage.setItem("anafood-deliverer-company-id", fbList[0].company_id);
            if (fbList[0].route_status) setRouteStatus(fbList[0].route_status);
            return fbList[0] as Deliverer & { route_status?: string };
          }
        }
        return null;
      }

      if (list.length > 1) {
        // Sem seleção + múltiplas lojas → manda escolher
        window.location.href = "/entregador/escolher-loja";
        return null;
      }

      const data = list[0];
      // Auto-grava seleção pra próximas sessões (1 loja só)
      if (!selectedCompany && data?.company_id) {
        localStorage.setItem("anafood-deliverer-company-id", data.company_id);
      }
      if (data?.route_status) setRouteStatus(data.route_status);
      return data as Deliverer & { route_status?: string };
    },
    enabled: dashboardActive,
  });

  // v1.0.2 — Detecta se entregador atua em 2+ lojas (controla botão "Trocar Loja")
  // Posicionado AQUI (antes dos early returns) pra manter ordem dos hooks consistente
  const { data: companyCount = 0 } = useQuery({
    queryKey: ["deliverer-company-count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return 0;
      // @ts-expect-error -- types
      const { count } = await supabase
        .from("deliverers")
        .select("id", { count: "exact", head: true })
        .eq("email", user.email)
        .eq("active", true);
      return count || 0;
    },
    enabled: dashboardActive,
    staleTime: 5 * 60_000,
  });
  const hasMultipleCompanies = companyCount > 1;

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["deliverer-orders", deliverer?.id],
    queryFn: async () => {
      if (!deliverer?.id) return [];
      // v1.0.3 — Filtro era só "delivering" → entregador não via pedidos já vinculados
      // em status anteriores (preparing/ready/out_for_delivery). Agora pega TODOS
      // status onde entregador deve acompanhar (até sair pra entrega).
      const ACTIVE_STATUSES = ['preparing', 'ready', 'out_for_delivery', 'delivering'];
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("deliverer_id", deliverer.id)
        .in("status", ACTIVE_STATUSES)
        .order("created_at");
      return (data || []) as Order[];
    },
    enabled: !!deliverer?.id,
    refetchInterval: 60000,
  });

  // Realtime: novo pedido aparece instantaneamente + toca som
  useEffect(() => {
    if (!deliverer?.id) return;
    const channel = supabase
      .channel(`deliverer-orders-${deliverer.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `deliverer_id=eq.${deliverer.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["deliverer-orders", deliverer.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [deliverer?.id, queryClient]);  

  const { data: completions = [] } = useQuery({
    queryKey: ["delivery-completions", deliverer?.id],
    queryFn: async () => {
      if (!deliverer?.id) return [];
      const { data } = await supabase
        .from("delivery_completions")
        .select("order_id")
        .eq("deliverer_id", deliverer.id);
      return (data || []).map((r: any) => r.order_id as string);
    },
    enabled: !!deliverer?.id,
  });

  const completeMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!deliverer?.id) throw new Error("Entregador não encontrado");
      const { error } = await supabase
        .from("delivery_completions")
        .upsert({ order_id: orderId, deliverer_id: deliverer.id }, { onConflict: "order_id,deliverer_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-completions", deliverer?.id] });
      toast({ title: "✓ Entrega marcada como concluída" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const { data: peers = [] } = useQuery({
    queryKey: ["deliverer-peers", deliverer?.company_id],
    queryFn: async () => {
      if (!deliverer?.company_id) return [];
      // @ts-expect-error -- Supabase generated types don't include this table yet
      const { data } = await supabase
        .from("deliverers")
        .select("id, name, phone")
        .eq("company_id", deliverer.company_id)
        .eq("active", true)
        .neq("id", deliverer.id)
        .order("name");
      return (data || []) as { id: string; name: string; phone: string }[];
    },
    enabled: !!deliverer?.company_id && !!transferOrder,
  });

  const transferMutation = useMutation({
    mutationFn: async ({ orderId, peerId, peerName }: { orderId: string; peerId: string; peerName: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ deliverer_id: peerId, deliverer_name: peerName } as any)
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["deliverer-orders", deliverer?.id] });
      setTransferOrder(null);
      toast({ title: `Pedido transferido para ${vars.peerName} ✓` });
    },
    onError: (e: any) => toast({ title: "Erro ao transferir", description: e.message, variant: "destructive" }),
  });

  // Som de novo pedido
  useEffect(() => {
    if (!dashboardActive) return;
    const count = orders.length;
    if (prevOrderCountRef.current >= 0 && count > prevOrderCountRef.current) {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.8;
      audio.play().catch(() => {});
    }
    prevOrderCountRef.current = count;
  }, [orders.length, dashboardActive]);

  // Estado de trabalho derivado:
  //   - sem "bater ponto" → offline (sem GPS, sem presença no servidor)
  //   - bateu ponto + 0 pedidos → available (presença, mas SEM GPS)
  //   - bateu ponto + tem pedido → delivering (GPS alta acurácia, 30s)
  const workStatus: WorkStatus = !punchedIn
    ? "offline"
    : orders.length > 0 ? "delivering" : "available";

  // Hook GPS adaptativo (faz watchPosition condicional + battery + RPC)
  const { batteryLow, effectiveStatus } = useDelivererGPS({
    delivererId: deliverer?.id ?? null,
    workStatus,
    enabled: dashboardActive,
  });

  // Early returns DEPOIS de todos os hooks
  if (authState === 'loading') return null;

  if (authState === 'unauthenticated') {
    const authError = (location.state as any)?.authError;
    const errorMsg = authError === 'otp_expired'
      ? 'Use o email e a senha temporária enviados pelo WhatsApp para fazer login.'
      : null;
    return <LoginScreen errorMsg={errorMsg} />;
  }

  if (mustChangePassword) return <SetPasswordScreen onDone={() => setMustChangePassword(false)} />;

  const completedSet = new Set(completions);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const n = new Set(prev);
      if (n.has(orderId)) { n.delete(orderId); } else { n.add(orderId); }
      return n;
    });
  };

  const handleLogout = async () => {
    // v1.0.2 — limpa loja selecionada no logout
    localStorage.removeItem("anafood-deliverer-company-id");
    await supabase.auth.signOut();
    navigate("/login");
  };

  // v1.0.2 — Trocar loja (só relevante quando entregador atua em 2+ lojas)
  const handleSwitchCompany = () => {
    localStorage.removeItem("anafood-deliverer-company-id");
    navigate("/entregador/escolher-loja");
  };

  // Aplica ordem manual para pendentes; concluídos vão para o fim
  const pendingOrders = orders.filter(o => !completedSet.has(o.id));
  const doneOrders = orders.filter(o => completedSet.has(o.id));

  const orderedPending = manualOrder.length > 0
    ? [
        ...manualOrder.map(id => pendingOrders.find(o => o.id === id)).filter(Boolean) as Order[],
        ...pendingOrders.filter(o => !manualOrder.includes(o.id)),
      ]
    : pendingOrders;

  const sortedOrders = [...orderedPending, ...doneOrders];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = orderedPending.map(o => o.id);
    const oldIdx = ids.indexOf(active.id as string);
    const newIdx = ids.indexOf(over.id as string);
    if (oldIdx === -1 || newIdx === -1) return;
    setManualOrder(arrayMove(ids, oldIdx, newIdx));
  };

  if (loadingDeliverer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <MotoIcon className="w-12 h-12 mx-auto animate-pulse text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!deliverer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <MotoIcon className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Conta não vinculada</p>
          <p className="text-sm text-muted-foreground">
            Seu email não está cadastrado como entregador.<br />
            Peça ao administrador para vincular seu email.
          </p>
          <Button variant="outline" onClick={handleLogout}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 w-full max-w-2xl mx-auto">
      {/* v1.0.0 — Banner ativar push notifications */}
      <PushNotificationBanner />
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MotoIcon className="w-7 h-7" />
            <div>
              <p className="font-bold text-base leading-tight">{deliverer.name}</p>
              <p className="text-xs text-primary-foreground/70">
                {pendingOrders.length} entrega{pendingOrders.length !== 1 ? "s" : ""} pendente{pendingOrders.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* v1.0.2 — Trocar Loja: aparece só quando entregador atua em 2+ lojas */}
            {hasMultipleCompanies && (
              <Button
                variant="ghost" size="icon"
                onClick={handleSwitchCompany}
                className="text-primary-foreground hover:bg-primary-foreground/10"
                title="Trocar loja"
              >
                <Store className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Bater Ponto + status GPS — controla consumo de bateria */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setPunchedIn(!punchedIn)}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 h-10 text-sm font-semibold transition-colors ${
              punchedIn
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border border-primary-foreground/30"
            }`}
            title={punchedIn ? "Você está disponível para receber pedidos" : "Bater ponto para ficar disponível"}
          >
            <Power className="w-4 h-4" />
            {punchedIn ? "No turno — disponível" : "Bater ponto"}
          </button>

          {/* Indicador de modo GPS — feedback claro pro entregador */}
          <div className="text-xs text-primary-foreground/80 px-2 py-1 rounded bg-primary-foreground/10 whitespace-nowrap">
            {effectiveStatus === "offline" && (batteryLow ? (
              <span className="flex items-center gap-1"><BatteryLow className="w-3 h-3" /> Bateria baixa</span>
            ) : "GPS off")}
            {effectiveStatus === "available" && <span title="Sem pedido: GPS desligado pra economizar bateria">💚 Disponível</span>}
            {effectiveStatus === "delivering" && <span className="flex items-center gap-1" title="GPS ativo durante entrega"><LocateFixed className="w-3 h-3" /> GPS ativo</span>}
          </div>
        </div>

        {/* Rota otimizada — link nativo para não ser bloqueado no PWA */}
        {activeTab === 'deliveries' && orderedPending.some(o => o.address) && (
          <a
            href={routeUrl(orderedPending)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-md px-4 h-10 text-sm font-medium bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border border-primary-foreground/30 transition-colors"
          >
            <Route className="w-4 h-4" />
            Ver Rota Otimizada ({orderedPending.filter(o => o.address).length} endereços)
          </a>
        )}
      </div>

      {/* Conteúdo por aba */}
      {activeTab === 'deliveries' ? (
        <div className="p-4 space-y-3 pb-24">
          {loadingOrders ? (
            <div className="text-center py-12 text-muted-foreground">
              <MotoIcon className="w-10 h-10 mx-auto mb-3 animate-pulse" />
              <p>Carregando pedidos...</p>
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-green-400" />
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Tudo entregue!</p>
              <p className="text-sm mt-1">Nenhum pedido pendente no momento.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedPending.map(o => o.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {sortedOrders.map((order, idx) => {
                    const isDone = completedSet.has(order.id);
                    const hasGPS = !!(order.customer_lat && order.customer_lng);
                    return (
                      <SortableOrderCard
                        key={order.id}
                        order={order}
                        idx={idx}
                        isDone={isDone}
                        isExpanded={expandedOrders.has(order.id)}
                        hasGPS={hasGPS}
                        sortable={!isDone}
                        onToggleExpand={() => toggleExpand(order.id)}
                        onComplete={() => completeMutation.mutate(order.id)}
                        onTransfer={() => setTransferOrder(order)}
                        completingId={completeMutation.isPending}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Dica de arrastar — aparece só se tiver ≥2 pedidos pendentes */}
          {orderedPending.length >= 2 && (
            <p className="text-center text-xs text-muted-foreground/60 py-1">
              <GripVertical className="w-3 h-3 inline mr-1" />
              Arraste pelo ícone para reordenar a rota
            </p>
          )}
        </div>
      ) : activeTab === 'available' ? (
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <AvailableOrdersTab
            delivererId={deliverer.id}
            routeStatus={routeStatus}
            onRouteStarted={() => { setRouteStatus('on_route'); setActiveTab('deliveries'); }}
          />
        </div>
      ) : (
        <ReportsTab deliverer={deliverer} />
      )}

      {/* v1.0.0 — Botão flutuante "Escanear QR" — captura pedido */}
      {punchedIn && (
        <button
          onClick={() => setScanOpen(true)}
          className="fixed bottom-20 right-4 z-20 h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-transform active:scale-95"
          title="Escanear QR do pedido"
        >
          <ScanLine className="w-7 h-7" />
        </button>
      )}

      <QrScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onClaimed={(order) => {
          toast({ title: `Pedido #${order.order_number} capturado!`, description: order.customer_name });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        }}
      />

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-background border-t border-border flex z-10">
        <button
          onClick={() => setActiveTab('deliveries')}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'deliveries'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5" />
            {pendingOrders.length > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                {pendingOrders.length}
              </span>
            )}
          </div>
          Entregas
        </button>
        {/* v1.0.0 — Aba Disponíveis */}
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'available'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Inbox className="w-5 h-5" />
          Disponíveis
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
            activeTab === 'reports'
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          Relatório
        </button>
      </div>

      {/* Bottom sheet — transferir pedido */}
      {transferOrder && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTransferOrder(null)} />
          <div className="relative bg-background rounded-t-2xl shadow-xl max-h-[75vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
              <div>
                <p className="font-semibold text-sm">Transferir Pedido</p>
                <p className="text-xs text-muted-foreground">#{transferOrder.order_number} · {transferOrder.customer_name}</p>
              </div>
              <button onClick={() => setTransferOrder(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {peers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Nenhum outro entregador ativo no momento.</p>
              ) : (
                peers.map(peer => (
                  <button
                    key={peer.id}
                    disabled={transferMutation.isPending}
                    onClick={() => transferMutation.mutate({ orderId: transferOrder.id, peerId: peer.id, peerName: peer.name })}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-300 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                      <MotoIcon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{peer.name}</p>
                      {peer.phone && <p className="text-xs text-muted-foreground">{peer.phone}</p>}
                    </div>
                    <ArrowRightLeft className="w-4 h-4 text-orange-500 shrink-0" />
                  </button>
                ))
              )}
            </div>
            <div className="pb-safe-area-inset-bottom h-4" />
          </div>
        </div>
      )}
    </div>
  );
}
