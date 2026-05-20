// v1.0.0 — Status global do agente de impressão (QZ Tray / Ana Food Print)
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { qzPrinter } from "@/lib/qz-tray";
import { printerCache } from "@/lib/printer-cache";
import { Printer, CheckCircle2, XCircle, Download, RefreshCw, Loader2 } from "lucide-react";

export function PrinterStatusBadge() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [printers, setPrinters] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      // Tenta conectar — sucesso = QZ rodando
      await qzPrinter.connect();
      setConnected(true);
      const list = await qzPrinter.getPrinters().catch(() => []);
      setPrinters(list || []);
      // Atualiza cache
      printerCache.set(list || []);
    } catch {
      setConnected(false);
      setPrinters([]);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Verifica ao montar + a cada 30s
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, []);

  if (connected === null && !checking) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2">
          {checking ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : connected ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-destructive" />
          )}
          <span className="text-xs hidden sm:inline">
            {checking ? "Verificando..."
              : connected ? `Agente OK · ${printers.length} impressora${printers.length !== 1 ? "s" : ""}`
              : "Agente offline"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            <h4 className="font-semibold text-sm">Agente de Impressão</h4>
          </div>

          {connected ? (
            <>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Conectado
              </Badge>
              <div className="text-xs">
                <div className="font-medium mb-1">{printers.length} impressora{printers.length !== 1 ? "s" : ""} detectada{printers.length !== 1 ? "s" : ""}:</div>
                <ul className="text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                  {printers.map(p => (
                    <li key={p} className="font-mono truncate">• {p}</li>
                  ))}
                  {!printers.length && <li>Nenhuma impressora detectada</li>}
                </ul>
              </div>
            </>
          ) : (
            <>
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Desconectado
              </Badge>
              <p className="text-xs text-muted-foreground">
                O agente de impressão (QZ Tray) não está rodando no computador.
                Instale e abra o programa para conectar suas impressoras.
              </p>
              <Button asChild variant="default" size="sm" className="w-full gap-2">
                <a href="https://qz.io/download/" target="_blank" rel="noopener">
                  <Download className="h-3.5 w-3.5" /> Baixar agente
                </a>
              </Button>
            </>
          )}

          <Button onClick={check} disabled={checking} variant="outline" size="sm" className="w-full gap-2">
            {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Verificar novamente
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
