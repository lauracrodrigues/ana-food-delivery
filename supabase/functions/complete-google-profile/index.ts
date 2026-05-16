// v1.0.0 — Completa perfil após login Google: cria company + linka profile
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  fullName: string;
  documentType: "cpf" | "cnpj";
  document: string;       // CPF ou CNPJ (sem máscara)
  companyName: string;    // razão social ou nome
  fantasyName: string;    // nome fantasia / nome da loja
  phone: string;
  email: string;          // email da empresa (pode ser diferente do email Google)
  subdomain: string;      // gerado a partir do fantasyName
  segment: string;
}

// Gera subdomain único a partir do nome (sanitize + sufixo numérico se colidir)
async function uniqueSubdomain(supabase: any, base: string): Promise<string> {
  const clean = base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30) || "loja";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? clean : `${clean}${i + 1}`;
    const { data } = await supabase.from("companies").select("id").eq("subdomain", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${clean}${Date.now().toString().slice(-4)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Sem token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // Resolve userId do token JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Usuário inválido" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Já tem company vinculada? Se sim, recusa
    const { data: existing } = await admin.from("profiles").select("company_id").eq("id", user.id).single();
    if (existing?.company_id) {
      return new Response(JSON.stringify({ error: "Perfil já vinculado a uma empresa", companyId: existing.company_id }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    if (!body.fullName?.trim() || !body.fantasyName?.trim() || !body.phone?.trim() || !body.document?.trim()) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios faltando" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gera subdomain único
    const subdomain = body.subdomain?.trim() || await uniqueSubdomain(admin, body.fantasyName);

    // Cria company
    const { data: company, error: cErr } = await admin
      .from("companies")
      .insert({
        owner_id: user.id,
        name: body.companyName || body.fantasyName,
        fantasy_name: body.fantasyName,
        cnpj: body.documentType === "cnpj" ? body.document : null,
        cpf: body.documentType === "cpf" ? body.document : null,
        email: body.email || user.email,
        phone: body.phone,
        subdomain,
        segment: body.segment || "Outros",
      } as any)
      .select()
      .single();

    if (cErr || !company) {
      console.error("create company error", cErr);
      return new Response(JSON.stringify({ error: cErr?.message || "Erro ao criar empresa" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atualiza profile com company_id + nome + role admin
    await admin.from("profiles").update({
      full_name: body.fullName,
      company_id: company.id,
      role: "company_admin",
    }).eq("id", user.id);

    // Cria user_roles (linka admin com a empresa)
    await admin.from("user_roles").insert({
      user_id: user.id,
      company_id: company.id,
      role: "company_admin",
    }).then(() => {}).catch(() => {});

    // Cria formas de pagamento padrão (Dinheiro, Cartão Débito, Cartão Crédito, PIX)
    // Não-bloqueante: dono edita depois em Cadastros → Formas de Pagamento
    try {
      await admin.from("payment_methods" as any).insert([
        { company_id: company.id, name: 'Dinheiro',       type: 'cash',   is_active: true },
        { company_id: company.id, name: 'Cartão Débito',  type: 'debit',  is_active: true },
        { company_id: company.id, name: 'Cartão Crédito', type: 'credit', is_active: true },
        { company_id: company.id, name: 'PIX',            type: 'pix',    is_active: true, show_pix_copy: true },
      ]);
    } catch (e) {
      console.warn("Erro payment_methods padrão (não-bloqueante)", e);
    }

    return new Response(JSON.stringify({
      success: true,
      companyId: company.id,
      subdomain: company.subdomain,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("complete-google-profile error", err);
    return new Response(JSON.stringify({ error: err?.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
