import { Button } from "@/components/ui/button";
import { Store, ArrowRight, Rocket, Shield, Cloud } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-primary rounded-3xl mb-8">
            <Store className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-primary bg-clip-text text-transparent">
            AnaFood
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Plataforma completa de delivery multi-tenant para seu negócio
          </p>
          
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Crie sua loja online em minutos, gerencie pedidos, produtos e clientes em uma plataforma moderna e intuitiva.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/cadastro">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity">
                Criar Minha Loja
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Acessar Plataforma
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Rocket className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Rápido e Fácil</h3>
            <p className="text-muted-foreground">Configure sua loja em minutos com nosso processo simplificado</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Seguro e Confiável</h3>
            <p className="text-muted-foreground">Dados isolados por tenant com segurança de nível empresarial</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-success/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">100% Cloud</h3>
            <p className="text-muted-foreground">Acesse de qualquer lugar, sem instalação necessária</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
