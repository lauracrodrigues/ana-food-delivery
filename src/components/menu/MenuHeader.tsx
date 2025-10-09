import { Clock, Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Company {
  name: string;
  fantasy_name: string;
  logo_url: string | null;
  banner_url: string | null;
  phone: string;
  description: string;
  schedule: any;
  is_active: boolean;
}

interface MenuHeaderProps {
  company: Company;
}

export function MenuHeader({ company }: MenuHeaderProps) {
  const isOpen = () => {
    if (!company.is_active) return false;
    
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const schedule = company.schedule?.[dayOfWeek];
    if (!schedule || schedule.closed) return false;
    
    const [openHour, openMin] = (schedule.open || '00:00').split(':').map(Number);
    const [closeHour, closeMin] = (schedule.close || '23:59').split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    return currentTime >= openTime && currentTime <= closeTime;
  };

  return (
    <header className="bg-card border-b border-border">
      {/* Banner */}
      {company.banner_url && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img
            src={company.banner_url}
            alt={company.fantasy_name || company.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Company Info */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Logo */}
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt={company.fantasy_name || company.name}
              className="w-20 h-20 object-contain rounded-lg border border-border bg-background"
            />
          )}

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">
                {company.fantasy_name || company.name}
              </h1>
              <Badge variant={isOpen() ? "default" : "destructive"}>
                {isOpen() ? "Aberto" : "Fechado"}
              </Badge>
            </div>

            {company.description && (
              <p className="text-muted-foreground mb-3">{company.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {company.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>{company.phone}</span>
                </div>
              )}
              
              {company.schedule && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Ver horários</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
