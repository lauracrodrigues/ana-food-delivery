// v1.1.0 — Google Analytics 4 integration
const GA_ID = "G-24XV655JBR";

export function initGA4() {
  if (import.meta.env.DEV) return;

  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  gtag("js", new Date());
  gtag("config", GA_ID);

  (window as any).gtag = gtag;
}

export function trackEvent(name: string, params?: Record<string, any>) {
  if (typeof (window as any).gtag === "function") {
    (window as any).gtag("event", name, params);
  }
}

export function trackPageView(path: string) {
  if (typeof (window as any).gtag === "function") {
    (window as any).gtag("event", "page_view", { page_path: path });
  }
}
