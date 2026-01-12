import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Trash2,
  Edit2,
  QrCode,
  Printer,
  MoreVertical,
  Loader2,
  Grid3X3,
  MapPin,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCompanyId } from '@/hooks/useCompanyId';
import QRCode from 'qrcode';

interface TableArea {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface TableData {
  id: string;
  table_number: string;
  name: string | null;
  capacity: number | null;
  area_id: string | null;
  is_active: boolean;
  area_name?: string;
}

export function TablesSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useCompanyId();

  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showAreaDialog, setShowAreaDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [editingArea, setEditingArea] = useState<TableArea | null>(null);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});

  // Form states
  const [tableForm, setTableForm] = useState({
    table_number: '',
    name: '',
    capacity: 4,
    area_id: '',
  });
  const [areaForm, setAreaForm] = useState({ name: '' });
  const [batchForm, setBatchForm] = useState({
    start: 1,
    end: 10,
    area_id: '',
    capacity: 4,
  });

  // Fetch areas
  const { data: areas = [], isLoading: loadingAreas } = useQuery({
    queryKey: ['table-areas', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('table_areas')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order');
      if (error) throw error;
      return data as TableArea[];
    },
    enabled: !!companyId,
  });

  // Fetch tables
  const { data: tables = [], isLoading: loadingTables } = useQuery({
    queryKey: ['tables-settings', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('tables')
        .select('*, table_areas(name)')
        .eq('company_id', companyId)
        .order('table_number');
      if (error) throw error;
      return data.map((t: any) => ({
        ...t,
        area_name: t.table_areas?.name,
      })) as TableData[];
    },
    enabled: !!companyId,
  });

  // Fetch company for subdomain
  const { data: company } = useQuery({
    queryKey: ['company-subdomain', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from('companies')
        .select('subdomain, name')
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Generate QR codes for tables
  useEffect(() => {
    if (company?.subdomain && tables.length > 0) {
      const generateQRCodes = async () => {
        const codes: Record<string, string> = {};
        for (const table of tables) {
          const url = `${window.location.origin}/${company.subdomain}?mesa=${table.table_number}`;
          try {
            codes[table.id] = await QRCode.toDataURL(url, {
              width: 200,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' },
            });
          } catch (err) {
            console.error('Error generating QR code:', err);
          }
        }
        setQrCodes(codes);
      };
      generateQRCodes();
    }
  }, [company?.subdomain, tables]);

  // Create table mutation
  const createTableMutation = useMutation({
    mutationFn: async (data: typeof tableForm) => {
      if (!companyId) throw new Error('Company ID not found');
      const { error } = await supabase.from('tables').insert({
        company_id: companyId,
        table_number: data.table_number,
        name: data.name || null,
        capacity: data.capacity || null,
        area_id: data.area_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-settings'] });
      setShowTableDialog(false);
      setTableForm({ table_number: '', name: '', capacity: 4, area_id: '' });
      toast({ title: 'Mesa criada com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar mesa', description: err.message, variant: 'destructive' });
    },
  });

  // Update table mutation
  const updateTableMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof tableForm) => {
      const { error } = await supabase
        .from('tables')
        .update({
          table_number: data.table_number,
          name: data.name || null,
          capacity: data.capacity || null,
          area_id: data.area_id || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-settings'] });
      setShowTableDialog(false);
      setEditingTable(null);
      toast({ title: 'Mesa atualizada' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar mesa', description: err.message, variant: 'destructive' });
    },
  });

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tables').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-settings'] });
      toast({ title: 'Mesa removida' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover mesa', description: err.message, variant: 'destructive' });
    },
  });

  // Create area mutation
  const createAreaMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!companyId) throw new Error('Company ID not found');
      const { error } = await supabase.from('table_areas').insert({
        company_id: companyId,
        name,
        sort_order: areas.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-areas'] });
      setShowAreaDialog(false);
      setAreaForm({ name: '' });
      toast({ title: 'Área criada' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar área', description: err.message, variant: 'destructive' });
    },
  });

  // Delete area mutation
  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('table_areas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-areas'] });
      toast({ title: 'Área removida' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao remover área', description: err.message, variant: 'destructive' });
    },
  });

  // Batch create tables mutation
  const batchCreateMutation = useMutation({
    mutationFn: async (data: typeof batchForm) => {
      if (!companyId) throw new Error('Company ID not found');
      const tablesToCreate = [];
      for (let i = data.start; i <= data.end; i++) {
        tablesToCreate.push({
          company_id: companyId,
          table_number: String(i),
          capacity: data.capacity,
          area_id: data.area_id || null,
        });
      }
      const { error } = await supabase.from('tables').insert(tablesToCreate);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables-settings'] });
      setShowBatchDialog(false);
      setBatchForm({ start: 1, end: 10, area_id: '', capacity: 4 });
      toast({ title: 'Mesas criadas em lote' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar mesas', description: err.message, variant: 'destructive' });
    },
  });

  const handleEditTable = (table: TableData) => {
    setEditingTable(table);
    setTableForm({
      table_number: table.table_number,
      name: table.name || '',
      capacity: table.capacity || 4,
      area_id: table.area_id || '',
    });
    setShowTableDialog(true);
  };

  const handleSaveTable = () => {
    if (editingTable) {
      updateTableMutation.mutate({ id: editingTable.id, ...tableForm });
    } else {
      createTableMutation.mutate(tableForm);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedTables((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedTables.length === tables.length) {
      setSelectedTables([]);
    } else {
      setSelectedTables(tables.map((t) => t.id));
    }
  };

  const handlePrintQRCodes = () => {
    if (selectedTables.length === 0) {
      toast({ title: 'Selecione ao menos uma mesa', variant: 'destructive' });
      return;
    }
    setShowPrintDialog(true);
  };

  const printSelectedQRCodes = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedTableData = tables.filter((t) => selectedTables.includes(t.id));

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - ${company?.name || 'Mesas'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
          .qr-card { 
            border: 2px solid #000; 
            padding: 20px; 
            text-align: center; 
            break-inside: avoid;
          }
          .qr-card img { max-width: 150px; }
          .table-number { font-size: 24px; font-weight: bold; margin: 10px 0; }
          .company-name { font-size: 14px; color: #666; }
          .instructions { font-size: 12px; color: #888; margin-top: 10px; }
          @media print {
            .grid { grid-template-columns: repeat(3, 1fr); }
          }
        </style>
      </head>
      <body>
        <div class="grid">
          ${selectedTableData
            .map(
              (table) => `
            <div class="qr-card">
              <div class="company-name">${company?.name || ''}</div>
              <div class="table-number">Mesa ${table.table_number}</div>
              <img src="${qrCodes[table.id] || ''}" alt="QR Code Mesa ${table.table_number}" />
              <div class="instructions">Escaneie para fazer seu pedido</div>
            </div>
          `
            )
            .join('')}
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
    setShowPrintDialog(false);
  };

  const isLoading = loadingAreas || loadingTables;

  return (
    <div className="space-y-6">
      {/* Áreas Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Áreas
              </CardTitle>
              <CardDescription>Organize suas mesas por áreas (Salão, Varanda, etc.)</CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAreaDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nova Área
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {areas.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma área cadastrada</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {areas.map((area) => (
                <Badge key={area.id} variant="secondary" className="py-2 px-3 gap-2">
                  {area.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => deleteAreaMutation.mutate(area.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mesas Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Mesas
              </CardTitle>
              <CardDescription>Cadastre e gerencie suas mesas</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintQRCodes}
                disabled={selectedTables.length === 0}
              >
                <Printer className="h-4 w-4 mr-1" /> Imprimir QR ({selectedTables.length})
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowBatchDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Gerar Lote
              </Button>
              <Button size="sm" onClick={() => setShowTableDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Mesa
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Grid3X3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma mesa cadastrada</p>
              <p className="text-sm">Clique em "Nova Mesa" ou "Gerar Lote" para começar</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTables.length === tables.length && tables.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Número</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>QR Code</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tables.map((table) => (
                    <TableRow key={table.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTables.includes(table.id)}
                          onCheckedChange={() => handleToggleSelect(table.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{table.table_number}</TableCell>
                      <TableCell>{table.name || '-'}</TableCell>
                      <TableCell>{table.area_name || '-'}</TableCell>
                      <TableCell>{table.capacity || '-'}</TableCell>
                      <TableCell>
                        {qrCodes[table.id] && (
                          <img
                            src={qrCodes[table.id]}
                            alt={`QR Mesa ${table.table_number}`}
                            className="h-10 w-10"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTable(table)}>
                              <Edit2 className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteTableMutation.mutate(table.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Table Form Dialog */}
      <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Editar Mesa' : 'Nova Mesa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Número *</Label>
                <Input
                  value={tableForm.table_number}
                  onChange={(e) => setTableForm({ ...tableForm, table_number: e.target.value })}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome (opcional)</Label>
                <Input
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                  placeholder="VIP 1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área</Label>
                <Select
                  value={tableForm.area_id}
                  onValueChange={(v) => setTableForm({ ...tableForm, area_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacidade</Label>
                <Input
                  type="number"
                  value={tableForm.capacity}
                  onChange={(e) =>
                    setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 4 })
                  }
                  min={1}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTableDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTable}
              disabled={!tableForm.table_number || createTableMutation.isPending || updateTableMutation.isPending}
            >
              {(createTableMutation.isPending || updateTableMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTable ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Area Form Dialog */}
      <Dialog open={showAreaDialog} onOpenChange={setShowAreaDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Área</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome da Área *</Label>
            <Input
              value={areaForm.name}
              onChange={(e) => setAreaForm({ name: e.target.value })}
              placeholder="Ex: Salão, Varanda, Terraço"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAreaDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createAreaMutation.mutate(areaForm.name)}
              disabled={!areaForm.name || createAreaMutation.isPending}
            >
              {createAreaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Create Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Mesas em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>De (número)</Label>
                <Input
                  type="number"
                  value={batchForm.start}
                  onChange={(e) => setBatchForm({ ...batchForm, start: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Até (número)</Label>
                <Input
                  type="number"
                  value={batchForm.end}
                  onChange={(e) => setBatchForm({ ...batchForm, end: parseInt(e.target.value) || 10 })}
                  min={1}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área</Label>
                <Select
                  value={batchForm.area_id}
                  onValueChange={(v) => setBatchForm({ ...batchForm, area_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacidade</Label>
                <Input
                  type="number"
                  value={batchForm.capacity}
                  onChange={(e) => setBatchForm({ ...batchForm, capacity: parseInt(e.target.value) || 4 })}
                  min={1}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Serão criadas {Math.max(0, batchForm.end - batchForm.start + 1)} mesas
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => batchCreateMutation.mutate(batchForm)}
              disabled={batchForm.end < batchForm.start || batchCreateMutation.isPending}
            >
              {batchCreateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Mesas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Imprimir QR Codes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {selectedTables.length} mesa(s) selecionada(s) para impressão
            </p>
            <div className="grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
              {tables
                .filter((t) => selectedTables.includes(t.id))
                .map((table) => (
                  <div key={table.id} className="border rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">{company?.name}</p>
                    <p className="font-bold">Mesa {table.table_number}</p>
                    {qrCodes[table.id] && (
                      <img src={qrCodes[table.id]} alt={`QR ${table.table_number}`} className="mx-auto my-2" />
                    )}
                    <p className="text-xs text-muted-foreground">Escaneie para pedir</p>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={printSelectedQRCodes}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
