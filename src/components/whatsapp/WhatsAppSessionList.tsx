import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, QrCode, RefreshCw, MessageSquare, AlertCircle, Star, StarOff } from "lucide-react";
import { SkeletonTable } from "@/components/loading";
import { useToast } from "@/components/ui/use-toast";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { UpgradeGate } from "@/components/billing/UpgradeGate";

interface WhatsAppSession {
  id: string;
  session_name: string;
  agent_name: string;
  agent_prompt: string | null;
  is_active: boolean;
  created_at: string;
  connection_status?: 'open' | 'close' | 'connecting' | 'unknown' | 'instance_missing';
  is_primary?: boolean;
  display_name?: string | null;
}

interface WhatsAppSessionListProps {
  sessions: WhatsAppSession[];
  isLoading: boolean;
  loadingStatus: Record<string, boolean>;
  onAddNew: () => void;
  onEdit: (session: WhatsAppSession) => void;
  onDelete: (id: string) => void;
  onConnect: (sessionName: string) => void;
  onCheckStatus: (sessionName: string) => void;
}

export function WhatsAppSessionList({
  sessions,
  isLoading,
  loadingStatus,
  onAddNew,
  onEdit,
  onDelete,
  onConnect,
  onCheckStatus,
}: WhatsAppSessionListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasExtra } = usePlanFeatures();
  const canMultiSession = hasExtra("multi_session");

  // Promove sessão a primária (RPC rebalanceia constraint unique)
  const setPrimaryMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.rpc("set_primary_whatsapp_session" as any, { p_session_id: sessionId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({ title: "Sessão principal alterada ✓", description: "Envios agora usam essa sessão." });
    },
    onError: (err: any) => toast({ title: "Erro", description: err?.message, variant: "destructive" }),
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Conectado</Badge>;
      case 'close':
        return <Badge variant="destructive">Desconectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary">Conectando...</Badge>;
      case 'instance_missing':
        // Bot detectou que instância sumiu no Evolution (provavelmente deletada
        // ou WhatsApp foi desconectado). Reconectar = recriar instância via QR.
        return <Badge variant="destructive" className="bg-amber-600">Instância removida — reconecte</Badge>;
      default:
        return <Badge variant="outline">Verificando...</Badge>;
    }
  };

  // Permite criar 2ª+ sessão apenas se plano permite multi-sessão
  const hasMultipleSessions = sessions.length >= 1;
  const blockAddMore = hasMultipleSessions && !canMultiSession;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sessões Configuradas</CardTitle>
            <CardDescription>
              Gerencie as sessões do WhatsApp da sua empresa
              {canMultiSession && sessions.length > 1 && (
                <span className="ml-1">— sessão com ⭐ é a padrão de envio</span>
              )}
            </CardDescription>
          </div>
          {sessions.length > 0 && (
            blockAddMore ? (
              <UpgradeGate feature="multi_session" compact>
                <Button onClick={onAddNew} size="sm">+ Adicionar</Button>
              </UpgradeGate>
            ) : (
              <Button onClick={onAddNew} size="sm">+ Adicionar sessão</Button>
            )
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <SkeletonTable rows={3} cols={5} />
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma sessão configurada.</p>
            <Button onClick={onAddNew} className="mt-4">
              Adicionar Primeira Sessão
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Sessão</TableHead>
                <TableHead>Nome do Agente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {session.is_primary && (
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" aria-label="Principal" />
                      )}
                      <div>
                        <div>{session.display_name || session.session_name}</div>
                        {session.display_name && (
                          <div className="text-xs text-muted-foreground">{session.session_name}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{session.agent_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(session.connection_status)}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCheckStatus(session.session_name)}
                        disabled={loadingStatus[session.session_name]}
                      >
                        <RefreshCw className={`h-4 w-4 ${loadingStatus[session.session_name] ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      {/* Tornar principal — só aparece em sessões secundárias quando plano permite */}
                      {!session.is_primary && canMultiSession && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPrimaryMutation.mutate(session.id)}
                          disabled={setPrimaryMutation.isPending}
                          title="Tornar sessão principal"
                        >
                          <StarOff className="h-4 w-4" />
                        </Button>
                      )}
                      {session.connection_status !== 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onConnect(session.session_name)}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          Conectar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(session)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(session.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}