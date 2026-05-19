import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { masks, validators, fetchCNPJData, fetchCEPData } from "@/lib/masks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const companyInfoSchema = z.object({
  companyName: z.string()
    .min(1, "Razão social é obrigatória")
    .min(3, "Razão social deve ter pelo menos 3 caracteres"),
  fantasyName: z.string()
    .min(1, "Nome fantasia é obrigatório")
    .min(3, "Nome fantasia deve ter pelo menos 3 caracteres"),
  cnpj: z.string()
    .min(1, "CNPJ é obrigatório")
    .refine((val) => validators.cnpj(val), "CNPJ inválido"),
  segment: z.string()
    .min(1, "Segmento é obrigatório"),
  email: z.string()
    .email("Email inválido")
    .min(1, "Email é obrigatório"),
  phone: z.string()
    .min(1, "Telefone é obrigatório"),
  zipCode: z.string()
    .min(1, "CEP é obrigatório")
    .refine((val) => validators.cep(val), "CEP inválido"),
  address: z.string().min(1, "Endereço é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  subdomain: z.string()
    .min(1, "Subdomínio é obrigatório")
    .refine((val) => validators.subdomain(val), "Subdomínio inválido"),
});

export type CompanyInfoData = z.infer<typeof companyInfoSchema>;

interface CompanyInfoStepProps {
  onNext: (data: CompanyInfoData) => void;
  initialData?: Partial<CompanyInfoData>;
}

