import { formatCurrency } from "@/lib/currency-formatter";
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
import { ProductFullDialog } from "@/components/products/ProductFullDialog"; // v1.0.0 — ficha unificada
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
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
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
  company_id?: string;
}

function SortableProductItem({
  product,
  isDraggable,
  onToggleStatus,
  onEdit,
  onDuplicate,
  onDelete,
  onPriceChange,
}: {
  product: Product;
  isDraggable: boolean;
  onToggleStatus: (id: string, status: boolean) => void;
  onEdit: (product: Product) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPriceChange: (id: string, price: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState(product.price.toString());

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handlePriceBlur = () => {
    const newPrice = parseFloat(priceValue);
    if (!isNaN(newPrice) && newPrice !== product.price) {
      onPriceChange(product.id, newPrice);
    }
    setEditingPrice(false);
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-30" : ""}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50">
          <div
            {...(isDraggable ? { ...attributes, ...listeners } : {})}
            className={isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-30"}
            title={isDraggable ? "Arrastar para reordenar" : "Selecione 'Personalizada' para reordenar"}
          >
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
                {formatCurrency(product.price)}
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
  // v1.0.1 — sort por categoria: default segue categories.sort_mode quando muda
  const [sortOrder, setSortOrder] = useState<"custom" | "name" | "price_asc" | "price_desc" | "newest">("custom");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const itemsPerPage = 20;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
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

  // v1.0.1 — Busca sort_mode da categoria selecionada pra default do sort
  const { data: selectedCategory } = useQuery({
    queryKey: ["category-sort", selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return null;
      const { data } = await supabase
        .from("categories")
        .select("sort_mode")
        .eq("id", selectedCategoryId)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedCategoryId,
  });

  // Map categories.sort_mode → sortOrder local
  const SORT_MAP: Record<string, "custom" | "name" | "price_asc" | "price_desc" | "newest"> = {
    manual: "custom",
    alphabetical: "name",
    price_asc: "price_asc",
    price_desc: "price_desc",
    newest: "newest",
  };

  // Reset sortOrder quando muda categoria — respeita sort_mode salvo
  useEffect(() => {
    if (selectedCategory?.sort_mode) {
      setSortOrder(SORT_MAP[selectedCategory.sort_mode] ?? "custom");
    } else {
      setSortOrder("custom");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, selectedCategory?.sort_mode]);

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

  // Reorder products — updates paralelos + setQueryData síncrono no handleDragEnd
  const reorderMutation = useMutation({
    mutationFn: async (reorderedProducts: Product[]) => {
      await Promise.all(
        reorderedProducts.map((prod, index) =>
          supabase.from("products").update({ display_order: index }).eq("id", prod.id)
        )
      );
    },
  });

  const handleDragEnd = (event: DragEndEvent, paginatedProds: Product[]) => {
    const { active, over } = event;
    if (!over || active.id === over.id || sortOrder !== "custom") return;

    const oldIndex = paginatedProds.findIndex((p) => p.id === active.id);
    const newIndex = paginatedProds.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedPage = arrayMove(paginatedProds, oldIndex, newIndex);

    // Reconstrói lista completa com itens da página na nova ordem
    const pageIds = new Set(paginatedProds.map(p => p.id));
    let pi = 0;
    const fullReordered = products.map(p =>
      pageIds.has(p.id) ? reorderedPage[pi++] : p
    );

    // setQueryData SÍNCRONO — antes de qualquer await, sem snap-back
    const snapshot = queryClient.getQueryData(["products", companyId, selectedCategoryId]);
    queryClient.setQueryData(["products", companyId, selectedCategoryId], fullReordered);

    reorderMutation.mutate(fullReordered, {
      onError: () => {
        queryClient.setQueryData(["products", companyId, selectedCategoryId], snapshot);
        toast({ title: "Erro ao reordenar produtos", variant: "destructive" });
      },
    });
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

  // Sort products — "custom" mantém ordem do banco (display_order)
  if (sortOrder !== "custom") {
    filteredProducts = [...filteredProducts].sort((a, b) => {
      if (sortOrder === "name") return a.name.localeCompare(b.name);
      if (sortOrder === "price_asc") return a.price - b.price;
      if (sortOrder === "price_desc") return b.price - a.price;
      if (sortOrder === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      return 0;
    });
  }

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

              {/* v1.0.1 — sort_mode default vem da categoria selecionada */}
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Personalizada</SelectItem>
                  <SelectItem value="name">Alfabética</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                  <SelectItem value="newest">Mais recentes</SelectItem>
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
              modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              onDragStart={({ active }: DragStartEvent) => {
                if (sortOrder === "custom") setActiveProductId(String(active.id));
              }}
              onDragEnd={(e) => { setActiveProductId(null); handleDragEnd(e, paginatedProducts); }}
              onDragCancel={() => setActiveProductId(null)}
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
                      isDraggable={sortOrder === "custom"}
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

              {/* Clone flutuante do produto durante drag */}
              <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                {activeProductId ? (() => {
                  const prod = products.find(p => p.id === activeProductId);
                  return prod ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-background shadow-lg">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{prod.name}</p>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {formatCurrency(prod.price)}
                      </span>
                    </div>
                  ) : null;
                })() : null}
              </DragOverlay>
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
                    let pageNum: number;
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
        <ProductFullDialog
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
