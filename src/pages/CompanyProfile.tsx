// v3.0.0 — Layout em abas (padrão Settings) + remove banner topo do cardápio
import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Loader2, Phone, Mail, MapPin, Globe, User, Utensils, Copy, Check, ExternalLink,
  ImageIcon, Megaphone,
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { CompanyLogoUpload } from "@/components/company/CompanyLogoUpload";
import { MenuBannersAdmin } from "@/components/company/MenuBannersAdmin";
import { useUserRole } from "@/hooks/use-user-role";
import { masks } from "@/lib/masks";
import { SkeletonCard, SkeletonMetricsGrid } from "@/components/loading";

const AddressSearchWithMap = lazy(() =>
  import("@/components/company/AddressSearchWithMap").then(m => ({ default: m.AddressSearchWithMap }))
);

const SEGMENTS = [
  "Restaurantes", "Pizzarias", "Hamburguerias", "Marmitarias",
  "Comida japonesa", "Açaiterias", "Lanchonetes", "Padarias",
  "Docerias", "Sorveterias", "Pastelarias", "Churrascarias",
  "Comida árabe", "Comida fitness", "Comida mexicana", "Outros",
];

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

interface FormData {
  name: string;
  fantasy_name: string;
  cnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  description: string;
  segment: string;
  logo_url: string;
  banner_url: string;
  subdomain: string;
  address: AddressData;
  google_maps_url: string;
}

const EMPTY_FORM: FormData = {
  name: '', fantasy_name: '', cnpj: '', phone: '', whatsapp: '',
  email: '', description: '', segment: '', logo_url: '', banner_url: '',
  subdomain: '',
  address: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' },
  google_maps_url: '',
};

