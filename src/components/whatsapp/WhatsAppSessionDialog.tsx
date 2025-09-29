import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SessionForm {
  session_name: string;
  agent_name: string;
  agent_prompt: string;
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
            {isEditing ? 
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
              onChange={(e) => onFormChange({ ...formData, session_name: e.target.value })}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="agent_name">Nome do Agente *</Label>
            <Input
              id="agent_name"
              placeholder="Ex: Assistente Virtual"
              value={formData.agent_name}
              onChange={(e) => onFormChange({ ...formData, agent_name: e.target.value })}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="agent_prompt">Prompt do Agente</Label>
            <Textarea
              id="agent_prompt"
              placeholder="Defina o comportamento e personalidade do agente..."
              value={formData.agent_prompt}
              onChange={(e) => onFormChange({ ...formData, agent_prompt: e.target.value })}
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onSave}>
            {isEditing ? "Salvar Alterações" : "Adicionar Sessão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}