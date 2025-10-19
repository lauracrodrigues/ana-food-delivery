import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { UnifiedFieldsList } from './UnifiedFieldsList';
import { InteractiveThermalPreview } from './InteractiveThermalPreview';
import { SECTOR_TEMPLATES } from '@/lib/print-templates';
import type { SectorConfig, PrintSector, CutType, TextMode } from '@/types/printer-settings';
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
  onRefreshPrinters: () => void;
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
  onRefreshPrinters,
  isTesting,
  isSaving
}: SectorConfigPanelProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  
  // Use ref to avoid onSave dependency causing infinite loop
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

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
        await onSaveRef.current();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('idle');
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [config, config.enabled]);

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

      <CardContent className="grid grid-cols-1 lg:grid-cols-[1fr,500px] gap-6">
        {/* Coluna Esquerda: Configurações com scroll */}
        <div className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 scrollbar-thin">
          {/* NOVA SEÇÃO: Opções de Impressão */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <h3 className="text-sm font-semibold">Opções de Impressão</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Template Base */}
              <div className="space-y-1.5">
                <Label htmlFor={`template-${sector}`} className="text-xs">Template Base</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={handleTemplateChange}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`template-${sector}`} className="h-8 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete">📋 Completo</SelectItem>
                    <SelectItem value="simplified">👨‍🍳 Simplificado</SelectItem>
                    <SelectItem value="custom">⚙️ Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Impressora + Botão Buscar */}
              <div className="space-y-1.5">
                <Label htmlFor={`printer-${sector}`} className="text-xs">Impressora</Label>
                <div className="flex gap-1.5">
                  <Select
                    value={config.printer_name}
                    onValueChange={(printer_name) => onConfigChange({ ...config, printer_name })}
                    disabled={!config.enabled}
                  >
                    <SelectTrigger id={`printer-${sector}`} className="flex-1 h-8 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrinters.length === 0 ? (
                        <SelectItem value="no-printer" disabled>
                          Nenhuma impressora
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
                  
                  <Button 
                    onClick={onRefreshPrinters} 
                    variant="outline" 
                    size="icon"
                    disabled={!config.enabled}
                    title="Buscar impressoras"
                    className="h-8 w-8"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tipo de Corte */}
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Corte</Label>
                <RadioGroup 
                  value={config.cut_type} 
                  onValueChange={(value) => onConfigChange({ ...config, cut_type: value as CutType })}
                  disabled={!config.enabled}
                >
                  <div className="flex gap-2">
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="partial" id={`${sector}-cut-partial`} />
                      <Label htmlFor={`${sector}-cut-partial`} className="cursor-pointer text-xs">
                        Parcial
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="full" id={`${sector}-cut-full`} />
                      <Label htmlFor={`${sector}-cut-full`} className="cursor-pointer text-xs">
                        Total
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="none" id={`${sector}-cut-none`} />
                      <Label htmlFor={`${sector}-cut-none`} className="cursor-pointer text-xs">
                        Sem corte
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Largura do Texto */}
              <div className="space-y-1.5">
                <Label className="text-xs">Largura do Texto</Label>
                <RadioGroup 
                  value={config.text_mode} 
                  onValueChange={(value) => onConfigChange({ ...config, text_mode: value as TextMode })}
                  disabled={!config.enabled}
                >
                  <div className="flex gap-2">
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="condensed" id={`${sector}-text-condensed`} />
                      <Label htmlFor={`${sector}-text-condensed`} className="cursor-pointer text-xs">
                        Condensado
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="normal" id={`${sector}-text-normal`} />
                      <Label htmlFor={`${sector}-text-normal`} className="cursor-pointer text-xs">
                        Normal
                      </Label>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <RadioGroupItem value="expanded" id={`${sector}-text-expanded`} />
                      <Label htmlFor={`${sector}-text-expanded`} className="cursor-pointer text-xs">
                        Expandido
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Espaçamento entre Linhas */}
              <div className="space-y-1.5">
                <Label htmlFor={`spacing-${sector}`} className="text-xs">Espaçamento</Label>
                <Select
                  value={String(config.layout.line_spacing_multiplier || 1.0)}
                  onValueChange={(value) => updateLayout({ line_spacing_multiplier: parseFloat(value) })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`spacing-${sector}`} className="h-8 text-xs">
                    <SelectValue placeholder="Normal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">Muito Compacto</SelectItem>
                    <SelectItem value="0.75">Compacto</SelectItem>
                    <SelectItem value="1.0">Normal</SelectItem>
                    <SelectItem value="1.5">Espaçado</SelectItem>
                    <SelectItem value="2.0">Muito Espaçado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Número de Vias */}
              <div className="space-y-1.5">
                <Label className="text-xs">Número de Vias</Label>
                <RadioGroup
                  value={String(config.copies)}
                  onValueChange={(value) => onConfigChange({ ...config, copies: parseInt(value) })}
                  disabled={!config.enabled}
                >
                  <div className="flex gap-3">
                    {[1, 2, 3].map((num) => (
                      <div key={num} className="flex items-center space-x-1.5">
                        <RadioGroupItem value={String(num)} id={`${sector}-copies-${num}`} />
                        <Label htmlFor={`${sector}-copies-${num}`} className="cursor-pointer text-xs">
                          {num} {num === 1 ? 'via' : 'vias'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          <Separator />
          
          {/* Configuração dos Campos */}
          <UnifiedFieldsList
            config={config.layout}
            onChange={updateLayout}
          />
        </div>

        {/* Coluna Direita: Preview sticky */}
        <div className="hidden lg:block">
          <div className="sticky top-4 max-h-[calc(100vh-8rem)]">
            <InteractiveThermalPreview 
              config={config.layout} 
              onChange={updateLayout}
              companyData={companyData}
              onTestPrint={onTestPrint}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
