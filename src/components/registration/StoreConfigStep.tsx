import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useRef, useEffect } from "react";
import { Upload, X, Check, Zap, Rocket, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const days = [
  { id: 'monday', label: 'Segunda-feira' },
  { id: 'tuesday', label: 'Terça-feira' },
  { id: 'wednesday', label: 'Quarta-feira' },
  { id: 'thursday', label: 'Quinta-feira' },
  { id: 'friday', label: 'Sexta-feira' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' },
];

const storeConfigSchema = z.object({
  logo: z.string().optional(),
  planId: z.string().min(1, "Selecione um plano"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  workingDays: z.array(z.string()).min(1, "Selecione pelo menos um dia de funcionamento"),
  openTime: z.string().min(1, "Horário de abertura é obrigatório"),
  closeTime: z.string().min(1, "Horário de fechamento é obrigatório"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
}).refine((data) => {
  const open = new Date(`1970-01-01T${data.openTime}:00`);
  const close = new Date(`1970-01-01T${data.closeTime}:00`);
  return open < close;
}, {
  message: "Horário de fechamento deve ser após o horário de abertura",
  path: ["closeTime"],
});

export type StoreConfigData = z.infer<typeof storeConfigSchema>;

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  icon: React.ReactNode;
  recommended?: boolean;
}

interface StoreConfigStepProps {
  onNext: (data: StoreConfigData) => void;
  onBack: () => void;
  initialData?: Partial<StoreConfigData>;
}

export function StoreConfigStep({ onNext, onBack, initialData }: StoreConfigStepProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<StoreConfigData>({
    resolver: zodResolver(storeConfigSchema),
    defaultValues: {
      logo: "",
      planId: "",
      password: "",
      confirmPassword: "",
      workingDays: [],
      openTime: "08:00",
      closeTime: "22:00",
      ...initialData,
    },
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (data && !error) {
      const formattedPlans: Plan[] = data.map((plan, index) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description || '',
        price: plan.price,
        features: Array.isArray(plan.features) ? plan.features.map(f => String(f)) : [],
        icon: index === 0 ? <Zap className="w-5 h-5" /> : 
              index === 1 ? <Rocket className="w-5 h-5" /> : 
              <Crown className="w-5 h-5" />,
        recommended: index === 1
      }));
      setPlans(formattedPlans);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setLogoPreview(result);
      form.setValue('logo', result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    form.setValue('logo', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (data: StoreConfigData) => {
    onNext(data);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-medium">
      <CardHeader className="text-center bg-gradient-accent text-accent-foreground rounded-t-lg">
        <CardTitle className="text-2xl">Configuração da Loja</CardTitle>
        <CardDescription className="text-accent-foreground/80">
          Escolha seu plano e configure o funcionamento da sua loja
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Plan Selection */}
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escolha seu Plano *</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value}>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {plans.map((plan) => (
                          <label
                            key={plan.id}
                            htmlFor={plan.id}
                            className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
                              field.value === plan.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border'
                            } ${plan.recommended ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                          >
                            {plan.recommended && (
                              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                                Recomendado
                              </span>
                            )}
                            <RadioGroupItem
                              value={plan.id}
                              id={plan.id}
                              className="sr-only"
                            />
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {plan.icon}
                                <h3 className="font-semibold">{plan.name}</h3>
                              </div>
                              {field.value === plan.id && (
                                <Check className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <p className="text-2xl font-bold mb-2">
                              R$ {plan.price.toFixed(2)}
                              <span className="text-sm font-normal text-muted-foreground">/mês</span>
                            </p>
                            <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                            <ul className="space-y-1">
                              {plan.features.slice(0, 3).map((feature, index) => (
                                <li key={index} className="text-xs flex items-start gap-1">
                                  <Check className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs font-medium text-success">
                                ✨ 7 dias grátis para testar!
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logo Upload */}
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo da Empresa</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {logoPreview ? (
                        <div className="relative w-32 h-32 mx-auto bg-muted rounded-lg overflow-hidden">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={removeLogo}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="w-32 h-32 mx-auto border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="text-center">
                            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">Upload Logo</p>
                          </div>
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Recomendado: 200x200px, máximo 5MB
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Working Days */}
            <FormField
              control={form.control}
              name="workingDays"
              render={() => (
                <FormItem>
                  <FormLabel>Dias de Funcionamento *</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {days.map((day) => (
                      <FormField
                        key={day.id}
                        control={form.control}
                        name="workingDays"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={day.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(day.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, day.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== day.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {day.label}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="openTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Abertura *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="closeTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário de Fechamento *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha de Acesso *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={onBack}
              >
                Voltar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-accent hover:opacity-90 transition-opacity"
              >
                Avançar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}