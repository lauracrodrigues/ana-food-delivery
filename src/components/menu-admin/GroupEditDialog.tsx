import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Search, Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GroupEditDialogProps {
  group?: any;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (groupId: string) => void;
}

export function GroupEditDialog({
  group,
  companyId,
  open,
  onOpenChange,
  onSuccess,
}: GroupEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!group;

  const [formData, setFormData] = useState({
    name: group?.name || "",
    min_selection: group?.min_selection || 0,
    max_selection: group?.max_selection || null,
  });

  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [freeQuantity, setFreeQuantity] = useState(0);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [newExtraForm, setNewExtraForm] = useState({
    name: "",
    price: "",
    description: "",
  });

  // Fetch all extras
  const { data: allExtras = [] } = useQuery({
    queryKey: ["extras", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extras")
        .select("*")
        .eq("company_id", companyId)
        .eq("on_off", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch group extras if editing
  const { data: groupExtras = [] } = useQuery({
    queryKey: ["group-extras", group?.id],
    queryFn: async () => {
      if (!group?.id) return [];
      const { data, error } = await supabase
        .from("group_extras")
        .select(`
          *,
          extra:extras(*)
        `)
        .eq("group_id", group.id)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Create extra mutation
  const createExtraMutation = useMutation({
    mutationFn: async (extraData: typeof newExtraForm) => {
      const { data, error } = await supabase
        .from("extras")
        .insert({
          company_id: companyId,
          name: extraData.name,
          description: extraData.description,
          price: parseFloat(extraData.price),
          on_off: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (newExtra) => {
      queryClient.invalidateQueries({ queryKey: ["extras", companyId] });
      setSelectedExtras([...selectedExtras, newExtra.id]);
      setNewExtraForm({ name: "", price: "", description: "" });
      setIsAddingExtra(false);
      toast({ title: "Adicional criado e adicionado ao grupo!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar adicional", variant: "destructive" });
    },
  });

  // Save group mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      let groupId = group?.id;

      if (isEditing) {
        const { error } = await supabase
          .from("product_groups")
          .update(formData)
          .eq("id", group.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("product_groups")
          .insert({
            ...formData,
            company_id: companyId,
          })
          .select()
          .single();
        if (error) throw error;
        groupId = data.id;
      }

      // Update group extras
      if (!isEditing && selectedExtras.length > 0) {
        const extrasToInsert = selectedExtras.map((extraId, index) => ({
          group_id: groupId,
          extra_id: extraId,
          display_order: index,
        }));

        const { error } = await supabase
          .from("group_extras")
          .insert(extrasToInsert);
        if (error) throw error;
      }

      return groupId;
    },
    onSuccess: (groupId) => {
      queryClient.invalidateQueries({ queryKey: ["product-groups"] });
      queryClient.invalidateQueries({ queryKey: ["group-extras"] });
      toast({
        title: isEditing
          ? "Agrupamento atualizado com sucesso!"
          : "Agrupamento criado com sucesso!",
      });
      onSuccess?.(groupId);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar agrupamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddExtra = (extraId: string) => {
    if (!selectedExtras.includes(extraId)) {
      setSelectedExtras([...selectedExtras, extraId]);
    }
    setSearchOpen(false);
  };

  const handleRemoveExtra = (extraId: string) => {
    setSelectedExtras(selectedExtras.filter((id) => id !== extraId));
  };

  const handleCreateExtra = () => {
    if (!newExtraForm.name || !newExtraForm.price) {
      toast({ title: "Preencha nome e preço", variant: "destructive" });
      return;
    }
    createExtraMutation.mutate(newExtraForm);
  };

  const displayExtras = isEditing
    ? groupExtras
    : selectedExtras
        .map((id) => allExtras.find((e: any) => e.id === id))
        .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Agrupamento" : "Novo Agrupamento"}
          </DialogTitle>
          <DialogDescription>
            Configure os adicionais e regras deste agrupamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Agrupamento</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Molhos, Sabores de Pizza"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base">Adicionais</Label>
              {!isEditing && (
                <div className="flex gap-2">
                  <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Search className="h-4 w-4 mr-2" />
                        Pesquisar
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="end">
                      <Command>
                        <CommandInput placeholder="Buscar adicional..." />
                        <CommandList>
                          <CommandEmpty>Nenhum adicional encontrado.</CommandEmpty>
                          <CommandGroup>
                            {allExtras
                              .filter((e: any) => !selectedExtras.includes(e.id))
                              .map((extra: any) => (
                                <CommandItem
                                  key={extra.id}
                                  onSelect={() => handleAddExtra(extra.id)}
                                >
                                  {extra.name} - R$ {extra.price.toFixed(2)}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsAddingExtra(!isAddingExtra)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Adicional
                  </Button>
                </div>
              )}
            </div>

            {isAddingExtra && !isEditing && (
              <div className="border rounded-lg p-4 mb-4 space-y-3 bg-muted/50">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Nome *</Label>
                    <Input
                      value={newExtraForm.name}
                      onChange={(e) =>
                        setNewExtraForm({ ...newExtraForm, name: e.target.value })
                      }
                      placeholder="Ex: Queijo Extra"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Preço *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newExtraForm.price}
                      onChange={(e) =>
                        setNewExtraForm({ ...newExtraForm, price: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Descrição</Label>
                  <Input
                    value={newExtraForm.description}
                    onChange={(e) =>
                      setNewExtraForm({ ...newExtraForm, description: e.target.value })
                    }
                    placeholder="Descrição opcional"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateExtra} size="sm">
                    Criar e Adicionar
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingExtra(false);
                      setNewExtraForm({ name: "", price: "", description: "" });
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  {!isEditing && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayExtras.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum adicional adicionado
                    </TableCell>
                  </TableRow>
                ) : (
                  displayExtras.map((item: any) => {
                    const extra = isEditing ? item.extra : item;
                    return (
                      <TableRow key={extra.id}>
                        <TableCell>{extra.name}</TableCell>
                        <TableCell>R$ {extra.price.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {extra.internal_code || "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              extra.on_off
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {extra.on_off ? "Ativo" : "Inativo"}
                          </span>
                        </TableCell>
                        {!isEditing && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveExtra(extra.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="free_quantity">Quantidade Gratuita</Label>
              <Input
                id="free_quantity"
                type="number"
                min="0"
                value={freeQuantity}
                onChange={(e) => setFreeQuantity(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Define quantos adicionais são gratuitos. Exemplo: se definir 2, os 2 primeiros adicionais não serão cobrados no pedido.
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min">Quantidade Mínima</Label>
                <Input
                  id="min"
                  type="number"
                  min="0"
                  value={formData.min_selection}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      min_selection: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>0 = opcional, 1+ = obrigatório selecionar essa quantidade</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Quantidade Máxima</Label>
                <Input
                  id="max"
                  type="number"
                  min="0"
                  value={formData.max_selection || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_selection: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="Ilimitado"
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>Vazio = ilimitado, ou defina um número máximo de seleções</span>
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Como funciona:</strong> Configure a quantidade mínima/máxima de adicionais que o cliente deve/pode escolher. 
              Use a quantidade gratuita para oferecer adicionais sem custo até determinado limite.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !formData.name}
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
