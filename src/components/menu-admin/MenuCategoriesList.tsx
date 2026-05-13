import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, MoreVertical, GripVertical, Search, Edit } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

interface MenuCategoriesListProps {
  companyId?: string;
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

interface Category {
  id: string;
  name: string;
  on_off: boolean;
  display_order: number;
  print_sector?: string | null;
  company_id?: string;
}

// Visual do item de categoria (reutilizado no SortableItem e no DragOverlay)
function CategoryItemContent({
  category,
  isSelected,
  onSelect,
  onToggleStatus,
  onDelete,
  onEdit,
  dragHandleProps,
  isOverlay = false,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStatus: (id: string, status: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (category: Category) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isOverlay?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg border ${
        isSelected ? "border-primary bg-primary/5" : "border-border"
      } cursor-pointer hover:bg-muted/50 ${isOverlay ? "shadow-lg bg-background" : ""}`}
      onClick={!isOverlay ? onSelect : undefined}
    >
      <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{category.name}</p>
      </div>
      {!isOverlay && (
        <>
          <Switch
            checked={category.on_off}
            onCheckedChange={(checked) => onToggleStatus(category.id, checked)}
            onClick={(e) => e.stopPropagation()}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(category)}>Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(category.id)}>Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
}

function SortableCategoryItem({
  category,
  isSelected,
  onSelect,
  onToggleStatus,
  onDelete,
  onEdit,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStatus: (id: string, status: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (category: Category) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Ghost placeholder enquanto arrasta — mantém espaço na lista */}
      <div className={isDragging ? "opacity-30" : ""}>
        <CategoryItemContent
          category={category}
          isSelected={isSelected}
          onSelect={onSelect}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onEdit={onEdit}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      </div>
    </div>
  );
}

export function MenuCategoriesList({
  companyId,
  selectedCategoryId,
  onSelectCategory,
}: MenuCategoriesListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryPrintSector, setNewCategoryPrintSector] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // evita drag acidental em clique
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", companyId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Create category
  const createMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(...categories.map((c) => c.display_order), -1);
      const { error } = await supabase.from("categories").insert({
        company_id: companyId,
        name: newCategoryName,
        print_sector: newCategoryPrintSector || null,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Categoria criada com sucesso!" });
      setIsCreateDialogOpen(false);
      setNewCategoryName("");
      setNewCategoryPrintSector("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update category
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCategory) return;
      const { error } = await supabase
        .from("categories")
        .update({
          name: newCategoryName,
          print_sector: newCategoryPrintSector || null,
        })
        .eq("id", editingCategory.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Categoria atualizada com sucesso!" });
      setIsEditDialogOpen(false);
      setEditingCategory(null);
      setNewCategoryName("");
      setNewCategoryPrintSector("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase
        .from("categories")
        .update({ on_off: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if category has products
      const { data: products } = await supabase
        .from("products")
        .select("id")
        .eq("category_id", id)
        .limit(1);

      if (products && products.length > 0) {
        throw new Error("Não é possível excluir uma categoria com produtos atrelados");
      }

      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Categoria excluída com sucesso!" });
      if (selectedCategoryId) {
        onSelectCategory(null);
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder categories — updates paralelos + setQueryData síncrono no handleDragEnd
  const reorderMutation = useMutation({
    mutationFn: async (reorderedCategories: Category[]) => {
      // Promise.all: todos updates em paralelo (~200ms) em vez de sequencial (N*200ms)
      await Promise.all(
        reorderedCategories.map((cat, index) =>
          supabase.from("categories").update({ display_order: index }).eq("id", cat.id)
        )
      );
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredCategories.findIndex((c) => c.id === active.id);
    const newIndex = filteredCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedFiltered = arrayMove(filteredCategories, oldIndex, newIndex);

    // Reconstrói lista completa mantendo itens não filtrados nas posições originais
    const filteredIds = new Set(filteredCategories.map(c => c.id));
    let fi = 0;
    const fullReordered = categories.map(c =>
      filteredIds.has(c.id) ? reorderedFiltered[fi++] : c
    );

    // setQueryData SÍNCRONO — antes de qualquer await, sem snap-back
    const snapshot = queryClient.getQueryData(["categories", companyId]);
    queryClient.setQueryData(["categories", companyId], fullReordered);

    reorderMutation.mutate(fullReordered, {
      onError: () => {
        queryClient.setQueryData(["categories", companyId], snapshot);
        toast({ title: "Erro ao reordenar categorias", variant: "destructive" });
      },
    });
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma categoria encontrada
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragStart={({ active }: DragStartEvent) => setActiveCategoryId(String(active.id))}
              onDragEnd={(event) => { setActiveCategoryId(null); handleDragEnd(event); }}
              onDragCancel={() => setActiveCategoryId(null)}
            >
              <SortableContext
                items={filteredCategories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {filteredCategories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      isSelected={selectedCategoryId === category.id}
                      onSelect={() => onSelectCategory(category.id)}
                      onToggleStatus={(id, status) => toggleStatusMutation.mutate({ id, status })}
                      onDelete={deleteMutation.mutate}
                      onEdit={(cat) => {
                        setEditingCategory(cat);
                        setNewCategoryName(cat.name);
                        setNewCategoryPrintSector(cat.print_sector || "");
                        setIsEditDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Clone flutuante que segue o cursor durante o drag */}
              <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                {activeCategoryId ? (() => {
                  const cat = categories.find(c => c.id === activeCategoryId);
                  return cat ? (
                    <CategoryItemContent
                      category={cat}
                      isSelected={false}
                      isOverlay
                      onSelect={() => {}}
                      onToggleStatus={() => {}}
                      onDelete={() => {}}
                      onEdit={() => {}}
                    />
                  ) : null;
                })() : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria para organizar seus produtos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Categoria</Label>
              <Input
                id="name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Pizzas, Bebidas..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="print_sector">Setor de Impressão</Label>
              <Select
                value={newCategoryPrintSector || "none"}
                onValueChange={(value) => setNewCategoryPrintSector(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (não imprimir)</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="cozinha1">Cozinha 1</SelectItem>
                  <SelectItem value="cozinha2">Cozinha 2</SelectItem>
                  <SelectItem value="bar">Copa/Bar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se o produto tiver setor definido, ele será priorizado
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewCategoryName("");
                setNewCategoryPrintSector("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newCategoryName.trim() || createMutation.isPending}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>
              Atualize as informações da categoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome da Categoria</Label>
              <Input
                id="edit-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Pizzas, Bebidas..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-print_sector">Setor de Impressão</Label>
              <Select
                value={newCategoryPrintSector || "none"}
                onValueChange={(value) => setNewCategoryPrintSector(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um setor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (não imprimir)</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="cozinha1">Cozinha 1</SelectItem>
                  <SelectItem value="cozinha2">Cozinha 2</SelectItem>
                  <SelectItem value="bar">Copa/Bar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se o produto tiver setor definido, ele será priorizado
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingCategory(null);
                setNewCategoryName("");
                setNewCategoryPrintSector("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!newCategoryName.trim() || updateMutation.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
