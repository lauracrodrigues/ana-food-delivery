import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Calendar, 
  Eye, 
  Printer,
  Wallet,
  Clock,
  User,
  ArrowLeft,
  Filter,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CashRegister } from '@/types/pdv';
import { CashRegisterSummaryView } from '@/components/pdv/CashRegisterSummaryView';
import { useNavigate } from 'react-router-dom';

export default function CashRegisterHistory() {
  const { companyId } = useCompanyId();
  const navigate = useNavigate();
  
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null);

  // Fetch closed registers
  const { data: registers, isLoading } = useQuery({
    queryKey: ['cash-register-history', companyId, startDate, endDate, operatorFilter],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('cash_registers')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'closed')
        .gte('closed_at', startOfDay(new Date(startDate)).toISOString())
        .lte('closed_at', endOfDay(new Date(endDate)).toISOString())
        .order('closed_at', { ascending: false });

      if (operatorFilter !== 'all') {
        query = query.eq('operator_id', operatorFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CashRegister[];
    },
    enabled: !!companyId,
  });

  // Fetch operators for filter
  const { data: operators } = useQuery({
    queryKey: ['cash-register-operators', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('cash_registers')
        .select('operator_id, operator_name')
        .eq('company_id', companyId)
        .eq('status', 'closed');

      if (error) throw error;
      
      // Unique operators
      const uniqueOperators = new Map();
      data?.forEach((r) => {
        if (r.operator_id && !uniqueOperators.has(r.operator_id)) {
          uniqueOperators.set(r.operator_id, r.operator_name);
        }
      });
      
      return Array.from(uniqueOperators.entries()).map(([id, name]) => ({ id, name }));
    },
    enabled: !!companyId,
  });

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return 'text-success';
    if (diff < 0) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const handlePrint = () => {
    window.print();
  };

  if (selectedRegister) {
    return (
      <CashRegisterSummaryView 
        register={selectedRegister}
        onBack={() => setSelectedRegister(null)}
        onPrint={handlePrint}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/caixa')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">Histórico de Caixas</h1>
          <p className="text-sm text-muted-foreground">
            Consulte fechamentos anteriores
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Operador</Label>
              <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {operators?.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : registers && registers.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Operador</TableHead>
                      <TableHead>Terminal</TableHead>
                      <TableHead className="text-right">Esperado</TableHead>
                      <TableHead className="text-right">Contado</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registers.map((register) => (
                      <TableRow key={register.id}>
                        <TableCell>
                          {register.closed_at && format(new Date(register.closed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{register.operator_name || 'Operador'}</TableCell>
                        <TableCell>{register.terminal_name || 'Caixa #1'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(register.expected_amount || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(register.closing_amount || 0)}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${getDifferenceColor(register.difference || 0)}`}>
                          {(register.difference || 0) >= 0 ? '+' : ''}{formatCurrency(register.difference || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={(register.difference || 0) === 0 ? 'default' : 'secondary'}>
                            {(register.difference || 0) === 0 ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                OK
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Diferença
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedRegister(register)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedRegister(register);
                                setTimeout(() => window.print(), 100);
                              }}
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden">
                <ScrollArea className="h-[calc(100vh-350px)]">
                  <div className="p-4 space-y-3">
                    {registers.map((register) => (
                      <Card key={register.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium">
                                {register.closed_at && format(new Date(register.closed_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {register.closed_at && format(new Date(register.closed_at), "HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            <Badge variant={(register.difference || 0) === 0 ? 'default' : 'secondary'}>
                              {(register.difference || 0) === 0 ? 'OK' : 'Diferença'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <p className="text-muted-foreground">Operador</p>
                              <p className="font-medium">{register.operator_name || 'Operador'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-muted-foreground">Diferença</p>
                              <p className={`font-bold ${getDifferenceColor(register.difference || 0)}`}>
                                {(register.difference || 0) >= 0 ? '+' : ''}{formatCurrency(register.difference || 0)}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => setSelectedRegister(register)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                setSelectedRegister(register);
                                setTimeout(() => window.print(), 100);
                              }}
                            >
                              <Printer className="w-4 h-4 mr-1" />
                              Imprimir
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Wallet className="w-12 h-12 mb-4" />
              <p className="text-lg font-medium">Nenhum caixa encontrado</p>
              <p className="text-sm">Ajuste os filtros para buscar outros períodos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
