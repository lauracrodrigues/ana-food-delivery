// v1.0.0 — Página recuperar senha (envia email reset via Supabase Auth)
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email || !email.includes("@")) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500" />
            <h2 className="text-xl font-bold">Email enviado!</h2>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link pra criar uma nova senha.
            </p>
            <p className="text-xs text-muted-foreground">
              Não chegou? Verifique também o spam.
            </p>
            <Button onClick={() => navigate("/login")} variant="outline" className="w-full">
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Informe seu email e enviaremos um link pra criar uma nova senha.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={handleReset} disabled={loading || !email} className="w-full">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enviar link
          </Button>
          <Link to="/login" className="flex items-center justify-center text-sm text-muted-foreground hover:text-primary gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar ao login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
