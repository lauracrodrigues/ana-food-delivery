import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Loader2 } from 'lucide-react';
import { UnifiedFieldsList } from './UnifiedFieldsList';
import { ThermalPaperSimulator } from './ThermalPaperSimulator';
import { SECTOR_TEMPLATES } from '@/lib/print-templates';
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');

  const updateLayout = (updates: Partial<ExtendedLayoutConfig>) => {
    onConfigChange({
      ...config,
      layout: { ...config.layout, ...updates }
    });
  };

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplate(templateKey);
    if (templateKey !== 'custom') {
      const template = SECTOR_TEMPLATES[templateKey];
      if (template) {
        onConfigChange({
          ...config,
          layout: {
            ...config.layout,
            elements: template.elements
          }
        });
      }
    }
  };

  // Auto-save com debounce
  useEffect(() => {
    if (!config.enabled) return;
    
    setSaveStatus('idle');
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onSave();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [config, config.enabled, onSave]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>{sectorIcon}</span>
            {sectorLabel}
          </CardTitle>
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <Badge variant="outline" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Salvando...
              </Badge>
            )}
            {saveStatus === 'saved' && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400">
                <Check className="h-3 w-3 mr-1" />
                Salvo
              </Badge>
            )}
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => onConfigChange({ ...config, enabled })}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-6">
        {/* Coluna Esquerda: Configurações */}
        <div className="space-y-6">
        {/* Seleção de Template */}
        <div className="space-y-2">
          <Label htmlFor={`template-${sector}`}>Template Base</Label>
          <Select
            value={selectedTemplate}
            onValueChange={handleTemplateChange}
            disabled={!config.enabled}
          >
            <SelectTrigger id={`template-${sector}`}>
              <SelectValue placeholder="Selecione um template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="complete">📋 Completo (Caixa)</SelectItem>
              <SelectItem value="simplified">👨‍🍳 Simplificado (Cozinha/Bar)</SelectItem>
              <SelectItem value="custom">⚙️ Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

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
        </div>

        {/* Coluna Direita: Preview */}
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <ThermalPaperSimulator 
              config={config.layout} 
              companyData={companyData}
              onTestPrint={onTestPrint}
              isTesting={isTesting}
              cutType={config.cut_type}
              textMode={config.text_mode}
              onCutTypeChange={(cut_type) => onConfigChange({ ...config, cut_type })}
              onTextModeChange={(text_mode) => onConfigChange({ ...config, text_mode })}
              printerConnected={!!config.printer_name}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
