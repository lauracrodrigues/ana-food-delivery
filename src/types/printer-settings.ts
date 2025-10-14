import type { ExtendedLayoutConfig } from './printer-layout-extended';

export type PrintSector = 'caixa' | 'cozinha_1' | 'cozinha_2' | 'copa_bar';

export interface SectorConfig {
  enabled: boolean;
  printer_name: string;
  copies: number;
  layout: ExtendedLayoutConfig;
}

export interface PrinterSettings {
  auto_print: boolean;
  sectors: Record<PrintSector, SectorConfig>;
}

export const SECTOR_LABELS: Record<PrintSector, { label: string; icon: string }> = {
  caixa: { label: 'Caixa', icon: '💰' },
  cozinha_1: { label: 'Cozinha 1', icon: '👨‍🍳' },
  cozinha_2: { label: 'Cozinha 2', icon: '👩‍🍳' },
  copa_bar: { label: 'Copa/Bar', icon: '🍹' }
};
