import { useState, useEffect } from "react";
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
import { Plus, MoreVertical, GripVertical, Search, ChevronRight, ChevronDown, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductEditDialog } from "./ProductEditDialog";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuProductsListProps {
  companyId?: string;
  selectedCategoryId: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  on_off: boolean;
  display_order: number;
  category_id: string | null;
}

function SortableProductItem({
  product,
  onToggleStatus,
  onEdit,
  onDuplicate,
  onDelete,
  onPriceChange,
}: {
  product: Product;
  onToggleStatus: (id: string, status: boolean) => void;
  onEdit: (product: Product) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPriceChange: (id: string, price: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(product.price.toString());

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const handlePriceBlur = () => {
    const newPrice = parseFloat(priceValue);
    if (!isNaN(newPrice) && newPrice !== product.price) {
      onPriceChange(product.id, newPrice);
    }
    setEditingPrice(false);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{product.name}</p>
          </div>

          <div className="flex items-center gap-2">
            {editingPrice ? (
              <Input
                type="number"
                step="0.01"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                onBlur={handlePriceBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePriceBlur();
                  if (e.key === "Escape") {
                    setPriceValue(product.price.toString());
                    setEditingPrice(false);
                  }
                }}
                className="w-24 h-8"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingPrice(true);
                }}
                className="text-sm font-medium px-3 py-1.5 rounded bg-muted hover:bg-muted/80 transition-colors"
              >
                R$ {product.price.toFixed(2)}
              </button>
            )}

            <Switch
              checked={product.on_off}
              onCheckedChange={(checked) => onToggleStatus(product.id, checked)}
              onClick={(e) => e.stopPropagation()}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  Editar produto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(product.id)}>
                  Duplicar produto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(product.id)}>
                  Excluir produto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="pl-6 pt-2">
          <div className="p-3 border-l-2 border-border ml-2 text-sm text-muted-foreground">
            Agrupamentos de adicionais serão exibidos aqui
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function MenuProductsList({
  companyId,
  selectedCategoryId,
}: MenuProductsListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortOrder, setSortOrder] = useState<"name" | "price_asc" | "price_desc">("name");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", companyId, selectedCategoryId],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .order("display_order", { ascending: true });

      if (selectedCategoryId) {
        query = query.eq("category_id", selectedCategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Toggle status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ on_off: status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // Update price
  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from("products")
        .update({ price })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Preço atualizado com sucesso!" });
    },
  });

  // Delete product
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto excluído com sucesso!" });
    },
  });

  // Duplicate product
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const { id: _, created_at, ...productData } = product;
      const maxOrder = Math.max(...products.map((p) => p.display_order), -1);

      const { error } = await supabase.from("products").insert({
        ...productData,
        name: `${product.name} (cópia)`,
        display_order: maxOrder + 1,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto duplicado com sucesso!" });
    },
  });

  // Reorder products
  const reorderMutation = useMutation({
    mutationFn: async (reorderedProducts: Product[]) => {
      const updates = reorderedProducts.map((prod, index) => ({
        id: prod.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("products")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = products.findIndex((p) => p.id === active.id);
      const newIndex = products.findIndex((p) => p.id === over.id);

      const reordered = arrayMove(products, oldIndex, newIndex);
      reorderMutation.mutate(reordered);
    }
  };

  let filteredProducts = products.filter((prod) =>
    prod.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter by status
  if (filterStatus === "active") {
    filteredProducts = filteredProducts.filter((prod) => prod.on_off);
  } else if (filterStatus === "inactive") {
    filteredProducts = filteredProducts.filter((prod) => !prod.on_off);
  }

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    if (sortOrder === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortOrder === "price_asc") {
      return a.price - b.price;
    } else if (sortOrder === "price_desc") {
      return b.price - a.price;
    }
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortOrder, selectedCategoryId]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategoryId ? "Produtos" : "Todos os Produtos"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Alfabética</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedCategoryId
                ? "Nenhum produto nesta categoria"
                : "Nenhum produto encontrado"}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={paginatedProducts.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {paginatedProducts.map((product) => (
                    <SortableProductItem
                      key={product.id}
                      product={product}
                      onToggleStatus={(id, status) => toggleStatusMutation.mutate({ id, status })}
                      onEdit={setEditingProduct}
                      onDuplicate={duplicateMutation.mutate}
                      onDelete={deleteMutation.mutate}
                      onPriceChange={(id, price) =>
                        updatePriceMutation.mutate({ id, price })
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(editingProduct || isCreateDialogOpen) && (
        <ProductEditDialog
          product={editingProduct}
          companyId={companyId}
          defaultCategoryId={selectedCategoryId}
          open={!!editingProduct || isCreateDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditingProduct(null);
              setIsCreateDialogOpen(false);
            }
          }}
        />
      )}
    </>
  );
}
