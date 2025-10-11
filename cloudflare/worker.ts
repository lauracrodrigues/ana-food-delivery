/**
 * Cloudflare Worker - API Gateway para AnáFood
 * 
 * Funcionalidades:
 * - Rate Limiting (100 req/min por IP)
 * - CORS para requisições externas
 * - Proxy transparente para Supabase Edge Functions
 * - Analytics e logging
 * - Validação de API Token
 */

interface Env {
  ANALYTICS: KVNamespace;
  SUPABASE_FUNCTION_URL: string;
  API_TOKEN: string;
  ALLOWED_ORIGINS: string;
}

interface AnalyticsData {
  timestamp: number;
  ip: string;
  method: string;
  path: string;
  status: number;
  userAgent: string | null;
  responseTime: number;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(env.ALLOWED_ORIGINS);
    }

    try {
      // 2. Rate Limiting (100 requisições por minuto por IP)
      const rateLimitResult = await checkRateLimit(env.ANALYTICS, clientIP);
      if (!rateLimitResult.allowed) {
        return jsonResponse(
          { error: 'Too Many Requests', retryAfter: 60 },
          { status: 429 }
        );
      }

      // 3. Validação de API Token (apenas para rotas públicas)
      const apiToken = request.headers.get('X-API-Token');
      const authHeader = request.headers.get('Authorization');
      
      // Se não tem JWT e não tem API Token, bloquear
      if (!authHeader && !apiToken) {
        return jsonResponse(
          { error: 'Authentication required: provide Authorization header (JWT) or X-API-Token' },
          { status: 401 }
        );
      }

      // Se tem API Token, validar
      if (apiToken && apiToken !== env.API_TOKEN) {
        return jsonResponse(
          { error: 'Invalid API Token' },
          { status: 401 }
        );
      }

      // 4. Construir URL do Supabase
      const supabasePath = url.pathname.replace(/^\//, ''); // Remove / inicial
      const supabaseUrl = `${env.SUPABASE_FUNCTION_URL}/${supabasePath}${url.search}`;

      console.log(`🌐 Proxying request: ${request.method} ${supabaseUrl}`);

      // 5. Criar headers para o proxy
      const proxyHeaders = new Headers(request.headers);
      proxyHeaders.set('X-Forwarded-For', clientIP);
      proxyHeaders.set('X-Request-ID', crypto.randomUUID());
      proxyHeaders.set('X-Gateway', 'cloudflare-worker');
      
      // Se veio com API Token, passar para o backend
      if (apiToken) {
        proxyHeaders.set('X-API-Token', apiToken);
      }

      // 6. Fazer proxy para Supabase Edge Function
      const proxyRequest = new Request(supabaseUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });

      const response = await fetch(proxyRequest);
      
      // 7. Log Analytics (não bloquear resposta)
      const responseTime = Date.now() - startTime;
      ctx.waitUntil(
        logAnalytics(env.ANALYTICS, {
          timestamp: Date.now(),
          ip: clientIP,
          method: request.method,
          path: url.pathname,
          status: response.status,
          userAgent: request.headers.get('User-Agent'),
          responseTime,
        })
      );

      // 8. Retornar resposta com CORS
      return addCORSHeaders(response.clone(), env.ALLOWED_ORIGINS);

    } catch (error) {
      console.error('❌ Gateway Error:', error);
      
      // Log do erro
      ctx.waitUntil(
        logAnalytics(env.ANALYTICS, {
          timestamp: Date.now(),
          ip: clientIP,
          method: request.method,
          path: url.pathname,
          status: 500,
          userAgent: request.headers.get('User-Agent'),
          responseTime: Date.now() - startTime,
        })
      );

      return jsonResponse(
        { error: 'Internal Gateway Error', message: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  },
};

/**
 * Rate Limiting usando KV Storage
 */
async function checkRateLimit(
  kv: KVNamespace,
  clientIP: string,
  maxRequests: number = 100,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000));
  const rateLimitKey = `ratelimit:${clientIP}:${windowStart}`;

  // Obter contagem atual
  const currentCountStr = await kv.get(rateLimitKey);
  const currentCount = currentCountStr ? parseInt(currentCountStr) : 0;

  // Verificar se excedeu o limite
  if (currentCount >= maxRequests) {
    return { allowed: false, current: currentCount, limit: maxRequests };
  }

  // Incrementar contador
  const newCount = currentCount + 1;
  await kv.put(rateLimitKey, String(newCount), {
    expirationTtl: windowSeconds * 2, // Manter por 2x o window para segurança
  });

  return { allowed: true, current: newCount, limit: maxRequests };
}

/**
 * Registrar analytics no KV
 */
async function logAnalytics(kv: KVNamespace, data: AnalyticsData): Promise<void> {
  try {
    const key = `analytics:${data.timestamp}:${crypto.randomUUID()}`;
    await kv.put(key, JSON.stringify(data), {
      expirationTtl: 86400 * 30, // 30 dias
    });
  } catch (error) {
    console.error('Failed to log analytics:', error);
  }
}

/**
 * Handle CORS Preflight
 */
function handleCORS(allowedOrigins: string): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigins,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token, X-Company-ID, X-Request-ID',
      'Access-Control-Max-Age': '86400', // 24 horas
      'Access-Control-Allow-Credentials': 'true',
    },
  });
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

  newResponse.headers.set('Access-Control-Allow-Origin', allowedOrigins);
  newResponse.headers.set('Access-Control-Allow-Credentials', 'true');

  return newResponse;
}

/**
 * Helper para criar respostas JSON
 */
function jsonResponse(data: any, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