export function CompanyInfoStep({ onNext, initialData }: CompanyInfoStepProps) {
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<'available' | 'taken' | null>(null);
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [isLoadingCEP, setIsLoadingCEP] = useState(false);
  const { toast } = useToast();

  const form = useForm<CompanyInfoData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      companyName: "",
      fantasyName: "",
      cnpj: "",
      segment: "",
      email: "",
      phone: "",
      zipCode: "",
      address: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      subdomain: "",
      ...initialData,
    },
  });

  const handleCNPJLookup = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) return;

    setIsLoadingCNPJ(true);
    try {
      const data = await fetchCNPJData(cnpj);
      if (data) {
        form.setValue('companyName', data.companyName);
        form.setValue('fantasyName', data.fantasyName || data.companyName);
        form.setValue('email', data.email);
        form.setValue('phone', data.phone);
        form.setValue('zipCode', data.zipCode);
        form.setValue('address', data.address);
        form.setValue('neighborhood', data.neighborhood);
        form.setValue('city', data.city);
        form.setValue('state', data.state);
        form.setValue('number', data.number);
        
        toast({
          title: "Dados encontrados!",
          description: "As informações da empresa foram preenchidas automaticamente.",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast({
        title: "Não foi possível buscar o CNPJ",
        description: "Verifique o número e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCNPJ(false);
    }
  };

  const handleCEPLookup = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return;

    setIsLoadingCEP(true);
    try {
      const data = await fetchCEPData(cep);
      if (data) {
        form.setValue('zipCode', data.zipCode);
        form.setValue('address', data.address);
        form.setValue('neighborhood', data.neighborhood);
        form.setValue('city', data.city);
        form.setValue('state', data.state);
        
        toast({
          title: "CEP encontrado!",
          description: "O endereço foi preenchido automaticamente.",
        });
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Não foi possível buscar o CEP",
        description: "Verifique o número e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCEP(false);
    }
  };

  const checkSubdomainAvailability = async (subdomain: string) => {
    const sub = (subdomain || '').toLowerCase().trim();
    if (!sub || sub.length < 3) {
      setSubdomainStatus(null);
      return;
    }

    // Check 1: regex + reservados (sem ir no DB)
    if (!validators.subdomain(sub)) {
      setSubdomainStatus('taken');
      const msg = validators.isReservedSubdomain(sub)
        ? `"${sub}" é reservado pelo sistema. Tente outro nome.`
        : 'Use letras minúsculas, números e hífen (não no início/fim, 3-30 chars).';
      form.setError('subdomain', { type: 'manual', message: msg });
      return;
    }

    // Check 2: unicidade no banco
    setIsCheckingSubdomain(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id')
        .eq('subdomain', sub)
        .maybeSingle();

      const isAvailable = !data && !error;
      setSubdomainStatus(isAvailable ? 'available' : 'taken');

      if (!isAvailable) {
        form.setError('subdomain', {
          type: 'manual',
          message: `"${sub}" já está em uso. Tente: ${sub}-2, ${sub}-loja ou ${sub}-${new Date().getFullYear()}`,
        });
      } else {
        form.clearErrors('subdomain');
      }
    } catch {
      setSubdomainStatus(null);
    } finally {
      setIsCheckingSubdomain(false);
    }
  };

  const onSubmit = (data: CompanyInfoData) => {
    if (subdomainStatus !== 'available') {
      toast({
        title: "Erro",
        description: "Por favor, escolha um subdomínio disponível",
        variant: "destructive",
      });
      return;
    }
    onNext(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-medium">
      <CardHeader className="text-center bg-gradient-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-2xl">Informações da Empresa</CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Cadastre os dados básicos da sua empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Burger Express LTDA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fantasyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Burger Express"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-preenche subdomain só se ainda não foi editado manualmente
                          const currentSubdomain = form.getValues('subdomain');
                          const fantasyMasked = masks.subdomain(e.target.value);
                          // Se subdomain vazio OU é igual à versão anterior do fantasy (não foi editado à mão), atualiza
                          if (!currentSubdomain || currentSubdomain === masks.subdomain(form.getValues('fantasyName'))) {
                            form.setValue('subdomain', fantasyMasked);
                            if (fantasyMasked.length >= 3) checkSubdomainAvailability(fantasyMasked);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="00.000.000/0000-00"
                          {...field}
                          onChange={(e) => {
                            const masked = masks.cnpj(e.target.value);
                            field.onChange(masked);
                            if (masked.replace(/\D/g, '').length === 14) {
                              handleCNPJLookup(masked);
                            }
                          }}
                        />
                        {isLoadingCNPJ && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="segment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="18">Açaiteria</SelectItem>
                        <SelectItem value="15">Celulares</SelectItem>
                        <SelectItem value="23">Churrascaria</SelectItem>
                        <SelectItem value="7">Comércio em Geral</SelectItem>
                        <SelectItem value="1">Delivery</SelectItem>
                        <SelectItem value="20">Depósito Construção</SelectItem>
                        <SelectItem value="24">Dog Queen</SelectItem>
                        <SelectItem value="8">Eletrônicos</SelectItem>
                        <SelectItem value="9">Fit</SelectItem>
                        <SelectItem value="25">Hamburgueria</SelectItem>
                        <SelectItem value="10">Hamburgueria Premium</SelectItem>
                        <SelectItem value="21">Moto peças</SelectItem>
                        <SelectItem value="11">Pet Shop</SelectItem>
                        <SelectItem value="12">Pit stop</SelectItem>
                        <SelectItem value="17">Pizzaria</SelectItem>
                        <SelectItem value="22">Restaurante</SelectItem>
                        <SelectItem value="16">Sex Shop</SelectItem>
                        <SelectItem value="19">Sorvetes</SelectItem>
                        <SelectItem value="13">Supermercado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@burgerexpress.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(11) 99999-9999"
                        {...field}
                        onChange={(e) => {
                          const masked = masks.phone(e.target.value);
                          field.onChange(masked);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="00000-000"
                          {...field}
                          onChange={(e) => {
                            const masked = masks.cep(e.target.value);
                            field.onChange(masked);
                            if (masked.replace(/\D/g, '').length === 8) {
                              handleCEPLookup(masked);
                            }
                          }}
                        />
                        {isLoadingCEP && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço *</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua das Flores" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número *</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="neighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro *</FormLabel>
                    <FormControl>
                      <Input placeholder="Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade *</FormLabel>
                    <FormControl>
                      <Input placeholder="São Paulo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado *</FormLabel>
                    <FormControl>
                      <Input placeholder="SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subdomain"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome do Cardápio Digital *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="burgerexpress"
                          {...field}
                          onChange={(e) => {
                            const masked = masks.subdomain(e.target.value);
                            field.onChange(masked);
                            checkSubdomainAvailability(masked);
                          }}
                          className="pr-10"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCheckingSubdomain && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                          {!isCheckingSubdomain && subdomainStatus === 'available' && (
                            <Check className="w-4 h-4 text-success" />
                          )}
                          {!isCheckingSubdomain && subdomainStatus === 'taken' && (
                            <X className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <p className="text-sm text-muted-foreground">
                      💡 Pré-preenchido com o nome fantasia (você pode editar).
                      Seu cardápio ficará em: <span className="font-medium text-primary">{field.value}.anafood.vip</span>
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={isCheckingSubdomain || subdomainStatus !== 'available'}
            >
              Avançar
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}