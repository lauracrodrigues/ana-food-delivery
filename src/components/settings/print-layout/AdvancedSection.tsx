import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { ExtendedLayoutConfig } from '@/types/printer-layout-extended';

interface AdvancedSectionProps {
  config: ExtendedLayoutConfig;
  onChange: (updates: Partial<ExtendedLayoutConfig>) => void;
  onCalibrationPrint?: () => void;
  isPrinting?: boolean;
}

export function AdvancedSection({ config, onChange, onCalibrationPrint, isPrinting }: AdvancedSectionProps) {
  return (
    <div className="space-y-6">
      {/* Paper Width */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Largura do Papel</Label>
        <RadioGroup
          value={config.paper_width}
          onValueChange={(value) => {
            const width = value as '57mm' | '80mm';
            const chars = width === '57mm' ? 32 : 48;
            onChange({ 
              paper_width: width,
              chars_per_line: config.allow_custom_chars_per_line ? config.chars_per_line : chars
            });
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="57mm" id="paper-57" />
            <Label htmlFor="paper-57">57mm (32 caracteres)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="80mm" id="paper-80" />
            <Label htmlFor="paper-80">80mm (48 caracteres)</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Characters per line */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Personalizar caracteres por linha</Label>
          <Switch
            checked={config.allow_custom_chars_per_line}
            onCheckedChange={(checked) => onChange({ allow_custom_chars_per_line: checked })}
          />
        </div>
        
        {config.allow_custom_chars_per_line && (
          <div className="space-y-2">
            <Input
              type="number"
              value={config.chars_per_line}
              onChange={(e) => onChange({ chars_per_line: parseInt(e.target.value) || 32 })}
              min={20}
              max={80}
            />
            <p className="text-xs text-muted-foreground">
              Padrão: {config.paper_width === '57mm' ? '32' : '48'} caracteres
            </p>
          </div>
        )}
      </div>

      {/* Encoding */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Codificação de Caracteres</Label>
        <RadioGroup
          value={config.encoding}
          onValueChange={(value) => onChange({ encoding: value as 'UTF-8' | 'Windows-1252' })}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="UTF-8" id="enc-utf8" />
            <Label htmlFor="enc-utf8">UTF-8 (padrão)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Windows-1252" id="enc-win" />
            <Label htmlFor="enc-win">Windows-1252 (se acentos não aparecem)</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Altere para Windows-1252 se caracteres acentuados (á, é, ç) não aparecem corretamente
        </p>
      </div>

      {/* Margins */}
      <div className="space-y-4">
        <Label className="text-sm font-semibold">Margens e Calibração</Label>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Margem Esquerda</Label>
            <span className="text-xs font-medium">{config.margin_left} espaços</span>
          </div>
          <Slider
            value={[config.margin_left]}
            onValueChange={([value]) => onChange({ margin_left: value })}
            min={0}
            max={10}
            step={1}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Margem Direita</Label>
            <span className="text-xs font-medium">{config.margin_right} espaços</span>
          </div>
          <Slider
            value={[config.margin_right]}
            onValueChange={([value]) => onChange({ margin_right: value })}
            min={0}
            max={10}
            step={1}
          />
        </div>

        {onCalibrationPrint && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCalibrationPrint}
            disabled={isPrinting}
            className="w-full"
          >
            <Printer className="mr-2 h-4 w-4" />
            {isPrinting ? 'Imprimindo...' : 'Imprimir Régua de Calibração'}
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          Imprima a régua para verificar o alinhamento e ajustar as margens
        </p>
      </div>

      {/* Line Spacing */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Espaçamento entre Linhas</Label>
        <RadioGroup
          value={config.line_spacing ?? 'normal'}
          onValueChange={(value) => {
            console.log('🔄 Mudando line_spacing para:', value);
            onChange({ line_spacing: value as 'compact' | 'normal' | 'relaxed' });
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="compact" id="spacing-compact" />
            <Label htmlFor="spacing-compact">Compacto (economiza papel)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="spacing-normal" />
            <Label htmlFor="spacing-normal">Normal (recomendado)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="relaxed" id="spacing-relaxed" />
            <Label htmlFor="spacing-relaxed">Relaxado (mais legível)</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          Selecionado: {config.line_spacing ?? 'normal'}
        </p>
      </div>
    </div>
  );
}
