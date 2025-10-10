// Utilitários de cache e validação

export interface PrinterData {
  id: string;
  nome: string;
  setor_id?: string;
  [key: string]: any;
}

export interface CategoryData {
  id: string;
  name: string;
  display_order?: number;
  [key: string]: any;
}

/**
 * Valida se dados de impressora estão completos
 */
export function validatePrinterData(printer: PrinterData): boolean {
  const isValid = !!(
    printer.id?.trim() &&
    printer.nome?.trim()
  );

  if (!isValid) {
    console.warn('[CACHE] Validation Failed - printer missing required fields:', {
      id: printer.id,
      nome: printer.nome
    });
  }

  return isValid;
}

/**
 * Valida array de impressoras
 */
export function validatePrintersArray(printers: PrinterData[]): boolean {
  if (!Array.isArray(printers)) {
    console.warn('[CACHE] Validation Failed - printers is not an array');
    return false;
  }

  return printers.every(validatePrinterData);
}

/**
 * Valida dados de categoria
 */
export function validateCategoryData(category: CategoryData): boolean {
  const isValid = !!(
    category.id?.trim() &&
    category.name?.trim()
  );

  if (!isValid) {
    console.warn('[CACHE] Validation Failed - category missing required fields:', {
      id: category.id,
      name: category.name
    });
  }

  return isValid;
}

/**
 * Valida array de categorias
 */
export function validateCategoriesArray(categories: CategoryData[]): boolean {
  if (!Array.isArray(categories)) {
    console.warn('[CACHE] Validation Failed - categories is not an array');
    return false;
  }

  return categories.every(validateCategoryData);
}

/**
 * TTLs recomendados por tipo de dado
 */
export const CacheTTL = {
  // Configurações da empresa (muda raramente)
  COMPANY_SETTINGS: 3600, // 1 hora

  // Setores e impressoras (crítico, validação frequente)
  PRINTERS: 1800, // 30 minutos

  // Categorias e produtos
  CATEGORIES: 1800, // 30 minutos
  PRODUCTS: 1800, // 30 minutos

  // Áudios (raramente mudam)
  AUDIOS: 7200, // 2 horas

  // Preferências do usuário
  USER_PREFERENCES: 0, // Até logout

  // Configurações da loja
  STORE_SETTINGS: 1800, // 30 minutos
} as const;

/**
 * Chaves de cache padrão
 */
export const CacheKeys = {
  COMPANY_SETTINGS: 'company_settings',
  STORE_SETTINGS: 'store_settings',
  PRINTERS: 'printers',
  PRINT_SECTORS: 'print_sectors',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  AUDIOS_LIST: 'audios_list',
  USER_PREFERENCES: 'user_preferences',
  PAYMENT_METHODS: 'payment_methods',
  DELIVERY_FEES: 'delivery_fees',
} as const;
