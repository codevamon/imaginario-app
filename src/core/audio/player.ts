// src/core/audio/player.ts
// Robust AudioManager singleton: controla 1 <audio> global, normaliza URLs y maneja errores.
import { NativeAudio } from '@capacitor-community/native-audio';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { mediaCacheService } from '../cache/mediaCacheService';

type OnChangeCb = (playingId: string | null) => void;
type OnProgressCb = (currentTime: number, duration: number, progress: number) => void;

interface ProgressData {
  currentTime: number;
  duration: number;
  progress: number;
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

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private playingId: string | null = null;
  private cbs: OnChangeCb[] = [];
  private progressCbs: OnProgressCb[] = [];
  private animationFrameId: number | null = null;
  private lastProgressUpdate: number = 0;
  private progressTimer: any = null;
  private nativeAudioStartTime: number = 0;
  private nativeAudioDuration: number = 0;
  private isUsingNativeAudio: boolean = false;

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

    // Verificar si el archivo ya está en caché
    try {
      const cached = await mediaCacheService.cacheAudio(src);
      if (cached && cached.startsWith('file://')) {
        console.log('[AudioManager] 🎧 Reproduciendo desde caché local:', cached);
        src = cached; // sobrescribe la URL con la versión local
        
        // Obtener URI segura compatible con WebView
        try {
          // Extraer el path relativo del URI file://
          let relativePath = src.replace('file://', '').replace(/^\/data\/user\/0\/[^\/]+\/files\//, '');
          
          // Si el path contiene 'imaginario/', usarlo directamente
          if (relativePath.includes('imaginario/')) {
            const imaginarioIndex = relativePath.indexOf('imaginario/');
            relativePath = relativePath.substring(imaginarioIndex);
          } else {
            // Si no tiene 'imaginario/', intentar extraer desde el nombre del archivo
            const fileName = src.split('/').pop() || '';
            relativePath = `imaginario/audio/${fileName}`;
          }
          
          const safeUri = await Filesystem.getUri({
            directory: Directory.Data,
            path: relativePath,
          });
          
          if (safeUri?.uri) {
            src = safeUri.uri;
            console.log('[AudioManager] ✅ Usando URI segura para reproducción:', src);
          }
        } catch (e) {
          console.warn('[AudioManager] ⚠️ No se pudo obtener URI segura:', e);
        }
      } else {
        console.log('[AudioManager] 🌐 Usando fuente remota:', src);
      }
    } catch (err) {
      console.warn('[AudioManager] ⚠️ No se pudo acceder al caché:', err);
    }

    // 🩵 Interceptar audios locales y convertirlos a blob seguros si es necesario
    if (src.startsWith('file://')) {
      try {
        console.log('[AudioManager] 🪶 Generando blob URL local para:', src);

        // Extraer path relativo desde file://
        let relativePath = src.replace('file://', '').replace(/^\/data\/user\/0\/[^/]+\/files\//, '');
        if (relativePath.includes('imaginario/')) {
          const idx = relativePath.indexOf('imaginario/');
          relativePath = relativePath.substring(idx);
        } else {
          const fileName = src.split('/').pop() || '';
          relativePath = `imaginario/audio/${fileName}`;
        }

        // Leer el archivo local en base64
        const readResult = await Filesystem.readFile({
          path: relativePath,
          directory: Directory.Data,
        });

        // Decodificar base64 a bytes
        const base64Data = typeof readResult.data === 'string' ? readResult.data : '';
        const binary = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(binary.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < binary.length; i++) {
          view[i] = binary.charCodeAt(i);
        }

        // 🔹 Detectar tipo de audio según extensión
        let mimeType = 'audio/mpeg';
        if (src.endsWith('.wav')) mimeType = 'audio/wav';
        if (src.endsWith('.ogg')) mimeType = 'audio/ogg';

        // Crear blob con MIME explícito
        const blob = new Blob([view], { type: mimeType });

        // Crear URL de blob
        const blobUrl = URL.createObjectURL(blob);
        console.log('[AudioManager] ✅ Blob URL lista para reproducción:', blobUrl);

        src = blobUrl; // Sobrescribir src para reproducción
      } catch (err) {
        console.error('[AudioManager] ❌ Error al crear blob URL local:', err);
      }
    }

    const normalizedSrc = this.normalizeSrc(src);
    console.log('[AudioManager] normalized src:', src, '->', normalizedSrc);

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
        this.startNativeAudioProgress();
        return;
      } catch (err) {
        console.error('[AudioManager] NativeAudio failed:', err);
        this.isUsingNativeAudio = false;
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
        this.audio.play().catch((e) => {
          console.warn('[AudioManager] resume failed:', e);
          this.setPlaying(null);
        });
        this.setPlaying(id);
        console.log('[AudioManager] resumed track:', id);
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
    this.audio.preload = 'metadata';
    
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
    };

    // intentar reproducir
    try {
      await this.audio.play();
      this.setPlaying(id);
      console.log('[AudioManager] playing track:', id, 'from:', normalizedSrc);
    } catch (e) {
      console.warn('[AudioManager] play failed:', e, 'for src:', normalizedSrc);
      this.setPlaying(null);
    }
  }

  pause() {
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

  onChange(cb: OnChangeCb) {
    this.cbs.push(cb);
    return () => { this.cbs = this.cbs.filter(x => x !== cb); };
  }

  onProgress(cb: OnProgressCb) {
    this.progressCbs.push(cb);
    return () => { this.progressCbs = this.progressCbs.filter(x => x !== cb); };
  }

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
}

export const audioManager = new AudioManager();
