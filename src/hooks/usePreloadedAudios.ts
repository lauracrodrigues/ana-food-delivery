import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UsePreloadedAudiosReturn {
  play: (audioUrl: string) => void;
  stop: () => void;
  loading: boolean;
  loadedCount: number;
  totalCount: number;
  error: Error | null;
}

export function usePreloadedAudios(audioUrls: string[]): UsePreloadedAudiosReturn {
  const [loading, setLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  
  const audioPoolRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const loadingRef = useRef(false);

  // Memoizar URLs para evitar re-execuções
  const urlsKey = useMemo(() => audioUrls.join('|'), [audioUrls]);

  // Pré-carregar todos os áudios com tolerância a falhas
  useEffect(() => {
    // Evitar múltiplas execuções simultâneas
    if (loadingRef.current) {
      console.log('[AUDIO] Already loading, skipping...');
      return;
    }

    let mounted = true;
    loadingRef.current = true;

    const loadAudios = async () => {
      console.log(`[AUDIO] Starting preload of ${audioUrls.length} audios`);
      setLoading(true);
      setLoadedCount(0);
      setError(null);

      // Limpar pool anterior
      audioPoolRef.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioPoolRef.current.clear();

      let successCount = 0;

      // Carregar áudios sequencialmente para evitar sobrecarga
      for (const url of audioUrls) {
        if (!mounted) break;

        try {
          const audio = new Audio();
          let resolved = false;

          const loadPromise = new Promise<boolean>((resolve) => {
            const timeout = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                console.warn(`[AUDIO] Timeout - ${url}`);
                resolve(false);
              }
            }, 3000);

            const onSuccess = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                if (mounted) {
                  audioPoolRef.current.set(url, audio);
                  successCount++;
                  setLoadedCount(successCount);
                  console.log(`[AUDIO] ✓ Loaded (${successCount}/${audioUrls.length}) - ${url}`);
                }
                resolve(true);
              }
            };

            const onError = () => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                cleanup();
                console.warn(`[AUDIO] ✗ Failed - ${url}`);
                resolve(false);
              }
            };

            const cleanup = () => {
              audio.removeEventListener('canplaythrough', onSuccess);
              audio.removeEventListener('loadeddata', onSuccess);
              audio.removeEventListener('error', onError);
            };

            audio.addEventListener('canplaythrough', onSuccess, { once: true });
            audio.addEventListener('loadeddata', onSuccess, { once: true });
            audio.addEventListener('error', onError, { once: true });

            audio.preload = 'auto';
            audio.volume = 0.5;
            audio.src = url;
            audio.load();
          });

          await loadPromise;
        } catch (err) {
          console.error(`[AUDIO] Exception - ${url}`, err);
        }
      }

      if (mounted) {
        const failedCount = audioUrls.length - successCount;
        
        if (failedCount > 0) {
          console.warn(`[AUDIO] Complete - ${successCount}/${audioUrls.length} loaded, ${failedCount} failed`);
        } else {
          console.log(`[AUDIO] ✓ All ${audioUrls.length} audios ready`);
        }
        
        setLoading(false);
        loadingRef.current = false;
        
        if (successCount === 0) {
          setError(new Error('Nenhum áudio pôde ser carregado'));
        }
      }
    };

    if (audioUrls.length > 0) {
      loadAudios();
    } else {
      setLoading(false);
      loadingRef.current = false;
    }

    return () => {
      mounted = false;
      loadingRef.current = false;
    };
  }, [urlsKey, audioUrls.length]);

  const stop = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  const play = useCallback((audioUrl: string) => {
    // Parar áudio atual se estiver tocando
    stop();

    // Buscar áudio pré-carregado
    const audio = audioPoolRef.current.get(audioUrl);

    if (!audio) {
      console.warn(`[AUDIO] Not found in cache - ${audioUrl}, using fallback`);
      // Fallback: criar e tocar imediatamente
      const fallbackAudio = new Audio(audioUrl);
      currentAudioRef.current = fallbackAudio;
      
      fallbackAudio.play()
        .then(() => {
          console.log(`[AUDIO] Playing (fallback) - ${audioUrl}`);
        })
        .catch(err => {
          console.error(`[AUDIO] Fallback Play Error - ${audioUrl}`, err);
        });
      return;
    }

    // Resetar para o início
    audio.currentTime = 0;
    
    // Tocar áudio pré-carregado
    audio.play()
      .then(() => {
        console.log(`[AUDIO] Playing (cached) - ${audioUrl}`);
        currentAudioRef.current = audio;
      })
      .catch(err => {
        console.error(`[AUDIO] Play Error - ${audioUrl}`, err);
        // Tentar fallback em caso de erro
        const fallbackAudio = new Audio(audioUrl);
        fallbackAudio.play().catch(e => {
          console.error(`[AUDIO] Fallback also failed - ${audioUrl}`, e);
        });
      });
  }, [stop]);

  return {
    play,
    stop,
    loading,
    loadedCount,
    totalCount: audioUrls.length,
    error
  };
}
