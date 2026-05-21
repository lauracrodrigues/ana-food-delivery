// v1.0.0 — Painel agentes "Ana Food Print" pareados com a loja
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Plus, Trash2, Copy, Download, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

const API_BASE = "https://api.anafood.vip";

interface Device {
  id: string;
  device_name: string;
  platform: string;
  hostname: string;
  app_version: string;
  paired_at: string;
  last_seen_at: string | null;
  status: "online" | "offline" | "error";
  last_error: string | null;
  enabled: boolean;
}

export function PrinterDevicesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeExpires, setCodeExpires] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");

  const { data: devices = [], isLoading } = useQuery<Device[]>({
    queryKey: ["printer-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("printer_devices")
        .select("*")
        .order("paired_at", { ascending: false });
      if (error) throw error;
      return data as Device[];
    },
    refetchInterval: 10_000, // polling 10s pra status realtime
  });

  const generateCode = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/print/codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ device_name: deviceName || undefined }),
      });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      setCodeExpires(data.expires_at);
    },
    onError: (e: any) => toast({ title: "Erro ao gerar código", description: e.message, variant: "destructive" }),
  });

  const removeDevice = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/print/devices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printer-devices"] });
      toast({ title: "Impressora removida" });
    },
  });

  const testPrint = useMutation({
    mutationFn: async (deviceId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/print/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ device_id: deviceId, sector: "caixa" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => toast({ title: "Teste enviado", description: "Verifique a impressora" }),
    onError: (e: any) => toast({ title: "Falha", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">🖨️ Ana Food Print — Computadores</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Cada computador da loja roda o agente e pode ter várias impressoras conectadas (caixa, cozinha, bar)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/agente/download" target="_blank" rel="noopener" className="gap-1">
                <Download className="h-3.5 w-3.5" /> Baixar agente
              </a>
            </Button>
            <Button size="sm" onClick={() => setShowCodeDialog(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Conectar computador
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin mx-auto" />
        ) : devices.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhum computador conectado. Baixe e instale o Ana Food Print pra começar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Conectado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{d.device_name || d.hostname || "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{d.id.slice(0, 8)}</div>
                  </TableCell>
                  <TableCell className="text-xs">{d.platform || "—"}</TableCell>
                  <TableCell className="text-xs">{d.app_version || "—"}</TableCell>
                  <TableCell className="text-xs">{new Date(d.paired_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    {d.status === "online" ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Online
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <XCircle className="h-3 w-3 text-muted-foreground" /> Offline
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => testPrint.mutate(d.id)} disabled={d.status !== "online"} title="Teste de impressão">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Remover "${d.device_name}"?`)) removeDevice.mutate(d.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog gerar código */}
      <Dialog open={showCodeDialog} onOpenChange={(v) => { setShowCodeDialog(v); if (!v) { setGeneratedCode(null); setDeviceName(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conectar computador</DialogTitle>
          </DialogHeader>

          {!generatedCode ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                1️⃣ Abra o aplicativo <b>Ana Food Print</b> no computador<br />
                2️⃣ Vou gerar um código de 6 dígitos<br />
                3️⃣ Digite o código no aplicativo<br />
                4️⃣ As impressoras (caixa, cozinha, bar) são configuradas no próprio app
              </p>
              <div>
                <Label className="text-xs">Apelido do computador (opcional)</Label>
                <Input
                  placeholder="Ex: PC do caixa, Notebook da cozinha"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Identifica este computador — útil quando você tem mais de um
                </p>
              </div>
              <Button onClick={() => generateCode.mutate()} disabled={generateCode.isPending} className="w-full">
                {generateCode.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Gerar código
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm">Digite este código no Ana Food Print:</p>
              <div className="bg-muted rounded-lg p-6">
                <div className="text-5xl font-mono font-bold tracking-widest">{generatedCode}</div>
                <Button variant="ghost" size="sm" className="mt-2 gap-1" onClick={() => navigator.clipboard.writeText(generatedCode)}>
                  <Copy className="h-3 w-3" /> Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Válido por 5 minutos. Após pareado, aparece na lista acima.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCodeDialog(false); setGeneratedCode(null); setDeviceName(""); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
