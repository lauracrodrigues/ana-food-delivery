// v3.0.0 — Header compacto: logo+nome menores, header todo clickable abre StoreProfileSheet
import React from "react";
import { MessageCircle, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pickWhatsAppNumber } from "@/lib/phone-validation";

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
  customerSlot?: React.ReactNode;
  themeSlot?: React.ReactNode;
  onProfileClick?: () => void;
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

export function MenuHeader({ company, customerSlot, themeSlot, onProfileClick }: MenuHeaderProps) {
  const open = calcIsOpen(company);
  const displayName = company.fantasy_name || company.name;

  // v3.0.2 — Só mostra botão se número tem WhatsApp válido (celular BR)
  // Evita "Conversar com +55 62 3594-1399" quando empresa cadastrou só fixo
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation(); // não dispara onProfileClick
    const valid = pickWhatsAppNumber(company);
    if (valid) {
      const num = valid.replace(/\D/g, "");
      window.open(`https://wa.me/${num}`, "_blank");
    }
  };

  const handleInstagram = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (company.instagram) {
      const handle = company.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
      window.open(`https://instagram.com/${handle}`, "_blank");
    }
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-2.5">
        <div className="flex items-center gap-3">
          {/* Bloco clicável: logo + nome empilhados — abre StoreProfileSheet */}
          <button
            type="button"
            onClick={onProfileClick}
            className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
            aria-label="Ver detalhes da loja"
          >
            {company.logo_url ? (
              <img
                src={company.logo_url}
                alt={displayName}
                /* v3.0.1 — animate-menu-logo: wobble + ring pulse a cada 4s pra chamar atenção */
                className="w-10 h-10 md:w-11 md:h-11 object-cover rounded-full border border-border bg-background shadow-sm animate-menu-logo"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-primary/10 border border-border flex items-center justify-center animate-menu-logo">
                <span className="text-sm font-bold">{displayName.charAt(0)}</span>
              </div>
            )}
            {/* Nome ABAIXO da logo — text-xs (antes era text-xl/2xl, agora < metade) */}
            <span className="text-[10px] md:text-xs font-semibold leading-tight max-w-[80px] truncate text-center">
              {displayName}
            </span>
          </button>

          {/* Área central clicável também — vazia mas expande área de toque, abre profile */}
          <button
            type="button"
            onClick={onProfileClick}
            className="flex-1 flex items-center justify-start cursor-pointer min-h-[44px]"
            aria-label="Ver detalhes da loja"
          >
            <Badge
              variant={open ? "default" : "destructive"}
              className={`text-[10px] px-1.5 py-0 ${open ? "bg-green-500 hover:bg-green-500" : ""}`}
            >
              {open ? "● Aberto" : "● Fechado"}
            </Badge>
          </button>

          {/* Ações: tema + conta + socials — fora do click do profile */}
          <div className="flex gap-1.5 shrink-0 items-center">
            {themeSlot}
            {customerSlot}
            {pickWhatsAppNumber(company) && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full border-green-500 text-green-600 hover:bg-green-50"
                onClick={handleWhatsApp}
                title="WhatsApp"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </Button>
            )}
            {company.instagram && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full border-pink-400 text-pink-500 hover:bg-pink-50"
                onClick={handleInstagram}
                title="Instagram"
              >
                <Instagram className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
