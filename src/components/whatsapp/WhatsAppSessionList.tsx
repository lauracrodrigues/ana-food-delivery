import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, QrCode, RefreshCw, MessageSquare, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface WhatsAppSession {
  id: string;
  session_name: string;
  agent_name: string;
  agent_prompt: string | null;
  is_active: boolean;
  created_at: string;
  connection_status?: 'open' | 'close' | 'connecting' | 'unknown';
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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-500">Conectado</Badge>;
      case 'close':
        return <Badge variant="destructive">Desconectado</Badge>;
      case 'connecting':
        return <Badge variant="secondary">Conectando...</Badge>;
      default:
        return <Badge variant="outline">Verificando...</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sessões Configuradas</CardTitle>
        <CardDescription>
          Gerencie as sessões do WhatsApp da sua empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Carregando...</p>
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
                <TableHead>Prompt</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.session_name}</TableCell>
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
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {session.agent_prompt ? 
                        (session.agent_prompt.length > 50 ? 
                          session.agent_prompt.substring(0, 50) + "..." : 
                          session.agent_prompt) : 
                        "Sem prompt definido"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
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