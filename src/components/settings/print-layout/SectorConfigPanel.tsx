import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

import { Separator } from '@/components/ui/separator';
import { Printer, Save } from 'lucide-react';
import { UnifiedFieldsList } from './UnifiedFieldsList';
import { ThermalPaperSimulator } from './ThermalPaperSimulator';
import type { SectorConfig, PrintSector } from '@/types/printer-settings';
import type { ExtendedLayoutConfig } from '@/types/printer-layout-extended';

interface SectorConfigPanelProps {
  sector: PrintSector;
  sectorLabel: string;
  sectorIcon: string;
  config: SectorConfig;
  availablePrinters: string[];
  companyData?: {
    name: string;
    phone?: string;
    address?: string;
  };
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
  companyData,
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

      <CardContent className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
        {/* Coluna Esquerda: Configurações */}
        <div className="space-y-6">
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
                <SelectItem value="no-printer-available" disabled>
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

        {/* Configuração dos Campos */}
        <UnifiedFieldsList
          config={config.layout}
          onChange={updateLayout}
        />

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
        </div>

        {/* Coluna Direita: Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <ThermalPaperSimulator 
              config={config.layout} 
              companyData={companyData}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
