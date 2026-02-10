

# Corrigir geração de QR Code do WhatsApp

## Problema Identificado

A Evolution API (`evo.anafood.vip`) esta retornando **erros 500** (PrismaClientKnownRequestError) e **erros 502** (Bad Gateway). Isso indica um problema no servidor da Evolution API, provavelmente relacionado ao banco de dados Prisma dela.

Os logs mostram:
```
Response 500: {"status":500,"error":"Internal Server Error",
"response":{"message":["PrismaClientKnownRequestError: 
Invalid `this.prismaRepository.integrationSession.findFirst()` invocation...
```

## Causa Raiz

O servidor Evolution API tem um problema interno de banco de dados. O codigo do Lovable esta correto, mas precisa de melhor tratamento de erros para:
1. Mostrar mensagens claras ao usuario sobre o que esta falhando
2. Diferenciar entre erro do servidor Evolution vs erro do codigo

## Plano de Correção

### 1. Melhorar a edge function `whatsapp-evolution`
- Adicionar logs mais detalhados com o corpo da resposta de erro
- Retornar mensagens de erro mais especificas para o frontend (ex: "Evolution API fora do ar", "Erro interno na Evolution API")
- Tratar respostas 500 e 502 como erros especificos em vez de erros genericos

### 2. Melhorar tratamento de erros no frontend (`src/pages/WhatsApp.tsx`)
- Na funcao `ensureInstanceExists`: tratar especificamente erros 500/502 da Evolution API e mostrar toast informativo dizendo que o servidor Evolution esta com problemas
- Na funcao `handleConnect`: mostrar mensagem mais clara quando a Evolution API esta indisponivel, sugerindo verificar o servidor
- Adicionar um estado de "servidor indisponivel" para evitar chamadas repetidas quando o servidor esta fora

### 3. Adicionar retry com feedback visual
- Adicionar botao de "Tentar Novamente" com mensagem explicativa quando a Evolution API falha
- Mostrar status do servidor Evolution na listagem de sessoes

## Detalhes Tecnicos

### Edge Function - Tratamento de erros 500/502
Para cada acao (status, connect, create), adicionar tratamento especifico:
```typescript
if (response.status === 500 || response.status === 502) {
  const errorBody = await response.text();
  console.error(`[Evolution] Server error ${response.status}:`, errorBody);
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'evolution_server_error',
      message: 'A Evolution API esta com problemas internos. Verifique o servidor.',
      statusCode: response.status
    }),
    { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Frontend - Mensagens claras
Na funcao `handleConnect`, capturar o tipo de erro e exibir:
- "Servidor Evolution API indisponivel" para erros 502
- "Erro interno na Evolution API - verifique o servidor" para erros 500
- Manter mensagem generica para outros erros

### Nota Importante
**Voce precisa verificar o servidor da Evolution API (`evo.anafood.vip`)**. O erro `PrismaClientKnownRequestError` indica que o banco de dados da Evolution pode estar corrompido, desconectado ou com schema incompativel. Possiveis acoes:
- Reiniciar o container/servico da Evolution API
- Verificar a conexao do banco de dados da Evolution
- Verificar se houve atualizacao da Evolution que requer migration do Prisma

