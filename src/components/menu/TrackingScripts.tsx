// v1.0.0 — Injeta GA + FB Pixel + meta verification tags no cardápio público
import { useEffect } from "react";

interface TrackingScriptsProps {
  googleAnalyticsId?: string | null;
  facebookPixelId?: string | null;
  metaVerificationTags?: Array<{ name: string; content: string }> | null;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

export function TrackingScripts({
  googleAnalyticsId,
  facebookPixelId,
  metaVerificationTags,
}: TrackingScriptsProps) {
  useEffect(() => {
    const cleanup: Array<() => void> = [];

    // === Google Analytics / GTM ===
    if (googleAnalyticsId && /^(G-|GTM-|UA-)[A-Z0-9-]+$/i.test(googleAnalyticsId)) {
      const id = googleAnalyticsId.trim();
      const isGTM = id.startsWith("GTM-");

      // Carrega script principal
      const s1 = document.createElement("script");
      s1.async = true;
      s1.src = isGTM
        ? `https://www.googletagmanager.com/gtm.js?id=${id}`
        : `https://www.googletagmanager.com/gtag/js?id=${id}`;
      s1.setAttribute("data-tracking", "ga");
      document.head.appendChild(s1);
      cleanup.push(() => s1.remove());

      if (!isGTM) {
        // Inicializa gtag pra GA4/UA
        window.dataLayer = window.dataLayer || [];
        window.gtag = function gtag(...args: unknown[]) {
          window.dataLayer?.push(args);
        };
        window.gtag("js", new Date());
        window.gtag("config", id);
      }
    }

    // === Facebook Pixel ===
    if (facebookPixelId && /^\d{13,17}$/.test(facebookPixelId.trim())) {
      const id = facebookPixelId.trim();
      const s2 = document.createElement("script");
      s2.setAttribute("data-tracking", "fbq");
      s2.text = `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${id}'); fbq('track', 'PageView');
      `;
      document.head.appendChild(s2);
      cleanup.push(() => s2.remove());
    }

    // === Meta verification tags ===
    const metaEls: HTMLMetaElement[] = [];
    if (Array.isArray(metaVerificationTags)) {
      metaVerificationTags.forEach(tag => {
        // Sanitização: só permite name + content (evita injection)
        if (!tag?.name || !tag?.content) return;
        if (typeof tag.name !== "string" || typeof tag.content !== "string") return;
        // Whitelist de prefixos válidos pra meta verification
        const validPrefixes = [
          "facebook-domain-verification", "google-site-verification",
          "msvalidate.01", "yandex-verification", "p:domain_verify",
        ];
        if (!validPrefixes.some(p => tag.name.toLowerCase().startsWith(p))) return;
        const el = document.createElement("meta");
        el.setAttribute("name", tag.name);
        el.setAttribute("content", tag.content);
        el.setAttribute("data-tracking", "meta");
        document.head.appendChild(el);
        metaEls.push(el);
      });
    }
    cleanup.push(() => metaEls.forEach(el => el.remove()));

    return () => cleanup.forEach(fn => fn());
  }, [googleAnalyticsId, facebookPixelId, metaVerificationTags]);

  return null;
}

// Helpers para disparar eventos em pontos-chave da jornada
export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // GA
  if (typeof window.gtag === "function") {
    try { window.gtag("event", eventName, params); } catch { /* */ }
  }
  // FB Pixel — mapeia GA event → FB event padrão
  const fbMap: Record<string, string> = {
    add_to_cart: "AddToCart",
    begin_checkout: "InitiateCheckout",
    purchase: "Purchase",
    view_item: "ViewContent",
  };
  if (typeof window.fbq === "function") {
    const fbEvent = fbMap[eventName];
    if (fbEvent) {
      try { window.fbq("track", fbEvent, params); } catch { /* */ }
    }
  }
}
