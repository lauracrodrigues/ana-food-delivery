import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import type { ExtendedLayoutConfig } from "@/types/printer-layout-extended";
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

  // USAR FORMATADOR ÚNICO (single source of truth)
  const lines = formatReceipt(order, config, companyData);

  return (
    <div className="space-y-4">
      <Card className="bg-muted/30">
        <CardContent className="p-6">
          <div className="max-h-[calc(100vh-20rem)] overflow-y-auto">
            <div 
              className="bg-[#F5E6D3] shadow-lg mx-auto rounded-sm p-4" 
              style={{ width: '420px' }}
            >
              {/* 
                PREVIEW BURRO: SÓ DISPLAY EM <PRE> MONOSPACE
                Sem interpretação de fontSize, bold, underline
              */}
              <pre className="font-mono text-[10px] leading-tight whitespace-pre">
                {lines.join('\n')}
              </pre>
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
          
          <div className="mt-3 text-xs text-muted-foreground text-center">
            Preview exibe alinhamento e quebra de linhas.
            <br />
            Negrito/tamanho são aplicados apenas na impressão.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
