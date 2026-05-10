// v1.0.0 — Página de sucesso pós-checkout Stripe
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      navigate("/billing", { replace: true });
    }
  }, [sessionId, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Pagamento Confirmado!</h1>
            <p className="text-muted-foreground">
              Sua assinatura foi ativada com sucesso. Seu plano já está disponível.
            </p>
          </div>

          <div className="space-y-3">
            <Button className="w-full" onClick={() => navigate("/billing")}>
              Ver meu plano
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard")}>
              Ir para o Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
