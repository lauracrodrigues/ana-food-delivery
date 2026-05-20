// menu-import/index.ts — v1.0.0
// Importa cardápio via imagem/PDF usando IA (OpenAI GPT-4o Vision)
// Retorna categorias e produtos parseados para confirmação no frontend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prompt que instrui o modelo a parsear o cardápio em JSON estruturado
const MENU_PARSE_PROMPT = `Você é um assistente especializado em análise de cardápios.

Analise esta imagem de cardápio e extraia TODOS os itens visíveis.
Retorne SOMENTE um JSON válido no formato abaixo, sem markdown, sem explicações:

{
  "categories": [
    {
      "name": "Nome da Categoria",
      "items": [
        {
          "name": "Nome do Produto",
          "description": "Descrição se houver, ou null",
          "price": 25.90
        }
      ]
    }
  ]
}

Regras obrigatórias:
- "price" deve ser número (float), nunca string. Se não houver preço visível, use null.
- Se não houver categoria definida no cardápio, agrupe tudo em "Sem Categoria".
- Inclua absolutamente TODOS os itens visíveis na imagem.
- "description" pode ser null se não houver descrição.
- Normalize preços: "R$ 25,90" → 25.90 | "25.90" → 25.90 | "R$25" → 25
- Remova espaços extras dos nomes.`;

interface ParsedItem {
  name: string;
  description: string | null;
  price: number | null;
}

interface ParsedCategory {
  name: string;
  items: ParsedItem[];
}

interface ParsedMenu {
  categories: ParsedCategory[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Valida auth via Supabase JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY não configurada nas secrets da Edge Function' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Valida usuário
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { imageBase64, mimeType } = body as {
      imageBase64: string;  // base64 sem prefixo data:
      mimeType: string;     // 'image/jpeg' | 'image/png' | 'image/webp'
    };

    if (!imageBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'imageBase64 e mimeType são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Chama GPT-4o Vision para parsear o cardápio
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // v1.0.1 — gpt-4o-mini (10x mais barato, suporta vision). Override via OPENAI_MENU_PARSE_MODEL.
        model: Deno.env.get('OPENAI_MENU_PARSE_MODEL') || 'gpt-4o-mini',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: MENU_PARSE_PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      console.error('[menu-import] OpenAI error:', errBody);
      return new Response(JSON.stringify({ error: 'Erro na API da OpenAI', detail: errBody }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content;

    let parsed: ParsedMenu;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return new Response(JSON.stringify({ error: 'Modelo retornou JSON inválido', raw: rawContent }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Valida estrutura mínima
    if (!parsed?.categories || !Array.isArray(parsed.categories)) {
      return new Response(JSON.stringify({ error: 'Estrutura de retorno inválida', raw: rawContent }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const totalItems = parsed.categories.reduce((acc, c) => acc + (c.items?.length || 0), 0);

    return new Response(JSON.stringify({
      success: true,
      categories: parsed.categories,
      stats: {
        categories: parsed.categories.length,
        items: totalItems,
        tokens_used: openaiData.usage?.total_tokens,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[menu-import] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
