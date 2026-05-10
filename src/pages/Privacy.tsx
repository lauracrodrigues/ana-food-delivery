// v1.0.0 — Política de Privacidade (LGPD)
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" /> Voltar</Link>
        </Button>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 04 de maio de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. Introdução</h2>
            <p>A AnaFood ("nós") respeita a privacidade dos seus usuários e está comprometida com a proteção dos dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Dados Coletados</h2>
            <p>Coletamos os seguintes dados:</p>
            <h3 className="text-lg font-medium mt-3">Dados do Estabelecimento:</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Razão social, nome fantasia, CNPJ</li>
              <li>Endereço, telefone, email</li>
              <li>Dados de acesso (email e senha criptografada)</li>
            </ul>
            <h3 className="text-lg font-medium mt-3">Dados Operacionais:</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Produtos cadastrados e preços</li>
              <li>Pedidos e histórico de vendas</li>
              <li>Dados de clientes finais (nome, telefone, endereço de entrega)</li>
            </ul>
            <h3 className="text-lg font-medium mt-3">Dados Técnicos:</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Endereço IP, tipo de navegador</li>
              <li>Logs de acesso e uso da plataforma</li>
              <li>Dados de performance e erros (via Sentry)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Finalidade do Tratamento</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Prestação do serviço:</strong> gerenciar pedidos, produtos e clientes</li>
              <li><strong>Cobrança:</strong> processar pagamentos via Stripe</li>
              <li><strong>Comunicação:</strong> enviar notificações sobre pedidos, conta e atualizações</li>
              <li><strong>Melhoria:</strong> analisar uso para aprimorar a plataforma</li>
              <li><strong>Segurança:</strong> prevenir fraudes e acessos não autorizados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Base Legal (LGPD Art. 7º)</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Execução de contrato:</strong> para prestar o serviço contratado</li>
              <li><strong>Legítimo interesse:</strong> para melhoria e segurança da plataforma</li>
              <li><strong>Obrigação legal:</strong> para cumprimento de obrigações fiscais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Compartilhamento de Dados</h2>
            <p>Compartilhamos dados apenas com:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Stripe:</strong> processamento de pagamentos</li>
              <li><strong>Supabase:</strong> armazenamento de dados (infraestrutura)</li>
              <li><strong>Sentry:</strong> monitoramento de erros (dados técnicos apenas)</li>
              <li><strong>Resend:</strong> envio de emails transacionais</li>
            </ul>
            <p className="mt-2">Não vendemos dados pessoais a terceiros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Armazenamento e Segurança</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dados armazenados em servidores seguros com criptografia em trânsito (TLS)</li>
              <li>Senhas armazenadas com hash bcrypt (irreversível)</li>
              <li>Acesso restrito por Row Level Security (RLS) — cada empresa só vê seus dados</li>
              <li>Backups diários com retenção de 30 dias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Retenção de Dados</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Dados da conta: enquanto a conta estiver ativa</li>
              <li>Após cancelamento: 90 dias para exclusão completa</li>
              <li>Dados fiscais: 5 anos conforme legislação</li>
              <li>Logs técnicos: 14 dias</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Direitos do Titular (LGPD Art. 18)</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmação e acesso aos seus dados</li>
              <li>Correção de dados incompletos ou incorretos</li>
              <li>Anonimização ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados</li>
              <li>Revogação do consentimento</li>
              <li>Oposição ao tratamento</li>
            </ul>
            <p className="mt-2">Para exercer esses direitos, entre em contato: <strong>privacidade@anafood.vip</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Cookies</h2>
            <p>Utilizamos cookies essenciais para funcionamento da plataforma (autenticação e preferências). Não utilizamos cookies de rastreamento publicitário.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Alterações</h2>
            <p>Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças relevantes via email.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Contato do DPO</h2>
            <p>Encarregado de Proteção de Dados: <strong>privacidade@anafood.vip</strong></p>
          </section>
        </div>
      </div>
    </div>
  );
}
