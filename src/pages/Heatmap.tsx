// v1.0.0 — Mapa de calor de pedidos (Leaflet + leaflet.heat)
// Mostra concentração geográfica de clientes via customer_locations
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-user-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Loader2, MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

interface HeatPoint {
  lat: number;
  lng: number;
  qty: number;
}

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 365, label: "1 ano" },
];

export default function Heatmap() {
  const { companyId } = useUserRole();
  const [days, setDays] = useState(30);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const heatLayer = useRef<any>(null);

  // Carrega coords da loja pra centrar mapa
  const { data: company } = useQuery({
    queryKey: ["heatmap-company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase.from("companies")
        .select("latitude, longitude, fantasy_name, name")
        .eq("id", companyId).single();
      return data;
    },
    enabled: !!companyId,
  });

  // Heatmap points via RPC
  const { data: points = [], isLoading } = useQuery({
    queryKey: ["heatmap-points", companyId, days],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_orders_heatmap" as any, {
        p_company_id: companyId,
        p_days: days,
      });
      if (error || !Array.isArray(data)) return [];
      return data as HeatPoint[];
    },
    enabled: !!companyId,
  });

  // Inicializa mapa quando container + company carregados
  useEffect(() => {
    if (!mapRef.current || !company || leafletMap.current) return;

    const lat = Number(company.latitude) || -16.78;
    const lng = Number(company.longitude) || -49.29;

    leafletMap.current = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 13,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(leafletMap.current);

    // Marker da loja
    const lojaIcon = L.divIcon({
      html: `<div style="background:#6366f1;color:white;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏪 ${company.fantasy_name || company.name}</div>`,
      className: "",
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    L.marker([lat, lng], { icon: lojaIcon }).addTo(leafletMap.current);

    return () => {
      leafletMap.current?.remove();
      leafletMap.current = null;
    };
  }, [company]);

  // Atualiza heat layer quando points mudam
  useEffect(() => {
    if (!leafletMap.current || points.length === 0) return;

    // Remove layer anterior
    if (heatLayer.current) {
      leafletMap.current.removeLayer(heatLayer.current);
    }

    // Converte points pra formato leaflet.heat: [lat, lng, intensity]
    const heatData = points.map(p => [
      Number(p.lat),
      Number(p.lng),
      Math.min(Number(p.qty) / 5, 1), // normaliza intensidade (max 1)
    ]);

    heatLayer.current = (L as any).heatLayer(heatData, {
      radius: 30,
      blur: 25,
      maxZoom: 17,
      gradient: {
        0.0: "#3b82f6",  // azul (poucos pedidos)
        0.3: "#10b981",  // verde
        0.5: "#f59e0b",  // amarelo
        0.7: "#ef4444",  // vermelho
        1.0: "#7c2d12",  // marrom escuro (concentração alta)
      },
    }).addTo(leafletMap.current);

    // Ajusta zoom pra ver todos pontos
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map(p => [Number(p.lat), Number(p.lng)]));
      leafletMap.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [points]);

  // Stats
  const totalOrders = points.reduce((sum, p) => sum + Number(p.qty), 0);
  const uniqueLocations = points.length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flame className="h-7 w-7 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Mapa de Calor</h1>
            <p className="text-sm text-muted-foreground">Concentração geográfica de pedidos</p>
          </div>
        </div>
        {/* Filtros período */}
        <div className="flex gap-1">
          {PERIODS.map(p => (
            <Button
              key={p.days}
              size="sm"
              variant={days === p.days ? "default" : "outline"}
              onClick={() => setDays(p.days)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Pedidos no período</p>
            <p className="text-3xl font-bold text-orange-600">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Localizações únicas</p>
            <p className="text-3xl font-bold text-blue-600">{uniqueLocations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Média/local</p>
            <p className="text-3xl font-bold text-green-600">
              {uniqueLocations > 0 ? (totalOrders / uniqueLocations).toFixed(1) : "0"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mapa */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Distribuição dos clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[500px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : points.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
              <Flame className="h-12 w-12 opacity-30 mb-2" />
              <p className="text-sm">Sem dados de localização no período</p>
              <p className="text-xs mt-1">Cliente WhatsApp precisa enviar localização pra aparecer aqui</p>
            </div>
          ) : (
            <>
              <div ref={mapRef} className="w-full h-[500px] rounded-lg overflow-hidden border" />
              <div className="mt-3 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-blue-500" /> Poucos
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-green-500" /> Médio
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-yellow-500" /> Alto
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-red-500" /> Concentração alta
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p>📍 <strong>Como funciona:</strong> Cada cliente que envia localização via WhatsApp ou cardápio digital aparece como um ponto. Cores indicam concentração de pedidos.</p>
          <p>💡 <strong>Use isso pra:</strong> definir raio de entrega, identificar bairros lucrativos, planejar expansão, otimizar rota motoboy.</p>
        </CardContent>
      </Card>
    </div>
  );
}
