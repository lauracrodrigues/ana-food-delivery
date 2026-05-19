import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { ExtendedLayoutConfig, FormattedLine } from "@/types/printer-layout-extended";
import { formatReceipt } from "@/lib/thermal-formatter";
import { MOCK_ORDER } from "@/lib/thermal-mock";

interface ThermalPreviewProps {
  config: ExtendedLayoutConfig;
  companyData?: any;
  onTestPrint?: () => void;
}

export function ThermalPreview({
  config,
  companyData,
  onTestPrint,
}: ThermalPreviewProps) {
  
  // USAR MOCK ÚNICO
  const order = {
    ...MOCK_ORDER,
    // Sobrescrever com dados reais da empresa
    company_name: companyData?.fantasy_name || companyData?.name || MOCK_ORDER.company_name,
    company_phone: companyData?.phone || MOCK_ORDER.company_phone,
    company_address: companyData?.address || MOCK_ORDER.company_address,
    company_email: companyData?.email || MOCK_ORDER.company_email,
    company_cnpj: companyData?.cnpj || undefined,
  };

  const lines = formatReceipt(order, config, companyData);

  // Helper para aplicar classes CSS baseadas na formatação
  // SEM tracking-tighter — impressora térmica usa fonte fixa, sem ajuste de espaço
  const getLineClasses = (line: FormattedLine): string => {
    const classes: string[] = ['font-mono'];
    
    if (line.formatting) {
      // Bold
      if (line.formatting.bold) classes.push('font-bold');
      
      // Underline
      if (line.formatting.underline) classes.push('underline');
      
      // Font size
      switch (line.formatting.fontSize) {
        case 'small':
          classes.push('text-[8px]');
          break;
        case 'medium':
          classes.push('text-[10px]');
          break;
        case 'large':
          classes.push('text-[12px]');
          break;
        case 'xlarge':
          classes.push('text-[14px]');
          break;
        default:
          classes.push('text-[10px]');
      }
      
      // Alignment
      switch (line.formatting.align) {
        case 'center':
          classes.push('text-center');
          break;
        case 'right':
          classes.push('text-right');
          break;
        default:
          classes.push('text-left');
      }
    } else {
      classes.push('text-[10px]');
    }
    
    return classes.join(' ');
  };

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="py-3 px-1">
          <div className="flex flex-col items-center">
            {/* Indicador da largura do papel (fiel à impressora) */}
            <p className="text-xs text-muted-foreground mb-2">
              📄 Papel {config.paper_width} · {config.chars_per_line} caracteres por linha
            </p>
            <div
              className="bg-[#F5E6D3] text-black shadow-lg rounded-sm overflow-hidden"
              style={{
                // 80mm = ~302px @ 96dpi (largura real do papel térmico)
                // 58mm = ~219px (impressoras pequenas)
                // A4 = ~595px (folha completa — preview reduzido)
                width: config.paper_width === '58mm' ? '219px'
                  : config.paper_width === 'A4' ? '480px'
                  : '302px',
              }}
            >
              {/* Preview com formatação aplicada — fonte mono, sem letter-spacing
                  pra bater 1:1 com impressora térmica que usa fonte de largura fixa */}
              <div className="p-3 leading-tight font-mono">
                {lines.map((line, idx) => (
                  <div key={idx} className={getLineClasses(line)} style={{ whiteSpace: 'pre' }}>
                    {line.text || ' '}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            <Button 
              onClick={onTestPrint} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir Teste
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
