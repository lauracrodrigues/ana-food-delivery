import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheContextType {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T, ttl?: number) => void;
  invalidate: (key?: string) => void;
  isValid: (key: string) => boolean;
  getAge: (key: string) => number | null;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

interface CacheProviderProps {
  children: React.ReactNode;
  defaultTTL?: number;
  enableLogs?: boolean;
}

export function CacheProvider({ 
  children, 
  defaultTTL = 3600,
  enableLogs = process.env.NODE_ENV === 'development'
}: CacheProviderProps) {
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());
  const [, forceUpdate] = useState({});

  const log = useCallback((message: string, ...args: any[]) => {
    if (enableLogs) {
      console.log(`[CACHE] ${message}`, ...args);
    }
  }, [enableLogs]);

  const get = useCallback(<T,>(key: string): T | null => {
    const entry = cacheRef.current.get(key);
    
    if (!entry) {
      log(`Miss - key: ${key}`);
      return null;
    }

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.ttl * 1000;

    if (isExpired) {
      log(`Expired - key: ${key} | age: ${Math.round(age / 1000)}s`);
      cacheRef.current.delete(key);
      return null;
    }

    log(`Hit - key: ${key} | age: ${Math.round(age / 1000)}s`);
    return entry.data as T;
  }, [log]);

  const set = useCallback(<T,>(key: string, data: T, ttl: number = defaultTTL) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    log(`Update - key: ${key} | ttl: ${ttl}s`);
  }, [defaultTTL, log]);

  const invalidate = useCallback((key?: string) => {
    if (key) {
      cacheRef.current.delete(key);
      log(`Invalidate - key: ${key}`);
    } else {
      cacheRef.current.clear();
      log('Clear All');
    }
    forceUpdate({});
  }, [log]);

  const isValid = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    return age <= entry.ttl * 1000;
  }, []);

  const getAge = useCallback((key: string): number | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;

    return Math.round((Date.now() - entry.timestamp) / 1000);
  }, []);

  // Limpar cache expirado periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      cacheRef.current.forEach((entry, key) => {
        const age = now - entry.timestamp;
        if (age > entry.ttl * 1000) {
          cacheRef.current.delete(key);
          cleaned++;
        }
      });

      if (cleaned > 0) {
        log(`Auto-cleanup - removed ${cleaned} expired entries`);
      }
    }, 60000); // Cada 1 minuto

    return () => clearInterval(interval);
  }, [log]);

  const value: CacheContextType = {
    get,
    set,
    invalidate,
    isValid,
    getAge
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within CacheProvider');
  }
  return context;
}
