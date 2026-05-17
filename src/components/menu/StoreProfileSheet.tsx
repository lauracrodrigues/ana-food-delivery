// v2.0.0 — Sheet de perfil da loja (horários, endereço, taxa entrega + cálculo localização, contato)
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageCircle, Instagram, MapPin, Clock, CreditCard, Share2, Phone, Truck, LocateFixed, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency-formatter";

interface Company {
  id?: string;
  name: string;
  fantasy_name: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string;
  phone: string;
  whatsapp: string;
  instagram?: string | null;
  schedule: any;
  is_active: boolean;
  subdomain?: string | null;
  google_maps_url?: string | null;
  address?: any;
  latitude?: number | string | null;
  longitude?: number | string | null;
  delivery_fee?: number | null;
  avg_delivery_minutes?: number | null;
}

interface StoreProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
}

// Calcula distância em km entre duas coordenadas (Haversine)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const WEEKDAY_LABELS: Record<string, string> = {
  sunday: "Domingo", monday: "Segunda", tuesday: "Terça",
  wednesday: "Quarta", thursday: "Quinta", friday: "Sexta", saturday: "Sábado",
};

const WEEKDAY_ORDER = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function isOpenNow(schedule: any): boolean {
  if (!schedule) return false;
  const now = new Date();
  const day = WEEKDAY_ORDER[now.getDay()];
  const s = schedule[day];
  if (!s || s.closed) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return cur >= toMin(s.open || "00:00") && cur <= toMin(s.close || "23:59");
}

