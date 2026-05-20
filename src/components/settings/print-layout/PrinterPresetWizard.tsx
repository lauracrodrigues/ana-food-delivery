// v1.0.0 — Wizard preset 1-clique pra configurar setores conforme tipo de operação
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, Utensils, Pizza, Beer, Coffee } from "lucide-react";
import { DEFAULT_EXTENDED_CONFIG } from "@/types/printer-layout-extended";
import type { PrintSector, SectorConfig } from "@/types/printer-settings";

interface Preset {
  id: string;
  name: string;
  description: string;
  icon: any;
  sectors: PrintSector[]; // setores que ficam habilitados
}

const PRESETS: Preset[] = [
  {
    id: "marmitaria",
    name: "Marmitaria simples",
    description: "1 impressora no caixa imprime tudo",
    icon: Utensils,
    sectors: ["caixa"],
  },
  {
    id: "hamburgueria",
    name: "Hamburgueria / Lanchonete",
    description: "Caixa + 1 cozinha",
    icon: Coffee,
    sectors: ["caixa", "cozinha_1"],
  },
  {
    id: "pizzaria",
    name: "Pizzaria / Restaurante",
    description: "Caixa + 1 cozinha + bar",
    icon: Pizza,
    sectors: ["caixa", "cozinha_1", "copa_bar"],
  },
  {
    id: "completo",
    name: "Operação completa",
    description: "Todos os setores ativos (escolha impressora de cada)",
    icon: Beer,
    sectors: ["caixa", "cozinha_1", "cozinha_2", "cozinha_3", "copa_bar"],
  },
];

interface Props {
  currentConfig: Record<PrintSector, SectorConfig>;
  availablePrinters: string[];
  onApply: (newConfig: Record<PrintSector, SectorConfig>) => void;
}

export function PrinterPresetWizard({ currentConfig, availablePrinters, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [printerAssign, setPrinterAssign] = useState<Record<string, string>>({});

  const reset = () => {
    setStep(1);
    setSelectedPreset(null);
    setPrinterAssign({});
  };

  const close = () => { setOpen(false); reset(); };

  const applyPreset = () => {
    if (!selectedPreset) return;
    // Constrói novo config: setores do preset ficam enabled com impressora atribuída, resto desabilitado
    const ALL_SECTORS: PrintSector[] = ["caixa", "cozinha_1", "cozinha_2", "cozinha_3", "copa_bar"];
    const newConfig: Record<PrintSector, SectorConfig> = {} as any;
    for (const s of ALL_SECTORS) {
      const isInPreset = selectedPreset.sectors.includes(s);
      newConfig[s] = {
        ...currentConfig[s],
        enabled: isInPreset,
        printer_name: isInPreset ? (printerAssign[s] || currentConfig[s]?.printer_name || "") : (currentConfig[s]?.printer_name || ""),
        copies: currentConfig[s]?.copies || 1,
        layout: currentConfig[s]?.layout || DEFAULT_EXTENDED_CONFIG,
        cut_type: currentConfig[s]?.cut_type || "partial",
        text_mode: currentConfig[s]?.text_mode || "normal",
      };
    }
    onApply(newConfig);
    close();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="default" size="sm" className="gap-2">
        <Sparkles className="h-3.5 w-3.5" />
        Configuração rápida
      </Button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else setOpen(v); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {step === 1 ? "Como funciona sua operação?" : "Escolha a impressora de cada setor"}
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Selecione o modelo que mais se encaixa. Você pode personalizar depois."
                : "Atribua uma impressora pra cada setor. Pode mudar depois nas configurações."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="grid grid-cols-1 gap-2">
              {PRESETS.map(p => {
                const Icon = p.icon;
                const isSelected = selectedPreset?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPreset(p)}
                    className={`text-left p-3 border-2 rounded-lg flex items-start gap-3 transition-colors ${
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                      <div className="text-[10px] mt-1 text-muted-foreground">
                        Setores: {p.sectors.map(s => s.replace("_", " ")).join(" • ")}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step === 2 && selectedPreset && (
            <div className="space-y-3">
              {selectedPreset.sectors.map(s => {
                const labelMap: any = {
                  caixa: "💰 Caixa", cozinha_1: "👨‍🍳 Cozinha 1", cozinha_2: "👩‍🍳 Cozinha 2",
                  cozinha_3: "🧑‍🍳 Cozinha 3", copa_bar: "🍹 Copa/Bar",
                };
                return (
                  <div key={s} className="space-y-1">
                    <Label className="text-xs">{labelMap[s]}</Label>
                    <Select
                      value={printerAssign[s] || ""}
                      onValueChange={(v) => setPrinterAssign(prev => ({ ...prev, [s]: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder={availablePrinters.length ? "Selecione" : "Nenhuma impressora detectada"} /></SelectTrigger>
                      <SelectContent>
                        {availablePrinters.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
              {!availablePrinters.length && (
                <p className="text-xs text-muted-foreground p-2 bg-muted/40 rounded">
                  Nenhuma impressora detectada. Você pode pular e configurar manualmente depois.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            {step === 2 && <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>}
            <Button variant="outline" onClick={close}>Cancelar</Button>
            {step === 1 ? (
              <Button onClick={() => setStep(2)} disabled={!selectedPreset}>Próximo</Button>
            ) : (
              <Button onClick={applyPreset}>Aplicar configuração</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
