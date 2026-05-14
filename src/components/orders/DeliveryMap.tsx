// v2.0.0 — Mapa de entregadores (Leaflet + OpenStreetMap — sem token)
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

// Corrige bug do webpack/vite com ícones padrão do Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Ícone personalizado para entregadores
const delivererIcon = L.divIcon({
  html: `<div style="background:#f97316;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:18px;line-height:1;">🛵</div>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});

interface DelivererPos {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  last_location_at: string | null;
}

interface DeliveryMapProps {
  onClose: () => void;
}

// Componente auxiliar para recentrar mapa quando entregadores mudam
function AutoFitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 16 });
    }
  }, [positions, map]);
  return null;
}

export function DeliveryMap({ onClose }: DeliveryMapProps) {
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();

  const { data: deliverers = [] } = useQuery({
    queryKey: ["deliverers-map", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      // @ts-expect-error -- Supabase generated types don't include this table yet
      const { data } = await supabase
        .from("deliverers")
        .select("id, name, lat, lng, last_location_at")
        .eq("company_id", companyId)
        .eq("active", true);
      return (data || []) as DelivererPos[];
    },
    enabled: !!companyId,
    refetchInterval: 30000,
  });

  // Realtime: atualiza mapa quando entregador move
  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel("deliverers-location")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "deliverers",
        filter: `company_id=eq.${companyId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["deliverers-map", companyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, queryClient]);

  const withPos = deliverers.filter(d => d.lat !== null && d.lng !== null);
  const positions: [number, number][] = withPos.map(d => [d.lat!, d.lng!]);

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold">Mapa de Entregadores</span>
          <span className="text-xs text-muted-foreground">
            {withPos.length} com GPS ativo
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Mapa Leaflet */}
      <div className="flex-1 relative">
        <MapContainer
          center={positions.length > 0 ? positions[0] : [-16.7, -49.2]}
          zoom={13}
          className="absolute inset-0 w-full h-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <AutoFitBounds positions={positions} />

          {withPos.map(d => (
            <Marker key={d.id} position={[d.lat!, d.lng!]} icon={delivererIcon}>
              <Popup>
                <div className="font-sans text-sm">
                  <strong>{d.name}</strong><br />
                  <small className="text-gray-500">
                    {d.last_location_at
                      ? `Atualizado: ${new Date(d.last_location_at).toLocaleTimeString("pt-BR")}`
                      : "Sem localização recente"
                    }
                  </small>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {withPos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
            <div className="bg-background/90 rounded-lg px-4 py-3 text-sm text-muted-foreground text-center shadow">
              Nenhum entregador com GPS ativo.<br />
              <span className="text-xs">GPS é compartilhado quando o entregador está logado no app.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