export function StoreProfileSheet({ open, onOpenChange, company }: StoreProfileSheetProps) {
  const { toast } = useToast();
  const displayName = company.fantasy_name || company.name;
  const open24 = isOpenNow(company.schedule);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  // Calcula distância usando geolocation do navegador → Haversine com lat/lng da loja
  const handleCalcDistance = () => {
    // Coords top-level (companies.latitude/longitude) > fallback address jsonb
    const storeLat = parseFloat(
      String(company.latitude ?? company.address?.latitude ?? company.address?.lat ?? "")
    );
    const storeLng = parseFloat(
      String(company.longitude ?? company.address?.longitude ?? company.address?.lng ?? "")
    );
    if (!storeLat || !storeLng || isNaN(storeLat) || isNaN(storeLng)) {
      toast({ title: "Loja sem coordenadas cadastradas", variant: "destructive" });
      return;
    }
    if (!navigator.geolocation) {
      toast({ title: "Navegador não suporta geolocalização", variant: "destructive" });
      return;
    }
    setCalculatingDistance(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const km = haversineKm(pos.coords.latitude, pos.coords.longitude, storeLat, storeLng);
        setDistanceKm(km);
        setCalculatingDistance(false);
      },
      () => {
        toast({ title: "Não foi possível obter sua localização", variant: "destructive" });
        setCalculatingDistance(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: displayName, text: company.description || "Faça seu pedido!", url });
      } catch { /* canceled */ }
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copiado!" });
    }
  };

  const openWhatsApp = () => {
    const num = company.whatsapp?.replace(/\D/g, "");
    if (num) window.open(`https://wa.me/${num}`, "_blank");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 flex flex-col">
        <SheetHeader className="sr-only">
          <SheetTitle>Perfil da loja — {displayName}</SheetTitle>
        </SheetHeader>

        {/* Native overflow — Radix ScrollArea corta topo dentro de Sheet em mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Banner topo — só se tiver */}
          {company.banner_url && (
            <div className="w-full h-32 overflow-hidden">
              <img src={company.banner_url} alt={displayName} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Padding top compensa SheetContent close button (X) + garante logo visível mesmo sem banner */}
          <div className={`px-4 pb-6 ${company.banner_url ? "-mt-10" : "pt-8"}`}>
            {/* Logo + nome */}
            <div className="flex items-end gap-3 mb-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt={displayName}
                  className="w-20 h-20 rounded-2xl border-4 border-background shadow-lg object-cover bg-card" />
              ) : (
                <div className="w-20 h-20 rounded-2xl border-4 border-background shadow-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold">{displayName.charAt(0)}</span>
                </div>
              )}
              <div className="flex-1 pb-1">
                <h2 className="text-xl font-bold">{displayName}</h2>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${open24
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"}`}>
                  ● {open24 ? "Aberto agora" : "Fechado"}
                </span>
              </div>
            </div>

            {company.description && (
              <p className="text-sm text-muted-foreground mb-4">{company.description}</p>
            )}

            {/* Ações rápidas */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {company.whatsapp && (
                <button onClick={openWhatsApp}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 hover:bg-green-100">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <span className="text-xs font-medium">WhatsApp</span>
                </button>
              )}
              {company.instagram && (
                <button onClick={() => {
                  const handle = (company.instagram || "").replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
                  window.open(`https://instagram.com/${handle}`, "_blank");
                }}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border border-pink-200 bg-pink-50 dark:bg-pink-950/20 hover:bg-pink-100">
                  <Instagram className="h-5 w-5 text-pink-600" />
                  <span className="text-xs font-medium">Instagram</span>
                </button>
              )}
              <button onClick={handleShare}
                className="flex flex-col items-center gap-1 p-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100">
                <Share2 className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium">Compartilhar</span>
              </button>
            </div>

            {/* Horários */}
            <div className="bg-card border rounded-xl p-3 mb-3">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Horário de funcionamento
              </h3>
              <ul className="space-y-1 text-sm">
                {WEEKDAY_ORDER.map(day => {
                  const s = company.schedule?.[day];
                  const todayKey = WEEKDAY_ORDER[new Date().getDay()];
                  const isToday = day === todayKey;
                  return (
                    <li key={day} className={`flex justify-between ${isToday ? "font-semibold" : ""}`}>
                      <span>{WEEKDAY_LABELS[day]}{isToday && " (hoje)"}</span>
                      <span className="text-muted-foreground">
                        {s?.closed || !s ? "Fechado" : `${s.open?.slice(0, 5)} – ${s.close?.slice(0, 5)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Telefone / contato */}
            {company.phone && (
              <div className="bg-card border rounded-xl p-3 mb-3 flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">{company.phone}</p>
                </div>
              </div>
            )}

            {/* Taxa entrega + cálculo distância */}
            {(company.delivery_fee != null || company.avg_delivery_minutes) && (
              <div className="bg-card border rounded-xl p-3 mb-3 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Truck className="h-4 w-4" /> Entrega
                </h3>
                <div className="flex flex-wrap gap-3 text-sm">
                  {company.delivery_fee != null && (
                    <div>
                      <span className="text-muted-foreground text-xs">Taxa: </span>
                      <span className="font-semibold">
                        {company.delivery_fee === 0 ? "Grátis" : formatCurrency(company.delivery_fee)}
                      </span>
                    </div>
                  )}
                  {company.avg_delivery_minutes && (
                    <div>
                      <span className="text-muted-foreground text-xs">Tempo: </span>
                      <span className="font-semibold">~{company.avg_delivery_minutes} min</span>
                    </div>
                  )}
                </div>
                {/* Botão calcular distância até cliente */}
                <button
                  onClick={handleCalcDistance}
                  disabled={calculatingDistance}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 text-sm font-medium hover:bg-blue-100 disabled:opacity-60"
                >
                  {calculatingDistance ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                  {calculatingDistance ? "Calculando..." : "Calcular distância até você"}
                </button>
                {distanceKm != null && (
                  <div className="text-center text-sm bg-green-50 border border-green-200 rounded-lg py-2">
                    <span className="font-bold text-green-700">{distanceKm.toFixed(1)} km</span>
                    <span className="text-muted-foreground text-xs ml-1">da loja até você</span>
                  </div>
                )}
              </div>
            )}

            {/* Formas de pagamento (estático — pode ler de payment_methods se quiser dinâmico) */}
            <div className="bg-card border rounded-xl p-3 mb-3">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Formas de pagamento
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-muted rounded">💵 Dinheiro</span>
                <span className="px-2 py-1 bg-muted rounded">📱 PIX</span>
                <span className="px-2 py-1 bg-muted rounded">💳 Cartão</span>
              </div>
            </div>

            {/* Endereço + botão Ver no mapa */}
            {(() => {
              const addr = company.address || {};
              const enderecoTexto = [
                addr.logradouro || addr.street,
                addr.numero || addr.number,
                addr.bairro || addr.neighborhood,
                addr.cidade || addr.city,
              ].filter(Boolean).join(", ");
              return (
                <div className="bg-card border rounded-xl p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Localização</p>
                      <p className="text-sm">
                        {enderecoTexto || "Atendimento via cardápio digital + entrega"}
                      </p>
                    </div>
                  </div>
                  {company.google_maps_url && (
                    <button
                      onClick={() => window.open(company.google_maps_url!, "_blank")}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                    >
                      <MapPin className="h-4 w-4" />
                      Ver no Google Maps
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
