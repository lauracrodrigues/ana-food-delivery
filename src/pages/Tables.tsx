import { useState } from 'react';
import { useTables } from '@/hooks/pdv/useTables';
import { usePOSStore } from '@/stores/posStore';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LayoutGrid, 
  Users, 
  Clock,
  Plus,
  Receipt,
} from 'lucide-react';
import { formatCurrency } from '@/lib/currency-formatter';
import { TableWithStatus } from '@/types/pdv';

export default function Tables() {
  const navigate = useNavigate();
  const { tables, areas, tablesByArea, tablesWithoutArea, isLoading } = useTables();
  const { setContext } = usePOSStore();
  const [selectedArea, setSelectedArea] = useState<string>('all');

  const handleTableClick = (table: TableWithStatus) => {
    // Set context with table info
    setContext({
      type: 'table',
      table_id: table.id,
      table_number: parseInt(String(table.table_number)) || 0,
    });
    
    // Navigate to POS
    navigate('/pdv');
  };

  const getStatusColor = (status: string | null, idleColor?: string | null) => {
    if (idleColor) return idleColor;
    
    switch (status) {
      case 'occupied':
        return 'bg-warning';
      case 'reserved':
        return 'bg-info';
      case 'available':
      default:
        return 'bg-success';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'occupied':
        return 'Ocupada';
      case 'reserved':
        return 'Reservada';
      case 'available':
      default:
        return 'Livre';
    }
  };

  const formatIdleTime = (minutes: number | null | undefined) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  };

  const renderTableCard = (table: TableWithStatus) => (
    <Card 
      key={table.id}
      className={`cursor-pointer hover:border-primary transition-all ${
        table.status === 'occupied' ? 'border-warning/50' : ''
      }`}
      onClick={() => handleTableClick(table)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${getStatusColor(table.status, table.idle_color)}`} 
            />
            <span className="font-bold text-lg">
              {table.name || `Mesa ${table.table_number}`}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {getStatusLabel(table.status)}
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
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{formatIdleTime(table.idle_minutes)}</span>
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
            {tables.filter(t => t.status === 'occupied').length} / {tables.length} ocupadas
          </Badge>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nova Mesa
        </Button>
      </div>

      {/* Areas Tabs */}
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
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-6">
              {tablesByArea.map(({ area, tables: areaTables }) => (
                areaTables.length > 0 && (
                  <div key={area.id}>
                    <h3 className="font-semibold text-lg mb-3">{area.name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {areaTables.map(renderTableCard)}
                    </div>
                  </div>
                )
              ))}
              
              {tablesWithoutArea.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Sem Área</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {tablesWithoutArea.map(renderTableCard)}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {areas.map((area) => (
          <TabsContent key={area.id} value={area.id} className="mt-4">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {tablesByArea
                  .find(g => g.area.id === area.id)
                  ?.tables.map(renderTableCard)}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
