// v1.0.0 — Otimização client-side de mídia antes do upload
// Imagens: resize + JPEG quality 75% via Canvas
// Vídeos: valida tamanho/duração + fallback (sem comprimir — ffmpeg.wasm cap. 300KB+ baixar)

const IMAGE_MAX_WIDTH = 1080;   // máx largura px (status WhatsApp ~ 9:16 vertical = 1080x1920)
const IMAGE_MAX_HEIGHT = 1920;
const IMAGE_QUALITY = 0.75;     // JPEG 75% (boa qualidade visual + tamanho ~70% menor)
const VIDEO_MAX_BYTES = 16 * 1024 * 1024;  // 16MB (WhatsApp aceita até 16MB em status)
const VIDEO_MAX_SECONDS = 30;   // status do WhatsApp limita ~30s

export interface OptimizeResult {
  blob: Blob;
  originalSize: number;
  optimizedSize: number;
  ratio: number;        // 0-1, quanto menor = mais comprimido
  width?: number;
  height?: number;
  durationSec?: number;
}

// Otimiza imagem: lê → canvas resize → JPEG quality 75
export async function optimizeImage(file: File): Promise<OptimizeResult> {
  const originalSize = file.size;
  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);

  // Calcula novas dimensões mantendo proporção
  let { width, height } = img;
  if (width > IMAGE_MAX_WIDTH) {
    height = Math.round((height * IMAGE_MAX_WIDTH) / width);
    width = IMAGE_MAX_WIDTH;
  }
  if (height > IMAGE_MAX_HEIGHT) {
    width = Math.round((width * IMAGE_MAX_HEIGHT) / height);
    height = IMAGE_MAX_HEIGHT;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, "image/jpeg", IMAGE_QUALITY);

  return {
    blob,
    originalSize,
    optimizedSize: blob.size,
    ratio: blob.size / originalSize,
    width,
    height,
  };
}

// Valida vídeo (não comprime — só checa). Throws se inválido.
export async function validateVideo(file: File): Promise<OptimizeResult> {
  const originalSize = file.size;
  if (originalSize > VIDEO_MAX_BYTES) {
    throw new Error(`Vídeo grande demais: ${(originalSize / 1048576).toFixed(1)}MB. Máximo 16MB. Reduza qualidade ou duração antes de enviar.`);
  }

  // Carrega metadata pra validar duração
  const url = URL.createObjectURL(file);
  try {
    const duration = await getVideoDuration(url);
    if (duration > VIDEO_MAX_SECONDS + 1) {
      throw new Error(`Vídeo longo demais: ${Math.round(duration)}s. Máximo ${VIDEO_MAX_SECONDS}s (limite do Status).`);
    }
    return {
      blob: file,
      originalSize,
      optimizedSize: originalSize,
      ratio: 1,
      durationSec: duration,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Helpers
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = () => rej(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("Imagem inválida"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((res, rej) => {
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("toBlob falhou"))),
      type,
      quality
    );
  });
}

function getVideoDuration(url: string): Promise<number> {
  return new Promise((res, rej) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => res(video.duration);
    video.onerror = () => rej(new Error("Vídeo inválido"));
    video.src = url;
  });
}

// Formata bytes legível
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