export default function CompanyProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useUserRole(); // só super_admin pode editar subdomain após criação
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [copied, setCopied] = useState(false);

  // Perfil do usuário → company_id
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Dados da empresa
  const { data: company, isLoading } = useQuery({
    queryKey: ["company", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile!.company_id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
    staleTime: 1000 * 60 * 5,
  });

  // Popula form quando empresa carrega
  useEffect(() => {
    if (!company) return;
    const addr = (company.address as any) || {};
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
      banner_url: company.banner_url || '',
      subdomain: company.subdomain || '',
      address: {
        cep: addr.cep || addr.zip_code || '',
        logradouro: addr.logradouro || addr.street || '',
        numero: addr.numero || addr.number || '',
        complemento: addr.complemento || '',
        bairro: addr.bairro || addr.neighborhood || '',
        cidade: addr.cidade || addr.city || '',
        estado: addr.estado || addr.state || '',
        latitude: company.latitude ? Number(company.latitude) : undefined,
        longitude: company.longitude ? Number(company.longitude) : undefined,
      },
      google_maps_url: (company as any).google_maps_url || '',
    });
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
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
          banner_url: data.banner_url,
          // Subdomain editável apenas por super admin (defesa em profundidade)
          ...(isSuperAdmin ? { subdomain: data.subdomain || null } : {}),
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
          google_maps_url: data.google_maps_url?.trim() || null,
        } as any)
        .eq("id", profile.company_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast({ title: "Perfil atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  const set = (field: keyof FormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const menuUrl = formData.subdomain ? `https://${formData.subdomain}.anafood.vip` : null;

  const copyUrl = () => {
    if (!menuUrl) return;
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile || isLoading) {
    return (
      <div className="p-6 space-y-4">
        <SkeletonCard className="h-24" />
        <SkeletonMetricsGrid />
      </div>
    );
  }

  return (
    <PageLayout title="Perfil da Empresa" subtitle="Informações do seu estabelecimento">
      <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(formData); }} className="space-y-6">
        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full max-w-4xl">
            <TabsTrigger value="identity" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Identidade
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <Utensils className="h-3.5 w-3.5" /> Dados
            </TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Contato
            </TabsTrigger>
            <TabsTrigger value="address" className="gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Endereço
            </TabsTrigger>
            <TabsTrigger value="menu" className="gap-1.5">
              <Megaphone className="h-3.5 w-3.5" /> Cardápio
            </TabsTrigger>
          </TabsList>

          {/* ── IDENTIDADE ── */}
          <TabsContent value="identity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Identidade Visual
                </CardTitle>
                <CardDescription>Logo do seu estabelecimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                {profile?.company_id && (
                  <div>
                    <Label className="mb-2 block">Logo</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Exibido no cabeçalho do cardápio digital (recomendado 300×300px)
                    </p>
                    <CompanyLogoUpload
                      companyId={profile.company_id}
                      currentLogoUrl={formData.logo_url}
                      companyName={formData.fantasy_name || formData.name || 'Empresa'}
                      onLogoUpdate={(url) => set('logo_url', url)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── DADOS ── */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-primary" />
                  Dados do Estabelecimento
                </CardTitle>
                <CardDescription>Nome, segmento e descrição exibidos no cardápio</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fantasy_name">Nome do estabelecimento *</Label>
              <Input
                id="fantasy_name"
                value={formData.fantasy_name}
                onChange={(e) => set('fantasy_name', e.target.value)}
                placeholder="Ex: Pizzaria do João"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Nome exibido para os clientes no cardápio
              </p>
            </div>

            <div>
              <Label htmlFor="segment">Categoria *</Label>
              <Select value={formData.segment || undefined} onValueChange={(v) => set('segment', v)}>
                <SelectTrigger id="segment">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {/* Inclui segmento atual no topo se não bater com a lista padrão
                      (cobre dados legados ou customizados pelo super admin) */}
                  {formData.segment && !SEGMENTS.includes(formData.segment) && (
                    <SelectItem value={formData.segment}>{formData.segment}</SelectItem>
                  )}
                  {SEGMENTS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">
                Descrição
                <span className="text-muted-foreground font-normal ml-2">
                  ({formData.description.length}/200)
                </span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => set('description', e.target.value.slice(0, 200))}
                placeholder="Ex: Marmitas caseiras fresquinhas todo dia, entregamos em até 40 minutos."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Dados Legais
                </CardTitle>
                <CardDescription>Razão social e CNPJ (uso interno)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Razão Social</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Nome da Empresa LTDA"
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ / CPF</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => set('cnpj', masks.cnpj(e.target.value))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CONTATO ── */}
          <TabsContent value="contact" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Contato
                </CardTitle>
                <CardDescription>Canais de atendimento ao cliente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    className="pl-9"
                    value={formData.phone}
                    onChange={(e) => set('phone', masks.phone(e.target.value))}
                    placeholder="(00) 0000-0000"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    className="pl-9"
                    value={formData.whatsapp}
                    onChange={(e) => set('whatsapp', masks.phone(e.target.value))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-mail de contato</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={formData.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="contato@empresa.com.br"
                />
              </div>
            </div>
          </CardContent>
        </Card>

          </TabsContent>

          {/* ── ENDEREÇO ── */}
          <TabsContent value="address" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Endereço
                </CardTitle>
                <CardDescription>Localização para cálculo de taxa de entrega e exibição no cardápio</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<div className="h-[300px] bg-muted animate-pulse rounded-lg" />}>
                  <AddressSearchWithMap
                    address={formData.address}
                    onChange={(addr) => setFormData(prev => ({ ...prev, address: addr }))}
                  />
                </Suspense>
              </CardContent>
            </Card>

            {/* Link Google Maps — facilita compartilhar localização no WhatsApp + cardápio */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Link do Google Maps
                </CardTitle>
                <CardDescription>
                  Cole o link compartilhável da localização do estabelecimento.
                  Será enviado pros clientes via WhatsApp e exibido no cardápio digital.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="google_maps_url">URL do Google Maps</Label>
                  <Input
                    id="google_maps_url"
                    type="url"
                    placeholder="https://maps.app.goo.gl/... ou https://goo.gl/maps/..."
                    value={formData.google_maps_url}
                    onChange={(e) => set('google_maps_url', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    💡 Como obter: abra o Google Maps → pesquise seu endereço → toque em <strong>Compartilhar</strong> → <strong>Copiar link</strong> → cole aqui.
                  </p>
                </div>
                {formData.google_maps_url && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-700">✓ Link configurado — aparecerá no cardápio</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(formData.google_maps_url, '_blank')}
                        className="gap-1.5 h-7 text-xs"
                      >
                        <ExternalLink className="h-3 w-3" /> Abrir em nova aba
                      </Button>
                    </div>
                    {/* Preview inline do mapa — embed Google Maps */}
                    <div className="rounded-lg overflow-hidden border border-border bg-muted">
                      <iframe
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(formData.google_maps_url)}&output=embed`}
                        width="100%"
                        height="280"
                        style={{ border: 0 }}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Localização do estabelecimento"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">
                      💡 Se o mapa não localizar exato, prefira links com coordenadas (lat,lng) ou endereço completo.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CARDÁPIO ── */}
          <TabsContent value="menu" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Link do Cardápio
                </CardTitle>
                <CardDescription>Endereço público do seu cardápio digital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Campo nome do cardápio — EDITÁVEL só pra super admin */}
                {isSuperAdmin ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="subdomain">Nome do cardápio digital</Label>
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                        🔧 Super Admin
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="subdomain"
                        value={formData.subdomain}
                        onChange={(e) => {
                          const clean = e.target.value
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[̀-ͯ]/g, "")
                            .replace(/[^a-z0-9-]/g, "")
                            .slice(0, 30);
                          set('subdomain', clean);
                        }}
                        placeholder="minhalanchonete"
                        className="font-mono"
                      />
                      <span className="text-sm text-muted-foreground">.anafood.vip</span>
                    </div>
                    <p className="text-xs text-amber-700">
                      ⚠️ Cuidado: mudar quebra links e QR Codes antigos. Use somente quando necessário.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="secondary" className="text-xs">Nome do cardápio</Badge>
                    <span className="font-mono text-muted-foreground">{formData.subdomain || "—"}.anafood.vip</span>
                    <span className="text-xs text-muted-foreground">(não editável)</span>
                  </div>
                )}

                {/* Link completo + ações */}
                {menuUrl && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-2 text-sm font-mono">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{menuUrl}</span>
                    </div>
                    <Button type="button" size="icon" variant="outline" onClick={copyUrl} title="Copiar link">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => window.open(menuUrl, '_blank')}
                      title="Abrir cardápio"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  Banners do Cardápio
                </CardTitle>
                <CardDescription>
                  Banners exibidos no topo do cardápio digital. Use para promover ofertas, frete grátis ou novidades.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile?.company_id && (
                  <MenuBannersAdmin companyId={profile.company_id} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── SALVAR ── */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 z-10">
          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={updateMutation.isPending} className="w-full sm:w-auto min-w-[160px]">
              {updateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
              ) : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}
