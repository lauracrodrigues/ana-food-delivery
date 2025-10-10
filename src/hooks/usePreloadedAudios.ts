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

  // Pré-carregar todos os áudios com tolerância a falhas
  useEffect(() => {
    let mounted = true;
    const loadAudios = async () => {
      console.log(`[AUDIO] Preloading - starting ${audioUrls.length} audios`);
      setLoading(true);
      setLoadedCount(0);
      setError(null);

      // Criar objetos Audio para cada URL com tratamento individual de erros
      const loadPromises = audioUrls.map((url) => {
        return new Promise<{ url: string; success: boolean; audio?: HTMLAudioElement }>((resolve) => {
          const audio = new Audio();
          
          // Timeout de 5 segundos para cada áudio
          const timeout = setTimeout(() => {
            console.warn(`[AUDIO] Load Timeout - ${url}`);
            resolve({ url, success: false });
          }, 5000);

          audio.addEventListener('canplaythrough', () => {
            clearTimeout(timeout);
            if (mounted) {
              audioPoolRef.current.set(url, audio);
              setLoadedCount(prev => {
                const newCount = prev + 1;
                console.log(`[AUDIO] Loaded ${newCount}/${audioUrls.length} - ${url}`);
                return newCount;
              });
              resolve({ url, success: true, audio });
            }
          }, { once: true });

          audio.addEventListener('error', (e) => {
            clearTimeout(timeout);
            console.error(`[AUDIO] Load Error - ${url}`, e);
            // Não rejeitar, apenas resolver como falha
            resolve({ url, success: false });
          }, { once: true });

          // Iniciar carregamento
          try {
            audio.preload = 'auto';
            audio.src = url;
            audio.load();
          } catch (err) {
            clearTimeout(timeout);
            console.error(`[AUDIO] Exception loading - ${url}`, err);
            resolve({ url, success: false });
          }
        });
      });

      // Aguardar todos os áudios tentarem carregar (com tolerância a falhas)
      const results = await Promise.all(loadPromises);
      
      if (mounted) {
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.length - successCount;
        
        if (failedCount > 0) {
          console.warn(`[AUDIO] Partial Load - ${successCount}/${audioUrls.length} succeeded, ${failedCount} failed`);
          const failedUrls = results.filter(r => !r.success).map(r => r.url);
          console.warn(`[AUDIO] Failed URLs:`, failedUrls);
        } else {
          console.log(`[AUDIO] Ready - all ${audioUrls.length} audios cached`);
        }
        
        setLoading(false);
        
        // Definir erro apenas se NENHUM áudio carregar
        if (successCount === 0) {
          setError(new Error('Failed to load any audio files'));
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
