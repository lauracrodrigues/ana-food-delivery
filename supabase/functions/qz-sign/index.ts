import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get('QZ_PRIVATE_KEY');
    
    if (!privateKey) {
      console.error('QZ_PRIVATE_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Chave privada não configurada' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const toSign = await req.text();
    
    if (!toSign) {
      return new Response(
        JSON.stringify({ error: 'Nenhum dado para assinar' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Import crypto for signing
    const encoder = new TextEncoder();
    const keyData = encoder.encode(privateKey);
    
    // Create signature using SHA-1
    const dataToSign = encoder.encode(toSign);
    
    // Import the private key
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      pemToArrayBuffer(privateKey),
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-1",
      },
      false,
      ["sign"]
    );

    // Sign the data
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      dataToSign
    );

    // Convert to base64
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    console.log('✅ Dados assinados com sucesso');
    
    return new Response(base64Signature, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  } catch (error) {
    console.error('❌ Erro ao assinar dados:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao assinar';
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  return bytes.buffer;
}
