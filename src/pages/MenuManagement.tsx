import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink } from "lucide-react";
import { CompanyLogoUpload } from "@/components/company/CompanyLogoUpload";

export default function MenuManagement() {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [subdomain, setSubdomain] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [schedule, setSchedule] = useState<any>({});

  // Carregar dados da empresa
  const { data: companyData, isLoading } = useQuery({
    queryKey: ["company-menu"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return null;

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (company) {
        setCompanyId(company.id);
        setSubdomain(company.subdomain || "");
        setBannerUrl(company.banner_url || "");
        setSchedule(company.schedule || {});
      }

      return company;
    },
  });

  // Mutation para atualizar empresa
  const updateCompany = useMutation({
    mutationFn: async (data: any) => {
      if (!companyId) throw new Error("Company ID não encontrado");
      
      const { error } = await supabase
        .from('companies')
        .update(data)
        .eq('id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Configurações do cardápio atualizadas.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as configurações.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateCompany.mutate({
      banner_url: bannerUrl,
      schedule: schedule,
    });
  };

  const copyMenuLink = () => {
    const link = `https://${subdomain}.anafood.vip`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link do cardápio foi copiado para a área de transferência.",
    });
  };

  const openMenu = () => {
    window.open(`https://${subdomain}.anafood.vip`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const menuLink = `https://${subdomain}.anafood.vip`;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cardápio Digital</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do seu cardápio online
          </p>
        </div>
      </div>

      {/* Link do Cardápio */}
      <Card>
        <CardHeader>
          <CardTitle>Link do Cardápio</CardTitle>
          <CardDescription>
            Compartilhe este link com seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={menuLink}
              readOnly
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={copyMenuLink}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={openMenu}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Os clientes poderão acessar seu cardápio e fazer pedidos através deste link
          </p>
        </CardContent>
      </Card>

      {/* Configurações Visuais */}
      <Card>
        <CardHeader>
          <CardTitle>Aparência do Cardápio</CardTitle>
          <CardDescription>
            Personalize a aparência do seu cardápio digital
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Logo da Empresa</Label>
            <CompanyLogoUpload
              companyId={companyId || ""}
              currentLogoUrl={companyData?.logo_url}
              companyName={companyData?.fantasy_name || companyData?.name || ""}
              onLogoUpdate={(url) => {
                toast({
                  title: "Logo atualizado",
                  description: "O logo foi atualizado com sucesso!",
                });
              }}
            />
            <p className="text-sm text-muted-foreground">
              Logo exibido no topo do cardápio
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner">URL do Banner</Label>
            <Input
              id="banner"
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://exemplo.com/banner.jpg"
            />
            <p className="text-sm text-muted-foreground">
              Banner exibido no topo do cardápio (recomendado: 1200x400px)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Horários de Funcionamento */}
      <Card>
        <CardHeader>
          <CardTitle>Horários de Funcionamento</CardTitle>
          <CardDescription>
            Configure os horários em que seu estabelecimento aceita pedidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
              <div key={day} className="flex items-center gap-4">
                <Label className="w-32 capitalize">
                  {day === 'monday' && 'Segunda'}
                  {day === 'tuesday' && 'Terça'}
                  {day === 'wednesday' && 'Quarta'}
                  {day === 'thursday' && 'Quinta'}
                  {day === 'friday' && 'Sexta'}
                  {day === 'saturday' && 'Sábado'}
                  {day === 'sunday' && 'Domingo'}
                </Label>
                <Input
                  type="time"
                  className="w-32"
                  value={schedule[day]?.open || "08:00"}
                  onChange={(e) => setSchedule({
                    ...schedule,
                    [day]: { ...schedule[day], open: e.target.value }
                  })}
                />
                <span>até</span>
                <Input
                  type="time"
                  className="w-32"
                  value={schedule[day]?.close || "22:00"}
                  onChange={(e) => setSchedule({
                    ...schedule,
                    [day]: { ...schedule[day], close: e.target.value }
                  })}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informações da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Exibidas</CardTitle>
          <CardDescription>
            Informações que aparecerão no seu cardápio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Estabelecimento</Label>
            <Input
              value={companyData?.fantasy_name || companyData?.name || ""}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input
              value={companyData?.phone || ""}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={companyData?.description || ""}
              disabled
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Para alterar estas informações, acesse a página de Perfil da Empresa
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateCompany.isPending}
          size="lg"
        >
          {updateCompany.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}