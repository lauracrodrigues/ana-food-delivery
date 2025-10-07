import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, ArrowLeft } from "lucide-react";
import { CompanyLogoUpload } from "@/components/company/CompanyLogoUpload";
import { AddressSearchWithMap } from "@/components/company/AddressSearchWithMap";
import { masks } from "@/lib/masks";

const deliverySegments = [
  "Restaurantes",
  "Pizzarias",
  "Hamburguerias",
  "Marmitarias",
  "Comida japonesa",
  "Açaiterias",
  "Lanchonetes",
  "Padarias",
  "Docerias",
  "Sorveterias",
  "Pastelarias",
  "Churrascarias",
  "Comida árabe",
  "Comida fitness",
  "Comida mexicana",
];

export default function CompanyProfile() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<{
    name: string;
    fantasy_name: string;
    cnpj: string;
    phone: string;
    whatsapp: string;
    email: string;
    description: string;
    segment: string;
    logo_url: string;
    address: {
      cep: string;
      logradouro: string;
      numero: string;
      complemento?: string;
      bairro: string;
      cidade: string;
      estado: string;
      latitude?: number;
      longitude?: number;
    };
  }>({
    name: '',
    fantasy_name: '',
    cnpj: '',
    phone: '',
    whatsapp: '',
    email: '',
    description: '',
    segment: '',
    logo_url: '',
    address: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      latitude: undefined,
      longitude: undefined,
    },
  });

  // Get user profile and company
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: company, isLoading } = useQuery({
    queryKey: ["company", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();

      if (error) {
        console.error('Erro ao carregar empresa:', error);
        throw error;
      }
      
      console.log('Empresa carregada:', data);
      return data;
    },
    enabled: !!profile?.company_id,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  useEffect(() => {
    if (company) {
      const addressData = company.address as any || {};
      
      console.log('Carregando dados da empresa:', {
        company,
        addressData,
        latitude: company.latitude,
        longitude: company.longitude
      });
      
      setFormData({
        name: company.name || '',
        fantasy_name: company.fantasy_name || '',
        cnpj: company.cnpj || '',
        phone: company.phone || '',
        whatsapp: company.whatsapp || '',
        email: company.email || '',
        description: company.description || '',
        segment: company.segment || '',
        logo_url: company.logo_url || '',
        address: {
          cep: addressData.cep || addressData.zip_code || '',
          logradouro: addressData.logradouro || addressData.street || '',
          numero: addressData.numero || addressData.number || '',
          complemento: addressData.complemento || '',
          bairro: addressData.bairro || addressData.neighborhood || '',
          cidade: addressData.cidade || addressData.city || '',
          estado: addressData.estado || addressData.state || '',
          latitude: company.latitude ? Number(company.latitude) : undefined,
          longitude: company.longitude ? Number(company.longitude) : undefined,
        },
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!profile?.company_id) throw new Error("Company ID not found");

      const { error } = await supabase
        .from("companies")
        .update({
          name: data.name,
          fantasy_name: data.fantasy_name,
          cnpj: data.cnpj,
          phone: data.phone,
          whatsapp: data.whatsapp,
          email: data.email,
          description: data.description,
          segment: data.segment,
          logo_url: data.logo_url,
          address: {
            cep: data.address.cep,
            logradouro: data.address.logradouro,
            numero: data.address.numero,
            complemento: data.address.complemento,
            bairro: data.address.bairro,
            cidade: data.address.cidade,
            estado: data.address.estado,
          },
          latitude: data.address.latitude,
          longitude: data.address.longitude,
        })
        .eq("id", profile.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast({
        title: "Sucesso",
        description: "Informações da empresa atualizadas com sucesso",
      });
    },
    onError: (error) => {
      console.error('Error updating company:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar informações da empresa",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Perfil da Empresa</h1>
            <p className="text-muted-foreground">
              Gerencie as informações completas da sua empresa
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Logo */}
          <Card>
            <CardHeader>
              <CardTitle>Logo da Empresa</CardTitle>
              <CardDescription>
                Faça upload do logo que representa sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile?.company_id && (
                <CompanyLogoUpload
                  companyId={profile.company_id}
                  currentLogoUrl={formData.logo_url}
                  companyName={formData.name || formData.fantasy_name || 'Empresa'}
                  onLogoUpdate={(url) => setFormData({ ...formData, logo_url: url })}
                />
              )}
            </CardContent>
          </Card>

          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Dados essenciais da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Razão Social *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da Empresa LTDA"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="fantasy_name">Nome Fantasia</Label>
                  <Input
                    id="fantasy_name"
                    value={formData.fantasy_name}
                    onChange={(e) => setFormData({ ...formData, fantasy_name: e.target.value })}
                    placeholder="Nome comercial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => {
                      const masked = masks.cnpj(e.target.value);
                      setFormData({ ...formData, cnpj: masked });
                    }}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => {
                      const masked = masks.phone(e.target.value);
                      setFormData({ ...formData, phone: masked });
                    }}
                    placeholder="(00) 0000-0000"
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => {
                      const masked = masks.phone(e.target.value);
                      setFormData({ ...formData, whatsapp: masked });
                    }}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com.br"
                  />
                </div>

                <div>
                  <Label htmlFor="segment">Segmento *</Label>
                  <Select
                    value={formData.segment}
                    onValueChange={(value) => setFormData({ ...formData, segment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliverySegments.map((segment) => (
                        <SelectItem key={segment} value={segment}>
                          {segment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição da Empresa</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Conte mais sobre sua empresa..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Endereço e Localização */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço e Localização</CardTitle>
              <CardDescription>
                Localização física da empresa para cálculo de entrega
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddressSearchWithMap
                address={formData.address}
                onChange={(address) => setFormData({ ...formData, address })}
              />
            </CardContent>
          </Card>

          {/* Botão de Salvar */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
