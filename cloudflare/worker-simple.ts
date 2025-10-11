/**
 * Cloudflare Worker Simplificado - API Gateway AnáFood
 * Versão MVP sem Analytics e Rate Limiting complexo
 */

interface Env {
  SUPABASE_FUNCTION_URL: string;
  API_TOKEN: string;
  ALLOWED_ORIGINS: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(env.ALLOWED_ORIGINS);
    }

    try {
      // 2. Validação de API Token
      const apiToken = request.headers.get('X-API-Token');
      const authHeader = request.headers.get('Authorization');
      
      // Se não tem JWT e não tem API Token, bloquear
      if (!authHeader && !apiToken) {
        return jsonResponse(
          { error: 'Authentication required: provide Authorization header (JWT) or X-API-Token' },
          { status: 401, headers: corsHeaders(env.ALLOWED_ORIGINS) }
        );
      }

      // Se tem API Token, validar
      if (apiToken && apiToken !== env.API_TOKEN) {
        return jsonResponse(
          { error: 'Invalid API Token' },
          { status: 401, headers: corsHeaders(env.ALLOWED_ORIGINS) }
        );
      }

      // 3. Construir URL do Supabase
      const supabasePath = url.pathname.replace(/^\//, '');
      const supabaseUrl = `${env.SUPABASE_FUNCTION_URL}/${supabasePath}${url.search}`;

      console.log(`🌐 Proxying: ${request.method} ${supabaseUrl}`);

      // 4. Criar headers para o proxy
      const proxyHeaders = new Headers(request.headers);
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      proxyHeaders.set('X-Forwarded-For', clientIP);
      proxyHeaders.set('X-Request-ID', crypto.randomUUID());
      proxyHeaders.set('X-Gateway', 'cloudflare-worker');
      
      if (apiToken) {
        proxyHeaders.set('X-API-Token', apiToken);
      }

      // 5. Fazer proxy para Supabase Edge Function
      const proxyRequest = new Request(supabaseUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      const response = await fetch(proxyRequest);
      
      // 6. Retornar resposta com CORS
      return addCORSHeaders(response, env.ALLOWED_ORIGINS);

    } catch (error) {
      console.error('❌ Gateway Error:', error);
      
      return jsonResponse(
        { 
          error: 'Internal Gateway Error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        },
        { status: 500, headers: corsHeaders(env.ALLOWED_ORIGINS) }
      );
    }
  },
};

/**
 * Handle CORS Preflight
 */
function handleCORS(allowedOrigins: string): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(allowedOrigins),
  });
}

/**
 * CORS Headers
 */
function corsHeaders(allowedOrigins: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigins,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token, X-Company-ID, X-Request-ID',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Adicionar headers CORS à resposta
 */
function addCORSHeaders(response: Response, allowedOrigins: string): Response {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  Object.entries(corsHeaders(allowedOrigins)).forEach(([key, value]) => {
    newResponse.headers.set(key, value);
  });

  return newResponse;
}

/**
 * Helper para criar respostas JSON
 */
function jsonResponse(data: any, init?: ResponseInit & { headers?: Record<string, string> }): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
