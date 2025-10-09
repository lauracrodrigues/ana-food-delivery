import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  BarChart3,
  MessageSquare,
  Shield,
  Star,
  Check,
  Play,
  Menu,
  X,
  Phone,
  Mail,
  Printer,
  Volume2,
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  Utensils,
  Coffee,
  Pizza,
  Sandwich,
  Store,
  ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import PublicMenuBySubdomain from "./PublicMenuBySubdomain";

const Index = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubdomain, setIsSubdomain] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    // Detecta se é um subdomínio (não é localhost, não é IP, tem 3+ partes e não é www)
    if (
      hostname !== 'localhost' && 
      !hostname.match(/^\d+\.\d+\.\d+\.\d+$/) &&
      parts.length >= 3 && 
      parts[0] !== 'www' &&
      parts[0] !== 'anafood'
    ) {
      setIsSubdomain(true);
    }
  }, []);

  // Se for um subdomínio, mostrar o cardápio público
  if (isSubdomain) {
    return <PublicMenuBySubdomain />;
  }

  const handleNavigation = (href: string) => {
    setIsMenuOpen(false);
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const benefits = [
    {
      icon: Clock,
      title: "Ganhe Tempo e Produtividade",
      description: "Pedidos chegam direto no painel, organizados e prontos para produção",
    },
    {
      icon: CheckCircle,
      title: "Acabe com os Erros no WhatsApp",
      description: "O cliente escolhe no cardápio online, você recebe tudo certinho",
    },
    {
      icon: Printer,
      title: "Impressão Automática",
      description: "Pedidos saem direto na impressora térmica do Windows",
    },
    {
      icon: Volume2,
      title: "Notificações Sonoras como no iFood",
      description: "Nunca mais perca um pedido, mesmo com o sistema minimizado",
    },
    {
      icon: BarChart3,
      title: "Gestão Simples e Completa",
      description: "Controle produtos, categorias, complementos, clientes e muito mais",
    },
    {
      icon: MessageSquare,
      title: "Controle Total do WhatsApp",
      description: "Ative ou desative sessões, conecte e desconecte quando quiser",
    },
  ];

  const features = [
    "Pedidos em tempo real (WhatsApp + Cardápio Online)",
    "Gestão de produtos, categorias e complementos",
    "Impressão automática nas impressoras térmicas do Windows",
    "Notificações sonoras personalizadas",
    "Gerenciamento de sessões WhatsApp (Evolution API)",
    "Dashboard de pedidos estilo kanban",
    "Cadastro de clientes com histórico",
    "Integração direta com seu cardápio digital",
    "Gestão de pagamentos e formas de entrega",
    "Sistema 100% na nuvem, acesso de qualquer lugar",
  ];

  const businessTypes = [
    { icon: Sandwich, name: "Hamburguerias" },
    { icon: Pizza, name: "Pizzarias" },
    { icon: Utensils, name: "Marmitarias" },
    { icon: Coffee, name: "Lanchonetes" },
    { icon: Coffee, name: "Cafeterias e Bares" },
    { icon: ShoppingBag, name: "Qualquer Delivery" },
  ];

  const testimonials = [
    {
      name: "João",
      business: "Hamburgueria Artesanal",
      content: "Depois que implementamos o Ana Food, nossos erros nos pedidos acabaram e o atendimento ficou muito mais rápido. Simplesmente sensacional.",
      rating: 5,
    },
    {
      name: "Ana",
      business: "Pizzaria da Vila",
      content: "O som igual do iFood faz toda diferença. Nunca mais perdemos um pedido por distração.",
      rating: 5,
    },
    {
      name: "Marcos",
      business: "Marmitaria Sabor Caseiro",
      content: "A integração com WhatsApp funciona muito bem. Sem complicações.",
      rating: 5,
    },
  ];

  const comparison = [
    {
      feature: "Gerenciamento de WhatsApp nativo via Evolution API",
      us: true,
      others: false,
    },
    {
      feature: "Impressão automática local (Windows)",
      us: true,
      others: false,
    },
    {
      feature: "Notificações sonoras como iFood",
      us: true,
      others: false,
    },
    {
      feature: "Sistema leve, rápido e hospedado na nuvem",
      us: true,
      others: false,
    },
    {
      feature: "Design pensado para restaurantes",
      us: true,
      others: false,
    },
    {
      feature: "Integração com seu próprio cardápio digital",
      us: true,
      others: false,
    },
  ];

  const faqs = [
    {
      question: "Precisa de computador ligado para funcionar?",
      answer: "Sim, especialmente para a impressão local.",
    },
    {
      question: "Funciona com qualquer impressora térmica?",
      answer: "Sim, qualquer impressora compatível com Windows.",
    },
    {
      question: "O sistema faz integração com marketplaces?",
      answer: "Não. É um sistema próprio para seu negócio, sem taxas de terceiros.",
    },
    {
      question: "Funciona para loja física e delivery?",
      answer: "Sim, 100% adaptado para os dois.",
    },
    {
      question: "Posso cancelar quando quiser?",
      answer: "Sim, sem contrato de fidelidade.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Store className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">Ana Food</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button onClick={() => handleNavigation("#beneficios")} className="text-muted-foreground hover:text-primary transition-colors">
                Benefícios
              </button>
              <button onClick={() => handleNavigation("#funcionalidades")} className="text-muted-foreground hover:text-primary transition-colors">
                Funcionalidades
              </button>
              <button onClick={() => handleNavigation("#depoimentos")} className="text-muted-foreground hover:text-primary transition-colors">
                Depoimentos
              </button>
            </nav>

            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link to="/cadastro">
                <Button className="bg-gradient-primary hover:opacity-90">
                  Criar Minha Loja
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <nav className="flex flex-col gap-4">
                <button onClick={() => handleNavigation("#beneficios")} className="text-left text-muted-foreground hover:text-primary">
                  Benefícios
                </button>
                <button onClick={() => handleNavigation("#funcionalidades")} className="text-left text-muted-foreground hover:text-primary">
                  Funcionalidades
                </button>
                <button onClick={() => handleNavigation("#depoimentos")} className="text-left text-muted-foreground hover:text-primary">
                  Depoimentos
                </button>
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <Link to="/login">
                    <Button variant="outline" className="w-full">Entrar</Button>
                  </Link>
                  <Link to="/cadastro">
                    <Button className="w-full bg-gradient-primary hover:opacity-90">Criar Minha Loja</Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/20">
              🚀 Sistema Completo para Restaurantes
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
              Transforme Seu Restaurante
              <br />
              em uma <span className="bg-gradient-primary bg-clip-text text-transparent">Máquina de Vendas!</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed max-w-3xl mx-auto">
              Automatize pedidos, atenda via WhatsApp, imprima automaticamente na cozinha e gerencie seu delivery em
              tempo real. Tudo isso em uma única plataforma completa e fácil de usar.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/cadastro">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Quero conhecer o sistema
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  <Play className="mr-2 h-5 w-5" />
                  Acessar demonstração
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              ✅ Demonstração gratuita • ✅ Sem compromisso • ✅ Suporte incluído
            </p>
          </div>
        </div>
      </section>

      {/* What is Ana Food Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-success/10 text-success">O Que é o Ana Food?</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Sistema Completo de Gestão
            </h2>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto mb-8">
              O Ana Food é um sistema desenvolvido especialmente para restaurantes, hamburguerias, pizzarias,
              lanchonetes e deliveries que precisam de uma operação ágil e organizada.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: MessageSquare, text: "Receba pedidos pelo WhatsApp e cardápio online" },
              { icon: BarChart3, text: "Painel de controle intuitivo em tempo real" },
              { icon: Printer, text: "Impressão automática dos pedidos na cozinha" },
              { icon: Volume2, text: "Notificações sonoras (som igual ao iFood)" },
              { icon: Zap, text: "Atenda mais, com menos erros e mais rapidez!" },
              { icon: Shield, text: "Sistema seguro e confiável na nuvem" },
            ].map((item, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <item.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">{item.text}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-success/10 text-success">Benefícios Imediatos</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Por Que Escolher o Ana Food?
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-4">
                    <benefit.icon className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-info/10 text-info">Diferenciais</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Diferenciais Que Ninguém Tem
            </h2>
          </div>
          <div className="max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-6 font-semibold">Funcionalidade</th>
                    <th className="text-center py-4 px-6 font-semibold text-primary">✅ Nosso Sistema</th>
                    <th className="text-center py-4 px-6 font-semibold text-muted-foreground">❌ Outros Sistemas</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6">{item.feature}</td>
                      <td className="text-center py-4 px-6">
                        {item.us ? (
                          <CheckCircle className="h-6 w-6 text-success mx-auto" />
                        ) : (
                          <XCircle className="h-6 w-6 text-destructive mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-4 px-6">
                        {item.others ? (
                          <CheckCircle className="h-6 w-6 text-success mx-auto" />
                        ) : (
                          <XCircle className="h-6 w-6 text-destructive mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary">Funcionalidades</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Funcionalidades do Sistema
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-4 bg-background rounded-lg shadow-sm">
                <Check className="h-6 w-6 text-success flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Target Audience Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Para Quem é Esse Sistema?
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
            {businessTypes.map((type, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <type.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-sm">{type.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-xl text-muted-foreground font-semibold">
              🚚 Qualquer delivery que queira vender mais e organizar seu atendimento!
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-success/10 text-success">Preços</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Planos e Assinatura
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Escolha o plano ideal para o seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Plano Básico */}
            <Card className="relative hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-info/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 text-info" />
                </div>
                <CardTitle className="text-2xl font-bold">Básico</CardTitle>
                <CardDescription>Ideal para pequenos restaurantes</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 49</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <Badge className="mt-2 bg-success/10 text-success">7 dias grátis</Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Até 100 pedidos/mês</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>1 usuário</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Cardápio digital</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Relatórios básicos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Suporte por email</span>
                  </li>
                </ul>
                <Link to="/cadastro">
                  <Button className="w-full mt-6">Escolher Plano</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plano Profissional */}
            <Card className="relative border-2 border-primary hover:shadow-lg transition-shadow">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                Mais Popular
              </Badge>
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <div className="text-2xl">👑</div>
                </div>
                <CardTitle className="text-2xl font-bold">Profissional</CardTitle>
                <CardDescription>Para restaurantes em crescimento</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 99</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <Badge className="mt-2 bg-success/10 text-success">7 dias grátis</Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Pedidos ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Até 5 usuários</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Cardápio digital avançado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Relatórios completos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Integração WhatsApp</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Suporte prioritário</span>
                  </li>
                </ul>
                <Link to="/cadastro">
                  <Button className="w-full mt-6 bg-gradient-primary hover:opacity-90">
                    Escolher Plano
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Plano Empresarial */}
            <Card className="relative hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl font-bold">Empresarial</CardTitle>
                <CardDescription>Para redes e grandes operações</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 199</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <Badge className="mt-2 bg-success/10 text-success">7 dias grátis</Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Tudo do Profissional</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Usuários ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Multi-restaurantes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>API personalizada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Suporte 24/7</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span>Gerente de conta dedicado</span>
                  </li>
                </ul>
                <Link to="/cadastro">
                  <Button className="w-full mt-6">Escolher Plano</Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
              {["Sem taxa por pedido", "Sem comissão", "7 dias grátis para testar"].map((text, index) => (
                <div key={index} className="text-center">
                  <Check className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="font-semibold">{text}</p>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mb-6">
              Todos os planos incluem 7 dias de teste gratuito. Cancele quando quiser, sem multa.
            </p>
            <Link to="/cadastro">
              <Button size="lg" className="bg-gradient-primary hover:opacity-90">
                <MessageSquare className="mr-2 h-5 w-5" />
                Começar teste grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="depoimentos" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-warning/10 text-warning">Depoimentos</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              O que Nossos Clientes Dizem
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="text-center shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-warning fill-current" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-info/10 text-info">FAQ</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">
              Perguntas Frequentes
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                  <CardDescription>👉 {faq.answer}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground mb-6">
            Organize seus pedidos, acabe com erros e venda mais.
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto">
            💥 Faça como dezenas de restaurantes que já estão faturando mais com o Ana Food.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/cadastro">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6">
                <MessageSquare className="mr-2 h-5 w-5" />
                Começar Agora
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6 bg-transparent">
                <Play className="mr-2 h-5 w-5" />
                Acessar Demonstração
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Store className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold">Ana Food</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Sistema completo de delivery e gestão para restaurantes. Transforme seu negócio hoje mesmo.
              </p>
            </div>
            
            {/* Product */}
            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <button onClick={() => handleNavigation("#beneficios")} className="hover:text-primary transition-colors text-left">
                    Benefícios
                  </button>
                </li>
                <li>
                  <button onClick={() => handleNavigation("#funcionalidades")} className="hover:text-primary transition-colors text-left">
                    Funcionalidades
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4">Suporte</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Central de Ajuda
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-4">Contato</h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href="tel:+5562992271019" className="hover:text-primary transition-colors">
                    +55 (62) 9 9227-1019
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:contato@anafood.com" className="hover:text-primary transition-colors">
                    contato@anafood.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-12 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Ana Food. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
