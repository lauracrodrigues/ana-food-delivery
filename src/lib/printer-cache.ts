/**
 * Sistema de cache de impressoras usando localStorage
 * TTL: 30 minutos
 */

const CACHE_KEY = 'qz_printers_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos em ms

interface PrinterCache {
  printers: string[];
  timestamp: number;
}

export const printerCache = {
  /**
   * Salva lista de impressoras no cache
   */
  set(printers: string[]): void {
    const cache: PrinterCache = {
      printers,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log('✅ Cache de impressoras atualizado:', printers.length, 'impressoras');
  },

  /**
   * Recupera lista de impressoras do cache (se válido)
   */
  get(): string[] | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cache: PrinterCache = JSON.parse(cached);
      const age = Date.now() - cache.timestamp;

      if (age > CACHE_TTL) {
        console.log('⏰ Cache de impressoras expirado (idade:', Math.round(age / 1000 / 60), 'min)');
        this.clear();
        return null;
      }

      console.log('✅ Cache de impressoras válido:', cache.printers.length, 'impressoras');
      return cache.printers;
    } catch (error) {
      console.error('❌ Erro ao ler cache:', error);
      return null;
    }
  },

  /**
   * Limpa o cache
   */
  clear(): void {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Cache de impressoras limpo');
  },

  /**
   * Verifica se o cache está válido
   */
  isValid(): boolean {
    return this.get() !== null;
  }
};
