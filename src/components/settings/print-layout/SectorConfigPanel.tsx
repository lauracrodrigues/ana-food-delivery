import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Edit, ChevronDown, Settings2 } from 'lucide-react';
import { UnifiedFieldsList } from './UnifiedFieldsList';
import { ThermalPreview } from './ThermalPreview';
import { FooterMessageDialog } from './FooterMessageDialog';
import { SECTOR_TEMPLATES } from '@/lib/print-templates';
import type { SectorConfig, PrintSector, CutType, TextMode } from '@/types/printer-settings';
import type { ExtendedLayoutConfig, PrinterModel } from '@/types/printer-layout-extended';
import { PRINTER_MODELS } from '@/types/printer-layout-extended';

interface SectorConfigPanelProps {
  sector: PrintSector;
  sectorLabel: string;
  sectorIcon: string;
  config: SectorConfig;
  availablePrinters: string[];
  companyData?: {
    name: string;
    fantasy_name?: string;
    phone?: string;
    address?: any;  // JSONB object or string
    email?: string;
    cnpj?: string;
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
  // v1.1.0 — UX: avançado colapsado por padrão
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFieldsEditor, setShowFieldsEditor] = useState(false);
  
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

  // v1.2.0 — Auto-save: skip mount + compara snapshot pra evitar saves redundantes
  const firstRunRef = useRef(true);
  const lastSavedRef = useRef<string>('');
  useEffect(() => {
    if (firstRunRef.current) {
      firstRunRef.current = false;
      lastSavedRef.current = JSON.stringify(config);
      return;
    }
    if (!config.enabled) return;

    const snapshot = JSON.stringify(config);
    if (snapshot === lastSavedRef.current) return; // sem mudança real

    const timer = setTimeout(() => {
      lastSavedRef.current = snapshot;
      onSaveRef.current();
    }, 1500);

    return () => clearTimeout(timer);
  }, [config]);

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

      <CardContent className="grid grid-cols-1 lg:grid-cols-[1fr,350px] gap-6">
        {/* Coluna Esquerda: Configurações com scroll */}
        <div className="space-y-4 max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 scrollbar-thin">
          {/* SEÇÃO BÁSICO — sempre visível */}
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <h3 className="text-sm font-semibold flex items-center gap-2">⚡ Configuração Básica</h3>

            {/* Linha 1: Campos principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
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
            </div>

            {/* Linha 2: Modelo da Impressora */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`printer-model-${sector}`} className="text-xs font-medium">Modelo da Impressora</Label>
                <Select
                  value={config.layout.printer_model || 'G250'}
                  onValueChange={(value) => updateLayout({ printer_model: value as PrinterModel })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`printer-model-${sector}`} className="h-9">
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="G250">Gertec G250</SelectItem>
                    <SelectItem value="TMT-T20">Epson TMT-T20</SelectItem>
                    <SelectItem value="Elgin i9">Elgin i9</SelectItem>
                    <SelectItem value="Elgin i8">Elgin i8</SelectItem>
                    <SelectItem value="Bematech MP4200TH">Bematech MP4200TH</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {PRINTER_MODELS[config.layout.printer_model || 'G250'].chars_per_line} caracteres por linha
                </p>
              </div>
            </div>

          </div>

          {/* SEÇÃO AVANÇADO — colapsada por padrão */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between" disabled={!config.enabled}>
                <span className="flex items-center gap-2 text-xs">
                  <Settings2 className="h-3.5 w-3.5" />
                  Configuração Avançada (margens, vias, rodapé)
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 p-3 border rounded-lg bg-muted/10 mt-2">
            {/* Linha 3: Opções adicionais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              {/* Linhas Após Impressão */}
              <div className="space-y-1.5">
                <Label htmlFor={`extra-feed-${sector}`} className="text-xs font-medium">Linhas Após</Label>
                <Input
                  id={`extra-feed-${sector}`}
                  type="number"
                  min="0"
                  max="10"
                  value={config.layout.extra_feed_lines || 3}
                  onChange={(e) => updateLayout({ extra_feed_lines: parseInt(e.target.value) || 3 })}
                  disabled={!config.enabled}
                  className="h-9"
                />
              </div>
            </div>

            {/* Linha 4: Espaçamento e Mensagem de Rodapé */}
            <div className="grid grid-cols-1 sm:grid-cols-[200px,1fr] gap-3">
              {/* Espaçamento entre Linhas */}
              <div className="space-y-1.5">
                <Label htmlFor={`spacing-${sector}`} className="text-xs font-medium">Espaçamento</Label>
                <Select
                  value={(config.layout.line_spacing_multiplier || 1.0).toFixed(1)}
                  onValueChange={(value) => updateLayout({ line_spacing_multiplier: parseFloat(value) })}
                  disabled={!config.enabled}
                >
                  <SelectTrigger id={`spacing-${sector}`} className="h-8">
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

              {/* Mensagem de Rodapé */}
              <div className="space-y-1.5">
                <Label htmlFor={`footer-${sector}`} className="text-xs font-medium">Mensagem de Rodapé</Label>
                <div className="flex gap-2">
                  <Input
                    id={`footer-${sector}`}
                    value={config.layout.footer_message || ''}
                    onChange={(e) => updateLayout({ footer_message: e.target.value })}
                    placeholder="Ex: Obrigado pela preferência!"
                    disabled={!config.enabled}
                    className="flex-1 h-8"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFooterDialogOpen(true)}
                    disabled={!config.enabled}
                    title="Abrir editor de mensagem"
                    className="h-8 w-8 shrink-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            </CollapsibleContent>
          </Collapsible>

          <FooterMessageDialog
            open={footerDialogOpen}
            onOpenChange={setFooterDialogOpen}
            value={config.layout.footer_message || ''}
            onChange={(value) => updateLayout({ footer_message: value })}
          />

          {/* Editor de campos do recibo — colapsado */}
          <Collapsible open={showFieldsEditor} onOpenChange={setShowFieldsEditor}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between" disabled={!config.enabled}>
                <span className="flex items-center gap-2 text-xs">
                  <Edit className="h-3.5 w-3.5" />
                  Personalizar campos do recibo
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showFieldsEditor ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <UnifiedFieldsList
                config={config.layout}
                onChange={updateLayout}
                highlightedFieldId={highlightedFieldId}
              />
            </CollapsibleContent>
          </Collapsible>
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
