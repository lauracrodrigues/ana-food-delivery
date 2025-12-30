import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Calendar, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LastOrderItem {
  product_id?: string;
  name: string;
  quantity: number;
  extras?: Array<{ extra_id?: string; name: string }>;
  observations?: string;
}

interface LastOrderData {
  order_number?: string;
  type?: string;
  payment_method?: string;
  observations?: string;
  items?: LastOrderItem[];
  delivery_address?: {
    address?: string;
    address_number?: string;
    address_complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
}

interface Customer {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  address_number?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  last_order_id?: string;
  last_order_data?: LastOrderData;
  last_order_at?: string;
  total_orders?: number;
  created_at?: string;
}

const formatAddress = (customer: Customer) => {
  const parts = [];
  if (customer.address) parts.push(customer.address);
  if (customer.address_number) parts.push(customer.address_number);
  if (customer.address_complement) parts.push(customer.address_complement);
  
  let formatted = parts.join(', ');
  
  if (customer.neighborhood) formatted += ` - ${customer.neighborhood}`;
  if (customer.city) {
    formatted += `, ${customer.city}`;
    if (customer.state) formatted += `/${customer.state}`;
  }
  
  return formatted || '-';
};

const formatLastOrderDate = (dateString?: string) => {
  if (!dateString) return null;
  try {
    return format(new Date(dateString), "dd/MM/yy", { locale: ptBR });
  } catch {
    return null;
  }
};

export function Customers() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    phone: "",
    email: "",
    address: "",
    address_number: "",
    address_complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    notes: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();

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

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", profile?.company_id, isAdmin],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!profile?.company_id,
  });

  // Create/Update customer
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      if (!profile?.company_id) throw new Error("Company ID not found");
      
      const customerData = {
        name: data.name || '',
        phone: data.phone || '',
        email: data.email,
        address: data.address,
        address_number: data.address_number,
        address_complement: data.address_complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        zip_code: data.zip_code,
        notes: data.notes,
      };
      
      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingCustomer.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customers")
          .insert([{ ...customerData, company_id: profile.company_id }]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: editingCustomer ? "Cliente atualizado" : "Cliente cadastrado",
        description: "Operação realizada com sucesso.",
      });
      handleCloseModal();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete customer
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({
        title: "Cliente excluído",
        description: "Cliente removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        address_number: "",
        address_complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: "",
        notes: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      address_number: "",
      address_complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip_code: "",
      notes: "",
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(formData);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(search.toLowerCase()) ||
    customer.phone.includes(search) ||
    customer.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Clientes</CardTitle>
            {isAdmin && (
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome, telefone ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Último Pedido</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        customer.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {customer.email}
                          </div>
                        )
                      ) : (
                        <span className="text-muted-foreground">***@***.com</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        <div className="flex items-center gap-1 max-w-[200px]">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate" title={formatAddress(customer)}>
                            {formatAddress(customer)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">***</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.last_order_at ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatLastOrderDate(customer.last_order_at)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ShoppingBag className="h-3 w-3 text-muted-foreground" />
                        {customer.total_orders || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isAdmin ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(customer)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Deseja realmente excluir este cliente?")) {
                                deleteMutation.mutate(customer.id);
                              }
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Sem permissão
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer 
                ? "Atualize as informações do cliente." 
                : "Preencha os dados para cadastrar um novo cliente."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Seção: Informações Básicas */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Informações Básicas</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@exemplo.com"
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Seção: Endereço */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Endereço</h4>
              
              <div className="grid grid-cols-[1fr_120px] gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Rua</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Ex: Rua das Flores"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address_number">Número</Label>
                  <Input
                    id="address_number"
                    value={formData.address_number}
                    onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                    placeholder="123"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address_complement">Complemento</Label>
                  <Input
                    id="address_complement"
                    value={formData.address_complement}
                    onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                    placeholder="Apto 45, Bloco B"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Centro"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-[1fr_80px_120px] gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    maxLength={2}
                    placeholder="SP"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Observações sobre o cliente..."
              />
            </div>
            
            {/* Histórico - somente leitura ao editar */}
            {editingCustomer && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Histórico</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Último pedido</div>
                    <div className="font-medium">
                      {editingCustomer.last_order_at ? (
                        <>
                          {editingCustomer.last_order_data?.order_number && (
                            <span className="text-primary">#{editingCustomer.last_order_data.order_number}</span>
                          )}{' '}
                          em {formatLastOrderDate(editingCustomer.last_order_at)}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Nunca pediu</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Total de pedidos</div>
                    <div className="font-medium">{editingCustomer.total_orders || 0}</div>
                  </div>
                </div>
                
                {editingCustomer.last_order_data?.items && editingCustomer.last_order_data.items.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-2">Itens do último pedido</div>
                    <ul className="text-sm space-y-1">
                      {editingCustomer.last_order_data.items.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="font-medium">{item.quantity}x</span>
                          <span>{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCustomer ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}