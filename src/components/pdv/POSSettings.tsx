import { useState } from 'react';
import { usePDVSettings } from '@/hooks/pdv/usePDVSettings';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Printer, 
  Wallet, 
  Users, 
  Percent, 
  LayoutGrid, 
  Settings,
  History,
} from 'lucide-react';

interface POSSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function POSSettings({ open, onOpenChange }: POSSettingsProps) {
  const navigate = useNavigate();
  const { settings, updateSettings, isUpdating } = usePDVSettings();

  const handleSettingChange = (key: string, value: any) => {
    updateSettings({ [key]: value });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do PDV
          </SheetTitle>
          <SheetDescription>
            Personalize o comportamento do ponto de venda
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Aba Padrão */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Aba padrão ao abrir
            </Label>
          <Select
            value={(settings as any)?.default_tab || 'counter'}
            onValueChange={(value) => handleSettingChange('default_tab', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="counter">Balcão</SelectItem>
              <SelectItem value="tables">Mesas</SelectItem>
                <SelectItem value="delivery">Entrega</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Impressão Automática */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Impressão
            </h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-print-send" className="text-sm">
                Imprimir ao enviar pedido
              </Label>
              <Switch
                id="auto-print-send"
                checked={settings?.auto_print_on_send || false}
                onCheckedChange={(checked) => handleSettingChange('auto_print_on_send', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-print-close" className="text-sm">
                Imprimir ao fechar comanda
              </Label>
              <Switch
                id="auto-print-close"
                checked={(settings as any)?.auto_print_on_close || false}
                onCheckedChange={(checked) => handleSettingChange('auto_print_on_close', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Configurações de Mesa */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <LayoutGrid className="w-4 h-4" />
              Mesas
            </h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="require-waiter" className="text-sm">
                Exigir garçom ao abrir mesa
              </Label>
              <Switch
                id="require-waiter"
                checked={settings?.require_waiter_on_table || false}
                onCheckedChange={(checked) => handleSettingChange('require_waiter_on_table', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Taxa de Serviço */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Taxa de Serviço
            </h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="charge-service" className="text-sm">
                Cobrar taxa de serviço
              </Label>
              <Switch
                id="charge-service"
                checked={(settings as any)?.charge_service_fee || false}
                onCheckedChange={(checked) => handleSettingChange('charge_service_fee', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Links Rápidos */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Links Rápidos</h4>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                onOpenChange(false);
                navigate('/caixa');
              }}
            >
              <Wallet className="w-4 h-4 mr-2" />
              Gerenciar Caixa
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                onOpenChange(false);
                navigate('/caixa/historico');
              }}
            >
              <History className="w-4 h-4 mr-2" />
              Histórico de Caixas
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                onOpenChange(false);
                navigate('/settings?tab=tables');
              }}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Gerenciar Mesas
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                onOpenChange(false);
                navigate('/settings');
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Outras Configurações
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
