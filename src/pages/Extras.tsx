import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { WEEKDAYS } from "@/lib/weekday-utils";
import { PageLayout } from "@/components/layout/PageLayout";
import { SkeletonTable } from "@/components/loading";

interface Extra {
  id: string;
  company_id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  on_off?: boolean;
  available_weekdays?: string[] | null;
  available_start_time?: string | null;
  available_end_time?: string | null;
  created_at?: string;
}

export function Extras() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  const emptyForm: Partial<Extra> = {
    name: "",
    price: 0,
    category: "",
    description: "",
    on_off: true,
    available_weekdays: null,
    available_start_time: null,
    available_end_time: null,
  };

  const [formData, setFormData] = useState<Partial<Extra>>(emptyForm);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get company ID from user profile
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      
      return data;
    },
  });

  // Fetch extras
  const { data: extras = [], isLoading } = useQuery({
    queryKey: ["extras", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("extras")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data as Extra[];
    },
    enabled: !!profile?.company_id,
  });

  // Create/Update extra
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Extra>) => {
      if (!profile?.company_id) throw new Error("Company ID not found");
      
      if (editingExtra) {
        const { error } = await supabase
          .from("extras")
          .update(data)
          .eq("id", editingExtra.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("extras")
          .insert([{ 
            name: data.name || '',
            price: data.price || 0,
            category: data.category,
            description: data.description,
            on_off: data.on_off,
            company_id: profile.company_id 
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extras"] });
      toast({
        title: editingExtra ? "Adicional atualizado" : "Adicional cadastrado",
        description: "Operação realizada com sucesso.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar adicional",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete extra
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("extras")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["extras"] });
      toast({
        title: "Adicional excluído",
        description: "Adicional removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir adicional",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenModal = (extra?: Extra) => {
    if (extra) {
      setEditingExtra(extra);
      setFormData(extra);
    } else {
      setEditingExtra(null);
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExtra(null);
    setFormData(emptyForm);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Campo obrigatório",
        description: "Nome é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const filteredExtras = extras.filter(extra =>
    extra.name.toLowerCase().includes(search.toLowerCase()) ||
    extra.category?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <PageLayout
      title="Adicionais"
      actions={
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Adicional
        </Button>
      }
    >
      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar adicionais..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <SkeletonTable rows={6} cols={4} />
          ) : filteredExtras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Nenhum adicional encontrado." : "Nenhum adicional cadastrado."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Disponibilidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExtras.map((extra) => (
                  <TableRow key={extra.id}>
                    <TableCell className="font-medium">{extra.name}</TableCell>
                    <TableCell>
                      {extra.category && (
                        <Badge variant="secondary">{extra.category}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(extra.price)}</TableCell>
                    <TableCell>
                      <Badge variant={extra.on_off ? "default" : "secondary"}>
                        {extra.on_off ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {extra.available_weekdays?.length ? (
                        <Badge variant="outline" className="text-xs">
                          {extra.available_weekdays
                            .map((d) => WEEKDAYS.find((w) => w.value === d)?.short)
                            .join(", ")}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Todos os dias</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(extra)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Deseja realmente excluir este adicional?")) {
                            deleteMutation.mutate(extra.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExtra ? "Editar Adicional" : "Novo Adicional"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Proteínas, Molhos, Queijos..."
              />
            </div>
            
            <div>
              <Label htmlFor="price">Preço</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="on_off">Adicional Ativo</Label>
              <Switch
                id="on_off"
                checked={formData.on_off}
                onCheckedChange={(checked) => setFormData({ ...formData, on_off: checked })}
              />
            </div>

            {/* Dias disponíveis */}
            <div>
              <Label className="mb-1.5 block">Disponível nos dias</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Deixe vazio = disponível todos os dias
              </p>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => {
                  const selected = (formData.available_weekdays || []).includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        const current = formData.available_weekdays || [];
                        const updated = selected
                          ? current.filter((d) => d !== day.value)
                          : [...current, day.value];
                        setFormData({
                          ...formData,
                          available_weekdays: updated.length ? updated : null,
                        });
                      }}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Faixa de horário */}
            <div>
              <Label className="mb-1.5 block">Horário (opcional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start_time" className="text-xs text-muted-foreground">Início</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.available_start_time || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        available_start_time: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="end_time" className="text-xs text-muted-foreground">Fim</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.available_end_time || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        available_end_time: e.target.value || null,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingExtra ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}