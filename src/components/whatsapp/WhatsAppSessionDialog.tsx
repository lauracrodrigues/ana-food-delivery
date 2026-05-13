import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SessionForm {
  session_name: string;
  agent_name: string;
  agent_prompt: string; // mantido na interface para compatibilidade com WhatsApp.tsx
}

interface WhatsAppSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: SessionForm;
  onFormChange: (data: SessionForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}

export function WhatsAppSessionDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSave,
  onCancel,
  isEditing,
}: WhatsAppSessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Sessão" : "Nova Sessão WhatsApp"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações da sessão WhatsApp." 
              : "Configure uma nova sessão do WhatsApp para sua empresa."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="session_name">Nome da Sessão *</Label>
            <Input
              id="session_name"
              placeholder="Ex: Atendimento Principal"
              value={formData.session_name}
              onChange={(e) => onFormChange({ ...formData, session_name: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="agent_name">Nome do Agente *</Label>
            <Input
              id="agent_name"
              placeholder="Ex: Assistente Virtual"
              value={formData.agent_name}
              onChange={(e) => onFormChange({ ...formData, agent_name: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Nome que aparecerá nas mensagens enviadas pelo agente
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            {isEditing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}