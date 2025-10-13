import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Store,
  Truck,
  Package,
  AlertTriangle,
  Bell,
  BellOff,
  Filter,
} from "lucide-react";
import { StoreSettings, STATUS_COLUMNS } from "./types";

const TIME_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

interface KanbanHeaderProps {
  settings: StoreSettings;
  onSettingsChange: (settings: Partial<StoreSettings>) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedOrdersCount: number;
  onBulkStatusChange: (status: string) => void;
}

export function KanbanHeader({
  settings,
  onSettingsChange,
  searchTerm,
  onSearchChange,
  showFilters,
  onToggleFilters,
  selectedOrdersCount,
  onBulkStatusChange,
}: KanbanHeaderProps) {
  return (
    <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 border-b pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4" />
          <Switch 
            checked={settings.storeOpen} 
            onCheckedChange={(checked) => onSettingsChange({ storeOpen: checked })}
          />
          <span className={`text-sm font-medium ${settings.storeOpen ? "text-success" : "text-destructive"}`}>
            {settings.storeOpen ? "Aberto" : "Fechado"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm">Aceite Automático</label>
          <Switch 
            checked={settings.autoAccept} 
            onCheckedChange={(checked) => onSettingsChange({ autoAccept: checked })}
          />
        </div>

        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4" />
          <Select
            value={String(settings.deliveryTime)}
            onValueChange={(value) => onSettingsChange({ deliveryTime: Number(value) })}
          >
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={String(time)}>
                  {time} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          <Select
            value={String(settings.pickupTime)}
            onValueChange={(value) => onSettingsChange({ pickupTime: Number(value) })}
          >
            <SelectTrigger className="w-28 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((time) => (
                <SelectItem key={time} value={String(time)}>
                  {time} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          type="text"
          placeholder="Buscar pedidos..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="text-sm border rounded px-3 py-1 w-48"
        />

        {selectedOrdersCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{selectedOrdersCount} selecionados</span>
            <Select onValueChange={onBulkStatusChange}>
              <SelectTrigger className="w-40 h-8">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_COLUMNS.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button
          variant={settings.soundEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => onSettingsChange({ soundEnabled: !settings.soundEnabled })}
        >
          {settings.soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </Button>

        <Button variant="outline" size="sm" onClick={onToggleFilters}>
          <Filter className="w-4 h-4 mr-1" />
          Filtros
        </Button>
      </div>

      {showFilters && (
        <Card className="mt-3 p-3">
          <h3 className="font-semibold mb-2 text-sm">Colunas Visíveis</h3>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_COLUMNS.map((column) => (
              <div key={column.id} className="flex items-center space-x-2">
                <Checkbox
                  checked={settings.visibleColumns[column.id as keyof typeof settings.visibleColumns]}
                  onCheckedChange={(checked) => 
                    onSettingsChange({ 
                      visibleColumns: { 
                        ...settings.visibleColumns, 
                        [column.id]: checked 
                      } 
                    })
                  }
                  disabled={column.id === "pending" && settings.autoAccept}
                />
                <label className="text-sm">{column.title}</label>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
