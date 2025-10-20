import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
  
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-2">
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

              {/* Impressora */}
              <div className="space-y-1.5 xl:col-span-2">
                <Label htmlFor={`printer-${sector}`} className="text-xs">Impressora</Label>
                <div className="flex gap-1">
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

              {/* Tipo de Corte - Convertido para Select */}
              <div className="space-y-1.5">
                <Label htmlFor={`cut-${sector}`} className="text-xs">Tipo de Corte</Label>
                <Select
                  value={config.cut_type}
                  onValueChange={(value) => onConfigChange({ ...config, cut_type: value as CutType })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`cut-${sector}`} className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="full">Total</SelectItem>
                    <SelectItem value="none">Sem corte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Largura do Texto - Convertido para Select */}
              <div className="space-y-1.5">
                <Label htmlFor={`text-mode-${sector}`} className="text-xs">Largura Texto</Label>
                <Select
                  value={config.text_mode}
                  onValueChange={(value) => onConfigChange({ ...config, text_mode: value as TextMode })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`text-mode-${sector}`} className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="condensed">Condensado</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="expanded">Expandido</SelectItem>
                  </SelectContent>
                </Select>
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

              {/* Número de Vias - Convertido para Select */}
              <div className="space-y-1.5">
                <Label htmlFor={`copies-${sector}`} className="text-xs">Nº Vias</Label>
                <Select
                  value={String(config.copies)}
                  onValueChange={(value) => onConfigChange({ ...config, copies: parseInt(value) })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`copies-${sector}`} className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 via</SelectItem>
                    <SelectItem value="2">2 vias</SelectItem>
                    <SelectItem value="3">3 vias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Margem Esquerda - NOVO */}
              <div className="space-y-1.5">
                <Label htmlFor={`margin-left-${sector}`} className="text-xs">Margem Esq.</Label>
                <Input
                  id={`margin-left-${sector}`}
                  type="number"
                  min="0"
                  max="20"
                  value={config.layout.margin_left || 0}
                  onChange={(e) => updateLayout({ margin_left: parseInt(e.target.value) || 0 })}
                  disabled={!config.enabled}
                  className="h-8 text-xs"
                />
              </div>

              {/* Margem Direita - NOVO */}
              <div className="space-y-1.5">
                <Label htmlFor={`margin-right-${sector}`} className="text-xs">Margem Dir.</Label>
                <Input
                  id={`margin-right-${sector}`}
                  type="number"
                  min="0"
                  max="20"
                  value={config.layout.margin_right || 0}
                  onChange={(e) => updateLayout({ margin_right: parseInt(e.target.value) || 0 })}
                  disabled={!config.enabled}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <Separator />
          
          {/* Configuração dos Campos */}
          <UnifiedFieldsList
            config={config.layout}
            onChange={updateLayout}
            highlightedFieldId={highlightedFieldId}
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
              onFieldFocus={(elementId) => {
                setHighlightedFieldId(elementId);
                setTimeout(() => setHighlightedFieldId(null), 2000);
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
