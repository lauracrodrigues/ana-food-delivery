import { useState, useCallback, useRef } from 'react';

interface ThrottledStatusCheckOptions {
  minimumInterval?: number; // Intervalo mínimo entre chamadas em ms
}

export function useThrottledStatusCheck(
  checkStatusFn: (sessionName: string) => Promise<string>,
  options: ThrottledStatusCheckOptions = {}
) {
  const { minimumInterval = 5000 } = options; // Mínimo de 5 segundos entre chamadas
  const [loadingStatus, setLoadingStatus] = useState<Record<string, boolean>>({});
  const lastCheckTime = useRef<Record<string, number>>({});
  const pendingTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const checkStatus = useCallback(async (sessionName: string) => {
    const now = Date.now();
    const lastCheck = lastCheckTime.current[sessionName] || 0;
    const timeSinceLastCheck = now - lastCheck;

    // Se foi verificado recentemente, não fazer nova chamada
    if (timeSinceLastCheck < minimumInterval) {
      console.log(`Throttled: Aguarde ${Math.ceil((minimumInterval - timeSinceLastCheck) / 1000)}s antes de verificar novamente`);
      return null;
    }

    // Cancelar timeout pendente se existir
    if (pendingTimeouts.current[sessionName]) {
      clearTimeout(pendingTimeouts.current[sessionName]);
      delete pendingTimeouts.current[sessionName];
    }

    setLoadingStatus(prev => ({ ...prev, [sessionName]: true }));
    
    try {
      const status = await checkStatusFn(sessionName);
      lastCheckTime.current[sessionName] = Date.now();
      return status;
    } finally {
      setLoadingStatus(prev => ({ ...prev, [sessionName]: false }));
    }
  }, [checkStatusFn, minimumInterval]);

  const scheduleCheck = useCallback((sessionName: string, delay: number) => {
    // Cancelar verificação agendada anterior
    if (pendingTimeouts.current[sessionName]) {
      clearTimeout(pendingTimeouts.current[sessionName]);
    }

    pendingTimeouts.current[sessionName] = setTimeout(() => {
      checkStatus(sessionName);
      delete pendingTimeouts.current[sessionName];
    }, delay);
  }, [checkStatus]);

  const cleanup = useCallback(() => {
    // Limpar todos os timeouts pendentes
    Object.values(pendingTimeouts.current).forEach(timeout => clearTimeout(timeout));
    pendingTimeouts.current = {};
  }, []);

  return {
    checkStatus,
    scheduleCheck,
    loadingStatus,
    cleanup
  };
}