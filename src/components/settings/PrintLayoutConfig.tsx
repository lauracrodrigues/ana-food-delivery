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
import type { LayoutConfig, PrintSector, PaperWidth, FontSize, LineSpacing } from "@/types/printer-layout";
import { PAPER_WIDTHS, DEFAULT_LAYOUT_CONFIG } from "@/types/printer-layout";
import { toast } from "sonner";

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

  const currentConfig = configs[selectedSector];

  const updateConfig = (updates: Partial<LayoutConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [selectedSector]: { ...prev[selectedSector], ...updates },
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

  const sectorLabels: Record<PrintSector, string> = {
    caixa: "Caixa",
    cozinha1: "Cozinha 1",
    cozinha2: "Cozinha 2",
    copa_bar: "Copa/Bar",
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
                    <Label>Caracteres por Linha</Label>
                    <Input value={currentConfig.chars_per_line} disabled />
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
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
