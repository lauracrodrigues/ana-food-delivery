import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { QZTrayPrinter } from "@/lib/qz-tray";
import { printerCache } from "@/lib/printer-cache";
import { SectorConfigPanel } from "./SectorConfigPanel";
import type { PrintSector, SectorConfig, SECTOR_LABELS } from "@/types/printer-settings";
import { DEFAULT_EXTENDED_CONFIG } from "@/types/printer-layout-extended";

const SECTORS: PrintSector[] = ["caixa", "cozinha_1", "cozinha_2", "copa_bar"];

const SECTOR_LABELS_MAP = {
  caixa: { label: "Caixa", icon: "💰" },
  cozinha_1: { label: "Cozinha 1", icon: "👨‍🍳" },
  cozinha_2: { label: "Cozinha 2", icon: "👩‍🍳" },
  copa_bar: { label: "Copa/Bar", icon: "🍹" },
};

export function PrintLayoutConfig() {
  const { companyId } = useCompanyId();
  const queryClient = useQueryClient();
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [testingSector, setTestingSector] = useState<PrintSector | null>(null);
  const [savingSector, setSavingSector] = useState<PrintSector | null>(null);

  // Estado dos setores
  const [sectorsConfig, setSectorsConfig] = useState<Record<PrintSector, SectorConfig>>({
    caixa: {
      enabled: true,
      printer_name: "",
      copies: 1,
      layout: DEFAULT_EXTENDED_CONFIG,
      cut_type: "partial",
      text_mode: "normal",
    },
    cozinha_1: {
      enabled: false,
      printer_name: "",
      copies: 1,
      layout: DEFAULT_EXTENDED_CONFIG,
      cut_type: "partial",
      text_mode: "normal",
    },
    cozinha_2: {
      enabled: false,
      printer_name: "",
      copies: 1,
      layout: DEFAULT_EXTENDED_CONFIG,
      cut_type: "partial",
      text_mode: "normal",
    },
    copa_bar: {
      enabled: false,
      printer_name: "",
      copies: 1,
      layout: DEFAULT_EXTENDED_CONFIG,
      cut_type: "partial",
      text_mode: "normal",
    },
  });

  // Fetch company data
  const { data: companyData } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("name, phone, address")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      return {
        name: data.name,
        phone: data.phone ? String(data.phone) : undefined,
        address: data.address ? String(data.address) : undefined,
      };
    },
    enabled: !!companyId,
  });

  // Fetch printer settings
  const { data: settings } = useQuery({
    queryKey: ["store-settings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("printer_settings")
        .eq("company_id", companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
    staleTime: 0,
  });

  // Carregar impressoras do cache ou buscar
  useEffect(() => {
    const loadPrinters = async () => {
      // Tentar carregar do cache primeiro
      const cached = printerCache.get();
      if (cached) {
        setAvailablePrinters(cached);
        return;
      }

      // Se não tem cache, buscar
      await fetchPrinters(false);
    };

    loadPrinters();
  }, []);

  // Load config when settings change
  useEffect(() => {
    if (!settings?.printer_settings) return;

    const printerSettings = settings.printer_settings as any;
    const newConfig: Record<PrintSector, SectorConfig> = {} as any;

    SECTORS.forEach((sector) => {
      const sectorData = printerSettings.sectors?.[sector];

      if (sectorData) {
        newConfig[sector] = {
          ...sectorData,
          layout: {
            ...DEFAULT_EXTENDED_CONFIG,
            ...sectorData.layout,
          },
        };
      } else {
        // Fallback para estrutura antiga
        const oldPrinterName = printerSettings[sector] || printerSettings.printers?.[sector];
        const oldLayoutConfig = printerSettings.layout_configs?.[sector];

        newConfig[sector] = {
          enabled: sector === "caixa",
          printer_name: oldPrinterName || "",
          copies: 1,
          layout: oldLayoutConfig ? { ...DEFAULT_EXTENDED_CONFIG, ...oldLayoutConfig } : DEFAULT_EXTENDED_CONFIG,
          cut_type: "partial",
          text_mode: "normal",
        };
      }
    });

    setSectorsConfig(newConfig);
  }, [settings]);

  // Fetch printers
  const fetchPrinters = async (showToast = true) => {
    setLoadingPrinters(true);
    try {
      const qzTray = QZTrayPrinter.getInstance();
      const printers = await qzTray.getPrinters();
      setAvailablePrinters(printers);
      printerCache.set(printers);

      if (showToast) {
        toast.success(`${printers.length} impressora(s) encontrada(s)`);
      }
    } catch (error) {
      console.error("Erro ao buscar impressoras:", error);
      if (showToast) {
        toast.error("Certifique-se que o QZ Tray está aberto e rodando");
      }
    } finally {
      setLoadingPrinters(false);
    }
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async ({ sector, config }: { sector: PrintSector; config: SectorConfig }) => {
      const currentSettings = (settings?.printer_settings as any) || {};

      const updatedSettings = {
        ...currentSettings,
        auto_print: currentSettings.auto_print ?? true,
        sectors: {
          ...(currentSettings.sectors || {}),
          [sector]: config,
        },
      };

      const { error } = await supabase
        .from("store_settings")
        .update({ printer_settings: updatedSettings })
        .eq("company_id", companyId);

      if (error) throw error;
    },
    onSuccess: (_, { sector }) => {
      queryClient.invalidateQueries({ queryKey: ["store-settings", companyId] });
      toast.success(`Configurações do ${SECTOR_LABELS_MAP[sector].label} salvas!`);
      setSavingSector(null);
    },
    onError: (error, { sector }) => {
      console.error("Erro ao salvar:", error);
      toast.error(`Erro ao salvar configurações do ${SECTOR_LABELS_MAP[sector].label}`);
      setSavingSector(null);
    },
  });

  // Test print
  const handleTestPrint = async (sector: PrintSector) => {
    try {
      setTestingSector(sector);

      const config = sectorsConfig[sector];
      if (!config.printer_name) {
        toast.error("Selecione uma impressora primeiro");
        return;
      }

      const testOrder = {
        order_number: "#001",
        customer_name: "Cliente Teste",
        customer_phone: "(99) 99999-9999",
        address: "Rua Exemplo, 123 - Centro, São Paulo",
        type: "delivery",
        source: "Cardápio Digital",
        // Campos da empresa necessários para impressão
        company_name: "Empresa Teste",
        company_fantasy_name: "Empresa Teste",
        company_phone: "(11) 1234-5678",
        company_address: "Rua da Empresa, 456\nCentro\nSão Paulo - SP\nCEP: 01234-567",
        company_email: "contato@empresa.com",
        items: [
          {
            name: "Produto Exemplo",
            quantity: 2,
            price: 25.5,
            observations: "Sem cebola",
            extras: [{ name: "Extra Queijo", price: 3.0 }],
          },
        ],
        delivery_fee: 5.0,
        subtotal: 54.0,
        total: 59.0,
        payment_method: "Dinheiro",
        observations: "Entregar na portaria",
        created_at: new Date().toISOString(),
      };

      const qzTray = QZTrayPrinter.getInstance();
      await qzTray.connect();
      await qzTray.printOrder(testOrder, config.printer_name, false, sector as any, config.layout, config.copies);

      toast.success("Impressão de teste enviada!");
    } catch (error) {
      console.error("Erro na impressão de teste:", error);
      toast.error("Erro ao imprimir teste");
    } finally {
      setTestingSector(null);
    }
  };

  const handleSave = (sector: PrintSector) => {
    setSavingSector(sector);
    saveMutation.mutate({ sector, config: sectorsConfig[sector] });
  };

  const handleConfigChange = (sector: PrintSector, config: SectorConfig) => {
    setSectorsConfig((prev) => ({
      ...prev,
      [sector]: config,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Sectors Accordion */}
      <Accordion type="single" collapsible defaultValue="caixa" className="space-y-2">
        {SECTORS.map((sector) => (
          <AccordionItem key={sector} value={sector} className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{SECTOR_LABELS_MAP[sector].icon}</span>
                <div className="text-left">
                  <div className="font-semibold">{SECTOR_LABELS_MAP[sector].label}</div>
                  <div className="text-sm text-muted-foreground">
                    {sectorsConfig[sector].enabled
                      ? sectorsConfig[sector].printer_name || "Nenhuma impressora configurada"
                      : "Desativado"}
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <SectorConfigPanel
                sector={sector}
                sectorLabel={SECTOR_LABELS_MAP[sector].label}
                sectorIcon={SECTOR_LABELS_MAP[sector].icon}
                config={sectorsConfig[sector]}
                availablePrinters={availablePrinters}
                companyData={companyData}
                onConfigChange={(config) => handleConfigChange(sector, config)}
                onTestPrint={() => handleTestPrint(sector)}
                onSave={() => handleSave(sector)}
                onRefreshPrinters={() => fetchPrinters(true)}
                isTesting={testingSector === sector}
                isSaving={savingSector === sector}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
