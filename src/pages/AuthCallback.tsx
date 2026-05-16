import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = async (event: string, session: any) => {
      if (event !== "SIGNED_IN" || !session) return;

      // Carrega profile (role + company_id pra decidir rota)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', session.user.id)
        .maybeSingle();

      // Super admins → /admin
      if (profile?.role === 'super_admin' || (profile?.role as string) === 'master_admin') {
        navigate('/admin');
        return;
      }

      // Entregadores → /entregador
      if (session.user.email) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore — deliverers não está no tipo gerado mas existe no banco
        const { data: deliverer } = await supabase
          .from('deliverers')
          .select('id')
          .eq('email', session.user.email)
          .maybeSingle();
        if (deliverer) {
          navigate('/entregador');
          return;
        }
      }

      // Sem profile OU sem company_id → fluxo de completar perfil (Google primeiro acesso)
      if (!profile || !profile.company_id) {
        navigate('/completar-perfil');
        return;
      }

      navigate('/dashboard');
    };

    // Check sessão existente (caso já tenha entrado e voltou pra essa URL)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handler("SIGNED_IN", session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handler);
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
        <p className="text-muted-foreground">Processando login...</p>
      </div>
    </div>
  );
}