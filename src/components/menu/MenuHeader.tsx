// v2.2.0 — Header com slots customer/theme + status/tempo/taxa/WhatsApp/Instagram
import React from "react";
import { Clock, Star, MessageCircle, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency-formatter";

interface Company {
  name: string;
  fantasy_name: string;
  logo_url: string | null;
  banner_url: string | null;
  phone: string;
  whatsapp: string;
  description: string;
  schedule: any;
  is_active: boolean;
  delivery_fee?: number | null;
  avg_delivery_minutes?: number | null;
  rating?: number | null;
  instagram?: string | null;
}

interface MenuHeaderProps {
  company: Company;
  customerSlot?: React.ReactNode; // botão de conta do cliente
  themeSlot?: React.ReactNode;    // toggle dark/light do cardápio
}

function calcIsOpen(company: Company): boolean {
  if (!company.is_active) return false;
  const now = new Date();
  const day = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][now.getDay()];
  const schedule = company.schedule?.[day];
  if (!schedule || schedule.closed) return false;
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= toMin(schedule.open || "00:00") && cur <= toMin(schedule.close || "23:59");
}

export function MenuHeader({ company, customerSlot, themeSlot }: MenuHeaderProps) {
  const open = calcIsOpen(company);
  const displayName = company.fantasy_name || company.name;

  const handleWhatsApp = () => {
    const num = company.whatsapp?.replace(/\D/g, "");
    if (num) window.open(`https://wa.me/${num}`, "_blank");
  };

  const handleInstagram = () => {
    if (company.instagram) {
      const handle = company.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
      window.open(`https://instagram.com/${handle}`, "_blank");
    }
  };

  return (
    <header className="bg-card border-b border-border">
      {/* Banner */}
      {company.banner_url && (
        <div className="w-full h-40 md:h-56 overflow-hidden">
          <img
            src={company.banner_url}
            alt={displayName}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt={displayName}
              className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-xl border border-border bg-background shrink-0 shadow-sm"
              loading="eager"
              decoding="async"
            />
          )}

          <div className="flex-1 min-w-0">
            {/* Nome + Status */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl md:text-2xl font-bold truncate">{displayName}</h1>
              <Badge
                variant={open ? "default" : "destructive"}
                className={`shrink-0 text-xs px-2 py-0.5 ${open ? "bg-green-500 hover:bg-green-500" : ""}`}
              >
                {open ? "● Aberto" : "● Fechado"}
              </Badge>
            </div>

            {/* Descrição */}
            {company.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{company.description}</p>
            )}

            {/* Métricas */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {(company.avg_delivery_minutes ?? 40) > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{company.avg_delivery_minutes ?? 40} min</span>
                </div>
              )}
              {company.delivery_fee != null && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-muted-foreground">Entrega:</span>
                  <span className="font-medium text-foreground">
                    {company.delivery_fee === 0 ? "Grátis" : formatCurrency(company.delivery_fee)}
                  </span>
                </div>
              )}
              {company.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground">{company.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botões sociais + conta do cliente + tema */}
          <div className="flex gap-2 shrink-0 items-start">
            {themeSlot}
            {customerSlot}
            {company.whatsapp && (
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full border-green-500 text-green-600 hover:bg-green-50"
                onClick={handleWhatsApp}
                title="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
            {company.instagram && (
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full border-pink-400 text-pink-500 hover:bg-pink-50"
                onClick={handleInstagram}
                title="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
