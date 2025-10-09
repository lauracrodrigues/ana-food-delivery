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
import { Plus, MoreVertical, GripVertical, Search } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
}

function SortableCategoryItem({
  category,
  isSelected,
  onSelect,
  onToggleStatus,
  onDelete,
}: {
  category: Category;
  isSelected: boolean;
  onSelect: () => void;
  onToggleStatus: (id: string, status: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg border ${
        isSelected ? "border-primary bg-primary/5" : "border-border"
      } cursor-pointer hover:bg-muted/50`}
      onClick={onSelect}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{category.name}</p>
      </div>

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
          <DropdownMenuItem onClick={() => onDelete(category.id)}>
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
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
    mutationFn: async (name: string) => {
      const maxOrder = Math.max(...categories.map((c) => c.display_order), -1);
      const { error } = await supabase.from("categories").insert({
        company_id: companyId,
        name,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Categoria criada com sucesso!" });
      setIsCreateDialogOpen(false);
      setNewCategoryName("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar categoria",
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

  // Reorder categories
  const reorderMutation = useMutation({
    mutationFn: async (reorderedCategories: Category[]) => {
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("categories")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((cat) => cat.id === active.id);
      const newIndex = categories.findIndex((cat) => cat.id === over.id);

      const reordered = arrayMove(categories, oldIndex, newIndex);
      reorderMutation.mutate(reordered);
    }
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
              onDragEnd={handleDragEnd}
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
                    />
                  ))}
                </div>
              </SortableContext>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate(newCategoryName)}
              disabled={!newCategoryName.trim() || createMutation.isPending}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
