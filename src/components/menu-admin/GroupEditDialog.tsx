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
import { Plus, Trash2, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
            <Label className="mb-2 block">Adicionais</Label>
            
            {!isEditing && (
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full mb-2">
                    <Search className="h-4 w-4 mr-2" />
                    Pesquisar adicionais
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
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
              <p className="text-xs text-muted-foreground">
                0 = opcional
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
              <p className="text-xs text-muted-foreground">
                Vazio = ilimitado
              </p>
            </div>
          </div>
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
