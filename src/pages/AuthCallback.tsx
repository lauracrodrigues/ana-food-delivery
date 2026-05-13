import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Check user role and redirect accordingly
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'super_admin' || profile?.role === 'master_admin') {
          navigate('/admin');
          return;
        }

        // Verifica se o email está vinculado a um entregador
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

        navigate('/dashboard');
      }
    });
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