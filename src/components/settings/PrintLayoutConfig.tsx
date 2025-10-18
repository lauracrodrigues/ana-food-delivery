import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Loader2 } from "lucide-react";
import type { LayoutConfig, PrintSector, PaperWidth, FontSize, LineSpacing, TextFormatting } from "@/types/printer-layout";
import { PAPER_WIDTHS, DEFAULT_LAYOUT_CONFIG } from "@/types/printer-layout";
import { toast } from "sonner";
import { PrintPreview } from "./PrintPreview";
import { QZTrayPrinter } from "@/lib/qz-tray";
import { supabase } from "@/integrations/supabase/client";

interface PrintLayoutConfigProps {
  companyId: string;
  initialConfig?: Record<PrintSector, LayoutConfig>;
  onSave: (configs: Record<PrintSector, LayoutConfig>) => Promise<void>;
}

export function PrintLayoutConfig({ companyId, initialConfig, onSave }: PrintLayoutConfigProps) {
  const [selectedSector, setSelectedSector] = useState<PrintSector>("caixa");
  const [configs, setConfigs] = useState<Record<PrintSector, LayoutConfig>>(
    initialConfig || {
      caixa: { ...DEFAULT_LAYOUT_CONFIG },
      cozinha1: { ...DEFAULT_LAYOUT_CONFIG, show_company_logo: false, show_payment_method: false },
      cozinha2: { ...DEFAULT_LAYOUT_CONFIG, show_company_logo: false, show_payment_method: false },
      copa_bar: { ...DEFAULT_LAYOUT_CONFIG, show_company_logo: false, show_payment_method: false },
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const currentConfig = configs[selectedSector];

  const updateConfig = (updates: Partial<LayoutConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [selectedSector]: { ...prev[selectedSector], ...updates },
    }));
  };

  const updateFormatting = (section: keyof LayoutConfig["formatting"], field: keyof TextFormatting, value: any) => {
    setConfigs((prev) => ({
      ...prev,
      [selectedSector]: {
        ...prev[selectedSector],
        formatting: {
          ...prev[selectedSector].formatting,
          [section]: {
            ...prev[selectedSector].formatting[section],
            [field]: value,
          },
        },
      },
    }));
  };

  const updatePaperWidth = (width: PaperWidth) => {
    updateConfig({
      paper_width: width,
      chars_per_line: PAPER_WIDTHS[width],
    });
  };

  const updateFontSize = (key: keyof LayoutConfig["font_sizes"], value: FontSize) => {
    updateConfig({
      font_sizes: { ...currentConfig.font_sizes, [key]: value },
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(configs);
      toast.success("Configurações de layout salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações de layout");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = async () => {
    try {
      setIsTesting(true);

      // Get printer settings to find the printer for this sector
      const { data: settings } = await supabase
        .from("store_settings")
        .select("printer_settings")
        .eq("company_id", companyId)
        .single();

      const printerName = settings?.printer_settings?.[selectedSector];

      if (!printerName) {
        toast.error(`Nenhuma impressora configurada para ${sectorLabels[selectedSector]}`);
        return;
      }

      // Generate test order
      const testOrder = {
        order_number: "TESTE-001",
        customer_name: "Cliente Teste",
        customer_phone: "(11) 98765-4321",
        address: "Rua Exemplo, 123 - Centro - São Paulo/SP",
        type: "delivery",
        source: "teste",
        // Campos da empresa necessários para impressão
        company_name: "Empresa Teste",
        company_fantasy_name: "Empresa Teste",
        company_phone: "(11) 1234-5678",
        company_address: "Rua da Empresa, 456\nCentro\nSão Paulo - SP\nCEP: 01234-567",
        company_email: "contato@empresa.com",
        items: [
          {
            name: "Produto Exemplo 1",
            quantity: 2,
            price: 25.50,
            observations: "Sem cebola",
            extras: [{ name: "Extra Queijo", price: 3.00 }]
          },
          {
            name: "Produto Exemplo 2",
            quantity: 1,
            price: 15.00,
          }
        ],
        delivery_fee: 5.00,
        total: 71.00,
        payment_method: "Dinheiro",
        observations: "Entregar na portaria - teste de impressão",
        created_at: new Date().toISOString(),
      };

      // Print using current config
      const qzTray = QZTrayPrinter.getInstance();
      await qzTray.connect();
      await qzTray.printOrder(testOrder, printerName, false, selectedSector, currentConfig);

      toast.success("Impressão de teste enviada com sucesso!");
    } catch (error: any) {
      console.error("Erro na impressão de teste:", error);
      toast.error(error?.message || "Erro ao imprimir teste");
    } finally {
      setIsTesting(false);
    }
  };

  const sectorLabels: Record<PrintSector, string> = {
    caixa: "Caixa",
    cozinha1: "Cozinha 1",
    cozinha2: "Cozinha 2",
    copa_bar: "Copa/Bar",
  };

  const sectionLabels = {
    header: "Cabeçalho",
    order_number: "Número do Pedido",
    customer_info: "Info do Cliente",
    items: "Itens",
    item_details: "Detalhes",
    totals: "Totais",
    footer: "Rodapé",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração de Layout de Impressão</CardTitle>
          <CardDescription>
            Personalize o layout dos recibos impressos para cada setor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedSector} onValueChange={(v) => setSelectedSector(v as PrintSector)}>
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(sectorLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.keys(sectorLabels).map((sector) => (
              <TabsContent key={sector} value={sector} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Left Column: Configuration */}
                  <div className="space-y-6">
                    {/* Configuração de Papel */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Configuração de Papel</h3>
                      
                      <div className="space-y-2">
                        <Label>Largura da Bobina</Label>
                        <RadioGroup
                          value={currentConfig.paper_width}
                          onValueChange={(v) => updatePaperWidth(v as PaperWidth)}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="57mm" id={`57mm-${sector}`} />
                            <Label htmlFor={`57mm-${sector}`}>57mm (32 caracteres)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="80mm" id={`80mm-${sector}`} />
                            <Label htmlFor={`80mm-${sector}`}>80mm (48 caracteres)</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label>Editar Caracteres Manualmente</Label>
                          <Switch
                            checked={currentConfig.allow_custom_chars_per_line}
                            onCheckedChange={(checked) => updateConfig({ allow_custom_chars_per_line: checked })}
                          />
                        </div>
                        <Label>Caracteres por Linha</Label>
                        <Input
                          type="number"
                          value={currentConfig.chars_per_line}
                          onChange={(e) => updateConfig({ chars_per_line: parseInt(e.target.value) || 32 })}
                          disabled={!currentConfig.allow_custom_chars_per_line}
                          min={20}
                          max={80}
                        />
                        <p className="text-xs text-muted-foreground">
                          Padrão: {PAPER_WIDTHS[currentConfig.paper_width]} caracteres para {currentConfig.paper_width}
                        </p>
                      </div>
                    </div>

                    {/* Tamanhos de Fonte */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Tamanhos de Fonte</h3>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Cabeçalho</Label>
                          <Select
                            value={currentConfig.font_sizes.header}
                            onValueChange={(v) => updateFontSize("header", v as FontSize)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="large">Grande</SelectItem>
                              <SelectItem value="xlarge">Extra Grande</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Número do Pedido</Label>
                          <Select
                            value={currentConfig.font_sizes.order_number}
                            onValueChange={(v) => updateFontSize("order_number", v as FontSize)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="large">Grande</SelectItem>
                              <SelectItem value="xlarge">Extra Grande</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Nome dos Itens</Label>
                          <Select
                            value={currentConfig.font_sizes.item_name}
                            onValueChange={(v) => updateFontSize("item_name", v as FontSize)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="large">Grande</SelectItem>
                              <SelectItem value="xlarge">Extra Grande</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Detalhes</Label>
                          <Select
                            value={currentConfig.font_sizes.item_details}
                            onValueChange={(v) => updateFontSize("item_details", v as FontSize)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="large">Grande</SelectItem>
                              <SelectItem value="xlarge">Extra Grande</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Totais</Label>
                          <Select
                            value={currentConfig.font_sizes.totals}
                            onValueChange={(v) => updateFontSize("totals", v as FontSize)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="large">Grande</SelectItem>
                              <SelectItem value="xlarge">Extra Grande</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Informações a Exibir */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Informações a Exibir</h3>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-logo-${sector}`}>Logo da Empresa</Label>
                          <Switch
                            id={`show-logo-${sector}`}
                            checked={currentConfig.show_company_logo}
                            onCheckedChange={(checked) => updateConfig({ show_company_logo: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-address-${sector}`}>Endereço</Label>
                          <Switch
                            id={`show-address-${sector}`}
                            checked={currentConfig.show_company_address}
                            onCheckedChange={(checked) => updateConfig({ show_company_address: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-phone-${sector}`}>Telefone</Label>
                          <Switch
                            id={`show-phone-${sector}`}
                            checked={currentConfig.show_company_phone}
                            onCheckedChange={(checked) => updateConfig({ show_company_phone: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-source-${sector}`}>Origem do Pedido</Label>
                          <Switch
                            id={`show-source-${sector}`}
                            checked={currentConfig.show_order_source}
                            onCheckedChange={(checked) => updateConfig({ show_order_source: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-customer-${sector}`}>Info do Cliente</Label>
                          <Switch
                            id={`show-customer-${sector}`}
                            checked={currentConfig.show_customer_info}
                            onCheckedChange={(checked) => updateConfig({ show_customer_info: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-customer-address-${sector}`}>Endereço do Cliente</Label>
                          <Switch
                            id={`show-customer-address-${sector}`}
                            checked={currentConfig.show_customer_address}
                            onCheckedChange={(checked) => updateConfig({ show_customer_address: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-item-obs-${sector}`}>Obs dos Itens</Label>
                          <Switch
                            id={`show-item-obs-${sector}`}
                            checked={currentConfig.show_item_observations}
                            onCheckedChange={(checked) => updateConfig({ show_item_observations: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-order-obs-${sector}`}>Obs do Pedido</Label>
                          <Switch
                            id={`show-order-obs-${sector}`}
                            checked={currentConfig.show_order_observations}
                            onCheckedChange={(checked) => updateConfig({ show_order_observations: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-payment-${sector}`}>Forma de Pagamento</Label>
                          <Switch
                            id={`show-payment-${sector}`}
                            checked={currentConfig.show_payment_method}
                            onCheckedChange={(checked) => updateConfig({ show_payment_method: checked })}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor={`show-footer-${sector}`}>Mensagem de Rodapé</Label>
                          <Switch
                            id={`show-footer-${sector}`}
                            checked={currentConfig.show_footer_message}
                            onCheckedChange={(checked) => updateConfig({ show_footer_message: checked })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Configurações Adicionais */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Configurações Adicionais</h3>
                      
                      <div className="space-y-2">
                        <Label>Espaçamento Entre Linhas</Label>
                        <RadioGroup
                          value={currentConfig.line_spacing}
                          onValueChange={(v) => updateConfig({ line_spacing: v as LineSpacing })}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="compact" id={`compact-${sector}`} />
                            <Label htmlFor={`compact-${sector}`}>Compacto</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="normal" id={`normal-${sector}`} />
                            <Label htmlFor={`normal-${sector}`}>Normal</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="relaxed" id={`relaxed-${sector}`} />
                            <Label htmlFor={`relaxed-${sector}`}>Relaxado</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2">
                        <Label>Linhas Extras Antes do Corte: {currentConfig.extra_feed_lines}</Label>
                        <Slider
                          value={[currentConfig.extra_feed_lines]}
                          onValueChange={([value]) => updateConfig({ extra_feed_lines: value })}
                          min={0}
                          max={10}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`footer-msg-${sector}`}>Mensagem do Rodapé</Label>
                        <Textarea
                          id={`footer-msg-${sector}`}
                          value={currentConfig.footer_message}
                          onChange={(e) => updateConfig({ footer_message: e.target.value })}
                          placeholder="Ex: Obrigado pela preferência!"
                          rows={2}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor={`cut-paper-${sector}`}>Cortar Papel Automaticamente</Label>
                        <Switch
                          id={`cut-paper-${sector}`}
                          checked={currentConfig.cut_paper}
                          onCheckedChange={(checked) => updateConfig({ cut_paper: checked })}
                        />
                      </div>
                    </div>

                    {/* Text Formatting Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Formatação de Texto</h3>
                      
                      <div className="space-y-3">
                        {(Object.keys(sectionLabels) as Array<keyof typeof sectionLabels>).map((section) => (
                          <Card key={section}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">{sectionLabels[section]}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={currentConfig.formatting[section].bold}
                                    onCheckedChange={(checked) => updateFormatting(section, 'bold', checked)}
                                    id={`${section}-bold-${sector}`}
                                  />
                                  <Label htmlFor={`${section}-bold-${sector}`}>Negrito</Label>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={currentConfig.formatting[section].underline}
                                    onCheckedChange={(checked) => updateFormatting(section, 'underline', checked)}
                                    id={`${section}-underline-${sector}`}
                                  />
                                  <Label htmlFor={`${section}-underline-${sector}`}>Sublinhado</Label>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Alinhamento</Label>
                                <RadioGroup
                                  value={currentConfig.formatting[section].align}
                                  onValueChange={(value) => updateFormatting(section, 'align', value)}
                                >
                                  <div className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="left" id={`${section}-left-${sector}`} />
                                      <Label htmlFor={`${section}-left-${sector}`}>Esquerda</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="center" id={`${section}-center-${sector}`} />
                                      <Label htmlFor={`${section}-center-${sector}`}>Centro</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="right" id={`${section}-right-${sector}`} />
                                      <Label htmlFor={`${section}-right-${sector}`}>Direita</Label>
                                    </div>
                                  </div>
                                </RadioGroup>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Preview */}
                  <div className="lg:sticky lg:top-6">
                    <PrintPreview config={currentConfig} sector={selectedSector} />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-6 flex gap-2 justify-end">
            <Button onClick={handleTestPrint} disabled={isTesting} variant="outline">
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Imprimindo...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Teste
                </>
              )}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
