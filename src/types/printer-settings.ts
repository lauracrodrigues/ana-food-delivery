import type { ExtendedLayoutConfig } from './printer-layout-extended';

// v1.1.0 — Adiciona cozinha_3
export type PrintSector = 'caixa' | 'cozinha_1' | 'cozinha_2' | 'cozinha_3' | 'copa_bar';

export type CutType = 'none' | 'partial' | 'full';
export type TextMode = 'condensed' | 'normal' | 'expanded';

export interface SectorConfig {
  enabled: boolean;
  printer_name: string;
  copies: number;
  layout: ExtendedLayoutConfig;
  cut_type: CutType;
  text_mode: TextMode;
}

export interface PrinterSettings {
  auto_print: boolean;
  sectors: Record<PrintSector, SectorConfig>;
}

export const SECTOR_LABELS: Record<PrintSector, { label: string; icon: string }> = {
  caixa:     { label: 'Caixa',     icon: '💰' },
  cozinha_1: { label: 'Cozinha 1', icon: '👨‍🍳' },
  cozinha_2: { label: 'Cozinha 2', icon: '👩‍🍳' },
  cozinha_3: { label: 'Cozinha 3', icon: '🧑‍🍳' },
  copa_bar:  { label: 'Copa/Bar',  icon: '🍹' }
};

export const SECTOR_ORDER: PrintSector[] = ['caixa', 'cozinha_1', 'cozinha_2', 'cozinha_3', 'copa_bar'];
