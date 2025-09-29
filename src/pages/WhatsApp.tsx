import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit2, Trash2, Plus, Save, X, MessageSquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface WhatsAppSession {
  id: string;
  session_name: string;
  agent_name: string;
  agent_prompt: string | null;
  is_active: boolean;
  created_at: string;
}

interface SessionForm {
  session_name: string;
  agent_name: string;
  agent_prompt: string;
}

export default function WhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<WhatsAppSession | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<SessionForm>({
    session_name: "",
    agent_name: "",
    agent_prompt: "",
  });

  // Load company info
  useEffect(() => {
    async function loadCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.company_id) {
          setCompanyId(profile.company_id);
        }
      }
    }
    loadCompany();
  }, []);

  // Load WhatsApp sessions
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["whatsapp-sessions", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppSession[];
    },
    enabled: !!companyId,
  });

  // Add/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SessionForm & { id?: string }) => {
      if (data.id) {
        // Update existing session
        const { error } = await supabase
          .from('whatsapp_sessions')
          .update({
            session_name: data.session_name,
            agent_name: data.agent_name,
            agent_prompt: data.agent_prompt || null,
          })
          .eq('id', data.id);

        if (error) throw error;
        return { isNew: false, data };
      } else {
        // Add new session
        const { error } = await supabase
          .from('whatsapp_sessions')
          .insert({ 
            company_id: companyId,
            session_name: data.session_name,
            agent_name: data.agent_name,
            agent_prompt: data.agent_prompt || null,
          });

        if (error) throw error;
        return { isNew: true, data };
      }
    },
    onSuccess: async ({ isNew, data }) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: editingSession ? "Sessão atualizada" : "Sessão adicionada",
        description: `A sessão foi ${editingSession ? 'atualizada' : 'adicionada'} com sucesso.`,
      });
      handleCloseDialog();

      // Comunicar com Evolution API apenas para novas sessões
      if (isNew) {
        try {
          const response = await supabase.functions.invoke('whatsapp-evolution', {
            body: {
              sessionName: data.session_name,
              agentName: data.agent_name,
              agentPrompt: data.agent_prompt || '',
            }
          });

          if (response.error) {
            console.error('Erro ao comunicar com Evolution API:', response.error);
            toast({
              title: "Atenção",
              description: "Sessão salva, mas houve erro ao comunicar com Evolution API.",
              variant: "destructive",
            });
          } else {
            console.log('Sucesso ao comunicar com Evolution API:', response.data);
          }
        } catch (error) {
          console.error('Erro ao chamar edge function:', error);
        }
      }
    },
    onError: () => {
      toast({
        title: `Erro ao ${editingSession ? 'atualizar' : 'adicionar'}`,
        description: `Não foi possível ${editingSession ? 'atualizar' : 'adicionar'} a sessão.`,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
      toast({
        title: "Sessão removida",
        description: "A sessão foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a sessão.",
        variant: "destructive",
      });
    },
  });

  const handleOpenAddDialog = () => {
    setFormData({
      session_name: "",
      agent_name: "",
      agent_prompt: "",
    });
    setEditingSession(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (session: WhatsAppSession) => {
    setFormData({
      session_name: session.session_name,
      agent_name: session.agent_name,
      agent_prompt: session.agent_prompt || "",
    });
    setEditingSession(session);
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingSession(null);
    setFormData({
      session_name: "",
      agent_name: "",
      agent_prompt: "",
    });
  };

  const handleSave = () => {
    if (!formData.session_name.trim() || !formData.agent_name.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome da sessão e nome do agente são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingSession) {
      saveMutation.mutate({ ...formData, id: editingSession.id });
    } else {
      saveMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
    setDeleteId(null);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Sessões WhatsApp</h1>
        </div>
        <Button onClick={handleOpenAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sessão
        </Button>
      </div>

      {/* Sessions list */}
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
              <Button onClick={handleOpenAddDialog} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Sessão
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Sessão</TableHead>
                  <TableHead>Nome do Agente</TableHead>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditDialog(session)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteId(session.id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingSession ? "Editar Sessão" : "Nova Sessão WhatsApp"}
            </DialogTitle>
            <DialogDescription>
              {editingSession ? 
                "Atualize as informações da sessão WhatsApp." : 
                "Configure uma nova sessão do WhatsApp para sua empresa."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="session_name">Nome da Sessão *</Label>
              <Input
                id="session_name"
                placeholder="Ex: Atendimento Principal"
                value={formData.session_name}
                onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="agent_name">Nome do Agente *</Label>
              <Input
                id="agent_name"
                placeholder="Ex: Assistente Virtual"
                value={formData.agent_name}
                onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="agent_prompt">Prompt do Agente</Label>
              <Textarea
                id="agent_prompt"
                placeholder="Defina o comportamento e personalidade do agente..."
                value={formData.agent_prompt}
                onChange={(e) => setFormData({ ...formData, agent_prompt: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingSession ? "Salvar Alterações" : "Adicionar Sessão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta sessão do WhatsApp? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}