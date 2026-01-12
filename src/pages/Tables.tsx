import { useState, useMemo } from 'react';
import { useTables } from '@/hooks/pdv/useTables';
import { usePDVSettings } from '@/hooks/pdv/usePDVSettings';
import { usePOSStore } from '@/stores/posStore';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { OpenCheckDialog } from '@/components/pdv/OpenCheckDialog';
import { 
  LayoutGrid, 
  Users, 
  Clock,
  Plus,
  Receipt,
  Search,
  UtensilsCrossed,
  CircleDot,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { TableWithStatus } from '@/types/pdv';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'free' | 'occupied' | 'paid';

export default function Tables() {
  const navigate = useNavigate();
  const { tables, areas, tablesByArea, tablesWithoutArea, isLoading } = useTables();
  const { settings } = usePDVSettings();
  const { setContext } = usePOSStore();
  
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [openCheckDialogOpen, setOpenCheckDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableWithStatus | null>(null);

  // Idle time configuration from settings
  const idleConfig = {
    minutes_1: settings?.idle_alert_minutes_1 || 15,
    minutes_2: settings?.idle_alert_minutes_2 || 30,
    minutes_3: settings?.idle_alert_minutes_3 || 45,
    color_1: settings?.idle_color_1 || '#22c55e', // green
    color_2: settings?.idle_color_2 || '#eab308', // yellow
    color_3: settings?.idle_color_3 || '#f97316', // orange
  };

  // Filter tables based on status and search
  const filteredTables = useMemo(() => {
    let result = tables;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(table => {
        const hasActiveCheck = table.active_check && table.status === 'occupied';
        const isPaid = table.active_check?.status === 'paid';
        
        switch (statusFilter) {
          case 'free':
            return !hasActiveCheck || table.status === 'available';
          case 'occupied':
            return hasActiveCheck && !isPaid;
          case 'paid':
            return hasActiveCheck && isPaid;
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(table => {
        const tableNum = String(table.table_number).toLowerCase();
        const tableName = (table.name || '').toLowerCase();
        const checkNum = table.active_check?.check_number ? String(table.active_check.check_number) : '';
        
        return tableNum.includes(term) || tableName.includes(term) || checkNum.includes(term);
      });
    }

    return result;
  }, [tables, statusFilter, searchTerm]);

  const handleTableClick = (table: TableWithStatus) => {
    if (table.status === 'available' || !table.active_check) {
      // Open new check dialog for free tables
      setSelectedTable(table);
      setOpenCheckDialogOpen(true);
    } else {
      // Navigate to POS with existing check context
      setContext({
        type: 'table',
        table_id: table.id,
        table_number: parseInt(String(table.table_number)) || 0,
        check_id: table.active_check?.id,
        check_number: table.active_check?.check_number,
      });
      navigate('/pdv');
    }
  };

  const handleCheckOpened = (checkId: string) => {
    navigate('/pdv');
  };

  const getTableIconColor = (table: TableWithStatus) => {
    if (!table.active_check || table.status === 'available') {
      return 'text-green-500'; // Free
    }
    if (table.active_check?.status === 'paid') {
      return 'text-orange-500'; // Paid but still occupied
    }
    return 'text-blue-500'; // Occupied
  };

  const getIdleColor = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    if (minutes >= idleConfig.minutes_3) return idleConfig.color_3;
    if (minutes >= idleConfig.minutes_2) return idleConfig.color_2;
    if (minutes >= idleConfig.minutes_1) return idleConfig.color_1;
    return null;
  };

  const formatIdleTime = (minutes: number | null | undefined) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? `${mins}m` : ''}`;
  };

  const getStatusLabel = (table: TableWithStatus) => {
    if (!table.active_check || table.status === 'available') return 'Livre';
    if (table.active_check?.status === 'paid') return 'Paga';
    return 'Ocupada';
  };

  const renderTableCard = (table: TableWithStatus) => {
    const iconColor = getTableIconColor(table);
    const idleColor = table.idle_minutes ? getIdleColor(table.idle_minutes) : null;

    return (
      <Card 
        key={table.id}
        className={cn(
          "cursor-pointer hover:border-primary transition-all",
          table.status === 'occupied' && "border-blue-500/30"
        )}
        onClick={() => handleTableClick(table)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className={cn("w-5 h-5", iconColor)} />
              <span className="font-bold text-lg">
                {table.name || `Mesa ${table.table_number}`}
              </span>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                iconColor === 'text-green-500' && "border-green-500 text-green-600",
                iconColor === 'text-blue-500' && "border-blue-500 text-blue-600",
                iconColor === 'text-orange-500' && "border-orange-500 text-orange-600",
              )}
            >
              {getStatusLabel(table)}
            </Badge>
          </div>

          {table.capacity && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span>{table.capacity} lugares</span>
            </div>
          )}

          {table.status === 'occupied' && table.active_check && (
            <div className="mt-3 pt-3 border-t space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Receipt className="w-4 h-4" />
                  <span>Comanda #{table.active_check.check_number}</span>
                </div>
                {table.idle_minutes && table.idle_minutes > 0 && (
                  <div 
                    className="flex items-center gap-1"
                    style={{ color: idleColor || undefined }}
                  >
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">{formatIdleTime(table.idle_minutes)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {table.check_items_count || 0} itens
                </span>
                <span className="font-bold text-primary">
                  {formatCurrency(table.check_total || 0)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Count by status
  const counts = useMemo(() => ({
    all: tables.length,
    free: tables.filter(t => !t.active_check || t.status === 'available').length,
    occupied: tables.filter(t => t.active_check && t.status === 'occupied' && t.active_check.status !== 'paid').length,
    paid: tables.filter(t => t.active_check?.status === 'paid').length,
  }), [tables]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Mesas</h1>
          <Badge variant="secondary" className="ml-2">
            {counts.occupied} / {counts.all} ocupadas
          </Badge>
        </div>
        <Button onClick={() => navigate('/settings?tab=tables')}>
          <Plus className="w-4 h-4 mr-2" />
          Gerenciar Mesas
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mesa ou comanda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Status Filter Buttons */}
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            Todas ({counts.all})
          </Button>
          <Button
            variant={statusFilter === 'free' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('free')}
            className="gap-1"
          >
            <CircleDot className="w-3 h-3 text-green-500" />
            Livres ({counts.free})
          </Button>
          <Button
            variant={statusFilter === 'occupied' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('occupied')}
            className="gap-1"
          >
            <CircleDot className="w-3 h-3 text-blue-500" />
            Em uso ({counts.occupied})
          </Button>
          <Button
            variant={statusFilter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('paid')}
            className="gap-1"
          >
            <CircleDot className="w-3 h-3 text-orange-500" />
            Pagas ({counts.paid})
          </Button>
        </div>
      </div>

      {/* Idle Time Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border rounded-lg p-2 bg-muted/30">
        <span className="font-medium">Tempo de ociosidade:</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" style={{ color: idleConfig.color_1 }} />
          <span>&gt; {idleConfig.minutes_1}min</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" style={{ color: idleConfig.color_2 }} />
          <span>&gt; {idleConfig.minutes_2}min</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" style={{ color: idleConfig.color_3 }} />
          <span>&gt; {idleConfig.minutes_3}min</span>
        </div>
      </div>

      {/* Empty State */}
      {tables.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Nenhuma mesa cadastrada</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Para começar a usar o sistema de mesas, cadastre as mesas do seu estabelecimento.
          </p>
          <Button onClick={() => navigate('/settings?tab=tables')}>
            <Plus className="w-4 h-4 mr-2" />
            Cadastrar Mesas
          </Button>
        </div>
      )}

      {/* No results */}
      {tables.length > 0 && filteredTables.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Nenhuma mesa encontrada</h2>
          <p className="text-muted-foreground">
            Tente ajustar os filtros ou termo de busca.
          </p>
        </div>
      )}

      {/* Areas Tabs */}
      {filteredTables.length > 0 && (
        <Tabs value={selectedArea} onValueChange={setSelectedArea}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            {areas.map((area) => (
              <TabsTrigger key={area.id} value={area.id}>
                {area.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <ScrollArea className="h-[calc(100vh-340px)]">
              <div className="space-y-6">
                {tablesByArea.map(({ area, tables: areaTables }) => {
                  const filteredAreaTables = areaTables.filter(t => filteredTables.some(ft => ft.id === t.id));
                  return filteredAreaTables.length > 0 && (
                    <div key={area.id}>
                      <h3 className="font-semibold text-lg mb-3">{area.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                        {filteredAreaTables.map(renderTableCard)}
                      </div>
                    </div>
                  );
                })}
                
                {tablesWithoutArea.filter(t => filteredTables.some(ft => ft.id === t.id)).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Sem Área</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {tablesWithoutArea
                        .filter(t => filteredTables.some(ft => ft.id === t.id))
                        .map(renderTableCard)}
                    </div>
                  </div>
                )}

                {/* Show all filtered tables if no areas defined */}
                {areas.length === 0 && tablesWithoutArea.length === 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {filteredTables.map(renderTableCard)}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {areas.map((area) => {
            const areaFilteredTables = tablesByArea
              .find(g => g.area.id === area.id)
              ?.tables.filter(t => filteredTables.some(ft => ft.id === t.id)) || [];
            
            return (
              <TabsContent key={area.id} value={area.id} className="mt-4">
                <ScrollArea className="h-[calc(100vh-340px)]">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {areaFilteredTables.map(renderTableCard)}
                  </div>
                </ScrollArea>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Open Check Dialog */}
      <OpenCheckDialog
        open={openCheckDialogOpen}
        onOpenChange={setOpenCheckDialogOpen}
        table={selectedTable}
        onSuccess={handleCheckOpened}
      />
    </div>
  );
}
