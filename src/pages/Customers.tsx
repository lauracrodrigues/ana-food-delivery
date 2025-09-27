import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin } from "lucide-react";

interface Customer {
  id: string;
  company_id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  created_at?: string;
}

export function Customers() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: "",
    phone: "",
    email: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    notes: "",
  });

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

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", profile?.company_id],
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
      
      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(data)
          .eq("id", editingCustomer.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customers")
          .insert([{ 
            name: data.name || '', 
            phone: data.phone || '',
            email: data.email,
            address: data.address,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            zip_code: data.zip_code,
            notes: data.notes,
            company_id: profile.company_id 
          }]);
        
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
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-bold">Clientes</CardTitle>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
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
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {customer.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {customer.address}
                          {customer.neighborhood && `, ${customer.neighborhood}`}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenModal(customer)}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCustomer ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}