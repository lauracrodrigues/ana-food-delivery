import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/use-user-role";
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Calendar, ShoppingBag, Home, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerAddress {
  label: string;
  is_default: boolean;
  address: string;
  address_number: string;
  address_complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code?: string;
}

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
  addresses: CustomerAddress[];
  notes?: string;
  last_order_id?: string;
  last_order_data?: LastOrderData;
  last_order_at?: string;
  total_orders?: number;
  created_at?: string;
}

const emptyAddress: CustomerAddress = {
  label: "Casa",
  is_default: true,
  address: "",
  address_number: "",
  address_complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zip_code: "",
};

const formatPrimaryAddress = (customer: Customer) => {
  const addresses = customer.addresses || [];
  const addr = addresses.find(a => a.is_default) || addresses[0];
  
  if (!addr) return '-';
  
  const parts = [addr.address, addr.address_number].filter(Boolean);
  let formatted = parts.join(', ');
  if (addr.neighborhood) formatted += ` - ${addr.neighborhood}`;
  if (addr.city) {
    formatted += `, ${addr.city}`;
    if (addr.state) formatted += `/${addr.state}`;
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
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [addresses, setAddresses] = useState<CustomerAddress[]>([{ ...emptyAddress }]);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);

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
      
      // Parse addresses from JSONB - cast to unknown first for type safety
      return (data || []).map(customer => ({
        ...customer,
        addresses: Array.isArray(customer.addresses) 
          ? (customer.addresses as unknown as CustomerAddress[]) 
          : [],
      })) as unknown as Customer[];
    },
    enabled: !!profile?.company_id,
  });

  // Create/Update customer
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error("Company ID not found");
      
      // Ensure at least one address is marked as default
      const cleanedAddresses = addresses.filter(a => a.address || a.neighborhood);
      if (cleanedAddresses.length > 0 && !cleanedAddresses.some(a => a.is_default)) {
        cleanedAddresses[0].is_default = true;
      }
      
      // Cast addresses to Json for Supabase compatibility
      const customerData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        notes: formData.notes || null,
        addresses: cleanedAddresses as unknown as Json,
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
      setFormData({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || "",
        notes: customer.notes || "",
      });
      setAddresses(customer.addresses?.length > 0 ? customer.addresses : [{ ...emptyAddress }]);
    } else {
      setEditingCustomer(null);
      setFormData({ name: "", phone: "", email: "", notes: "" });
      setAddresses([{ ...emptyAddress }]);
    }
    setEditingAddressIndex(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: "", phone: "", email: "", notes: "" });
    setAddresses([{ ...emptyAddress }]);
    setEditingAddressIndex(null);
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
    
    saveMutation.mutate();
  };

  const handleAddAddress = () => {
    const newAddress: CustomerAddress = {
      ...emptyAddress,
      label: `Endereço ${addresses.length + 1}`,
      is_default: addresses.length === 0,
    };
    setAddresses([...addresses, newAddress]);
    setEditingAddressIndex(addresses.length);
  };

  const handleRemoveAddress = (index: number) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    // If removed address was default, set first as default
    if (addresses[index].is_default && newAddresses.length > 0) {
      newAddresses[0].is_default = true;
    }
    setAddresses(newAddresses);
    setEditingAddressIndex(null);
  };

  const handleSetDefault = (index: number) => {
    const newAddresses = addresses.map((addr, i) => ({
      ...addr,
      is_default: i === index,
    }));
    setAddresses(newAddresses);
  };

  const updateAddress = (index: number, field: keyof CustomerAddress, value: string | boolean) => {
    const newAddresses = [...addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setAddresses(newAddresses);
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
                          <span className="truncate" title={formatPrimaryAddress(customer)}>
                            {formatPrimaryAddress(customer)}
                          </span>
                          {customer.addresses?.length > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (+{customer.addresses.length - 1})
                            </span>
                          )}
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
            
            {/* Seção: Endereços */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Endereços</h4>
                <Button type="button" variant="outline" size="sm" onClick={handleAddAddress}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              {addresses.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-lg">
                  Nenhum endereço cadastrado
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 space-y-3 transition-colors ${
                        editingAddressIndex === index ? 'border-primary bg-muted/30' : ''
                      }`}
                    >
                      {/* Header do endereço */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {addr.label.toLowerCase().includes('trabalho') ? (
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Home className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Input
                            value={addr.label}
                            onChange={(e) => updateAddress(index, 'label', e.target.value)}
                            className="h-7 w-32 text-sm font-medium"
                            placeholder="Ex: Casa"
                          />
                          {addr.is_default && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Padrão
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!addr.is_default && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(index)}
                              className="text-xs"
                            >
                              Definir padrão
                            </Button>
                          )}
                          {editingAddressIndex === index ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingAddressIndex(null)}
                            >
                              Fechar
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingAddressIndex(index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {addresses.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAddress(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Preview do endereço (quando não está editando) */}
                      {editingAddressIndex !== index && (addr.address || addr.neighborhood) && (
                        <div className="text-sm text-muted-foreground pl-6">
                          {[addr.address, addr.address_number].filter(Boolean).join(', ')}
                          {addr.neighborhood && ` - ${addr.neighborhood}`}
                          {addr.city && `, ${addr.city}`}
                          {addr.state && `/${addr.state}`}
                        </div>
                      )}

                      {/* Formulário de edição do endereço */}
                      {editingAddressIndex === index && (
                        <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-[1fr_100px] gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Rua</Label>
                              <Input
                                value={addr.address}
                                onChange={(e) => updateAddress(index, 'address', e.target.value)}
                                placeholder="Ex: Rua das Flores"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Número</Label>
                              <Input
                                value={addr.address_number}
                                onChange={(e) => updateAddress(index, 'address_number', e.target.value)}
                                placeholder="123"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Complemento</Label>
                              <Input
                                value={addr.address_complement || ''}
                                onChange={(e) => updateAddress(index, 'address_complement', e.target.value)}
                                placeholder="Apto 45"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Bairro</Label>
                              <Input
                                value={addr.neighborhood}
                                onChange={(e) => updateAddress(index, 'neighborhood', e.target.value)}
                                placeholder="Centro"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-[1fr_60px_100px] gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Cidade</Label>
                              <Input
                                value={addr.city}
                                onChange={(e) => updateAddress(index, 'city', e.target.value)}
                                placeholder="São Paulo"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">UF</Label>
                              <Input
                                value={addr.state}
                                onChange={(e) => updateAddress(index, 'state', e.target.value.toUpperCase())}
                                maxLength={2}
                                placeholder="SP"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">CEP</Label>
                              <Input
                                value={addr.zip_code || ''}
                                onChange={(e) => updateAddress(index, 'zip_code', e.target.value)}
                                placeholder="00000-000"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Separator />
            
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
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {editingCustomer ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
