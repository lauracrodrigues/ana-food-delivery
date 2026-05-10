// v2.0.0 — User management com suporte a super_admin + actions list/reset_password/toggle_block
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  fullName: string;
  role: 'company_admin' | 'company_staff';
  companyId: string;
  password?: string;
}

interface UpdateUserRequest {
  userId: string;
  fullName?: string;
  role?: 'company_admin' | 'company_staff';
}

interface ResetPasswordRequest {
  userId: string;
  newPassword?: string;
  sendEmail?: boolean;
}

interface ToggleBlockRequest {
  userId: string;
  block: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verifica role do usuário (super_admin OR company_admin)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    const isSuperAdmin = profile?.role === 'super_admin';
    const isCompanyAdmin = profile?.role === 'company_admin';

    if (!isSuperAdmin && !isCompanyAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem gerenciar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Helper: valida acesso ao company alvo
    const canAccessCompany = (companyId: string) =>
      isSuperAdmin || profile?.company_id === companyId;

    // ──────────────── LIST ────────────────
    if (action === 'list') {
      const companyId = url.searchParams.get('company_id') || profile?.company_id;
      if (!companyId) {
        return new Response(JSON.stringify({ error: 'company_id required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (!canAccessCompany(companyId)) {
        return new Response(JSON.stringify({ error: 'Acesso negado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .eq('company_id', companyId);

      if (!roles || roles.length === 0) {
        return new Response(JSON.stringify({ users: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const userIds = roles.map(r => r.user_id);
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Buscar emails do auth.users
      const users = await Promise.all(
        roles.map(async (r) => {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
          const p = profiles?.find(pr => pr.id === r.user_id);
          return {
            id: r.user_id,
            email: authUser?.user?.email || null,
            full_name: p?.full_name || null,
            role: r.role,
            blocked: !!authUser?.user?.banned_until && new Date(authUser.user.banned_until) > new Date(),
            created_at: authUser?.user?.created_at,
            last_sign_in_at: authUser?.user?.last_sign_in_at,
          };
        })
      );

      return new Response(JSON.stringify({ users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ──────────────── CREATE ────────────────
    if (action === 'create') {
      const { email, fullName, role, companyId, password }: CreateUserRequest = await req.json();

      if (!canAccessCompany(companyId)) {
        return new Response(JSON.stringify({ error: 'Acesso negado para esta empresa' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const finalPassword = password || (Math.random().toString(36).slice(-12) + 'Aa1!');

      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName }
      });

      if (authError || !newUser.user) {
        return new Response(JSON.stringify({ error: authError?.message || 'Falha ao criar usuário' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Trigger handle_new_user já cria profile/role default. Atualizar com dados corretos.
      await new Promise(r => setTimeout(r, 500));

      await supabaseAdmin.from('profiles')
        .update({ company_id: companyId, full_name: fullName })
        .eq('id', newUser.user.id);

      await supabaseAdmin.from('user_roles')
        .upsert({
          user_id: newUser.user.id,
          company_id: companyId,
          role,
          created_by: user.id
        }, { onConflict: 'user_id,role,company_id' });

      return new Response(JSON.stringify({
        success: true,
        userId: newUser.user.id,
        tempPassword: password ? undefined : finalPassword,
        message: password ? 'Usuário criado' : 'Usuário criado. Senha temporária retornada.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ──────────────── UPDATE ────────────────
    if (action === 'update') {
      const { userId, fullName, role }: UpdateUserRequest = await req.json();

      const { data: targetRole } = await supabaseAdmin
        .from('user_roles').select('company_id').eq('user_id', userId).single();

      if (!targetRole || !canAccessCompany(targetRole.company_id)) {
        return new Response(JSON.stringify({ error: 'Acesso negado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (fullName) {
        await supabaseAdmin.from('profiles').update({ full_name: fullName }).eq('id', userId);
      }
      if (role) {
        await supabaseAdmin.from('user_roles')
          .update({ role }).eq('user_id', userId).eq('company_id', targetRole.company_id);
      }

      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ──────────────── RESET PASSWORD ────────────────
    if (action === 'reset_password') {
      const { userId, newPassword, sendEmail }: ResetPasswordRequest = await req.json();

      const { data: targetRole } = await supabaseAdmin
        .from('user_roles').select('company_id').eq('user_id', userId).single();

      if (!targetRole || !canAccessCompany(targetRole.company_id)) {
        return new Response(JSON.stringify({ error: 'Acesso negado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: targetUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!targetUser?.user?.email) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Opção 1: senha fornecida — set direto
      if (newPassword) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, message: 'Senha alterada' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Opção 2: enviar email de reset
      if (sendEmail) {
        const { error } = await supabaseAdmin.auth.resetPasswordForEmail(targetUser.user.email, {
          redirectTo: `${req.headers.get('origin')}/auth/callback`
        });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, message: 'Email de reset enviado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'newPassword ou sendEmail obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ──────────────── TOGGLE BLOCK ────────────────
    if (action === 'toggle_block') {
      const { userId, block }: ToggleBlockRequest = await req.json();

      if (userId === user.id) {
        return new Response(JSON.stringify({ error: 'Não pode bloquear sua própria conta' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: targetRole } = await supabaseAdmin
        .from('user_roles').select('company_id').eq('user_id', userId).single();

      if (!targetRole || !canAccessCompany(targetRole.company_id)) {
        return new Response(JSON.stringify({ error: 'Acesso negado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Bloqueia por 100 anos = efetivamente permanente
      const banDuration = block ? '876000h' : 'none';
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: banDuration
      } as any);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({
        success: true,
        message: block ? 'Usuário bloqueado' : 'Usuário desbloqueado'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ──────────────── DELETE ────────────────
    if (action === 'delete') {
      const { userId } = await req.json();

      if (userId === user.id) {
        return new Response(JSON.stringify({ error: 'Não pode excluir sua própria conta' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: targetRole } = await supabaseAdmin
        .from('user_roles').select('company_id').eq('user_id', userId).single();

      if (!targetRole || !canAccessCompany(targetRole.company_id)) {
        return new Response(JSON.stringify({ error: 'Acesso negado' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Error in user-management:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar requisição' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
