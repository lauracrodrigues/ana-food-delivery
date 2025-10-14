import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Printer, Save } from 'lucide-react';
import { UnifiedFieldsList } from './UnifiedFieldsList';
import type { SectorConfig, PrintSector } from '@/types/printer-settings';
import type { ExtendedLayoutConfig } from '@/types/printer-layout-extended';

interface SectorConfigPanelProps {
  sector: PrintSector;
  sectorLabel: string;
  sectorIcon: string;
  config: SectorConfig;
  availablePrinters: string[];
  onConfigChange: (config: SectorConfig) => void;
  onTestPrint: () => void;
  onSave: () => void;
  isTesting: boolean;
  isSaving: boolean;
}

export function SectorConfigPanel({
  sector,
  sectorLabel,
  sectorIcon,
  config,
  availablePrinters,
  onConfigChange,
  onTestPrint,
  onSave,
  isTesting,
  isSaving
}: SectorConfigPanelProps) {
  const updateLayout = (updates: Partial<ExtendedLayoutConfig>) => {
    onConfigChange({
      ...config,
      layout: { ...config.layout, ...updates }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>{sectorIcon}</span>
            {sectorLabel}
          </CardTitle>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onConfigChange({ ...config, enabled })}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Seleção de Impressora */}
        <div className="space-y-2">
          <Label htmlFor={`printer-${sector}`}>Impressora</Label>
          <Select
            value={config.printer_name}
            onValueChange={(printer_name) => onConfigChange({ ...config, printer_name })}
            disabled={!config.enabled}
          >
            <SelectTrigger id={`printer-${sector}`}>
              <SelectValue placeholder="Selecione uma impressora" />
            </SelectTrigger>
            <SelectContent>
              {availablePrinters.length === 0 ? (
                <SelectItem value="" disabled>
                  Nenhuma impressora disponível
                </SelectItem>
              ) : (
                availablePrinters.map((printer) => (
                  <SelectItem key={printer} value={printer}>
                    {printer}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Número de Vias */}
        <div className="space-y-3">
          <Label>Número de Vias</Label>
          <RadioGroup
            value={String(config.copies)}
            onValueChange={(value) => onConfigChange({ ...config, copies: parseInt(value) })}
            disabled={!config.enabled}
          >
            <div className="flex gap-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="flex items-center space-x-2">
                  <RadioGroupItem value={String(num)} id={`${sector}-copies-${num}`} />
                  <Label htmlFor={`${sector}-copies-${num}`} className="cursor-pointer">
                    {num} {num === 1 ? 'via' : 'vias'}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Campos de Exibição */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Campos de Exibição</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-logo`} className="cursor-pointer">Logo da empresa</Label>
              <Switch
                id={`${sector}-logo`}
                checked={config.layout.show_company_logo}
                onCheckedChange={(checked) => updateLayout({ show_company_logo: checked })}
                disabled={!config.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-datetime`} className="cursor-pointer">Data e hora</Label>
              <Switch
                id={`${sector}-datetime`}
                checked={config.layout.show_datetime}
                onCheckedChange={(checked) => updateLayout({ show_datetime: checked })}
                disabled={!config.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-source`} className="cursor-pointer">Origem do pedido</Label>
              <Switch
                id={`${sector}-source`}
                checked={config.layout.show_order_source}
                onCheckedChange={(checked) => updateLayout({ show_order_source: checked })}
                disabled={!config.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-address`} className="cursor-pointer">Endereço do cliente</Label>
              <Switch
                id={`${sector}-address`}
                checked={config.layout.show_customer_address}
                onCheckedChange={(checked) => updateLayout({ show_customer_address: checked })}
                disabled={!config.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-delivery-type`} className="cursor-pointer">Tipo de entrega</Label>
              <Switch
                id={`${sector}-delivery-type`}
                checked={config.layout.show_delivery_type}
                onCheckedChange={(checked) => updateLayout({ show_delivery_type: checked })}
                disabled={!config.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-obs`} className="cursor-pointer">Observações</Label>
              <Switch
                id={`${sector}-obs`}
                checked={config.layout.show_order_observations}
                onCheckedChange={(checked) => updateLayout({ show_order_observations: checked })}
                disabled={!config.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-items`} className="cursor-pointer">Itens principais</Label>
              <Switch
                id={`${sector}-items`}
                checked={config.layout.show_main_items}
                onCheckedChange={(checked) => updateLayout({ show_main_items: checked })}
                disabled={!config.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-extras`} className="cursor-pointer">Complementos</Label>
              <Switch
                id={`${sector}-extras`}
                checked={config.layout.show_extras}
                onCheckedChange={(checked) => updateLayout({ show_extras: checked })}
                disabled={!config.enabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor={`${sector}-payment`} className="cursor-pointer">Forma de pagamento</Label>
              <Switch
                id={`${sector}-payment`}
                checked={config.layout.show_payment_method}
                onCheckedChange={(checked) => updateLayout({ show_payment_method: checked })}
                disabled={!config.enabled}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Configurações Avançadas */}
        <Accordion type="single" collapsible>
          <AccordionItem value="advanced">
            <AccordionTrigger>Configurações Avançadas</AccordionTrigger>
            <AccordionContent>
              <UnifiedFieldsList
                config={config.layout}
                onChange={updateLayout}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator />

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            onClick={onTestPrint}
            disabled={!config.enabled || !config.printer_name || isTesting}
            variant="outline"
            className="flex-1"
          >
            <Printer className="mr-2 h-4 w-4" />
            {isTesting ? 'Imprimindo...' : 'Imprimir Teste'}
          </Button>
          <Button
            onClick={onSave}
            disabled={!config.enabled || isSaving}
            className="flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
