import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

export function AddressSearchWithMap({ address, onChange }: AddressSearchWithMapProps) {
  const [loading, setLoading] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  
  // Mantém uma referência sempre atualizada do endereço
  const addressRef = useRef(address);
  
  // Atualiza a ref sempre que o address mudar
  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  // Mapbox token - Use sua própria chave API
  // Obtenha gratuitamente em: https://www.mapbox.com/
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Verificar se há token do Mapbox
    if (!MAPBOX_TOKEN) {
      toast({
        title: "Aviso",
        description: "Token do Mapbox não configurado. O mapa não será exibido.",
        variant: "destructive",
      });
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter: [number, number] = address.longitude && address.latitude 
      ? [address.longitude, address.latitude]
      : [-46.6333, -23.5505]; // São Paulo default

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: initialCenter,
        zoom: 15,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      marker.current = new mapboxgl.Marker({ draggable: true })
        .setLngLat(initialCenter)
        .addTo(map.current);

      marker.current.on('dragend', () => {
        const lngLat = marker.current?.getLngLat();
        if (lngLat) {
          // Usa a ref para garantir os valores mais recentes
          const currentAddress = addressRef.current;
          const updatedAddress = {
            cep: currentAddress.cep || '',
            logradouro: currentAddress.logradouro || '',
            numero: currentAddress.numero || '',
            complemento: currentAddress.complemento || '',
            bairro: currentAddress.bairro || '',
            cidade: currentAddress.cidade || '',
            estado: currentAddress.estado || '',
            latitude: lngLat.lat,
            longitude: lngLat.lng,
          };
          console.log('Marcador arrastado - endereço atual:', currentAddress, 'atualizado:', updatedAddress);
          onChange(updatedAddress);
        }
      });

      map.current.on('click', (e) => {
        marker.current?.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        // Usa a ref para garantir os valores mais recentes
        const currentAddress = addressRef.current;
        const updatedAddress = {
          cep: currentAddress.cep || '',
          logradouro: currentAddress.logradouro || '',
          numero: currentAddress.numero || '',
          complemento: currentAddress.complemento || '',
          bairro: currentAddress.bairro || '',
          cidade: currentAddress.cidade || '',
          estado: currentAddress.estado || '',
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
        };
        console.log('Mapa clicado - endereço atual:', currentAddress, 'atualizado:', updatedAddress);
        onChange(updatedAddress);
      });

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', (e) => {
        console.error('Erro ao carregar o mapa:', e);
        toast({
          title: "Erro no mapa",
          description: "Não foi possível carregar o mapa. Verifique o token do Mapbox.",
          variant: "destructive",
        });
      });
    } catch (error) {
      console.error('Erro ao inicializar o mapa:', error);
    }

    return () => {
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (mapLoaded && address.latitude && address.longitude && marker.current && map.current) {
      const newCenter: [number, number] = [address.longitude, address.latitude];
      marker.current.setLngLat(newCenter);
      map.current.flyTo({ center: newCenter, zoom: 15 });
    }
  }, [address.latitude, address.longitude, mapLoaded]);

  const handleCEPSearch = async () => {
    const cep = address.cep.replace(/\D/g, '');
    
    if (cep.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "O CEP deve conter 8 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Buscar endereço via ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        throw new Error("CEP não encontrado");
      }

      const updatedAddress: AddressData = {
        ...address,
        logradouro: data.logradouro || address.logradouro,
        bairro: data.bairro || address.bairro,
        cidade: data.localidade || address.cidade,
        estado: data.uf || address.estado,
      };

      // Geocoding - converter endereço em coordenadas
      const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`;
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_TOKEN}`;
      
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.features && geocodeData.features.length > 0) {
        const [longitude, latitude] = geocodeData.features[0].center;
        updatedAddress.latitude = latitude;
        updatedAddress.longitude = longitude;
      }

      onChange(updatedAddress);

      toast({
        title: "Endereço encontrado",
        description: "Ajuste a posição do marcador se necessário",
      });
    } catch (error) {
      console.error('Error searching CEP:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o CEP",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCEPChange = (value: string) => {
    // Aplicar máscara de CEP
    const cleaned = value.replace(/\D/g, '');
    const masked = cleaned.replace(/(\d{5})(\d)/, '$1-$2');
    onChange({ ...address, cep: masked });
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
            <Button
              type="button"
              onClick={handleCEPSearch}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
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
            value={address.complemento || ''}
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
        <Label className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Localização no Mapa
        </Label>
        {!MAPBOX_TOKEN ? (
          <div className="w-full h-[400px] rounded-lg border bg-muted flex items-center justify-center">
            <div className="text-center p-4">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Para habilitar o mapa interativo, configure o token do Mapbox
              </p>
              <p className="text-xs text-muted-foreground">
                Obtenha gratuitamente em:{" "}
                <a 
                  href="https://www.mapbox.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Clique no mapa ou arraste o marcador para ajustar a localização exata
            </p>
            <div 
              ref={mapContainer} 
              className="w-full h-[400px] rounded-lg border"
            />
          </>
        )}
      </div>

      {address.latitude && address.longitude && (
        <div className="text-xs text-muted-foreground">
          Coordenadas: {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
        </div>
      )}
    </div>
  );
}
