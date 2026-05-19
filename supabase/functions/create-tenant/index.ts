import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Subdomínios reservados (sistema/infra) — não podem ser usados por lojas
const RESERVED_SUBDOMAINS = [
  'www', 'api', 'evo', 'admin', 'app', 'mail', 'blog',
  'gestao', 'login', 'auth', 'dashboard', 'panel', 'support',
  'help', 'docs', 'status', 'cdn', 'static', 'assets',
  'menu', 'menus', 'orders', 'pedidos', 'checkout', 'cart',
  'webhook', 'webhooks', 'billing', 'pay', 'pagamento',
];

// Regex: começa+termina com letra/dígito, permite hífen no meio, 3-30 chars
const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

function validateSubdomain(sub: string): { valid: boolean; error?: string } {
  const s = (sub || '').toLowerCase().trim();
  if (!s) return { valid: false, error: 'Subdomínio é obrigatório' };
  if (s.length < 3) return { valid: false, error: 'Subdomínio deve ter pelo menos 3 caracteres' };
  if (s.length > 30) return { valid: false, error: 'Subdomínio máximo 30 caracteres' };
  if (!SUBDOMAIN_REGEX.test(s)) {
    return { valid: false, error: 'Subdomínio só aceita letras minúsculas, números e hífen (não no início/fim)' };
  }
  if (RESERVED_SUBDOMAINS.includes(s)) {
    return { valid: false, error: `Subdomínio "${s}" é reservado pelo sistema. Escolha outro.` };
  }
  return { valid: true };
}

interface CreateTenantRequest {
  companyData: {
    companyName: string;
    fantasyName: string;
    cnpj: string;
    segment: string;
    email: string;
    phone: string;
    address: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    subdomain: string;
  };
  storeConfig: {
    planId: string;
    logo?: string;
    workingDays: string[];
    openTime: string;
    closeTime: string;
    password: string;
  };
  userInfo: {
    fullName: string;
    email: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyData, storeConfig, userInfo }: CreateTenantRequest = await req.json();

    // Valida subdomínio antes de qualquer operação
    const subCheck = validateSubdomain(companyData.subdomain);
    if (!subCheck.valid) {
      return new Response(JSON.stringify({ error: subCheck.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Normaliza pra lowercase (DNS é case-insensitive)
    companyData.subdomain = companyData.subdomain.toLowerCase().trim();

    // Verifica unicidade do subdomain
    const { data: existingSub } = await supabase
      .from('companies')
      .select('id')
      .eq('subdomain', companyData.subdomain)
      .maybeSingle();
    if (existingSub) {
      return new Response(JSON.stringify({ error: `Subdomínio "${companyData.subdomain}" já está em uso. Escolha outro.` }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Start transaction-like operations
    console.log('Creating user account...');
    
    // 1. Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userInfo.email,
      password: storeConfig.password,
      email_confirm: true,
      user_metadata: {
        full_name: userInfo.fullName,
        role: 'company_admin'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Erro ao criar usuário: ${authError.message}`);
    }

    const userId = authData.user.id;
    console.log('User created:', userId);

    // 2. Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        owner_id: userId,
        name: companyData.companyName,
        fantasy_name: companyData.fantasyName,
        cnpj: companyData.cnpj,
        email: companyData.email,
        phone: companyData.phone,
        subdomain: companyData.subdomain,
        segment: companyData.segment,
        plan_id: storeConfig.planId,
        address: {
          street: companyData.address,
          number: companyData.number,
          neighborhood: companyData.neighborhood,
          city: companyData.city,
          state: companyData.state,
          zip_code: companyData.zipCode
        },
        logo_url: storeConfig.logo
      })
      .select()
      .single();

    if (companyError) {
      console.error('Company error:', companyError);
      // Rollback: delete created user
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(`Erro ao criar empresa: ${companyError.message}`);
    }

    console.log('Company created:', company.id);

    // Cria formas de pagamento padrão (Dinheiro, Cartão Débito, Cartão Crédito, PIX)
    // Não-bloqueante: dono pode editar/remover depois em Cadastros → Formas de Pagamento
    try {
      await supabase.from('payment_methods').insert([
        { company_id: company.id, name: 'Dinheiro',       type: 'cash',   is_active: true },
        { company_id: company.id, name: 'Cartão Débito',  type: 'debit',  is_active: true },
        { company_id: company.id, name: 'Cartão Crédito', type: 'credit', is_active: true },
        { company_id: company.id, name: 'PIX',            type: 'pix',    is_active: true, show_pix_copy: true },
      ]);
      console.log('Payment methods padrão criados');
    } catch (e: any) {
      console.warn('Erro criando payment_methods padrão (não-bloqueante):', e?.message);
    }

    // The trigger will handle:
    // - Setting up the user profile with company_id and role
    // - Creating initial categories
    // - Creating sample products
    // - Setting trial period

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Empresa criada com sucesso!',
        data: {
          userId,
          companyId: company.id,
          subdomain: company.subdomain
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in create-tenant:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar cadastro'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
        status: 400,
      }
    );
  }
};

serve(handler);