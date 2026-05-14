// v1.0.0 — Modal de adição ao carrinho com seleção de complementos
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/currency-formatter";
import { isExtraAvailable } from "@/lib/weekday-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Minus, Image as ImageIcon } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
}

interface ExtraOption {
  id: string;
  name: string;
  price: number;
  available_weekdays: string[] | null;
  available_start_time: string | null;
  available_end_time: string | null;
}

interface Group {
  id: string;
  name: string;
  min_selection: number;
  max_selection: number | null;
  extras: ExtraOption[];
}

export interface SelectedExtra {
  id: string;
  name: string;
  price: number;
  groupId: string;
  groupName: string;
}

interface ProductAddModalProps {
  product: Product | null;
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (extras: SelectedExtra[], quantity: number, observations: string) => void;
}

export function ProductAddModal({
  product,
  companyId,
  open,
  onOpenChange,
  onAddToCart,
}: ProductAddModalProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [observations, setObservations] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open || !product) return;
    setSelections({});
    setObservations("");
    setQuantity(1);
    loadGroups();
  }, [open, product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadGroups = async () => {
    if (!product) return;
    setLoading(true);
    try {
      const { data: links } = await supabase
        .from("product_group_links")
        .select(`
          display_order,
          group:product_groups (
            id, name, min_selection, max_selection,
            group_extras (
              display_order,
              extra:extras (
                id, name, price, on_off,
                available_weekdays, available_start_time, available_end_time
              )
            )
          )
        `)
        .eq("product_id", product.id)
        .order("display_order");

      if (!links || links.length === 0) {
        setGroups([]);
        return;
      }

      const built: Group[] = (links as any[])
        .map((link: any) => {
          const g = link.group;
          const availableExtras = (g.group_extras || [])
            .filter((ge: any) => {
              const e = ge.extra;
              return (
                e.on_off &&
                isExtraAvailable(e.available_weekdays, e.available_start_time, e.available_end_time)
              );
            })
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((ge: any) => ({
              id: ge.extra.id,
              name: ge.extra.name,
              price: ge.extra.price,
              available_weekdays: ge.extra.available_weekdays,
              available_start_time: ge.extra.available_start_time,
              available_end_time: ge.extra.available_end_time,
            }));

          return {
            id: g.id,
            name: g.name,
            min_selection: g.min_selection ?? 0,
            max_selection: g.max_selection ?? null,
            extras: availableExtras,
          };
        })
        .filter((g: Group) => g.extras.length > 0);

      setGroups(built);
    } finally {
      setLoading(false);
    }
  };

  const isRadio = (group: Group) => group.max_selection === 1;

  const toggleExtra = (group: Group, extraId: string) => {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      if (isRadio(group)) {
        return { ...prev, [group.id]: [extraId] };
      }
      if (current.includes(extraId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== extraId) };
      }
      if (group.max_selection !== null && current.length >= group.max_selection) {
        return prev;
      }
      return { ...prev, [group.id]: [...current, extraId] };
    });
  };

  const isValid = groups.every(
    (g) => (selections[g.id] || []).length >= g.min_selection
  );

  const extrasTotal = groups.reduce((sum, group) => {
    return (
      sum +
      (selections[group.id] || []).reduce((gSum, extraId) => {
        const extra = group.extras.find((e) => e.id === extraId);
        return gSum + (extra?.price || 0);
      }, 0)
    );
  }, 0);

  const unitTotal = (product?.price || 0) + extrasTotal;
  const grandTotal = unitTotal * quantity;

  const buildSelectedExtras = (): SelectedExtra[] =>
    groups.flatMap((group) =>
      (selections[group.id] || []).map((extraId) => {
        const extra = group.extras.find((e) => e.id === extraId)!;
        return {
          id: extra.id,
          name: extra.name,
          price: extra.price,
          groupId: group.id,
          groupName: group.name,
        };
      })
    );

  const handleAdd = () => {
    if (!product || !isValid) return;
    onAddToCart(buildSelectedExtras(), quantity, observations);
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 space-y-4 pb-4">
            {/* Imagem */}
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-44 object-cover rounded-lg"
                loading="lazy"
              />
            ) : null}

            {/* Descrição */}
            {product.description && (
              <p className="text-sm text-muted-foreground">{product.description}</p>
            )}

            {/* Preço base */}
            <p className="text-xl font-bold text-primary">{formatCurrency(product.price)}</p>

            {/* Grupos de complementos */}
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              groups.map((group) => {
                const selected = selections[group.id] || [];
                const satisfied = selected.length >= group.min_selection;

                return (
                  <div key={group.id} className="border rounded-lg overflow-hidden">
                    {/* Cabeçalho do grupo */}
                    <div className="bg-muted px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.min_selection > 0 ? "Obrigatório • " : "Opcional • "}
                          {group.max_selection === 1
                            ? "Escolha 1"
                            : group.max_selection
                            ? `Até ${group.max_selection}`
                            : "Escolha quantos quiser"}
                        </p>
                      </div>
                      {group.min_selection > 0 && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            satisfied
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {satisfied ? "OK" : "Obrigatório"}
                        </span>
                      )}
                    </div>

                    {/* Lista de extras */}
                    <div className="divide-y">
                      {isRadio(group) ? (
                        <RadioGroup
                          value={selected[0] || ""}
                          onValueChange={(val) => toggleExtra(group, val)}
                        >
                          {group.extras.map((extra) => (
                            <label
                              key={extra.id}
                              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <RadioGroupItem
                                  value={extra.id}
                                  id={`${group.id}-${extra.id}`}
                                />
                                <span className="text-sm">{extra.name}</span>
                              </div>
                              {extra.price > 0 && (
                                <span className="text-sm font-medium text-primary">
                                  +{formatCurrency(extra.price)}
                                </span>
                              )}
                            </label>
                          ))}
                        </RadioGroup>
                      ) : (
                        group.extras.map((extra) => {
                          const isChecked = selected.includes(extra.id);
                          const maxReached =
                            group.max_selection !== null &&
                            selected.length >= group.max_selection &&
                            !isChecked;
                          return (
                            <label
                              key={extra.id}
                              className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors ${
                                maxReached ? "opacity-40 cursor-not-allowed" : ""
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id={`${group.id}-${extra.id}`}
                                  checked={isChecked}
                                  disabled={maxReached}
                                  onCheckedChange={() =>
                                    !maxReached && toggleExtra(group, extra.id)
                                  }
                                />
                                <span className="text-sm">{extra.name}</span>
                              </div>
                              {extra.price > 0 && (
                                <span className="text-sm font-medium text-primary">
                                  +{formatCurrency(extra.price)}
                                </span>
                              )}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Ex: Sem cebola, molho à parte..."
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Rodapé fixo */}
        <div className="border-t px-4 py-3 bg-background shrink-0">
          <div className="flex items-center gap-3">
            {/* Quantidade */}
            <div className="flex items-center gap-1 bg-muted rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Botão adicionar */}
            <Button
              className="flex-1 font-semibold"
              disabled={!isValid}
              onClick={handleAdd}
            >
              Adicionar • {formatCurrency(grandTotal)}
            </Button>
          </div>

          {!isValid && (
            <p className="text-xs text-destructive mt-1.5 text-center">
              Selecione os itens obrigatórios para continuar
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
