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
    
    console.log('🔑 Verificando QZ_PRIVATE_KEY...');
    console.log('Chave existe:', !!privateKey);
    console.log('Tamanho da chave:', privateKey?.length || 0);
    
    if (!privateKey) {
      console.error('❌ QZ_PRIVATE_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Chave privada não configurada' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const toSign = await req.text();
    
    console.log('📝 Dados recebidos para assinar (tamanho):', toSign.length);
    
    if (!toSign) {
      console.error('❌ Nenhum dado para assinar');
      return new Response(
        JSON.stringify({ error: 'Nenhum dado para assinar' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate PEM format
    if (!privateKey.includes('BEGIN') || !privateKey.includes('PRIVATE KEY')) {
      console.error('❌ Formato de chave inválido - não é PEM');
      return new Response(
        JSON.stringify({ error: 'Formato de chave privada inválido' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('🔧 Convertendo chave PEM para ArrayBuffer...');
    
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

    console.log('✅ Chave importada com sucesso');
    console.log('🔏 Assinando dados...');

    // Create signature using SHA-1
    const encoder = new TextEncoder();
    const dataToSign = encoder.encode(toSign);
    
    // Sign the data
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      dataToSign
    );

    // Convert to base64
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    console.log('✅ Dados assinados com sucesso (tamanho da assinatura):', base64Signature.length);
    
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
  try {
    // Remove all PEM headers and footers
    let b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/-----BEGIN RSA PRIVATE KEY-----/g, '')
      .replace(/-----END RSA PRIVATE KEY-----/g, '')
      .replace(/\r/g, '')
      .replace(/\n/g, '')
      .replace(/\s/g, '')
      .trim();
    
    console.log('🔧 Base64 limpo (primeiros 50 chars):', b64.substring(0, 50));
    console.log('🔧 Tamanho do base64:', b64.length);
    
    // Decode base64
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    console.log('✅ Conversão PEM -> ArrayBuffer concluída');
    return bytes.buffer;
  } catch (error) {
    console.error('❌ Erro ao converter PEM:', error);
    throw new Error(`Falha ao converter chave PEM: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
  }
}
