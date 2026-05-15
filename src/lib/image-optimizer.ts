// v1.0.0 — Otimiza imagens client-side antes do upload (resize + compressão + WebP)
// Reduz uploads de 5MB → 100-300KB tipicamente. Sem deps externas.

export interface OptimizeOptions {
  maxWidth?: number;     // largura máxima em px (default 1200)
  maxHeight?: number;    // altura máxima (default 1200)
  quality?: number;      // 0-1 (default 0.85)
  preferWebP?: boolean;  // tenta WebP se suportado (default true)
  format?: "image/webp" | "image/jpeg" | "image/png"; // força formato (override preferWebP)
}

const DEFAULTS: Required<Omit<OptimizeOptions, "format">> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.85,
  preferWebP: true,
};

// Cache do suporte WebP (faz check 1x por sessão)
let webpSupported: boolean | null = null;
function checkWebPSupport(): Promise<boolean> {
  if (webpSupported !== null) return Promise.resolve(webpSupported);
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1; canvas.height = 1;
    canvas.toBlob((b) => {
      webpSupported = !!b && b.type === "image/webp";
      resolve(webpSupported);
    }, "image/webp");
  });
}

// Carrega File em HTMLImageElement
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Falha ao carregar imagem")); };
    img.src = url;
  });
}

// Otimiza: redimensiona pra caber em maxWidth/Height (mantém aspect ratio) + comprime
export async function optimizeImage(file: File, opts: OptimizeOptions = {}): Promise<File> {
  // Não otimiza GIF/SVG (perderia animação/vetor)
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  // Se já é pequeno (<150KB), não vale otimizar
  if (file.size < 150 * 1024) return file;

  const o = { ...DEFAULTS, ...opts };

  const img = await loadImage(file);

  // Calcula dimensões mantendo aspect ratio
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > o.maxWidth || h > o.maxHeight) {
    const ratio = Math.min(o.maxWidth / w, o.maxHeight / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  // Desenha em canvas com tamanho alvo
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  // Background branco pra PNG transparente → JPEG (evita preto)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  // Decide formato de saída
  let outputType: string;
  if (opts.format) {
    outputType = opts.format;
  } else if (o.preferWebP && (await checkWebPSupport())) {
    outputType = "image/webp";
  } else {
    // Mantém PNG se origem PNG (preserva qualidade pra logos); resto vira JPEG
    outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error("toBlob falhou")),
      outputType,
      o.quality
    );
  });

  // Se output ficou maior que original (raro, mas pode com PNG → PNG), usa original
  if (blob.size >= file.size) return file;

  // Nova extensão baseada no tipo final
  const ext = outputType === "image/webp" ? "webp" : outputType === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.${ext}`, { type: outputType, lastModified: Date.now() });
}

// Helper: formata tamanho legível pra UI ("1.2 MB", "340 KB")
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
