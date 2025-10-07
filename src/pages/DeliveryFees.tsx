import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Edit, Plus, MapPin, Map } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface DeliveryFee {
  id: string;
  company_id: string;
  zone_name: string;
  delivery_fee: number;
  min_order_value?: number;
  max_distance_km?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export function DeliveryFees() {
  const [showModal, setShowModal] = useState(false);
  const [editingFee, setEditingFee] = useState<DeliveryFee | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<'zones' | 'radius'>('zones');
  const [formData, setFormData] = useState<Partial<DeliveryFee>>({
    zone_name: "",
    delivery_fee: 0,
    min_order_value: undefined,
    max_distance_km: undefined,
    is_active: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get company ID and delivery mode from user profile
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const { data, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Get company info including delivery mode
  const { data: company } = useQuery({
    queryKey: ["company", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("delivery_mode")
        .eq("id", profile.company_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  // Update local delivery mode when company data loads
  useState(() => {
    if (company?.delivery_mode) {
      setDeliveryMode(company.delivery_mode as 'zones' | 'radius');
    }
  });

  // Fetch delivery fees
  const { data: fees = [], isLoading } = useQuery({
    queryKey: ["delivery_fees", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      console.log("Fetching delivery fees for company:", profile.company_id);
      const { data, error } = await supabase
        .from("delivery_fees")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("zone_name");
      
      if (error) {
        console.error("Error fetching delivery fees:", error);
        throw error;
      }
      
      console.log("Delivery fees fetched:", data);
      return data as DeliveryFee[];
    },
    enabled: !!profile?.company_id,
  });

  // Create/Update delivery fee
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<DeliveryFee>) => {
      if (!profile?.company_id) throw new Error("Company ID not found");
      
      if (editingFee) {
        const { error } = await supabase
          .from("delivery_fees")
          .update(data)
          .eq("id", editingFee.id);
        
        if (error) throw error;
      } else {
        const newFee = {
          ...data,
          company_id: profile.company_id,
          zone_name: data.zone_name || "",
          delivery_fee: data.delivery_fee || 0,
        };
        const { error } = await supabase
          .from("delivery_fees")
          .insert([newFee]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_fees"] });
      toast({
        title: "Sucesso",
        description: editingFee ? "Taxa atualizada com sucesso" : "Taxa criada com sucesso",
      });
      handleCloseModal();
    },
    onError: (error) => {
      console.error("Error saving delivery fee:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar taxa de entrega",
        variant: "destructive",
      });
    },
  });

  // Delete delivery fee
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("delivery_fees")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_fees"] });
      toast({
        title: "Sucesso",
        description: "Taxa excluída com sucesso",
      });
    },
    onError: (error) => {
      console.error("Error deleting delivery fee:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir taxa de entrega",
        variant: "destructive",
      });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("delivery_fees")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_fees"] });
      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
      });
    },
    onError: (error) => {
      console.error("Error toggling active status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (fee: DeliveryFee) => {
    setEditingFee(fee);
    setFormData({
      zone_name: fee.zone_name,
      delivery_fee: fee.delivery_fee,
      min_order_value: fee.min_order_value,
      max_distance_km: fee.max_distance_km,
      is_active: fee.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta taxa?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFee(null);
    setFormData({
      zone_name: "",
      delivery_fee: 0,
      min_order_value: undefined,
      max_distance_km: undefined,
      is_active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDeliveryModeChange = async (mode: 'zones' | 'radius') => {
    if (!profile?.company_id) return;

    try {
      const { error } = await supabase
        .from('companies')
        .update({ delivery_mode: mode })
        .eq('id', profile.company_id);

      if (error) throw error;

      setDeliveryMode(mode);
      queryClient.invalidateQueries({ queryKey: ["company"] });

      toast({
        title: "Sucesso",
        description: `Modo de cálculo alterado para ${mode === 'zones' ? 'Por Zonas' : 'Por Raio'}`,
      });
    } catch (error) {
      console.error('Error updating delivery mode:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar modo de cálculo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 mb-2">
                <MapPin className="h-5 w-5" />
                Taxas de Entrega
              </CardTitle>
              <CardDescription>
                Configure as taxas de entrega por zona ou raio de distância
              </CardDescription>
              
              {/* Seletor de Modo */}
              <Tabs value={deliveryMode} onValueChange={(v) => handleDeliveryModeChange(v as 'zones' | 'radius')} className="mt-4">
                <TabsList>
                  <TabsTrigger value="zones" className="gap-2">
                    <Map className="h-4 w-4" />
                    Por Zonas/Bairros
                  </TabsTrigger>
                  <TabsTrigger value="radius" className="gap-2">
                    <MapPin className="h-4 w-4" />
                    Por Raio (km)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Taxa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando...</div>
          ) : fees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma taxa de entrega cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zona</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Pedido Mínimo</TableHead>
                  <TableHead>Distância Máx.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.zone_name}</TableCell>
                    <TableCell>R$ {fee.delivery_fee.toFixed(2)}</TableCell>
                    <TableCell>
                      {fee.min_order_value ? `R$ ${fee.min_order_value.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell>
                      {fee.max_distance_km ? `${fee.max_distance_km} km` : "-"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={fee.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: fee.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(fee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(fee.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
              {editingFee ? "Editar Taxa de Entrega" : "Nova Taxa de Entrega"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da taxa de entrega
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="zone_name">
                  {deliveryMode === 'zones' ? 'Nome da Zona/Bairro *' : 'Descrição do Raio *'}
                </Label>
                <Input
                  id="zone_name"
                  value={formData.zone_name}
                  onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                  placeholder={deliveryMode === 'zones' ? 'Ex: Centro, Bairro Sul' : 'Ex: Até 2km, Até 5km'}
                  required
                />
              </div>

              {deliveryMode === 'radius' && (
                <div>
                  <Label htmlFor="max_distance_km">Distância Máxima (km) *</Label>
                  <Input
                    id="max_distance_km"
                    type="number"
                    step="0.1"
                    value={formData.max_distance_km || ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      max_distance_km: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    placeholder="Ex: 2.0, 5.0"
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="delivery_fee">Taxa de Entrega (R$) *</Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  value={formData.delivery_fee}
                  onChange={(e) => setFormData({ ...formData, delivery_fee: parseFloat(e.target.value) })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="min_order_value">Valor Mínimo do Pedido (R$)</Label>
                <Input
                  id="min_order_value"
                  type="number"
                  step="0.01"
                  value={formData.min_order_value || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    min_order_value: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                  placeholder="Opcional"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Taxa ativa</Label>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingFee ? "Salvar Alterações" : "Criar Taxa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}