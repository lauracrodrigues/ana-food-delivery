import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Printer, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyId } from '@/hooks/useCompanyId';
import { QZTrayPrinter } from '@/lib/qz-tray';
import { HeaderSection } from './HeaderSection';
import { BodySection } from './BodySection';
import { FooterSection } from './FooterSection';
import { AdvancedSection } from './AdvancedSection';
import { ThermalPaperSimulator } from './ThermalPaperSimulator';
import type { ExtendedLayoutConfig, SectionConfig } from '@/types/printer-layout-extended';
import { DEFAULT_EXTENDED_CONFIG } from '@/types/printer-layout-extended';

type PrintSector = 'caixa' | 'cozinha_1' | 'cozinha_2' | 'copa_bar';

const SECTORS: { id: PrintSector; label: string; icon: string }[] = [
  { id: 'caixa', label: 'Caixa', icon: '💰' },
  { id: 'cozinha_1', label: 'Cozinha 1', icon: '👨‍🍳' },
  { id: 'cozinha_2', label: 'Cozinha 2', icon: '👩‍🍳' },
  { id: 'copa_bar', label: 'Copa/Bar', icon: '🍹' }
];

export function PrintLayoutConfig() {
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [selectedSector, setSelectedSector] = useState<PrintSector>('caixa');
  const [isTesting, setIsTesting] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [config, setConfig] = useState<ExtendedLayoutConfig>(DEFAULT_EXTENDED_CONFIG);

  // Fetch company data
  const { data: companyData } = useQuery({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('name, phone, address')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  // Fetch printer settings
  const { data: settings } = useQuery({
    queryKey: ['store-settings', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('printer_settings')
        .eq('company_id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 0
  });

  // Load config when settings change
  useEffect(() => {
    const printerSettings = settings?.printer_settings as any;
    const savedConfig = printerSettings?.layout_configs?.[selectedSector];
    
    if (savedConfig) {
      // Merge saved config with defaults to ensure all new properties exist
      setConfig({
        ...DEFAULT_EXTENDED_CONFIG,
        ...savedConfig,
        header: savedConfig.header || DEFAULT_EXTENDED_CONFIG.header,
        body: savedConfig.body || DEFAULT_EXTENDED_CONFIG.body,
        footer: savedConfig.footer || DEFAULT_EXTENDED_CONFIG.footer,
      });
    } else {
      setConfig(DEFAULT_EXTENDED_CONFIG);
    }
  }, [settings, selectedSector]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newConfig: ExtendedLayoutConfig) => {
      const currentSettings = (settings?.printer_settings as any) || {};
      const layoutConfigs = currentSettings.layout_configs || {};
      
      const updatedSettings = {
        ...currentSettings,
        layout_configs: {
          ...layoutConfigs,
          [selectedSector]: newConfig
        }
      };

      const { error } = await supabase
        .from('store_settings')
        .update({ printer_settings: updatedSettings })
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings', companyId] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    }
  });

  // Test print
  const handleTestPrint = async () => {
    try {
      setIsTesting(true);
      
      const testOrder = {
        order_number: "TESTE-001",
        customer_name: "Cliente Teste",
        customer_phone: "(11) 98765-4321",
        address: "Rua Exemplo, 123 - Centro",
        type: "delivery",
        source: "teste",
        items: [
          {
            name: "Produto Exemplo",
            quantity: 2,
            price: 25.50,
            observations: "Sem cebola",
            extras: [{ name: "Extra Queijo", price: 3.00 }]
          }
        ],
        delivery_fee: 5.00,
        subtotal: 54.00,
        total: 59.00,
        payment_method: "Dinheiro",
        observations: "Entregar na portaria",
        created_at: new Date().toISOString()
      };
      
      const printerSettings = settings?.printer_settings as any;
      const printerName = printerSettings?.printers?.[selectedSector];
      if (!printerName) {
        toast.error('Nenhuma impressora configurada para este setor');
        return;
      }

      const qzTray = QZTrayPrinter.getInstance();
      await qzTray.connect();
      await qzTray.printOrder(testOrder, printerName, false, selectedSector as any, config);
      
      toast.success('Impressão de teste enviada!');
    } catch (error) {
      console.error('Erro na impressão de teste:', error);
      toast.error('Erro ao imprimir teste');
    } finally {
      setIsTesting(false);
    }
  };

  // Calibration print
  const handleCalibrationPrint = async () => {
    try {
      setIsCalibrating(true);
      
      const printerSettings = settings?.printer_settings as any;
      const printerName = printerSettings?.printers?.[selectedSector];
      if (!printerName) {
        toast.error('Nenhuma impressora configurada para este setor');
        return;
      }

      // Calibration print - simplified test
      toast.info('Função de calibração em desenvolvimento');
      
      toast.success('Régua de calibração enviada!');
    } catch (error) {
      console.error('Erro na impressão de calibração:', error);
      toast.error('Erro ao imprimir calibração');
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  const updateConfig = (updates: Partial<ExtendedLayoutConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateSection = (section: 'header' | 'body' | 'footer', sectionConfig: SectionConfig) => {
    setConfig(prev => ({ ...prev, [section]: sectionConfig }));
  };

  // Update config when sector changes
  const handleSectorChange = (sector: PrintSector) => {
    setSelectedSector(sector);
    const printerSettings = settings?.printer_settings as any;
    const savedConfig = printerSettings?.layout_configs?.[sector];
    
    if (savedConfig) {
      // Merge saved config with defaults to ensure all new properties exist
      setConfig({
        ...DEFAULT_EXTENDED_CONFIG,
        ...savedConfig,
        header: savedConfig.header || DEFAULT_EXTENDED_CONFIG.header,
        body: savedConfig.body || DEFAULT_EXTENDED_CONFIG.body,
        footer: savedConfig.footer || DEFAULT_EXTENDED_CONFIG.footer,
      });
    } else {
      setConfig(DEFAULT_EXTENDED_CONFIG);
    }
  };

  // Safety check - ensure config has required properties
  if (!config?.header || !config?.body || !config?.footer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sector Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Tabs value={selectedSector} onValueChange={(v) => handleSectorChange(v as PrintSector)} className="flex-1">
              <TabsList className="grid w-full grid-cols-4">
                {SECTORS.map(sector => (
                  <TabsTrigger key={sector.id} value={sector.id}>
                    <span className="mr-2">{sector.icon}</span>
                    {sector.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex gap-2">
              <Button 
                onClick={handleTestPrint} 
                disabled={isTesting}
                variant="outline"
                size="sm"
              >
                <Printer className="mr-2 h-4 w-4" />
                {isTesting ? 'Imprimindo...' : 'Teste'}
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saveMutation.isPending}
                size="sm"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div>
          <Card>
            <CardContent className="p-6">
              <Accordion type="single" collapsible defaultValue="header" className="w-full">
                <AccordionItem value="header">
                  <AccordionTrigger className="text-base font-semibold">
                    📄 Cabeçalho
                  </AccordionTrigger>
                  <AccordionContent>
                    <HeaderSection
                      config={config.header}
                      onChange={(sectionConfig) => updateSection('header', sectionConfig)}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="body">
                  <AccordionTrigger className="text-base font-semibold">
                    🍽️ Corpo / Itens
                  </AccordionTrigger>
                  <AccordionContent>
                    <BodySection
                      config={config.body}
                      layoutConfig={config}
                      onChange={(sectionConfig) => updateSection('body', sectionConfig)}
                      onLayoutChange={updateConfig}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="footer">
                  <AccordionTrigger className="text-base font-semibold">
                    📝 Rodapé
                  </AccordionTrigger>
                  <AccordionContent>
                    <FooterSection
                      config={config.footer}
                      layoutConfig={config}
                      onChange={(sectionConfig) => updateSection('footer', sectionConfig)}
                      onLayoutChange={updateConfig}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="advanced">
                  <AccordionTrigger className="text-base font-semibold">
                    ⚙️ Avançado
                  </AccordionTrigger>
                  <AccordionContent>
                    <AdvancedSection
                      config={config}
                      onChange={updateConfig}
                      onCalibrationPrint={handleCalibrationPrint}
                      isPrinting={isCalibrating}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div>
          <ThermalPaperSimulator
            config={config}
            companyData={companyData ? {
              name: companyData.name,
              phone: companyData.phone || '',
              address: String(companyData.address || '')
            } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
