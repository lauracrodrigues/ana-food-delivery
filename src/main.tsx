import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeColorPalette } from "./hooks/use-color-palette";

// Inicializar paleta de cores salva antes de renderizar
initializeColorPalette();

createRoot(document.getElementById("root")!).render(<App />);
