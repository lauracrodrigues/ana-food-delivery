import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Pré-carregar todos os áudios
  useEffect(() => {
    let mounted = true;
    const loadAudios = async () => {
      console.log(`[AUDIO] Preloading - starting ${audioUrls.length} audios`);
      setLoading(true);
      setLoadedCount(0);
      setError(null);

      try {
        // Criar objetos Audio para cada URL
        const loadPromises = audioUrls.map((url, index) => {
          return new Promise<void>((resolve, reject) => {
            const audio = new Audio();
            
            audio.addEventListener('canplaythrough', () => {
              if (mounted) {
                audioPoolRef.current.set(url, audio);
                setLoadedCount(prev => {
                  const newCount = prev + 1;
                  console.log(`[AUDIO] Loaded ${newCount}/${audioUrls.length} - ${url}`);
                  return newCount;
                });
                resolve();
              }
            }, { once: true });

            audio.addEventListener('error', (e) => {
              console.error(`[AUDIO] Load Error - ${url}`, e);
              reject(new Error(`Failed to load audio: ${url}`));
            }, { once: true });

            // Iniciar carregamento
            audio.preload = 'auto';
            audio.src = url;
            audio.load();
          });
        });

        // Aguardar todos os áudios carregarem
        await Promise.all(loadPromises);

        if (mounted) {
          setLoading(false);
          console.log(`[AUDIO] Ready - all ${audioUrls.length} audios cached`);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error('Audio preload failed');
          setError(error);
          setLoading(false);
          console.error('[AUDIO] Preload Error', error);
        }
      }
    };

    if (audioUrls.length > 0) {
      loadAudios();
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
      // Limpar objetos de áudio ao desmontar
      audioPoolRef.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioPoolRef.current.clear();
    };
  }, [audioUrls]);

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
      console.warn(`[AUDIO] Not found in cache - ${audioUrl}`);
      // Fallback: criar e tocar imediatamente
      const fallbackAudio = new Audio(audioUrl);
      fallbackAudio.play().catch(err => {
        console.error(`[AUDIO] Play Error - ${audioUrl}`, err);
      });
      return;
    }

    // Resetar para o início
    audio.currentTime = 0;
    
    // Tocar áudio
    audio.play()
      .then(() => {
        console.log(`[AUDIO] Playing - ${audioUrl}`);
        currentAudioRef.current = audio;
      })
      .catch(err => {
        console.error(`[AUDIO] Play Error - ${audioUrl}`, err);
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
