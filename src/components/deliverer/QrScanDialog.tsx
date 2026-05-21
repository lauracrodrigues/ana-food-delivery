// v1.0.0 — Scanner QR para entregador capturar pedido
// Segurança: claim só via /api/deliveries/claim (Bearer token JWT do Supabase)
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScanLine, CheckCircle2, XCircle } from "lucide-react";

const API_BASE = "https://api.anafood.vip";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClaimed: (order: any) => void;
}

export function QrScanDialog({ open, onOpenChange, onClaimed }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "claiming" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setStatus("scanning");
    setError("");
    setOrder(null);

    const id = "qr-reader";
    const el = document.getElementById(id);
    if (!el) return;

    scannerRef.current = new Html5Qrcode(id);
    scannerRef.current.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      async (decodedText) => {
        // Para scan imediato (anti dupe)
        try { await scannerRef.current?.stop(); } catch (_) {}
        await handleToken(decodedText);
      },
      () => {} // ignora falhas frame-a-frame
    ).catch((err) => {
      setStatus("error");
      setError(`Câmera indisponível: ${err.message || err}`);
    });

    return () => {
      try { scannerRef.current?.stop().catch(() => {}); } catch (_) {}
      scannerRef.current = null;
    };
  }, [open]);

  async function handleToken(raw: string) {
    setStatus("claiming");
    // Extrai token do conteúdo (suporta URL ou token raw)
    let token = raw.trim();
    const urlMatch = token.match(/[a-f0-9]{24}/i);
    if (urlMatch) token = urlMatch[0];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada — faça login.");

      const res = await fetch(`${API_BASE}/api/deliveries/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.detail || data.error || `HTTP ${res.status}`);
        return;
      }

      setOrder(data.order);
      setStatus("success");
      setTimeout(() => {
        onClaimed(data.order);
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Falha ao capturar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { try { scannerRef.current?.stop().catch(() => {}); } catch (_) {} } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Escanear pedido
          </DialogTitle>
        </DialogHeader>

        {status === "scanning" && (
          <>
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden bg-black" />
            <p className="text-xs text-center text-muted-foreground">
              Aponte a câmera para o QR Code no recibo do pedido
            </p>
          </>
        )}

        {status === "claiming" && (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
            <p className="text-sm mt-3">Capturando pedido...</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
            <h2 className="text-xl font-bold mt-3">Pedido capturado!</h2>
            {order && (
              <>
                <p className="text-sm mt-1">Pedido #{order.order_number}</p>
                <p className="text-xs text-muted-foreground">{order.customer_name}</p>
              </>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center py-6 text-center">
            <XCircle className="h-16 w-16 text-red-500" />
            <p className="font-medium mt-2">Não foi possível capturar</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button onClick={() => { setStatus("idle"); onOpenChange(false); }} variant="outline" size="sm" className="mt-4">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
