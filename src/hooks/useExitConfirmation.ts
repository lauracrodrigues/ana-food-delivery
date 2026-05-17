// v1.0.0 — Intercepta back/exit pra evitar saída acidental do cardápio
// Pushes dummy history state; popstate handler pergunta confirmação antes de sair
import { useEffect } from "react";

export function useExitConfirmation(enabled: boolean, message = "Sair do cardápio?") {
  useEffect(() => {
    if (!enabled) return;

    // Push dummy state — primeiro back vai cair aqui sem sair da página
    window.history.pushState({ menuGuard: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      // Pergunta confirmação
      const confirmed = window.confirm(message);
      if (confirmed) {
        // Usuário confirmou — sai (volta de novo p/ navegar pra trás de verdade)
        window.history.back();
      } else {
        // Cancelou — re-push dummy state pra próximo back ser interceptado também
        window.history.pushState({ menuGuard: true }, "");
      }
    };

    // beforeunload — fecha aba / reload acidental
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // browsers exigem string vazia pra mostrar prompt nativo
      return "";
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled, message]);
}
