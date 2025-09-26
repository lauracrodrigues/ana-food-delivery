import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, Mail, Lock } from "lucide-react";

const userInfoSchema = z.object({
  fullName: z.string()
    .min(1, "Nome completo é obrigatório")
    .min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string()
    .email("Email inválido")
    .min(1, "Email é obrigatório"),
});

export type UserInfoData = z.infer<typeof userInfoSchema>;

interface UserInfoStepProps {
  onNext: (data: UserInfoData) => void;
  onBack: () => void;
  initialData?: Partial<UserInfoData>;
  isLoading?: boolean;
}

export function UserInfoStep({ onNext, onBack, initialData, isLoading = false }: UserInfoStepProps) {
  const form = useForm<UserInfoData>({
    resolver: zodResolver(userInfoSchema),
    defaultValues: {
      fullName: "",
      email: "",
      ...initialData,
    },
  });

  const onSubmit = (data: UserInfoData) => {
    onNext(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-medium">
      <CardHeader className="text-center bg-gradient-dark text-foreground rounded-t-lg">
        <CardTitle className="text-2xl">Informações do Administrador</CardTitle>
        <CardDescription className="text-foreground/80">
          Configure os dados do administrador principal da loja
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="João da Silva" 
                        className="pl-10"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de Acesso *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        placeholder="admin@minharloja.com" 
                        className="pl-10"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-accent" />
                <h4 className="font-semibold text-sm">Informação de Segurança</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                A senha foi definida na etapa anterior e será usada para acessar o painel administrativo da sua loja.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={onBack}
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? "Criando empresa..." : "Finalizar Cadastro"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}