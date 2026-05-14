// v1.0.0 — Seta meta tags do <head> para SEO + Open Graph + Twitter Card
import { useEffect } from "react";

export interface DocumentMeta {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: "website" | "article" | "product";
  siteName?: string;
}

// Cria ou atualiza tag <meta>. Usa data-managed pra identificar tags geridas (evita conflito com index.html)
function setMeta(attr: "name" | "property", key: string, value: string) {
  if (!value) return;
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-managed", "1");
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function removeManagedTags() {
  document.querySelectorAll("meta[data-managed]").forEach(el => el.remove());
}

export function useDocumentMeta(meta: DocumentMeta) {
  useEffect(() => {
    const prevTitle = document.title;
    if (meta.title) document.title = meta.title;

    // Tags básicas
    if (meta.description) setMeta("name", "description", meta.description);

    // Open Graph
    if (meta.title) setMeta("property", "og:title", meta.title);
    if (meta.description) setMeta("property", "og:description", meta.description);
    if (meta.image) setMeta("property", "og:image", meta.image);
    if (meta.url) setMeta("property", "og:url", meta.url);
    setMeta("property", "og:type", meta.type ?? "website");
    if (meta.siteName) setMeta("property", "og:site_name", meta.siteName);

    // Twitter Card
    setMeta("name", "twitter:card", meta.image ? "summary_large_image" : "summary");
    if (meta.title) setMeta("name", "twitter:title", meta.title);
    if (meta.description) setMeta("name", "twitter:description", meta.description);
    if (meta.image) setMeta("name", "twitter:image", meta.image);

    return () => {
      document.title = prevTitle;
      removeManagedTags();
    };
  }, [meta.title, meta.description, meta.image, meta.url, meta.type, meta.siteName]);
}
