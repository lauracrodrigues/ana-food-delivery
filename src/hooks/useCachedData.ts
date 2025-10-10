import { useState, useEffect, useCallback } from 'react';
import { useCache } from '@/contexts/CacheContext';

interface UseCachedDataOptions<T> {
  ttl?: number;
  validate?: (data: T) => boolean;
  onValidationFail?: () => void;
  staleWhileRevalidate?: boolean;
}

interface UseCachedDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isStale: boolean;
}

export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: UseCachedDataOptions<T> = {}
): UseCachedDataReturn<T> {
  const {
    ttl = 3600,
    validate,
    onValidationFail,
    staleWhileRevalidate = true
  } = options;

  const cache = useCache();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchAndCache = useCallback(async (background = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      setError(null);

      const fetchedData = await fetchFn();

      // Validar dados se função fornecida
      if (validate && !validate(fetchedData)) {
        console.warn(`[CACHE] Validation Failed - key: ${key}`);
        if (onValidationFail) {
          onValidationFail();
        }
        throw new Error('Data validation failed');
      }

      cache.set(key, fetchedData, ttl);
      setData(fetchedData);
      setIsStale(false);

      return fetchedData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setError(error);
      console.error(`[CACHE] Fetch Error - key: ${key}`, error);
      throw error;
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [key, fetchFn, cache, ttl, validate, onValidationFail]);

  const refresh = useCallback(async () => {
    cache.invalidate(key);
    await fetchAndCache(false);
  }, [key, cache, fetchAndCache]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      // Verificar cache primeiro
      const cachedData = cache.get<T>(key);

      if (cachedData) {
        // Validar dados em cache
        if (validate && !validate(cachedData)) {
          console.warn(`[CACHE] Validation Failed - key: ${key} | reason: cached data invalid`);
          if (onValidationFail) {
            onValidationFail();
          }
          // Recarregar dados
          await fetchAndCache(false);
          return;
        }

        setData(cachedData);
        setLoading(false);

        // Stale-while-revalidate: atualizar em background
        if (staleWhileRevalidate && mounted) {
          setIsStale(true);
          fetchAndCache(true).catch(() => {
            // Manter dados em cache se falhar
          });
        }
      } else {
        // Sem cache, buscar dados
        if (mounted) {
          await fetchAndCache(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [key, cache, fetchAndCache, validate, onValidationFail, staleWhileRevalidate]);

  return {
    data,
    loading,
    error,
    refresh,
    isStale
  };
}
