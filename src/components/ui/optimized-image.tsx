// v1.1.0 — <img> com lazy, decoding async, aspect-ratio (evita CLS) e fallback
// NOTA: Supabase Storage transforms exigem plano Pro. Quando upgradar, descomentar
// toOptimizedUrl pra ativar WebP automático + resize.
import { useState, ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string | null | undefined;
  fallback?: React.ReactNode; // exibido quando sem src ou erro
  aspectRatio?: string;       // ex "4/3", "1/1" pra evitar layout shift
}

export function OptimizedImage({ src, fallback, aspectRatio, className, style, ...rest }: OptimizedImageProps) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    if (fallback) return <>{fallback}</>;
    return <div className={className} style={aspectRatio ? { aspectRatio, ...style } : style} />;
  }

  return (
    <img
      src={src}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={className}
      style={aspectRatio ? { aspectRatio, ...style } : style}
      {...rest}
    />
  );
}
