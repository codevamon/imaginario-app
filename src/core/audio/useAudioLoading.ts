import { useEffect, useState } from 'react';
import { audioManager } from './player';

/**
 * Hook que expone el estado de carga (downloading/caching) de un track específico
 * @param trackId - ID del track a monitorear
 * @returns boolean indicando si el track está cargando
 */
export function useAudioLoading(trackId: string | null): boolean {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trackId) {
      setLoading(false);
      return;
    }

    // Verificar estado inicial
    setLoading(audioManager.getLoadingId() === trackId);

    // Escuchar cambios en el estado de carga
    const unsub = audioManager.onLoading((loadingId) => {
      setLoading(loadingId === trackId);
    });

    return unsub;
  }, [trackId]);

  return loading;
}

