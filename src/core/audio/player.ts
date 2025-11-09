// src/core/audio/player.ts
// Robust AudioManager singleton: controla 1 <audio> global, normaliza URLs y maneja errores.
import { NativeAudio } from '@capacitor-community/native-audio';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { mediaCacheService, ensureCachedMedia } from '../cache/mediaCacheService';
import { revalidateAudio } from '../hooks/useAudioVerification';

type OnChangeCb = (playingId: string | null) => void;
type OnProgressCb = (currentTime: number, duration: number, progress: number) => void;
type OnLoadingCb = (loadingId: string | null) => void;
type OnRepairingCb = (repairingId: string | null) => void;

interface ProgressData {
  currentTime: number;
  duration: number;
  progress: number;
}

/**
 * Re-descarga un archivo de audio desde la URL original
 */
async function reDownloadAudio(url: string, hash: string): Promise<void> {
  try {
    console.log('[AudioManager] 🔄 Re-descargando audio:', url);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} al re-descargar ${url}`);
    }
    const blob = await res.blob();
    
    // Validar que el blob tenga contenido
    if (!blob || blob.size < 1024) {
      throw new Error(`Blob inválido o vacío (${blob?.size || 0} bytes)`);
    }
    
    // Convertir blob a base64 de forma segura
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Convertir bytes a base64 de forma eficiente para archivos grandes
    let base64 = '';
    const chunkSize = 8192; // Procesar en chunks para evitar problemas con archivos grandes
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      base64 += btoa(String.fromCharCode(...chunk));
    }
    
    // Asegurar que el directorio existe
    await Filesystem.mkdir({
      path: 'imaginario/audio',
      directory: Directory.Data,
      recursive: true,
    }).catch(() => {}); // Ignorar si ya existe
    
    // Eliminar archivo corrupto anterior si existe
    try {
      await Filesystem.deleteFile({
        path: `imaginario/audio/${hash}.mp3`,
        directory: Directory.Data,
      });
    } catch {} // Ignorar si no existe
    
    // Escribir archivo nuevo
    await Filesystem.writeFile({
      path: `imaginario/audio/${hash}.mp3`,
      data: base64,
      directory: Directory.Data,
      encoding: 'base64' as Encoding,
      recursive: true,
    });
    
    // Verificar que el archivo se escribió correctamente
    const stat = await Filesystem.stat({
      path: `imaginario/audio/${hash}.mp3`,
      directory: Directory.Data,
    });
    
    if (!stat || (stat.size || 0) < 1024) {
      throw new Error(`Archivo re-descargado tiene tamaño inválido (${stat?.size || 0} bytes)`);
    }
    
    console.log('[AudioManager] ✅ Re-descarga completada para:', hash, `(${(stat.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error('[AudioManager] ❌ Error en re-descarga:', err);
    throw err;
  }
}

async function getFileSize(path: string): Promise<number> {
  try {
    // Extraer el path relativo del URI file://
    // Los URIs pueden ser: file:///path/to/file o capacitor://localhost/_capacitor_file_/path/to/file
    let relativePath = path.replace('file://', '').replace('capacitor://localhost/_capacitor_file_', '');
    
    // Si el path contiene 'imaginario/', extraer solo esa parte
    const imaginarioIndex = relativePath.indexOf('imaginario/');
    if (imaginarioIndex !== -1) {
      relativePath = relativePath.substring(imaginarioIndex);
    } else {
      // Si no tiene 'imaginario/', intentar extraer desde el nombre del archivo
      const fileName = path.split('/').pop() || '';
      relativePath = `imaginario/audio/${fileName}`;
    }
    
    const stat = await Filesystem.stat({
      path: relativePath,
      directory: Directory.Data,
    });
    return stat.size || 0;
  } catch {
    return 0;
  }
}

/**
 * Genera un hash SHA-256 de la URL
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
    console.error('[AudioManager] Error generando hash SHA-256:', error);
    // Fallback: usar un hash simple basado en la URL
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
  }
}

/**
 * Función auxiliar para obtener hash del audio desde la URL
 * Usa SHA-256 para generar un hash consistente (igual que prepareSource)
 */
async function getAudioHash(url: string): Promise<string> {
  // Usar la misma función sha256 que se usa en prepareSource para consistencia
  return await sha256(url);
}

/**
 * Obtiene una URL segura para reproducir audio offline, evitando blobs corruptos
 */
async function getSafeAudioUrl(path: string): Promise<string> {
  // 1. Si ya tenemos un blob:https, usarlo
  if (path.startsWith('blob:') || path.startsWith('http')) return path;

  // 2. Intentar resolver URI nativa
  try {
    const { uri } = await Filesystem.getUri({
      directory: Directory.Data,
      path,
    });
    const fileUri = Capacitor.convertFileSrc(uri);
    console.log('[AudioManager] 🎧 Archivo reproducible localmente:', fileUri);
    return fileUri;
  } catch (err) {
    console.warn('[AudioManager] ❌ No se pudo obtener URI nativa:', err);
  }

  // 3. Si todo falla, fallback seguro usando streaming Base64
  try {
    const result = await Filesystem.readFile({
      path,
      directory: Directory.Data,
    });
    const base64Data = typeof result.data === 'string' ? result.data : '';
    if (!base64Data) {
      throw new Error('No se pudo leer datos del archivo');
    }
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length)
      .fill(0)
      .map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    console.log('[AudioManager] ✅ Fallback a Blob URL exitoso');
    return blobUrl;
  } catch (err) {
    console.error('[AudioManager] 🚫 Error en fallback a Blob URL:', err);
    throw err;
  }
}

/**
 * Prepara la fuente de audio: prioriza medios cacheados, descarga en background si hay conexión
 */
async function prepareSource(originalSrc: string, id: string): Promise<string> {
  try {
    const { connected } = await Network.getStatus();

    // Derivar hash único por URL
    const hash = await sha256(originalSrc);
    const relPath = `imaginario/audio/${hash}.mp3`;

    // Si estamos offline, intenta resolver local
    if (!connected) {
      try {
        const stat = await Filesystem.stat({ path: relPath, directory: Directory.Data });
        if (stat) {
          const uri = await Filesystem.getUri({ path: relPath, directory: Directory.Data });
          const fileUri = uri.uri.startsWith('file://') ? uri.uri : `file://${uri.uri}`;
          console.log('[AudioManager] 🎧 Reproduciendo desde caché local:', fileUri);
          return fileUri;
        }
      } catch {
        console.warn('[AudioManager] ⚠️ Archivo no disponible sin conexión:', originalSrc);
        if (typeof window !== 'undefined') {
          const toast = document.createElement('ion-toast');
          toast.message = '⚠️ Archivo no disponible sin conexión';
          toast.duration = 2000;
          document.body.appendChild(toast);
          toast.present();
        }
        return originalSrc;
      }
    }

    // Si hay red: asegurar copia local, devolver original
    await ensureCachedMedia(originalSrc, 'audio');
    return originalSrc;
  } catch (error) {
    console.warn('[AudioManager] Error en prepareSource:', error);
    return originalSrc;
  }
}

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private playingId: string | null = null;
  private loadingId: string | null = null;
  private repairingId: string | null = null;
  private cbs: OnChangeCb[] = [];
  private progressCbs: OnProgressCb[] = [];
  private loadingCbs: OnLoadingCb[] = [];
  private repairingCbs: OnRepairingCb[] = [];
  private animationFrameId: number | null = null;
  private lastProgressUpdate: number = 0;
  private progressTimer: any = null;
  private nativeAudioStartTime: number = 0;
  private nativeAudioDuration: number = 0;
  private isUsingNativeAudio: boolean = false;
  public lastPathname: string = '';

  private startProgressLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const updateProgress = (timestamp: number) => {
      // Throttle: actualizar máximo cada 100ms para optimizar rendimiento
      if (timestamp - this.lastProgressUpdate < 100) {
        this.animationFrameId = requestAnimationFrame(updateProgress);
        return;
      }

      this.lastProgressUpdate = timestamp;

      if (!this.audio || this.audio.paused || this.audio.ended) {
        this.animationFrameId = null;
        return;
      }

      try {
        const currentTime = this.audio.currentTime || 0;
        const duration = this.audio.duration || 0;
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        // Emitir eventos de progreso
        this.progressCbs.forEach(cb => {
          try {
            cb(currentTime, duration, progress);
          } catch (e) {
            console.warn('[AudioManager] onProgress callback failed:', e);
          }
        });

        // Continuar el loop si sigue reproduciéndose
        if (!this.audio.paused && !this.audio.ended) {
          this.animationFrameId = requestAnimationFrame(updateProgress);
        }
      } catch (error) {
        console.warn('[AudioManager] Progress update error:', error);
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(updateProgress);
  }

  private stopProgressLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private setProgress(currentTime: number) {
    const duration = this.isUsingNativeAudio ? this.nativeAudioDuration : (this.audio?.duration || 0);
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    // Emitir eventos de progreso
    this.progressCbs.forEach(cb => {
      try {
        cb(currentTime, duration, progress);
      } catch (e) {
        console.warn('[AudioManager] onProgress callback failed:', e);
      }
    });
  }

  private setDuration(duration: number) {
    if (this.isUsingNativeAudio) {
      this.nativeAudioDuration = duration;
    }
  }

  private async getAudioDuration(src: string): Promise<number> {
    return new Promise((resolve) => {
      const tempAudio = new Audio(src);
      tempAudio.onloadedmetadata = () => {
        resolve(tempAudio.duration || 0);
        tempAudio.src = '';
      };
      tempAudio.onerror = () => {
        resolve(0);
      };
      tempAudio.load();
    });
  }

  private startNativeAudioProgress() {
    this.setProgress(0);
    this.progressTimer = setInterval(() => {
      const elapsed = (Date.now() - this.nativeAudioStartTime) / 1000;
      const currentTime = Math.min(elapsed, this.nativeAudioDuration);
      
      this.setProgress(currentTime);
      
      if (currentTime >= this.nativeAudioDuration) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
        this.setPlaying(null);
        this.setProgress(0);
      }
    }, 250);
  }

  private normalizeSrc(src: string): string {
    // No tocar si ya es una URL válida
    if (!src) return src;

    // 🔹 Mantener blob: y data: intactos
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      return src;
    }

    // 🔹 URLs completas (http o https)
    if (src.startsWith('http')) {
      return src;
    }

    // 🔹 Rutas absolutas locales (para dev)
    if (src.startsWith('/')) {
      return location.origin + src;
    }

    // 🔹 Rutas file:// locales
    if (src.startsWith('file://')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Capacitor } = require('@capacitor/core');
        if (Capacitor && typeof Capacitor.convertFileSrc === 'function') {
          return Capacitor.convertFileSrc(src);
        }
      } catch (e) {
        console.warn('[AudioManager] Capacitor not available for file conversion:', e);
      }
      return src;
    }

    // 🔹 Por defecto, agregar origin
    return location.origin + '/' + src;
  }

  async checkUrlExists(url: string) {
    try {
      if (!url) return false;
      // 🔹 Bypass CORS y HEAD requests
      console.warn('[AudioManager] Skipping HEAD request (dev mode bypass)');
      return true;
    } catch (err) {
      console.warn('[AudioManager] URL check skipped (CORS):', err);
      return true;
    }
  }

  async play(id: string, src?: string) {
    if (!id || !src) {
      console.warn('[AudioManager] play called with missing id or src:', { id, src });
      return;
    }

    // Limpiar cualquier timer anterior
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }

    // Indicar que este track está cargando
    this.setLoading(id);

    // Preparar fuente: prioriza caché local, descarga en background si hay conexión
    const originalSrc = src;
    src = await prepareSource(originalSrc, id);
    
    // Si prepareSource retornó la URL original pero no hay conexión y no hay archivo local,
    // ya se mostró el toast, así que retornamos
    if (!src || (src === originalSrc && !src.startsWith('file://') && !src.startsWith('http'))) {
      this.setLoading(null);
      return;
    }

    // Si la fuente preparada es local, ya está lista para usar
    if (src.startsWith('file://')) {
      console.log('[AudioManager] 🎧 Reproduciendo desde caché local:', src);
    } else {
      console.log('[AudioManager] 🌐 Usando fuente remota:', src);
    }

    // 🩵 Interceptar audios locales y convertirlos a URL segura para reproducción offline
    if (src.startsWith('file://')) {
      try {
        console.log('[DebugAudioPlayer] Preparando reproducción desde:', src);

        // Extraer path relativo desde file://
        let relativePath = src.replace('file://', '').replace(/^\/data\/user\/0\/[^/]+\/files\//, '');
        if (relativePath.includes('imaginario/')) {
          const idx = relativePath.indexOf('imaginario/');
          relativePath = relativePath.substring(idx);
        } else {
          const fileName = src.split('/').pop() || '';
          relativePath = `imaginario/audio/${fileName}`;
        }

        // Usar función robusta para obtener URL segura
        src = await getSafeAudioUrl(relativePath);
        console.log('[DebugAudioPlayer] URL final:', src);
      } catch (err) {
        console.error('[AudioManager] ❌ Error al obtener URL segura para audio local:', err);
      }
    }

    const normalizedSrc = this.normalizeSrc(src);
    console.log('[AudioManager] normalized src:', src, '->', normalizedSrc);

    // Logs de diagnóstico para verificar si el archivo existe físicamente
    console.log('[DebugAudioPlayer] Intentando reproducir:', src);
    if (src.startsWith('file://')) {
      try {
        // Extraer path relativo desde file:// (similar a getFileSize)
        let relativePath = src.replace('file://', '').replace(/^\/data\/user\/0\/[^/]+\/files\//, '');
        if (relativePath.includes('imaginario/')) {
          const idx = relativePath.indexOf('imaginario/');
          relativePath = relativePath.substring(idx);
        } else {
          const fileName = src.split('/').pop() || '';
          relativePath = `imaginario/audio/${fileName}`;
        }
        
        const stat = await Filesystem.stat({ path: relativePath, directory: Directory.Data }).catch(() => null);
        if (!stat) {
          console.warn('[DebugAudioPlayer] ❌ Archivo no encontrado localmente:', src, '(path buscado:', relativePath, ')');
        } else {
          console.log('[DebugAudioPlayer] 🟢 Archivo encontrado en caché:', stat, '(path:', relativePath, ')');
        }
      } catch (err) {
        console.warn('[DebugAudioPlayer] ❌ Error al verificar archivo:', src, err);
      }
    }

    // Verificar que la URL existe antes de intentar reproducir
    const urlExists = await this.checkUrlExists(normalizedSrc);
    if (!urlExists) {
      console.warn('[AudioManager] URL not found (404):', normalizedSrc);
      this.setPlaying(null);
      return;
    }

    // Detectar si es un archivo local (file:// o capacitor://) y decidir si usar NativeAudio o HTMLAudioElement
    const isLocal = src.startsWith('file://') || src.startsWith('capacitor://');
    let useNative = false;
    
    if (isLocal) {
      try {
        // Para obtener el tamaño, usar el path original si tenemos file://, o extraer de capacitor://
        const pathForSize = src.startsWith('file://') ? src : src.replace('capacitor://localhost/_capacitor_file_', 'file://');
        const size = await getFileSize(pathForSize);
        // Solo usar NativeAudio si el archivo es menor de 5 MB
        useNative = size < 5 * 1024 * 1024;
        console.log(`[AudioManager] 📊 File size: ${(size / 1024 / 1024).toFixed(2)} MB, useNative: ${useNative}`);
      } catch (err) {
        console.warn('[AudioManager] ⚠️ Could not get file size, using HTMLAudioElement:', err);
        useNative = false;
      }
    }
    
    if (isLocal && useNative) {
      try {
        const fileName = src.split('/').pop() || 'cached-audio';
        console.log('[AudioManager] 🎧 Playing cached audio via NativeAudio:', src);
        
        // Limpiar asset previo si ya existe para evitar "Audio Asset already exists"
        try {
          await NativeAudio.unload({ assetId: fileName });
        } catch {
          // Ignorar error si el asset no existe
        }
        
        // Obtener duración del audio antes de reproducir
        const duration = await this.getAudioDuration(normalizedSrc);
        this.isUsingNativeAudio = true;
        this.nativeAudioDuration = duration;
        this.nativeAudioStartTime = Date.now();
        
        // Usar src que ya tiene la URI segura
        await NativeAudio.preload({
          assetId: fileName,
          assetPath: src,
          isUrl: true,
        });
        await NativeAudio.play({ assetId: fileName });
        
        this.setPlaying(id);
        this.setLoading(null); // Finalizar loading cuando comienza a reproducir
        this.startNativeAudioProgress();
        return;
      } catch (err) {
        console.error('[AudioManager] NativeAudio failed:', err);
        this.isUsingNativeAudio = false;
        this.setLoading(null); // Limpiar loading si NativeAudio falla
        // Continuar con el flujo normal si NativeAudio falla
      }
    } else {
      this.isUsingNativeAudio = false;
      if (isLocal) {
        console.log('[AudioManager] 🎵 Using HTMLAudioElement for large file:', src);
      }
    }

    // si es la misma pista, toggle play/pause
    if (this.playingId === id) {
      this.setLoading(null); // Limpiar loading si es toggle del mismo track
      if (this.isUsingNativeAudio) {
        // Para NativeAudio, solo detener el timer
        if (this.progressTimer) {
          clearInterval(this.progressTimer);
          this.progressTimer = null;
        }
        this.setPlaying(null);
        console.log('[AudioManager] paused NativeAudio track:', id);
      } else if (this.audio && !this.audio.paused) {
        this.audio.pause();
        if (this.progressTimer) {
          clearInterval(this.progressTimer);
          this.progressTimer = null;
        }
        this.stopProgressLoop();
        this.setPlaying(null);
        console.log('[AudioManager] paused current track:', id);
      } else if (this.audio) {
        try {
          await this.audio.play();
          console.log('[AudioManager] ▶️ Reproducción iniciada correctamente (resume)');
          this.setPlaying(id);
          console.log('[AudioManager] resumed track:', id);
        } catch (err: any) {
          console.warn('[AudioManager] ⚠️ Error de reproducción (resume):', err);
          
          // Detectar error DOMException típico de archivo corrupto
          if (err.name === 'DOMException' || String(err).includes('DOMException')) {
            console.warn('[AudioManager] Archivo posiblemente dañado en resume, iniciando verificación...');
            
            // Para resume, necesitamos obtener la URL original del track actual
            // Como no tenemos acceso directo a originalSrc aquí, solo logueamos el error
            console.warn('[AudioManager] ⚠️ No se puede reparar automáticamente en resume sin URL original');
            this.setPlaying(null);
          } else {
            console.error('[AudioManager] Reproducción falló por otra causa (resume):', err);
            this.setPlaying(null);
          }
        }
      }
      return;
    }

    // nueva pista: detener la anterior
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    if (this.audio) {
      try { 
        this.audio.pause(); 
        this.stopProgressLoop();
        this.audio.src = '';
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch (e) {
        console.warn('[AudioManager] cleanup failed:', e);
      }
    }
    this.isUsingNativeAudio = false;

    // crear o reutilizar audio element
    this.audio = this.audio ?? document.createElement('audio');
    this.audio.src = normalizedSrc;
    this.audio.preload = 'auto';
    
    // Exponer el elemento global para acceso desde hooks
    (window as any).__IMAGINARIO_AUDIO__ = this.audio;
    
    // Configurar eventos para HTMLAudioElement
    this.audio.onloadedmetadata = () => {
      const duration = this.audio?.duration || 0;
      this.setDuration(duration);
      this.setProgress(0);
    };
    
    this.audio.ontimeupdate = () => {
      const currentTime = this.audio?.currentTime || 0;
      this.setProgress(currentTime);
    };
    
    this.audio.onended = () => {
      console.log('[AudioManager] track ended:', id);
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
      this.setProgress(0);
      this.stopProgressLoop();
      this.setPlaying(null);
    };
    
    this.audio.onerror = (e) => {
      console.warn('[AudioManager] audio error:', e, 'for src:', normalizedSrc);
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
      this.stopProgressLoop();
      this.setPlaying(null);
      this.setLoading(null); // Limpiar loading en caso de error
    };

    // Cargar el audio y esperar a que esté listo antes de reproducir
    this.audio.load();
    
    // Esperar a que el audio esté listo (canplaythrough) para evitar DOMException en Android WebView
    try {
      await this.waitForAudioReady(this.audio);
      console.log('[AudioManager] 🔁 Intentando reproducir tras canplaythrough');
      
      try {
        await this.audio.play();
        console.log('[AudioManager] ▶️ Reproducción iniciada correctamente');
        this.setPlaying(id);
        this.setLoading(null); // Finalizar loading cuando comienza a reproducir
        console.log('[AudioManager] playing track:', id, 'from:', normalizedSrc);
      } catch (err: any) {
        console.warn('[AudioManager] ⚠️ Error de reproducción:', err);

        // Detectar error DOMException típico de archivo corrupto
        if (err.name === 'DOMException' || String(err).includes('DOMException')) {
          console.warn('[AudioManager] Archivo posiblemente dañado, iniciando verificación...');

          try {
            const networkStatus = await Network.getStatus();
            if (networkStatus.connected) {
              console.log('[AudioManager] 🌐 En línea, re-descargando archivo...');
              this.setRepairing(id); // Indicar que se está reparando
              this.setLoading(id); // Mantener loading activo
              
              const downloadUrl = originalSrc;
              const hash = await getAudioHash(downloadUrl);
              await reDownloadAudio(downloadUrl, hash);
              console.log('[AudioManager] ✅ Re-descarga completada, reintentando reproducción...');
              
              // Obtener nueva URL segura después de la re-descarga
              const newPath = await getSafeAudioUrl(`imaginario/audio/${hash}.mp3`);
              this.audio.src = newPath;
              this.audio.load();
              
              // Esperar un momento antes de reintentar
              await new Promise((r) => setTimeout(r, 500));
              
              // Esperar a que el audio esté listo nuevamente
              await this.waitForAudioReady(this.audio);
              await this.audio.play();
              
              console.log('[AudioManager] ✅ Reproducción exitosa tras reparación');
              
              // Revalidar el audio en el estado de verificación para actualizar el contador del navbar
              await revalidateAudio(`imaginario/audio/${hash}.mp3`);
              
              this.setRepairing(null); // Finalizar reparación
              this.setPlaying(id);
              this.setLoading(null);
            } else {
              console.warn('[AudioManager] ❌ Sin conexión, no se puede reparar archivo corrupto');
              this.setRepairing(null);
              this.setPlaying(null);
              this.setLoading(null);
            }
          } catch (repairErr) {
            console.error('[AudioManager] 🚫 Fallo en la reparación automática:', repairErr);
            this.setRepairing(null);
            this.setPlaying(null);
            this.setLoading(null);
          }
        } else {
          console.error('[AudioManager] Reproducción falló por otra causa:', err);
          this.setRepairing(null);
          this.setPlaying(null);
          this.setLoading(null);
        }
      }
    } catch (e) {
      console.warn('[AudioManager] waitForAudioReady failed:', e, 'for src:', normalizedSrc);
      this.setPlaying(null);
      this.setLoading(null); // Finalizar loading en caso de error
    }
  }

  pause() {
    this.setLoading(null); // Limpiar loading al pausar
    if (this.isUsingNativeAudio) {
      try {
        // Para NativeAudio, solo detener el timer
        if (this.progressTimer) {
          clearInterval(this.progressTimer);
          this.progressTimer = null;
        }
        // Intentar pausar NativeAudio si tiene ese método
        // NativeAudio no tiene pause nativo, así que solo detenemos el progreso
        this.setPlaying(null);
        console.log('[AudioManager] paused NativeAudio');
      } catch (e) {
        console.warn('[AudioManager] pause NativeAudio failed:', e);
      }
      return;
    }
    
    if (!this.audio) return;
    try {
      this.audio.pause();
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
      this.stopProgressLoop();
      this.setPlaying(null);
      console.log('[AudioManager] paused');
    } catch (e) {
      console.warn('[AudioManager] pause failed:', e);
    }
  }

  toggle(id: string, src?: string) {
    if (this.playingId === id) {
      this.pause();
    } else {
      this.play(id, src);
    }
  }

  getPlayingId() { return this.playingId; }

  isPlaying(): boolean {
    return this.playingId !== null;
  }

  onChange(cb: OnChangeCb) {
    this.cbs.push(cb);
    return () => { this.cbs = this.cbs.filter(x => x !== cb); };
  }

  onProgress(cb: OnProgressCb) {
    this.progressCbs.push(cb);
    return () => { this.progressCbs = this.progressCbs.filter(x => x !== cb); };
  }

  onLoading(cb: OnLoadingCb) {
    this.loadingCbs.push(cb);
    return () => { this.loadingCbs = this.loadingCbs.filter(x => x !== cb); };
  }

  getLoadingId() { return this.loadingId; }

  onRepairing(cb: OnRepairingCb) {
    this.repairingCbs.push(cb);
    return () => { this.repairingCbs = this.repairingCbs.filter(x => x !== cb); };
  }

  getRepairingId() { return this.repairingId; }

  getCurrentTime(): number {
    if (this.isUsingNativeAudio) {
      const elapsed = (Date.now() - this.nativeAudioStartTime) / 1000;
      return Math.min(elapsed, this.nativeAudioDuration);
    }
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    if (this.isUsingNativeAudio) {
      return this.nativeAudioDuration;
    }
    return this.audio?.duration || 0;
  }

  getProgress(): number {
    const currentTime = this.getCurrentTime();
    const duration = this.getDuration();
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  }

  private setPlaying(id: string | null) {
    this.playingId = id;
    this.cbs.forEach(cb => {
      try { cb(this.playingId); } catch (e) {
        console.warn('[AudioManager] onChange callback failed:', e);
      }
    });
  }

  private setLoading(id: string | null) {
    this.loadingId = id;
    this.loadingCbs.forEach(cb => {
      try { cb(this.loadingId); } catch (e) {
        console.warn('[AudioManager] onLoading callback failed:', e);
      }
    });
  }

  private setRepairing(id: string | null) {
    this.repairingId = id;
    this.repairingCbs.forEach(cb => {
      try { cb(this.repairingId); } catch (e) {
        console.warn('[AudioManager] onRepairing callback failed:', e);
      }
    });
  }

  /**
   * Espera a que el audio esté listo para reproducir (canplaythrough) antes de intentar play()
   * Evita DOMException por carga incompleta en WebView Android
   */
  private async waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.warn('[AudioManager] ⏰ Timeout esperando canplaythrough');
        resolve();
      }, 4000); // máximo 4 segundos

      const onReady = () => {
        clearTimeout(timeout);
        console.log('[AudioManager] ✅ canplaythrough detectado');
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        resolve();
      };

      const onError = (e: Event) => {
        clearTimeout(timeout);
        console.warn('[AudioManager] ⚠️ Error en carga de audio:', e);
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        reject(e);
      };

      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
    });
  }
}

