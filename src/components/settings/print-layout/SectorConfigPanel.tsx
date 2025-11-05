import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Edit } from 'lucide-react';
import { UnifiedFieldsList } from './UnifiedFieldsList';
import { ThermalPreview } from './ThermalPreview';
import { FooterMessageDialog } from './FooterMessageDialog';
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
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  const [highlightedFieldId, setHighlightedFieldId] = useState<string | null>(null);
  const [footerDialogOpen, setFooterDialogOpen] = useState(false);
  
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
    
    const timer = setTimeout(() => {
      onSaveRef.current();
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
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => onConfigChange({ ...config, enabled })}
          />
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 lg:grid-cols-[1fr,500px] gap-6">
        {/* Coluna Esquerda: Configurações com scroll */}
        <div className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 scrollbar-thin">
          {/* NOVA SEÇÃO: Opções de Impressão */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <h3 className="text-sm font-semibold">Opções de Impressão</h3>
            
            {/* Linha 1: Campos principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Template Base */}
              <div className="space-y-1.5">
                <Label htmlFor={`template-${sector}`} className="text-xs font-medium">Template Base</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={handleTemplateChange}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`template-${sector}`} className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete">📋 Completo</SelectItem>
                    <SelectItem value="simplified">👨‍🍳 Simplificado</SelectItem>
                    <SelectItem value="custom">⚙️ Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Impressora + Buscar */}
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor={`printer-${sector}`} className="text-xs font-medium">Impressora</Label>
                <div className="flex gap-2">
                  <Select
                    value={config.printer_name}
                    onValueChange={(printer_name) => onConfigChange({ ...config, printer_name })}
                    disabled={!config.enabled}
                  >
                    <SelectTrigger id={`printer-${sector}`} className="flex-1 h-9">
                      <SelectValue placeholder="Selecione a impressora" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrinters.length === 0 ? (
                        <SelectItem value="no-printer" disabled>
                          Nenhuma impressora encontrada
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
                    className="h-9 w-9 shrink-0"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Espaçamento entre Linhas */}
              <div className="space-y-1.5">
                <Label htmlFor={`spacing-${sector}`} className="text-xs font-medium">Espaçamento</Label>
                <Select
                  value={String(config.layout.line_spacing_multiplier || 1.0)}
                  onValueChange={(value) => updateLayout({ line_spacing_multiplier: parseFloat(value) })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`spacing-${sector}`} className="h-9">
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
            </div>

            {/* Linha 2: Opções adicionais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {/* Número de Vias */}
              <div className="space-y-1.5">
                <Label htmlFor={`copies-${sector}`} className="text-xs font-medium">Nº de Vias</Label>
                <Select
                  value={String(config.copies)}
                  onValueChange={(value) => onConfigChange({ ...config, copies: parseInt(value) })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`copies-${sector}`} className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 via</SelectItem>
                    <SelectItem value="2">2 vias</SelectItem>
                    <SelectItem value="3">3 vias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Margem Esquerda */}
              <div className="space-y-1.5">
                <Label htmlFor={`margin-left-${sector}`} className="text-xs font-medium">Margem Esq.</Label>
                <Input
                  id={`margin-left-${sector}`}
                  type="number"
                  min="0"
                  max="20"
                  value={config.layout.margin_left || 0}
                  onChange={(e) => updateLayout({ margin_left: parseInt(e.target.value) || 0 })}
                  disabled={!config.enabled}
                  className="h-9"
                />
              </div>

              {/* Margem Direita */}
              <div className="space-y-1.5">
                <Label htmlFor={`margin-right-${sector}`} className="text-xs font-medium">Margem Dir.</Label>
                <Input
                  id={`margin-right-${sector}`}
                  type="number"
                  min="0"
                  max="20"
                  value={config.layout.margin_right || 0}
                  onChange={(e) => updateLayout({ margin_right: parseInt(e.target.value) || 0 })}
                  disabled={!config.enabled}
                  className="h-9"
                />
              </div>
            </div>

            {/* Linha 3: Mensagem de Rodapé */}
            <div className="space-y-1.5">
              <Label htmlFor={`footer-${sector}`} className="text-xs font-medium">Mensagem de Rodapé</Label>
              <div className="flex gap-2">
                <Input
                  id={`footer-${sector}`}
                  value={config.layout.footer_message || ''}
                  onChange={(e) => updateLayout({ footer_message: e.target.value })}
                  placeholder="Ex: Obrigado pela preferência!"
                  disabled={!config.enabled}
                  className="flex-1 h-9"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setFooterDialogOpen(true)}
                  disabled={!config.enabled}
                  title="Abrir editor de mensagem"
                  className="h-9 w-9 shrink-0"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <FooterMessageDialog
            open={footerDialogOpen}
            onOpenChange={setFooterDialogOpen}
            value={config.layout.footer_message || ''}
            onChange={(value) => updateLayout({ footer_message: value })}
          />

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
            <ThermalPreview 
              config={config.layout} 
              companyData={companyData}
              onTestPrint={onTestPrint}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
