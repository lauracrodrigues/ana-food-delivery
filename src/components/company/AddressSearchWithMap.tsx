// v2.0.0 — Busca de endereço com mapa interativo (Leaflet + Nominatim — sem token)
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2, LocateFixed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Corrige ícones padrão do Leaflet no Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface AddressData {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
}

interface AddressSearchWithMapProps {
  address: AddressData;
  onChange: (address: AddressData) => void;
}

// Componente interno para capturar cliques no mapa e mover marcador
function MapClickHandler({
  onMove,
}: {
  onMove: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Marcador arrastável
function DraggableMarker({
  position,
  onDrag,
}: {
  position: [number, number];
  onDrag: (lat: number, lng: number) => void;
}) {
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(e) {
          const latlng = (e.target as L.Marker).getLatLng();
          onDrag(latlng.lat, latlng.lng);
        },
      }}
    />
  );
}

export function AddressSearchWithMap({ address, onChange }: AddressSearchWithMapProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // v1.1.0 — Validação robusta de coords: evita NaN/Infinity que quebra MapContainer
  const lat = Number(address.latitude);
  const lng = Number(address.longitude);
  const validCoords = isFinite(lat) && isFinite(lng) && lat !== 0 && lng !== 0;
  const center: [number, number] = validCoords
    ? [lat, lng]
    : [-23.5505, -46.6333]; // São Paulo default

  const handleCoordChange = (lat: number, lng: number) => {
    onChange({ ...address, latitude: lat, longitude: lng });
  };

  const handleCEPSearch = async () => {
    const cep = address.cep.replace(/\D/g, "");

    if (cep.length !== 8) {
      toast({ title: "CEP inválido", description: "O CEP deve conter 8 dígitos", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Busca endereço no ViaCEP
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("CEP não encontrado");

      const updated: AddressData = {
        ...address,
        logradouro: data.logradouro || address.logradouro,
        bairro: data.bairro || address.bairro,
        cidade: data.localidade || address.cidade,
        estado: data.uf || address.estado,
      };

      // Geocoding via Nominatim (OpenStreetMap) — sem custo, sem token
      const q = encodeURIComponent(`${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`);
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers: { "Accept-Language": "pt-BR", "User-Agent": "AnaFood/1.0" } }
      );
      const geoData = await geoRes.json();

      if (geoData.length > 0) {
        updated.latitude = parseFloat(geoData[0].lat);
        updated.longitude = parseFloat(geoData[0].lon);
      }

      onChange(updated);
      toast({ title: "Endereço encontrado", description: "Ajuste o marcador se necessário" });
    } catch {
      toast({ title: "Erro", description: "Não foi possível buscar o CEP", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCEPChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    const masked = cleaned.replace(/(\d{5})(\d)/, "$1-$2");
    onChange({ ...address, cep: masked });
  };

  // Usa geolocation do navegador — útil pra cadastrar feito DENTRO da empresa
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS indisponível", description: "Navegador não suporta geolocalização", variant: "destructive" });
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode pra preencher endereço (best-effort, não bloqueia)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "pt-BR", "User-Agent": "AnaFood/1.0" } }
          );
          const data = await res.json();
          const a = data?.address || {};
          onChange({
            ...address,
            latitude,
            longitude,
            cep: a.postcode ? a.postcode.replace(/(\d{5})(\d)/, "$1-$2") : address.cep,
            logradouro: a.road || a.pedestrian || a.footway || address.logradouro,
            bairro: a.suburb || a.neighbourhood || a.quarter || address.bairro,
            cidade: a.city || a.town || a.village || address.cidade,
            estado: a.state_code?.toUpperCase() || a.state?.slice(0, 2)?.toUpperCase() || address.estado,
          });
          toast({ title: "Localização capturada", description: "Ajuste o marcador no mapa se precisar" });
        } catch {
          // Falha no reverse: salva pelo menos coords
          onChange({ ...address, latitude, longitude });
          toast({ title: "Coordenadas salvas", description: "Não foi possível buscar endereço — preencha manualmente" });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        const msg = err.code === 1
          ? "Permita acesso à localização nas configurações do navegador"
          : "Não foi possível obter sua localização";
        toast({ title: "Localização negada", description: msg, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="cep">CEP *</Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              value={address.cep}
              onChange={(e) => handleCEPChange(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              required
            />
            <Button type="button" onClick={handleCEPSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <Label htmlFor="logradouro">Logradouro *</Label>
          <Input
            id="logradouro"
            value={address.logradouro}
            onChange={(e) => onChange({ ...address, logradouro: e.target.value })}
            placeholder="Rua, Avenida..."
            required
          />
        </div>
        <div>
          <Label htmlFor="numero">Número *</Label>
          <Input
            id="numero"
            value={address.numero}
            onChange={(e) => onChange({ ...address, numero: e.target.value })}
            placeholder="123"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="complemento">Complemento</Label>
          <Input
            id="complemento"
            value={address.complemento || ""}
            onChange={(e) => onChange({ ...address, complemento: e.target.value })}
            placeholder="Apto, Sala..."
          />
        </div>
        <div>
          <Label htmlFor="bairro">Bairro *</Label>
          <Input
            id="bairro"
            value={address.bairro}
            onChange={(e) => onChange({ ...address, bairro: e.target.value })}
            placeholder="Centro"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cidade">Cidade *</Label>
          <Input
            id="cidade"
            value={address.cidade}
            onChange={(e) => onChange({ ...address, cidade: e.target.value })}
            placeholder="São Paulo"
            required
          />
        </div>
        <div>
          <Label htmlFor="estado">Estado *</Label>
          <Input
            id="estado"
            value={address.estado}
            onChange={(e) => onChange({ ...address, estado: e.target.value })}
            placeholder="SP"
            maxLength={2}
            required
          />
        </div>
      </div>

      {/* Mapa Interativo */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localização no Mapa
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseMyLocation}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
            Usar minha localização atual
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          💡 Cole um link do Google Maps no campo abaixo, use o botão acima (cadastro feito na empresa)
          ou clique/arraste o marcador para ajustar manualmente.
        </p>
        <div className="w-full h-[400px] rounded-lg border overflow-hidden">
          <MapContainer
            key={`${center[0]}-${center[1]}`}
            center={center}
            zoom={15}
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMove={handleCoordChange} />
            {validCoords && (
              <DraggableMarker
                position={center}
                onDrag={handleCoordChange}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {address.latitude && address.longitude && (
        <div className="text-xs text-muted-foreground">
          Coordenadas: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
}
