import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, Store, ArrowRight, Chrome, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabaseQueryNullable } from "@/lib/supabase-safe";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) checkUserRole(session.user.id, session.user.email ?? undefined);
      })
      .catch((err) => console.error('[Login] Erro ao verificar sessão:', err));
  }, [navigate]);

  const checkUserRole = async (userId: string, email?: string) => {
    try {
      // Role vem de user_roles (não profiles.role que é legado/null)
      const roles = await supabaseQueryNullable(
        supabase.from('user_roles').select('role').eq('user_id', userId)
      );
      const roleList = Array.isArray(roles) ? roles.map((r: any) => r.role) : [];
      const isSuperAdmin = roleList.includes('super_admin') || roleList.includes('master_admin');

      if (isSuperAdmin) {
        navigate('/admin');
        return;
      }

      // v1.0.2 — Entregador pode atuar em 2+ lojas: lista TODAS e decide
      if (email) {
        const list = await supabaseQueryNullable(
          supabase.from('deliverers').select('id, company_id').eq('email', email).eq('active', true)
        );
        const rows = Array.isArray(list) ? list : [];
        if (rows.length === 1) {
          localStorage.setItem('anafood-deliverer-company-id', rows[0].company_id);
          navigate('/entregador');
          return;
        }
        if (rows.length > 1) {
          // 2+ lojas → seletor escolhe qual usar nesse login
          navigate('/entregador/escolher-loja');
          return;
        }
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('[Login] Erro ao verificar role:', err);
      navigate('/dashboard');
    }
  };

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        // Log completo no console pra debug (DevTools F12)
        console.error('[Login] Erro Supabase:', error.message, error);
        const msg = error.message || '';
        let userMsg = msg;
        if (msg === 'Invalid login credentials') userMsg = 'Email ou senha incorretos';
        else if (msg.includes('Email not confirmed')) userMsg = 'Email não confirmado — verifique sua caixa de entrada';
        else if (msg.includes('rate limit')) userMsg = 'Muitas tentativas. Aguarde 1 minuto e tente novamente';
        else if (msg.includes('Network')) userMsg = 'Sem internet — verifique sua conexão';
        toast({
          title: "Erro ao fazer login",
          description: userMsg,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (authData.user) {
        // SECURITY: limpa cache React Query da sessão anterior pra evitar vazamento entre tenants
        queryClient.clear();

        toast({
          title: "Login realizado!",
          description: "Bem-vindo de volta!",
        });

        await checkUserRole(authData.user.id, authData.user.email ?? undefined);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao fazer login. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível fazer login com Google",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao fazer login com Google",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-primary rounded-2xl mb-4">
            <Store className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            AnaFood
          </h1>
          <p className="text-muted-foreground mt-2">Plataforma de Delivery Multi-Tenant</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle>Acessar Plataforma</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            type="email" 
                            placeholder="seu@email.com" 
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            tabIndex={-1}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-between">
                  <Link 
                    to="/recuperar-senha" 
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </form>
            </Form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <Chrome className="w-4 h-4 mr-2" />
              Google
            </Button>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Ainda não tem uma loja?{" "}
                <Link 
                  to="/cadastro" 
                  className="text-primary hover:underline font-medium"
                >
                  Cadastre-se agora
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}