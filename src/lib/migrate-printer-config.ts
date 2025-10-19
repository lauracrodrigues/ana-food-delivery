import type { ExtendedLayoutConfig } from '@/types/printer-layout-extended';

/**
 * Migra configurações de impressão antigas para novas tags
 * - {telefone} → {telefone_empresa}
 * - {endereco} → {endereco_empresa}
 * - Remove {bairro} e {cidade} (agora são parte do endereço)
 */
export function migratePrinterConfig(config: ExtendedLayoutConfig): ExtendedLayoutConfig {
  if (!config.elements) return config;
  
  const migratedElements = config.elements.map(el => {
    let tag = el.tag;
    let label = el.label;
    
    // Migrar tags antigas para novas
    if (tag === '{telefone}' as any) {
      tag = '{telefone_empresa}';
      label = 'Telefone Empresa';
    }
    if (tag === '{endereco}' as any) {
      tag = '{endereco_empresa}';
      label = 'Endereço Empresa';
    }
    
    // Remover campos obsoletos (bairro e cidade agora fazem parte do endereço)
    if ((tag as string) === '{bairro}' || (tag as string) === '{cidade}') {
      return null;
    }
    
    return { ...el, tag, label };
  }).filter(Boolean) as any[];
  
  return {
    ...config,
    elements: migratedElements
  };
}
