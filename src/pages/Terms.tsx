// v1.0.0 — Termos de Uso
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
        </Button>

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 04 de maio de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
            <p>Ao acessar e utilizar a plataforma AnaFood ("Plataforma"), você concorda com estes Termos de Uso. Se não concordar, não utilize nossos serviços.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
            <p>A AnaFood é uma plataforma SaaS (Software as a Service) que oferece:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sistema de gerenciamento de pedidos de delivery</li>
              <li>Cardápio digital online</li>
              <li>Integração com WhatsApp para atendimento automatizado</li>
              <li>Painel administrativo para gestão do negócio</li>
              <li>Relatórios e análises de vendas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>É necessário fornecer informações verdadeiras no cadastro</li>
              <li>Cada empresa deve ter CNPJ válido</li>
              <li>Você é responsável pela segurança de suas credenciais</li>
              <li>É proibido compartilhar acesso com terceiros não autorizados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Planos e Pagamento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>O período de trial é de 30 dias sem cobrança</li>
              <li>Após o trial, é necessário assinar um plano pago para continuar utilizando</li>
              <li>Os pagamentos são processados via Stripe com recorrência mensal</li>
              <li>O cancelamento pode ser feito a qualquer momento pelo portal de pagamento</li>
              <li>Não há reembolso proporcional em caso de cancelamento antecipado</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Limites de Uso</h2>
            <p>Cada plano possui limites de pedidos mensais. Ao atingir o limite:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Novos pedidos serão bloqueados até o próximo ciclo</li>
              <li>Você pode fazer upgrade de plano a qualquer momento</li>
              <li>O sistema notificará quando estiver próximo do limite (80%)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Responsabilidades do Usuário</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Manter informações do cardápio e preços atualizados</li>
              <li>Cumprir legislação sanitária e de alimentos aplicável</li>
              <li>Responder aos pedidos dos clientes em tempo hábil</li>
              <li>Não utilizar a plataforma para atividades ilícitas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Propriedade Intelectual</h2>
            <p>A plataforma AnaFood, incluindo código, design e marca, são propriedade da AnaFood. Os dados inseridos pelo usuário (produtos, pedidos, clientes) pertencem ao próprio usuário.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Limitação de Responsabilidade</h2>
            <p>A AnaFood não se responsabiliza por:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Perdas decorrentes de indisponibilidade temporária do serviço</li>
              <li>Problemas de conexão do usuário</li>
              <li>Qualidade ou entrega dos produtos vendidos pelo usuário</li>
              <li>Disputas entre o usuário e seus clientes finais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Suspensão e Cancelamento</h2>
            <p>Reservamo-nos o direito de suspender ou cancelar contas que violem estes termos, sem aviso prévio em casos graves.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Alterações nos Termos</h2>
            <p>Podemos alterar estes termos a qualquer momento. Notificaremos via email sobre mudanças significativas. O uso continuado após alterações implica aceitação.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Contato</h2>
            <p>Para dúvidas sobre estes termos: <strong>contato@anafood.vip</strong></p>
          </section>
        </div>
      </div>
    </div>
  );
}
