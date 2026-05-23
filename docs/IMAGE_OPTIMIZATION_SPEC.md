# Especificação: Otimização de Imagens

**STATUS:** Regra OBRIGATÓRIA do sistema.

## Por que

- Reduz custo de Storage (Supabase cobra por GB)
- Acelera download no cardápio digital (UX melhor)
- Reduz banda WhatsApp (custos Evolution + dados do cliente)
- Mantém qualidade visual aceitável

## Regra

**Toda imagem subida pelo usuário no Painel ou Cardápio DEVE passar por
`optimizeImage(file, preset)` antes do upload pro Supabase Storage.**

Sem exceções. PRs que adicionem upload de imagem sem otimização devem ser
rejeitadas.

## Presets disponíveis

`src/lib/image-optimizer.ts`

| Preset | Tamanho máx | Qualidade | Mime | Uso |
|--------|-------------|-----------|------|-----|
| `product` | 800×800px | JPEG 80% | image/jpeg | Cards de produto (cardápio) |
| `banner` | 1920×640px | JPEG 80% | image/jpeg | Banners do cardápio digital |
| `logo` | 400×400px | PNG 90% | image/png | Logo empresa (preserva transparência) |
| `status` | 1080×1920px | JPEG 75% | image/jpeg | Status WhatsApp/Instagram |
| `generic` | 1200×1200px | JPEG 80% | image/jpeg | Fallback genérico |

## Como aplicar

```ts
import { optimizeImage, formatBytes } from "@/lib/image-optimizer";

async function onFileSelect(file: File) {
  const result = await optimizeImage(file, "product");
  console.log(`${formatBytes(result.originalSize)} → ${formatBytes(result.optimizedSize)}`);

  await supabase.storage
    .from("products")
    .upload(`${companyId}/${Date.now()}.jpg`, result.blob, {
      contentType: result.mimeType,
    });
}
```

## Resultados típicos

| Original | Após otimização | Redução |
|----------|-----------------|---------|
| 4 MB (foto celular) | 200-300 KB | ~92% |
| 1 MB (foto web) | 80-150 KB | ~85% |
| 500 KB (já otimizada) | 100-200 KB | ~70% |

## Vídeo

Vídeo NÃO é otimizado client-side (ffmpeg.wasm 300KB+ download). Aplicar:
- Limite tamanho máx 16MB (rejeita acima)
- Limite duração 30s (rejeita acima)
- Use `validateVideo` em `lib/media-optimizer.ts`

Futuramente: implementar ffmpeg.wasm pra recodificar 720p H.264.

## Storage paths

Cada bucket Supabase tem path scoped por empresa:
- `products/{company_id}/{timestamp}.jpg`
- `company-logos/{company_id}/logo.png`
- `menu-banners/{company_id}/{timestamp}.jpg`
- `whatsapp-status/{company_id}/{timestamp}.jpg`

## Cleanup automático

- Status WhatsApp: TTL 7 dias (cron limpa Storage)
- Outros: persistente até user deletar/substituir

## Anti-patterns

❌ NÃO faça:
```ts
// Upload direto sem otimização
const { error } = await supabase.storage
  .from("products")
  .upload(path, file); // arquivo bruto 4MB
```

✅ Faça:
```ts
const opt = await optimizeImage(file, "product");
await supabase.storage.from("products").upload(path, opt.blob, {
  contentType: opt.mimeType,
});
```

## Adicionar novo preset

Edite `src/lib/image-optimizer.ts`:
1. Adiciona entrada em `PRESETS`
2. Documenta aqui
3. Atualiza tipo `ImagePreset`
