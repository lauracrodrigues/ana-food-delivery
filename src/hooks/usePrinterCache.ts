import { useEffect } from 'react';
import { printerCache } from '@/lib/printer-cache';
import { QZTrayPrinter } from '@/lib/qz-tray';

/**
 * Hook para inicializar cache de impressoras no login
 */
export function usePrinterCache() {
  useEffect(() => {
    const initializePrinterCache = async () => {
      // Verificar se já tem cache válido
      if (printerCache.isValid()) {
        console.log('✅ Cache de impressoras já válido');
        return;
      }

      // Buscar impressoras e cachear
      try {
        console.log('🔄 Inicializando cache de impressoras...');
        const qzTray = QZTrayPrinter.getInstance();
        const printers = await qzTray.getPrinters();
        printerCache.set(printers);
        console.log('✅ Cache de impressoras inicializado:', printers.length, 'impressoras');
      } catch (error) {
        console.error('❌ Erro ao inicializar cache de impressoras:', error);
        // Não lançar erro - falha silenciosa
      }
    };

    // Delay para não impactar carregamento inicial
    const timer = setTimeout(initializePrinterCache, 2000);
    
    return () => clearTimeout(timer);
  }, []);
}
