import { useEffect, useState } from 'react';
import { audioManager } from './player';

/**
 * Hook que expone el estado de reparación de un track específico
 * @param trackId - ID del track a monitorear
 * @returns boolean indicando si el track está siendo reparado
 */
export function useAudioRepairing(trackId: string | null): boolean {
  const [repairing, setRepairing] = useState(false);

  useEffect(() => {
    if (!trackId) {
      setRepairing(false);
      return;
    }

    // Verificar estado inicial
    setRepairing(audioManager.getRepairingId() === trackId);

    // Escuchar cambios en el estado de reparación
    const unsub = audioManager.onRepairing((repairingId) => {
      setRepairing(repairingId === trackId);
    });

    return unsub;
  }, [trackId]);

  return repairing;
}

