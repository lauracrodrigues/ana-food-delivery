// v1.0.0 — Modal Relatórios: histórico do período + CSV + PDF + envio WhatsApp
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Send, FileSpreadsheet } from "lucide-react";
import { formatCurrency } from "@/lib/currency-formatter";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "./types";

// Tradução de status pra exibição no relatório (PT-BR)
const STATUS_PT: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready: "Pronto",
  delivering: "Em entrega",
  completed: "Concluído",
  cancelled: "Cancelado",
  cancelado: "Cancelado",
  scheduled: "Agendado",
  awaiting_payment: "Aguardando pagamento",
  archived: "Arquivado",
};
const statusPT = (s?: string) => (s ? STATUS_PT[s] || s : "—");

interface OrdersReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: Order[];
  periodLabel: string;
  companyId: string | null;
  companyName?: string | null;
  onExportCSV: () => void;
}

export function OrdersReportDialog({
  open, onOpenChange, orders, periodLabel, companyId, companyName, onExportCSV,
}: OrdersReportDialogProps) {
  const { toast } = useToast();
  const [waPhone, setWaPhone] = useState("");
  const [sending, setSending] = useState(false);

  const totalGeral = orders.reduce((s, o) => s + (Number((o as any).total) || 0), 0);
  const dataLabel = new Date().toLocaleDateString("pt-BR");

  // Gera PDF e retorna Blob
  const buildPDF = (): Blob => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(companyName || "Relatório de Pedidos", 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${periodLabel} — Gerado em ${dataLabel}`, 14, 26);
    doc.text(`Total de pedidos: ${orders.length}    Faturamento: ${formatCurrency(totalGeral)}`, 14, 32);

    const body = orders.map(o => [
      (o as any).order_number || "—",
      (o as any).customer_name || "—",
      statusPT((o as any).status),
      (o as any).payment_method || "—",
      formatCurrency(Number((o as any).total) || 0),
      new Date((o as any).created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    ]);

    autoTable(doc, {
      head: [["#", "Cliente", "Status", "Pagamento", "Total", "Criado"]],
      body,
      startY: 38,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] }, // orange-500
    });

    return doc.output("blob");
  };

  const handleDownloadPDF = () => {
    if (orders.length === 0) return;
    const blob = buildPDF();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_pedidos_${dataLabel.replace(/\//g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "PDF baixado ✓" });
  };

  const handleSendWhatsApp = async () => {
    const phone = waPhone.replace(/\D/g, "");
    if (phone.length < 10) {
      toast({ title: "Número inválido", description: "Use formato com DDD (ex: 62999998888)", variant: "destructive" });
      return;
    }
    if (!companyId || orders.length === 0) return;

    setSending(true);
    try {
      // Busca instance ativa pra envio
      const { data: cfg } = await supabase
        .from("whatsapp_config")
        .select("session_name")
        .eq("company_id", companyId)
        .eq("config_type", "session")
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cfg?.session_name) throw new Error("Sem WhatsApp conectado");

      // Resumo texto
      const resumo = orders.slice(0, 30).map(o => {
        const num = (o as any).order_number || "—";
        const cli = (o as any).customer_name || "—";
        const tot = formatCurrency(Number((o as any).total) || 0);
        return `• #${num} ${cli} — ${tot}`;
      }).join("\n");
      const overflow = orders.length > 30 ? `\n_(+${orders.length - 30} pedidos no PDF anexo)_` : "";
      const text = `📊 *Relatório de Pedidos*\n${companyName || ""}\nPeríodo: ${periodLabel}\nData: ${dataLabel}\n\n*${orders.length} pedidos · ${formatCurrency(totalGeral)}*\n\n${resumo}${overflow}`;

      // Envia texto + PDF como anexo via edge function whatsapp-evolution
      const { error: txtErr } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "sendText", instanceName: cfg.session_name, number: phone, message: text },
      });
      if (txtErr) throw txtErr;

      // Anexo PDF (base64)
      const blob = buildPDF();
      const buf = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "sendMedia",
          instanceName: cfg.session_name,
          number: phone,
          mediatype: "document",
          mimetype: "application/pdf",
          media: b64,
          fileName: `relatorio_${dataLabel.replace(/\//g, "-")}.pdf`,
          caption: `Relatório ${periodLabel}`,
        },
      });

      toast({ title: "Relatório enviado ✓", description: `WhatsApp ${phone}` });
      setWaPhone("");
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err?.message || "Falha desconhecida", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatório de Pedidos — {periodLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Resumo topo */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary" className="text-sm">
            {orders.length} pedidos
          </Badge>
          <Badge className="text-sm bg-emerald-500">
            {formatCurrency(totalGeral)}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">Gerado em {dataLabel}</span>
        </div>

        {/* Lista de pedidos */}
        <Card className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <CardContent className="p-0 overflow-y-auto flex-1">
            {orders.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum pedido no período.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Pagamento</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={(o as any).id} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{(o as any).order_number || "—"}</td>
                      <td className="px-3 py-2">{(o as any).customer_name || "—"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs">{statusPT((o as any).status)}</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{(o as any).payment_method || "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatCurrency(Number((o as any).total) || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Ações: CSV / PDF / WhatsApp */}
        <div className="space-y-3 pt-2">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={onExportCSV} disabled={orders.length === 0}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Baixar CSV
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF} disabled={orders.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          </div>

          <div className="flex gap-2 items-end pt-2 border-t">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Enviar relatório por WhatsApp</Label>
              <Input
                type="tel"
                placeholder="62999998888 (com DDD)"
                value={waPhone}
                onChange={e => setWaPhone(e.target.value)}
                disabled={sending}
              />
            </div>
            <Button onClick={handleSendWhatsApp} disabled={sending || !waPhone || orders.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
