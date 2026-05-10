import { createRoot } from "react-dom/client";
import { initSentry } from "./lib/sentry";
import { initGA4 } from "./lib/analytics";
import App from "./App.tsx";
import "./index.css";

initSentry();
initGA4();

createRoot(document.getElementById("root")!).render(<App />);

// PWA — registrar service worker
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
