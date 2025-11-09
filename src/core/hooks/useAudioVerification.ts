import { useState, useCallback, useEffect } from 'react';
import { verifyAudioCacheWithProgress } from '../cache/mediaCacheService';

// Estado global que persiste entre navegaciones
const verificationState = {
  running: false,
  progress: { total: 0, checked: 0, missing: 0, downloading: 0, completed: 0 }
};

export function useAudioVerification() {
  // Inicializar estados locales desde el estado global
  const [progress, setProgress] = useState(verificationState.progress);
  const [running, setRunning] = useState(verificationState.running);

  // Sincronizar estado local con el global periódicamente y al montar
  useEffect(() => {
    // Sincronizar inmediatamente al montar
    setProgress(verificationState.progress);
    setRunning(verificationState.running);
    
    // Sincronizar periódicamente para capturar cambios desde otros componentes
    const interval = setInterval(() => {
      setProgress(verificationState.progress);
      setRunning(verificationState.running);
    }, 500); // Verificar cada 500ms
    
    return () => clearInterval(interval);
  }, []);

  const startVerification = useCallback(async () => {
    if (verificationState.running) return;
    
    verificationState.running = true;
    setRunning(true);
    
    await verifyAudioCacheWithProgress((status) => {
      verificationState.progress = status;
      setProgress(status);
      console.log('[useAudioVerification] Estado actualizado:', status);
    });
    
    verificationState.running = false;
    setRunning(false);
  }, []);

  return { 
    progress, 
    running, 
    startVerification,
    state: progress // Alias para compatibilidad con el código que espera 'state'
  };
}

/**
 * Revalida un audio específico tras una reparación exitosa
 * Actualiza el estado global de verificación para reflejar que el audio ahora está disponible
 * @param path - Ruta del archivo de audio (ej: "imaginario/audio/{hash}.mp3")
 */
export async function revalidateAudio(path: string): Promise<void> {
  try {
    // Actualizar el estado global de verificación
    if (verificationState.progress.total > 0) {
      // Si el audio estaba marcado como faltante, incrementar completados
      // y decrementar faltantes
      const newCompleted = verificationState.progress.completed + 1;
      const newMissing = Math.max(0, verificationState.progress.missing - 1);
      
      verificationState.progress = {
        ...verificationState.progress,
        completed: newCompleted,
        missing: newMissing,
      };
      
      console.log('[AudioVerification] 🔁 Revalidado tras reparación:', path);
      console.log('[AudioVerification] Nuevo estado:', verificationState.progress);
    } else {
      // Si aún no se ha ejecutado una verificación completa, solo loguear
      console.log('[AudioVerification] 🔁 Audio reparado (sin verificación previa):', path);
    }
  } catch (err) {
    console.warn('[AudioVerification] ⚠️ Error revalidando audio:', err);
  }
}

