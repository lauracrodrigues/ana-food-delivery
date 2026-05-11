import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento camelCase → snake_case para campos de StoreSettings
function toDbFields(settings: Record<string, any>): Record<string, any> {
  const map: Record<string, string> = {
    storeOpen:           'store_open',
    autoAccept:          'auto_accept',
    soundEnabled:        'sound_enabled',
    notificationSound:   'notification_sound',
    deliveryTime:        'delivery_time',
    pickupTime:          'pickup_time',
    alertTime:           'alert_time',
    visibleColumns:      'visible_columns',
    autoPrint:           'auto_print',
    debounceMs:          'debounce_ms',
    printerSettings:     'printer_settings',
    orderNumberingMode:  'order_numbering_mode',
    orderNumberingResetTime: 'order_numbering_reset_time',
  };

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(settings)) {
    const dbKey = map[key] ?? key; // passa direto se já está em snake_case
    result[dbKey] = value;
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);

    // Lê body UMA vez aqui (evita double-consume)
    let body: Record<string, any> = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { body = {}; }
    }

    // company_id: query param (GET) ou body (POST)
    const companyId = url.searchParams.get('company_id') || body.company_id;
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'company_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar acesso
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.company_id !== companyId) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado à empresa' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET — buscar configurações
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST — atualizar configurações
    if (req.method === 'POST') {
      const { settings } = body;
      if (!settings) {
        return new Response(
          JSON.stringify({ error: 'settings é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Converte camelCase → snake_case antes de salvar
      const dbFields = toDbFields(settings);

      const { data, error } = await supabase
        .from('store_settings')
        .update({ ...dbFields, updated_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro na API Settings:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
