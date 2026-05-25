// v1.1.0 — Scanner QR para entregador capturar pedido
// Fixes:
//  - div qr-reader sempre renderizada (pra ref existir antes do start())
//  - Pede permissão de câmera ao clicar (Html5Qrcode.start dispara permission prompt)
//  - Mensagem clara quando user nega permissão
//  - Botão "Tentar novamente" no erro
// Segurança: claim só via /api/deliveries/claim (Bearer token JWT do Supabase)
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScanLine, CheckCircle2, XCircle, Camera } from "lucide-react";

const API_BASE = "https://api.anafood.vip";
const QR_READER_ID = "qr-reader-deliverer";

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

  // v1.1.0 — Start câmera só após dialog renderizar o div (useEffect roda APÓS DOM)
  const startScanner = async () => {
    setStatus("scanning");
    setError("");
    setOrder(null);

    // Aguarda 1 frame pra garantir div renderizou (status mudou pra "scanning")
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const el = document.getElementById(QR_READER_ID);
    if (!el) {
      setStatus("error");
      setError("Container de scan não encontrado. Tente novamente.");
      return;
    }

    try {
      // Cleanup instância anterior se houver
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch (_) { /* noop */ }
        scannerRef.current = null;
      }

      scannerRef.current = new Html5Qrcode(QR_READER_ID);
      await scannerRef.current.start(
        { facingMode: "environment" },                           // câmera traseira
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          try { await scannerRef.current?.stop(); } catch (_) { /* noop */ }
          await handleToken(decodedText);
        },
        () => { /* noop */ } // ignora falhas frame-a-frame
      );
    } catch (err: any) {
      setStatus("error");
      // Mensagens específicas pra permission denial
      const msg = String(err?.message || err || "");
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        setError("Permissão de câmera negada. Vá nas configurações do navegador e libere o acesso à câmera pra este site.");
      } else if (msg.includes("NotFound") || msg.includes("device")) {
        setError("Nenhuma câmera encontrada neste dispositivo.");
      } else if (msg.includes("NotReadable") || msg.includes("in use")) {
        setError("Câmera em uso por outro app. Feche-o e tente novamente.");
      } else if (msg.includes("Secure context") || msg.includes("https")) {
        setError("Acesso à câmera só funciona via HTTPS.");
      } else {
        setError(`Não foi possível abrir a câmera: ${msg}`);
      }
    }
  };

  // Auto-start ao abrir dialog
  useEffect(() => {
    if (open) {
      startScanner();
    } else {
      // Cleanup ao fechar
      if (scannerRef.current) {
        try { scannerRef.current.stop().catch(() => { /* noop */ }); } catch (_) { /* noop */ }
        scannerRef.current = null;
      }
      setStatus("idle");
      setError("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // v1.2.0 — Salva último token tentado pra usar no force-confirm (override)
  const [pendingForceToken, setPendingForceToken] = useState<string | null>(null);
  const [confirmOverride, setConfirmOverride] = useState<{ delivererName: string } | null>(null);

  async function handleToken(raw: string, force: boolean = false) {
    setStatus("claiming");
    let token = raw.trim();
    const urlMatch = token.match(/[a-f0-9]{24}/i);
    if (urlMatch) token = urlMatch[0];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada — faça login.");

      const selectedCompany = localStorage.getItem("anafood-deliverer-company-id");
      const res = await fetch(`${API_BASE}/api/deliveries/claim`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token, companyId: selectedCompany || undefined, force }),
      });
      const data = await res.json();

      // v1.2.0 — already_taken com requires_confirmation: pergunta antes de forçar
      if (res.status === 409 && data.error === 'already_taken' && data.requires_confirmation) {
        setPendingForceToken(token);
        setConfirmOverride({ delivererName: data.current_deliverer_name || 'outro entregador' });
        setStatus("idle");
        return;
      }

      // v1.2.0 — in_route: pedido em rota, bloqueio total
      if (res.status === 409 && data.error === 'in_route') {
        setStatus("error");
        setError(data.detail || "Pedido em rota — não pode mais ser capturado.");
        return;
      }

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

  // v1.2.0 — Confirma override: chama handleToken com force=true
  const confirmTakeover = () => {
    if (!pendingForceToken) return;
    setConfirmOverride(null);
    handleToken(pendingForceToken, true);
    setPendingForceToken(null);
  };
  const cancelTakeover = () => {
    setConfirmOverride(null);
    setPendingForceToken(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v && scannerRef.current) {
        try { scannerRef.current.stop().catch(() => { /* noop */ }); } catch (_) { /* noop */ }
      }
      onOpenChange(v);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Escanear pedido
          </DialogTitle>
        </DialogHeader>

        {/* v1.1.0 — Div sempre montada (oculta com display:none quando não scaneando) */}
        {/* Garante que document.getElementById funcione no start() */}
        <div
          id={QR_READER_ID}
          className="w-full rounded-lg overflow-hidden bg-black"
          style={{ display: status === "scanning" ? "block" : "none", minHeight: status === "scanning" ? 250 : 0 }}
        />

        {status === "scanning" && !confirmOverride && (
          <p className="text-xs text-center text-muted-foreground">
            Aponte a câmera para o QR Code no recibo do pedido
          </p>
        )}

        {/* v1.2.0 — Confirmação de override quando pedido já está com outro entregador */}
        {confirmOverride && (
          <div className="flex flex-col items-center py-4 text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <ScanLine className="h-8 w-8 text-amber-600" />
            </div>
            <p className="font-semibold">Pedido já está com outro entregador</p>
            <p className="text-sm text-muted-foreground">
              Pedido atrelado a <span className="font-semibold">{confirmOverride.delivererName}</span>.
              <br />Quer realmente pegar?
            </p>
            <div className="flex gap-2 w-full pt-2">
              <Button onClick={cancelTakeover} variant="outline" size="sm" className="flex-1">
                Não, cancelar
              </Button>
              <Button onClick={confirmTakeover} variant="default" size="sm" className="flex-1">
                Sim, pegar pra mim
              </Button>
            </div>
          </div>
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
          <div className="flex flex-col items-center py-6 text-center gap-3">
            <XCircle className="h-16 w-16 text-red-500" />
            <p className="font-medium">Não foi possível capturar</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-2 w-full">
              <Button onClick={() => onOpenChange(false)} variant="outline" size="sm" className="flex-1">
                Fechar
              </Button>
              <Button onClick={startScanner} variant="default" size="sm" className="flex-1 gap-1">
                <Camera className="h-4 w-4" />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
