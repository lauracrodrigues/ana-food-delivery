import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import { initGA4 } from "./lib/analytics";
import App from "./App.tsx";
import "./index.css";

// Chunk load error após novo deploy — força reload para pegar index.html + chunks frescos
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

initSentry();
initGA4();

createRoot(document.getElementById("root")!).render(<App />);

// v1.2.0 — registra SW + força reload UMA vez quando SW novo assume controle
// (previne ChunkLoadError após deploy fresh)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  navigator.serviceWorker.register("/sw.js").then((reg) => {
    if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          nw.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
  }).catch(() => {});
}
