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
  permissions?: {
    canManageProducts?: boolean;
    canManageOrders?: boolean;
    canManageCustomers?: boolean;
    canViewReports?: boolean;
    canManageSettings?: boolean;
  };
}

interface UpdateUserRequest {
  userId: string;
  fullName?: string;
  role?: 'company_admin' | 'company_staff';
  permissions?: {
    canManageProducts?: boolean;
    canManageOrders?: boolean;
    canManageCustomers?: boolean;
    canViewReports?: boolean;
    canManageSettings?: boolean;
  };
}

interface DeleteUserRequest {
  userId: string;
  currentUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from request
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

    // Verify user is company admin
    const { data: userRole, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id)
      .single();

    if (roleError || !userRole || userRole.role !== 'company_admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem gerenciar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'create') {
      // CREATE USER
      const { email, fullName, role, companyId, permissions }: CreateUserRequest = await req.json();

      // Validate that admin is creating user for their own company
      if (companyId !== userRole.company_id) {
        return new Response(
          JSON.stringify({ error: 'Você só pode criar usuários para sua própria empresa' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if email already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const emailExists = existingUsers?.users?.some(u => u.email === email);
      
      if (emailExists) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado no sistema' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';

      // Create auth user with email confirmation required
      const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false, // User must confirm email
        user_metadata: {
          full_name: fullName,
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!newUser.user) {
        return new Response(
          JSON.stringify({ error: 'Falha ao criar usuário' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Wait for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with company_id and full_name
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          company_id: companyId,
          full_name: fullName
        })
        .eq('id', newUser.user.id);

      if (profileError) {
        console.error('Profile error:', profileError);
        // Rollback: delete user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return new Response(
          JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create user role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          company_id: companyId,
          role: role,
          created_by: user.id
        });

      if (roleError) {
        console.error('Role error:', roleError);
        // Rollback: delete user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return new Response(
          JSON.stringify({ error: `Erro ao criar role: ${roleError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Send password reset email (since user needs to confirm and set password)
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.get('origin')}/auth/callback`
      });

      if (resetError) {
        console.error('Reset password error:', resetError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Usuário criado com sucesso! Um email de confirmação foi enviado.',
          userId: newUser.user.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else if (action === 'update') {
      // UPDATE USER
      const { userId, fullName, role }: UpdateUserRequest = await req.json();

      // Get user's company to verify admin can update
      const { data: targetUserRole } = await supabaseClient
        .from('user_roles')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (!targetUserRole || targetUserRole.company_id !== userRole.company_id) {
        return new Response(
          JSON.stringify({ error: 'Você só pode atualizar usuários da sua empresa' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update profile if fullName provided
      if (fullName) {
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ full_name: fullName })
          .eq('id', userId);

        if (profileError) {
          return new Response(
            JSON.stringify({ error: `Erro ao atualizar perfil: ${profileError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update role if provided
      if (role) {
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .update({ role })
          .eq('user_id', userId)
          .eq('company_id', userRole.company_id);

        if (roleError) {
          return new Response(
            JSON.stringify({ error: `Erro ao atualizar role: ${roleError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Usuário atualizado com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'delete') {
      // DELETE USER
      const { userId, currentUserId }: DeleteUserRequest = await req.json();

      // Prevent self-deletion
      if (userId === currentUserId) {
        return new Response(
          JSON.stringify({ error: 'Você não pode excluir sua própria conta' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify user belongs to admin's company
      const { data: targetUserRole } = await supabaseClient
        .from('user_roles')
        .select('company_id')
        .eq('user_id', userId)
        .single();

      if (!targetUserRole || targetUserRole.company_id !== userRole.company_id) {
        return new Response(
          JSON.stringify({ error: 'Você só pode excluir usuários da sua empresa' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Delete user (cascade will delete profile and user_roles)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: `Erro ao excluir usuário: ${deleteError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: 'Ação inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in user-management:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar requisição' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
