// Barra de progresso no topo — ativa quando qualquer query React Query está carregando.
// Não bloqueia a UI, apenas indica atividade em background.
import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function GlobalLoader() {
  const isFetching = useIsFetching();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (isFetching > 0) {
      setVisible(true);
      setWidth(30);
      const t1 = setTimeout(() => setWidth(60), 200);
      const t2 = setTimeout(() => setWidth(80), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setWidth(100);
      const t = setTimeout(() => { setVisible(false); setWidth(0); }, 300);
      return () => clearTimeout(t);
    }
  }, [isFetching]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[2px] bg-primary transition-all"
      style={{
        width: `${width}%`,
        transitionDuration: isFetching > 0 ? "600ms" : "200ms",
        transitionTimingFunction: "ease-out",
        opacity: isFetching > 0 ? 1 : 0,
      }}
    />
  );
}