export const audioManager = new AudioManager();

// 🧭 Pausar audio automáticamente en cambios de página o visibilidad
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const pauseIfPlaying = () => {
    try {
      if (audioManager?.isPlaying && audioManager.isPlaying()) {
        console.log('[AudioManager] ⏸️ Pausa automática por cambio de vista.');
        audioManager.pause();
      }
    } catch (err) {
      console.warn('[AudioManager] Error al pausar automáticamente:', err);
    }
  };

  // Cuando se cambia de pestaña o la app pasa a segundo plano
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseIfPlaying();
  });

  // Cuando cambia la ruta interna de Ionic / React Router
  window.addEventListener('ionRouteWillChange', pauseIfPlaying);
  window.addEventListener('popstate', pauseIfPlaying);
  window.addEventListener('beforeunload', pauseIfPlaying);

  // 📱 Pausar audio cuando la app se va al background (modo nativo)
  try {
    App.addListener('pause', () => {
      pauseIfPlaying();
    });
  } catch (err) {
    console.warn('[AudioManager] No se pudo registrar App.pause:', err);
  }

  // 🚦 Pausar audio al cambiar de ruta o módulo
  try {
    // Inicializar lastPathname
    audioManager.lastPathname = window.location.pathname;

    window.addEventListener('ionRouteWillChange', () => {
      pauseIfPlaying();
    });

    // También cubrir navegación directa por React Router (push, back, forward)
    window.addEventListener('popstate', () => {
      pauseIfPlaying();
    });

    // Monitor global de cambios de URL con MutationObserver (fallback en caso de router.push interno)
    const observer = new MutationObserver(() => {
      const currentPath = window.location.pathname;
      if (audioManager?.isPlaying() && currentPath !== audioManager?.lastPathname) {
        pauseIfPlaying();
        audioManager.lastPathname = currentPath;
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  } catch (err) {
    console.warn('[AudioManager] No se pudo registrar listener de cambio de ruta:', err);
  }
}
