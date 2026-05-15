// v1.0.0 — Sheet de perfil da loja (horários, endereço, formas de pagamento, contato)
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageCircle, Instagram, MapPin, Clock, CreditCard, Share2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Company {
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
}

interface StoreProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company;
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
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Perfil da loja — {displayName}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-full">
          {/* Banner topo */}
          {company.banner_url && (
            <div className="w-full h-32 overflow-hidden">
              <img src={company.banner_url} alt={displayName} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="px-4 pb-6 -mt-10">
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

            {/* Endereço placeholder */}
            <div className="bg-card border rounded-xl p-3 flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Local</p>
                <p className="text-sm">Atendimento via cardápio digital + entrega</p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
