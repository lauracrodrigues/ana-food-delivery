import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
// v1.2.0 — QZ Tray removido. Impressoras agora no Ana Food Print agent.
import { SectorConfigPanel } from "./SectorConfigPanel";
import { PrinterStatusBadge } from "./PrinterStatusBadge";
import { PrinterPresetWizard } from "./PrinterPresetWizard";
import { PrinterDevicesPanel } from "./PrinterDevicesPanel";
import type { PrintSector, SectorConfig, SECTOR_LABELS } from "@/types/printer-settings";
import { DEFAULT_EXTENDED_CONFIG } from "@/types/printer-layout-extended";
import { MOCK_ORDER } from "@/lib/thermal-mock";

// v1.1.0 — Adiciona Cozinha 3
const SECTORS: PrintSector[] = ["caixa", "cozinha_1", "cozinha_2", "cozinha_3", "copa_bar"];

const SECTOR_LABELS_MAP = {
  caixa:     { label: "Caixa",     icon: "💰" },
  cozinha_1: { label: "Cozinha 1", icon: "👨‍🍳" },
  cozinha_2: { label: "Cozinha 2", icon: "👩‍🍳" },
  cozinha_3: { label: "Cozinha 3", icon: "🧑‍🍳" },
  copa_bar:  { label: "Copa/Bar",  icon: "🍹" },
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
    cozinha_3: {
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
        .select("name, fantasy_name, phone, address, email, cnpj")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      
      // Manter tipos originais - NÃO converter para string
      return {
        name: data.name,
        fantasy_name: data.fantasy_name,
        phone: data.phone,        // Manter como string do DB
        address: data.address,    // Manter como objeto JSONB
        email: data.email,
        cnpj: data.cnpj,
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
  });

  // v1.2.0 — impressoras vêm do app Ana Food Print. Aqui mantém placeholder vazio.

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

  // v1.2.0 — impressoras configuradas no app Ana Food Print local
  const fetchPrinters = async (_showToast = true) => {
    setLoadingPrinters(false);
    setAvailablePrinters([]);
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

      // USAR O MESMO MOCK DO PREVIEW (single source of truth)
      const testOrder = {
        ...MOCK_ORDER,
        // Sobrescrever com dados reais da empresa se disponível
        company_name: companyData?.name || MOCK_ORDER.company_name,
        company_phone: companyData?.phone || MOCK_ORDER.company_phone,
        company_address: companyData?.address || MOCK_ORDER.company_address,
      };
      
      // v1.2.0 — Teste via gateway Ana Food Print
      const { queuePrintJob } = await import("@/lib/ana-food-print");
      const r = await queuePrintJob({
        sector: sector as any,
        payload: testOrder,
        copies: config.copies || 1,
      });
      if (!r.ok) throw new Error(r.error || 'falha enfileirar');
      toast.success("Impressão de teste enfileirada!");
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
      {/* v1.1.0 — Header com status agente + preset wizard */}
      <div className="flex items-center justify-between gap-2 flex-wrap p-3 border rounded-lg bg-muted/30">
        <div>
          <h3 className="text-sm font-semibold">Configuração de Impressoras</h3>
          <p className="text-xs text-muted-foreground">Configure setores e impressoras térmicas</p>
        </div>
        <div className="flex items-center gap-2">
          <PrinterPresetWizard
            currentConfig={sectorsConfig}
            availablePrinters={availablePrinters}
            onApply={(newConfig) => setSectorsConfig(newConfig)}
          />
          <PrinterStatusBadge />
        </div>
      </div>

      {/* v1.1.0 — Devices Ana Food Print */}
      <PrinterDevicesPanel />

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
