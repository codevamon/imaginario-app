import { useState, useCallback, useEffect } from 'react';
import { verifyAudioCacheWithProgress } from '../cache/mediaCacheService';
import { Preferences } from '@capacitor/preferences';
import { cacheAudio } from '../cache/mediaCacheService';
import { Network } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';
import { useIonToast } from '@ionic/react';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Estado global que persiste entre navegaciones
const verificationState = {
  running: false,
  progress: { total: 0, checked: 0, missing: 0, downloading: 0, completed: 0 }
};

/**
 * Escribe una entrada en el archivo de log de reparaciones
 */
async function writeRepairLog(url: string, sizeKB: number, result: string = '✅ Reparado'): Promise<void> {
  try {
    const logPath = 'imaginario/logs/repair.log';
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${result}: ${url} (${sizeKB} KB)\n`;

    // Verificar si el archivo de log existe
    try {
      const existingFile = await Filesystem.readFile({
        path: logPath,
        directory: Directory.Data,
      });
      const existingData = typeof existingFile.data === 'string' ? existingFile.data : '';
      const newData = existingData + entry;
      
      await Filesystem.writeFile({
        path: logPath,
        directory: Directory.Data,
        data: newData,
        recursive: true,
      });
    } catch {
      // Si no existe, lo crea
      await Filesystem.writeFile({
        path: logPath,
        directory: Directory.Data,
        data: entry,
        recursive: true,
      });
    }
  } catch (logErr) {
    console.warn('[RepairLog] No se pudo escribir en repair.log:', logErr);
  }
}

/**
 * Genera un hash SHA-256 de la URL para usarlo como nombre de archivo
 */
async function sha256(url: string): Promise<string> {
  try {
    // Normalizar URL: eliminar query params y fragmentos para mantener hashes consistentes
    if (url.includes('?') || url.includes('#')) {
      try {
        const u = new URL(url);
        u.search = '';
        u.hash = '';
        url = u.toString();
      } catch {
        // Si no es una URL válida, eliminar manualmente partes comunes
        url = url.split('?')[0].split('#')[0];
      }
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('[AudioVerification] Error generando hash SHA-256:', error);
    // Fallback: usar un hash simple basado en la URL
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
  }
}

export function useAudioVerification() {
  const [presentToast] = useIonToast();
  
  // Inicializar estados locales desde el estado global
  const [progress, setProgress] = useState(verificationState.progress);
  const [running, setRunning] = useState(verificationState.running);
  const [repairing, setRepairing] = useState(false);
  const [repairCount, setRepairCount] = useState<number>(0);
  const [totalRepairs, setTotalRepairs] = useState<number>(0);

  // Cargar contador histórico de reparaciones al montar
  useEffect(() => {
    const loadRepairCount = async () => {
      const { value } = await Preferences.get({ key: 'repairCount' });
      if (value) setRepairCount(parseInt(value));
    };
    loadRepairCount();
  }, []);

  // Cargar valor inicial desde almacenamiento
  useEffect(() => {
    Preferences.get({ key: 'totalRepairs' }).then(res => {
      if (res.value) setTotalRepairs(parseInt(res.value, 10) || 0);
    });
  }, []);

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

  const repairMissing = useCallback(async () => {
    try {
      const { value } = await Preferences.get({ key: 'missingQueue' });
      if (!value) return;
      
      const missing = JSON.parse(value);
      if (missing.length === 0) return;

      setRepairing(true);
      console.log('[RepairAudio] 🔄 Reparando', missing.length, 'audios...');
      let repairedCount = 0;

      // Verificación binaria: comprobar archivos existentes que puedan estar corruptos
      let binaryRepairedCount = 0;
      for (const url of missing) {
        try {
          const hash = await sha256(url);
          const path = `imaginario/audio/${hash}.mp3`;
          
          try {
            const stat = await Filesystem.stat({ path, directory: Directory.Data });
            const file = await Filesystem.readFile({ path, directory: Directory.Data });

            // Verificar encabezado ID3 y tamaño
            const fileData = typeof file.data === 'string' ? file.data : '';
            if (fileData) {
              const bytes = atob(fileData.substring(0, 20));
              const hasID3 = bytes.startsWith('ID3');
              const isTooSmall = stat.size < 10240; // menor a 10 KB = sospechoso

              if (!hasID3 || isTooSmall) {
                console.warn('[VerifyAudio] Archivo corrupto o incompleto, re-descargando:', path);
                await Filesystem.deleteFile({ path, directory: Directory.Data });

                const response = await fetch(url);
                const blob = await response.blob();
                const reader = new FileReader();

                const data: string = await new Promise((resolve, reject) => {
                  reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });

                await Filesystem.writeFile({
                  path,
                  directory: Directory.Data,
                  data,
                  recursive: true,
                  encoding: 'base64' as any, // Capacitor 7 no lo tipa, pero sigue funcionando
                });

                binaryRepairedCount++;
                
                // Registrar en el log
                const sizeKB = Math.round(blob.size / 1024);
                await writeRepairLog(url, sizeKB, '🔧 Reparado (corrupto)');
              }
            }
          } catch (statErr) {
            // Archivo no existe o error al leerlo, continuar con el flujo normal
            console.log('[VerifyAudio] Archivo no existe o no se pudo leer:', path);
          }
        } catch (err) {
          console.warn('[VerifyAudio] Error verificando o reparando archivo', err);
        }
      }

      // Bucle principal de reparación
      for (const url of missing) {
        try {
          await cacheAudio(url);
          repairedCount++;
          console.log('[RepairAudio] ✅ Reparado:', url);
          
          // Registrar en el log
          try {
            const hash = await sha256(url);
            const path = `imaginario/audio/${hash}.mp3`;
            const stat = await Filesystem.stat({ path, directory: Directory.Data });
            const sizeKB = Math.round((stat.size || 0) / 1024);
            await writeRepairLog(url, sizeKB);
          } catch (logErr) {
            console.warn('[RepairLog] No se pudo obtener tamaño para log:', logErr);
            // Registrar sin tamaño si no se puede obtener
            await writeRepairLog(url, 0);
          }
        } catch (err) {
          console.warn('[RepairAudio] ⚠️ Falló reparación de', url, err);
        }
      }

      setRepairing(false);
      await Preferences.remove({ key: 'missingQueue' });

      // Mostrar toast de verificación binaria si se repararon archivos corruptos
      if (binaryRepairedCount > 0) {
        presentToast({
          message: `🔧 ${binaryRepairedCount} audios reparados. Log actualizado.`,
          duration: 3000,
          position: 'bottom',
          color: 'success',
        });
        const prev = (await Preferences.get({ key: 'totalRepairs' })).value;
        const total = (parseInt(prev || '0') + binaryRepairedCount).toString();
        await Preferences.set({ key: 'totalRepairs', value: total });
        setTotalRepairs(parseInt(total));
      }

      if (repairedCount > 0) {
        // Actualizar contador histórico
        const { value } = await Preferences.get({ key: 'repairCount' });
        const previous = parseInt(value || '0');
        const newTotal = previous + repairedCount;
        await Preferences.set({ key: 'repairCount', value: newTotal.toString() });
        setRepairCount(newTotal);

        // Mostrar notificación
        presentToast({
          message: `✅ ${repairedCount} audios reparados. Log actualizado.`,
          duration: 3500,
          color: 'success',
          position: 'bottom',
        });
        console.info(`[AudioRepair] ${repairedCount} audios reparados con éxito`);

        try {
          const newTotal = totalRepairs + repairedCount;
          setTotalRepairs(newTotal);
          await Preferences.set({ key: 'totalRepairs', value: String(newTotal) });
          console.info(`[AudioRepair] Total acumulado de reparaciones: ${newTotal}`);
        } catch (err) {
          console.warn('[AudioRepair] No se pudo guardar total acumulado:', err);
        }
      }
    } catch (err) {
      console.warn('[RepairAudio] ⚠️ Error en repairMissing:', err);
      setRepairing(false);
    }
  }, [presentToast, totalRepairs]);

  // Ejecutar reparación automática cuando hay conexión
  useEffect(() => {
    let listenerHandle: PluginListenerHandle | null = null;

    (async () => {
      listenerHandle = await Network.addListener('networkStatusChange', async (status) => {
        if (status.connected && !repairing) {
          await repairMissing();
        }
      });
    })();

    return () => {
      (async () => {
        if (listenerHandle) {
          await listenerHandle.remove();
        }
      })();
    };
  }, [repairing, repairMissing]);

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
    state: { ...progress, totalRepairs }, // Alias para compatibilidad con el código que espera 'state'
    repairing,
    repairMissing,
    repairCount,
    totalRepairs
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

