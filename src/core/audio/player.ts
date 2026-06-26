// src/core/audio/player.ts
// Robust AudioManager singleton: controla 1 <audio> global, normaliza URLs y maneja errores.
import { NativeAudio } from '@capacitor-community/native-audio';
import { NativeAudio as CapgoNativeAudio } from '@capgo/native-audio';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { mediaCacheService, ensureCachedMedia } from '../cache/mediaCacheService';
import { revalidateAudio } from '../hooks/useAudioVerification';

// PoC: permitir reproducción en segundo plano (solo desactiva autopause por background)
const BACKGROUND_AUDIO_ENABLED = true;

// Experimental: Capgo muestra notificación nativa, pero actualmente rompe background/progreso.
// Mantener false hasta integrar foreground service/progreso nativo completo.
const USE_CAPGO_NATIVE_AUDIO = false;

// 🔒 Previene autopause en el primer tap al entrar a una vista
let allowAutoPause = true;

// Marca el momento en que comenzó la última reproducción real
let lastPlaybackStartedAt: number | null = null;

export type AudioPlayMetadata = {
  title?: string;
  artist?: string;
  artworkUrl?: string;
};

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
    // Importante: el hash debe ser idéntico al de ensureCachedMedia (sha256(url) sin encodeURI)
    const hash = await sha256(originalSrc);
    const relPath = `imaginario/audio/${hash}.mp3`;

    // 🎯 PRIORIDAD 1: Intentar usar archivo local SIEMPRE (con o sin red)
    try {
      const stat = await Filesystem.stat({ path: relPath, directory: Directory.Data });
      // Verificar que el archivo existe y tiene tamaño válido (> 1KB)
      if (stat && stat.size && stat.size > 1024) {
        const uri = await Filesystem.getUri({ path: relPath, directory: Directory.Data });
        const fileUri = uri.uri.startsWith('file://') ? uri.uri : `file://${uri.uri}`;
        console.log('[AudioManager] 🎧 Reproduciendo desde caché local:', fileUri, `(${(stat.size / 1024).toFixed(1)} KB)`);
        return fileUri;
      } else if (stat && stat.size && stat.size <= 1024) {
        // Archivo existe pero es sospechosamente pequeño (posiblemente corrupto)
        console.warn('[AudioManager] ⚠️ Archivo local corrupto o incompleto (', stat.size, 'bytes), descargando de nuevo');
      }
    } catch (statError) {
      // Archivo no existe localmente, continuar al paso 2
      console.log('[AudioManager] 📡 Archivo no encontrado en caché local, verificando conexión...');
    }

    // 🌐 PRIORIDAD 2: Si no existe archivo local, verificar conexión
    const { connected } = await Network.getStatus();

    if (connected) {
      // Si hay red: descargar en background y usar URL remota
      console.log('[AudioManager] 🌐 Descargando en background desde:', originalSrc);
      await ensureCachedMedia(originalSrc, 'audio');
      return originalSrc;
    } else {
      // Si no hay red y no hay archivo local: mostrar warning y usar URL remota como fallback
      console.warn('[AudioManager] ⚠️ Sin conexión y archivo no disponible localmente:', originalSrc);
      if (typeof window !== 'undefined') {
        const toast = document.createElement('ion-toast');
        toast.message = '⚠️ Audio no disponible sin conexión';
        toast.duration = 2000;
        document.body.appendChild(toast);
        toast.present();
      }
      return originalSrc;
    }
  } catch (error) {
    console.warn('[AudioManager] Error en prepareSource:', error);
    return originalSrc;
  }
}

let capgoConfigured = false;

async function ensureCapgoConfigured(): Promise<boolean> {
  if (capgoConfigured) return true;
  try {
    await CapgoNativeAudio.configure({
      focus: true,
      showNotification: true,
      background: true,
    });
    capgoConfigured = true;
    return true;
  } catch (e) {
    capgoConfigured = false;
    console.warn('[AudioManager] ensureCapgoConfigured failed:', e);
    return false;
  }
}

function mapCapgoMetadata(metadata?: AudioPlayMetadata, id?: string) {
  return {
    title: metadata?.title || id || 'Imaginario',
    artist: metadata?.artist || 'Imaginario',
  };
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
  private isUsingCapgoNative: boolean = false;
  private capgoPaused = false;
  private lastCapgoAssetId: string | null = null;
  private capgoDuration = 0;
  private capgoCurrentTime = 0;
  private capgoCurrentTimeListener: any = null;
  private capgoCompleteListener: any = null;
  private isStartingCapgoNative = false;
  public lastPathname: string = '';
  private currentMetadata: AudioPlayMetadata | null = null;
  private lastPlayId: string | null = null;
  private lastPlaySrc: string | null = null;

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
    let duration: number;
    if (this.isUsingCapgoNative || this.capgoPaused) {
      duration = this.capgoDuration;
    } else if (this.isUsingNativeAudio) {
      duration = this.nativeAudioDuration;
    } else {
      duration = this.audio?.duration || 0;
    }
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
        this.setPlaying(null, { endOfTrack: true });
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

  private async cleanupCapgoListeners(): Promise<void> {
    if (this.capgoCurrentTimeListener) {
      await this.capgoCurrentTimeListener.remove().catch(() => {});
      this.capgoCurrentTimeListener = null;
    }
    if (this.capgoCompleteListener) {
      await this.capgoCompleteListener.remove().catch(() => {});
      this.capgoCompleteListener = null;
    }
  }

  private async setupCapgoProgress(assetId: string): Promise<void> {
    await this.cleanupCapgoListeners();
    try {
      const durationResult = await CapgoNativeAudio.getDuration({ assetId });
      this.capgoDuration = durationResult?.duration || 0;
      if (this.capgoDuration === 0) {
        console.warn('[AudioManager] Capgo getDuration returned 0 for:', assetId);
      }
    } catch (e) {
      console.warn('[AudioManager] Capgo getDuration failed:', e);
      this.capgoDuration = 0;
    }

    this.capgoCurrentTimeListener = await CapgoNativeAudio.addListener('currentTime', (event: any) => {
      if (event?.assetId !== this.lastCapgoAssetId) return;
      this.capgoCurrentTime = event.currentTime || 0;
      this.setProgress(this.capgoCurrentTime);
    });

    this.capgoCompleteListener = await CapgoNativeAudio.addListener('complete', (event: any) => {
      if (event?.assetId !== this.lastCapgoAssetId) return;
      this.capgoCurrentTime = 0;
      this.capgoDuration = 0;
      this.capgoPaused = false;
      this.isUsingCapgoNative = false;
      this.setPlaying(null, { endOfTrack: true });
    });

    this.setProgress(0);
  }

  private async stopCurrentCapgoTrack(reason?: string): Promise<void> {
    if (!this.isUsingCapgoNative || !this.playingId) return;
    const previousId = this.playingId;
    await CapgoNativeAudio.stop({ assetId: previousId }).catch(() => {});
    await CapgoNativeAudio.unload({ assetId: previousId }).catch(() => {});
    await this.cleanupCapgoListeners();
    this.capgoDuration = 0;
    this.capgoCurrentTime = 0;
    console.log('[AudioManager] stopped previous Capgo track:', previousId, reason ?? '');
    this.isUsingCapgoNative = false;
    this.capgoPaused = false;
  }

  private async resumeCapgoTrack(assetId: string): Promise<boolean> {
    try {
      await CapgoNativeAudio.resume({ assetId });
      this.capgoPaused = false;
      this.setPlaying(assetId);
      if (!this.capgoCurrentTimeListener) {
        await this.setupCapgoProgress(assetId);
      }
      console.log('[AudioManager] resumed Capgo');
      return true;
    } catch (e) {
      console.warn('[AudioManager] resume Capgo failed:', e);
      return false;
    }
  }

  private async playViaCapgoNative(
    id: string,
    playbackSrc: string,
    metadata?: AudioPlayMetadata
  ): Promise<boolean> {
    try {
      if (!(await ensureCapgoConfigured())) return false;
      this.isStartingCapgoNative = true;
      await this.stopCurrentCapgoTrack('before new Capgo play');
      const capgo = CapgoNativeAudio as any;
      await capgo.unload({ assetId: id }).catch(() => {});
      await capgo.preload({
        assetId: id,
        assetPath: playbackSrc,
        isUrl: true,
        notificationMetadata: mapCapgoMetadata(metadata, id),
      });
      await capgo.play({ assetId: id });
      lastPlaybackStartedAt = Date.now();
      this.isUsingCapgoNative = true;
      this.capgoPaused = false;
      this.lastCapgoAssetId = id;
      this.setPlaying(id);
      this.setLoading(null);
      await this.setupCapgoProgress(id);
      console.log('[AudioManager] Capgo playing:', id, 'from:', playbackSrc);
      return true;
    } catch (err) {
      console.warn('[AudioManager] Capgo native failed, falling back:', err);
      this.isUsingCapgoNative = false;
      return false;
    } finally {
      this.isStartingCapgoNative = false;
    }
  }

  async play(id: string, src?: string, metadata?: AudioPlayMetadata) {
    if (!id || !src) {
      console.warn('[AudioManager] play called with missing id or src:', { id, src });
      return;
    }

    setupMediaSession();
    this.lastPlayId = id;
    this.lastPlaySrc = src;
    if (metadata) {
      this.currentMetadata = metadata;
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

    const capgoNativeSrc = src.startsWith('file://') ? src : null;

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
      this.setPlaying(null, { endOfTrack: true });
      return;
    }

    if (
      USE_CAPGO_NATIVE_AUDIO &&
      Capacitor.isNativePlatform() &&
      Capacitor.getPlatform() === 'android' &&
      this.playingId !== id
    ) {
      const playbackSrc = capgoNativeSrc
        ?? (normalizedSrc.startsWith('http')
          ? normalizedSrc
          : Capacitor.convertFileSrc(normalizedSrc));
      console.log('[AudioManager] Capgo native src:', playbackSrc);
      if (await this.playViaCapgoNative(id, playbackSrc, metadata)) {
        return;
      }
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
        setMediaSessionPaused();
        this.setPlaying(null);
        console.log('[AudioManager] paused NativeAudio track:', id);
      } else if (this.audio && !this.audio.paused) {
        this.audio.pause();
        if (this.progressTimer) {
          clearInterval(this.progressTimer);
          this.progressTimer = null;
        }
        this.stopProgressLoop();
        setMediaSessionPaused();
        this.setPlaying(null);
        console.log('[AudioManager] paused current track:', id);
      } else if (this.audio) {
        try {
          await this.audio.play();
          console.log('[AudioManager] ▶️ Reproducción iniciada correctamente (resume)');
          // Registrar cuándo comenzó esta reproducción (para proteger los primeros ms)
          lastPlaybackStartedAt = Date.now();
          this.setPlaying(id);
          console.log('[AudioManager] resumed track:', id);
        } catch (err: any) {
          console.warn('[AudioManager] ⚠️ Error de reproducción (resume):', err);
          
          // Detectar error DOMException típico de archivo corrupto
          if (err.name === 'DOMException' || String(err).includes('DOMException')) {
            console.warn('[AudioManager] Archivo posiblemente dañado en resume, iniciando verificación...');
            
            // Eliminar archivo corrupto si es local
            if (this.audio?.src?.includes('_capacitor_file_') || this.audio?.src?.startsWith('capacitor://localhost/_capacitor_file_') || this.audio?.src?.startsWith('https://localhost/_capacitor_file_')) {
              try {
                let decodedPath = this.audio.src.replace('file://', '').replace('capacitor://localhost/_capacitor_file_', '').replace(/^https?:\/\/localhost\/_capacitor_file_/, '');
                decodedPath = decodeURIComponent(decodedPath);
                const relativePath = decodedPath.indexOf('imaginario/') !== -1 
                  ? decodedPath.substring(decodedPath.indexOf('imaginario/'))
                  : `imaginario/audio/${decodedPath.split('/').pop() || ''}`;
                
                await Filesystem.deleteFile({
                  path: relativePath,
                  directory: Directory.Data,
                });
                console.warn('[AudioManager] 🧹 Archivo corrupto eliminado en resume:', relativePath);
              } catch (delErr) {
                console.warn('[AudioManager] No se pudo eliminar archivo corrupto en resume:', delErr);
              }
            }
            
            // Para resume, necesitamos obtener la URL original del track actual
            // Como no tenemos acceso directo a originalSrc aquí, solo logueamos el error
            console.warn('[AudioManager] ⚠️ No se puede reparar automáticamente en resume sin URL original');
            this.setPlaying(null, { endOfTrack: true });
          } else {
            console.error('[AudioManager] Reproducción falló por otra causa (resume):', err);
            this.setPlaying(null, { endOfTrack: true });
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
    const finalSrc = normalizedSrc.startsWith('http') ? normalizedSrc : Capacitor.convertFileSrc(normalizedSrc);
    
    // --- Verificación de archivo local corrupto antes de reproducir ---
    if (finalSrc.includes('_capacitor_file_') || finalSrc.startsWith('capacitor://localhost/_capacitor_file_') || finalSrc.startsWith('https://localhost/_capacitor_file_')) {
      try {
        // Extraer el path relativo del URI
        let relativePath = finalSrc
          .replace('file://', '')
          .replace('capacitor://localhost/_capacitor_file_', '')
          .replace(/^https?:\/\/localhost\/_capacitor_file_/, '');
        relativePath = decodeURIComponent(relativePath);
        
        // ✅ Eliminar path absoluto completo hasta /files/ para evitar conflicto con package name
        // Esto previene que indexOf('imaginario/') encuentre 'app.imaginario/' en vez de 'imaginario/audio/'
        relativePath = relativePath.replace(/^\/data\/user\/0\/[^/]+\/files\//, '');
        
        // Si después del regex no empieza con 'imaginario/', construir path manualmente
        if (!relativePath.startsWith('imaginario/')) {
          const fileName = finalSrc.split('/').pop() || '';
          relativePath = `imaginario/audio/${decodeURIComponent(fileName)}`;
        }
        
        const stat = await Filesystem.stat({
          path: relativePath,
          directory: Directory.Data,
        });

        if (stat.size < 10240) { // menos de 10 KB = posible corrupción
          console.warn(`[AudioManager] ⚠️ Archivo corrupto detectado (${stat.size} bytes). Eliminando:`, relativePath);
          await Filesystem.deleteFile({
            path: relativePath,
            directory: Directory.Data,
          });
          throw new Error('Archivo corrupto eliminado antes de reproducir');
        }
      } catch (verErr) {
        if (verErr instanceof Error && verErr.message === 'Archivo corrupto eliminado antes de reproducir') {
          // Archivo corrupto eliminado, continuar sin reproducir
          this.setLoading(null);
          this.setPlaying(null, { endOfTrack: true });
          return;
        }
        console.warn('[AudioManager] Verificación de archivo local falló:', verErr);
      }
    }
    // --- Fin verificación ---
    
    this.audio.src = finalSrc;
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
      this.setPlaying(null, { endOfTrack: true });
    };
    
    this.audio.onerror = async (e) => {
      console.warn('[AudioManager] audio error:', e, 'for src:', normalizedSrc);
      
      // Si el audio local falla en reproducirse, se elimina para reparación futura
      if (this.audio?.src?.includes('_capacitor_file_') || this.audio?.src?.startsWith('capacitor://localhost/_capacitor_file_') || this.audio?.src?.startsWith('https://localhost/_capacitor_file_')) {
        try {
          let decodedPath = this.audio.src.replace('file://', '').replace('capacitor://localhost/_capacitor_file_', '').replace(/^https?:\/\/localhost\/_capacitor_file_/, '');
          decodedPath = decodeURIComponent(decodedPath);
          const relativePath = decodedPath.indexOf('imaginario/') !== -1 
            ? decodedPath.substring(decodedPath.indexOf('imaginario/'))
            : `imaginario/audio/${decodedPath.split('/').pop() || ''}`;
          
          await Filesystem.deleteFile({
            path: relativePath,
            directory: Directory.Data,
          });
          console.warn('[AudioManager] 🧹 Archivo local eliminado por error de reproducción:', relativePath);
        } catch (delErr) {
          console.warn('[AudioManager] No se pudo eliminar archivo corrupto:', delErr);
        }
      }
      
      if (this.progressTimer) {
        clearInterval(this.progressTimer);
        this.progressTimer = null;
      }
      this.stopProgressLoop();
      this.setPlaying(null, { endOfTrack: true });
      this.setLoading(null); // Limpiar loading en caso de error
    };

    // Cargar el audio y esperar a que esté listo antes de reproducir
    this.audio.load();
    
    // Esperar a que el audio esté listo (canplaythrough) para evitar DOMException en Android WebView
    try {
      await this.waitForAudioReady(this.audio);
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        try {
          await playPromise;
        } catch (err) {
          // Si es un error simple de reproducción, hacer reintento rápido
          if (!(err instanceof DOMException)) {
            console.warn('[AudioManager] Reintento de reproducción fallida:', err);
            setTimeout(() => this.audio?.play().catch(() => {}), 300);
            return;
          }
          // Si es DOMException, propagar al catch externo para reparación
          throw err;
        }
      }
      console.log('[AudioManager] ▶️ Reproducción iniciada correctamente');
      // Registrar cuándo comenzó esta reproducción (para proteger los primeros ms)
      lastPlaybackStartedAt = Date.now();
      this.setPlaying(id);
      this.setLoading(null); // Finalizar loading cuando comienza a reproducir
      console.log('[AudioManager] playing track:', id, 'from:', normalizedSrc);
    } catch (err: any) {
      console.warn('[AudioManager] ⚠️ Error de reproducción:', err);

      // Detectar error DOMException típico de archivo corrupto
      if (err.name === 'DOMException' || String(err).includes('DOMException')) {
        console.warn('[AudioManager] Archivo posiblemente dañado, iniciando verificación...');

        try {
          // Eliminar archivo corrupto si es local antes de re-descargar
          if (this.audio?.src?.includes('_capacitor_file_') || this.audio?.src?.startsWith('capacitor://localhost/_capacitor_file_') || this.audio?.src?.startsWith('https://localhost/_capacitor_file_')) {
            try {
              let decodedPath = this.audio.src.replace('file://', '').replace('capacitor://localhost/_capacitor_file_', '').replace(/^https?:\/\/localhost\/_capacitor_file_/, '');
              decodedPath = decodeURIComponent(decodedPath);
              const relativePath = decodedPath.indexOf('imaginario/') !== -1 
                ? decodedPath.substring(decodedPath.indexOf('imaginario/'))
                : `imaginario/audio/${decodedPath.split('/').pop() || ''}`;
              
              await Filesystem.deleteFile({
                path: relativePath,
                directory: Directory.Data,
              });
              console.warn('[AudioManager] 🧹 Archivo corrupto eliminado antes de re-descarga:', relativePath);
            } catch (delErr) {
              console.warn('[AudioManager] No se pudo eliminar archivo corrupto antes de re-descarga:', delErr);
            }
          }
          
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
            const finalNewPath = newPath.startsWith('http') ? newPath : Capacitor.convertFileSrc(newPath);
            this.audio.src = finalNewPath;
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
            this.setPlaying(null, { endOfTrack: true });
            this.setLoading(null);
          }
        } catch (repairErr) {
          console.error('[AudioManager] 🚫 Fallo en la reparación automática:', repairErr);
          this.setRepairing(null);
          this.setPlaying(null, { endOfTrack: true });
          this.setLoading(null);
        }
      } else {
        // Si el error no es DOMException, puede ser de waitForAudioReady
        console.warn('[AudioManager] Audio aún no listo, reintentando...', err);
        setTimeout(() => {
          this.audio?.play().catch(() => {});
        }, 500);
      }
    }
  }

  pause() {
    this.setLoading(null); // Limpiar loading al pausar
    if (this.isUsingCapgoNative && this.playingId) {
      const assetId = this.playingId;
      void CapgoNativeAudio.pause({ assetId }).catch((e) => {
        console.warn('[AudioManager] pause Capgo failed:', e);
      });
      this.capgoPaused = true;
      setMediaSessionPaused();
      this.setPlaying(null);
      console.log('[AudioManager] paused Capgo');
      return;
    }
    setMediaSessionPaused();
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

  toggle(id: string, src?: string, metadata?: AudioPlayMetadata) {
    if (USE_CAPGO_NATIVE_AUDIO && this.capgoPaused && this.lastCapgoAssetId === id) {
      void this.resumeCapgoTrack(id);
      return;
    }
    if (USE_CAPGO_NATIVE_AUDIO && this.isUsingCapgoNative && this.playingId === id) {
      this.pause();
      return;
    }
    if (this.playingId === id) {
      this.pause();
    } else {
      void this.play(id, src, metadata);
    }
  }

  getPlayingId() { return this.playingId; }

  isCapgoStarting(): boolean {
    return this.isStartingCapgoNative;
  }

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
    if (this.isUsingCapgoNative || this.capgoPaused) {
      return this.capgoCurrentTime;
    }
    if (this.isUsingNativeAudio) {
      const elapsed = (Date.now() - this.nativeAudioStartTime) / 1000;
      return Math.min(elapsed, this.nativeAudioDuration);
    }
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    if (this.isUsingCapgoNative || this.capgoPaused) {
      return this.capgoDuration;
    }
    if (this.isUsingNativeAudio) {
      return this.nativeAudioDuration;
    }
    return this.audio?.duration || 0;
  }

  getProgress(): number {
    if (this.isUsingCapgoNative || this.capgoPaused) {
      return this.capgoDuration > 0 ? (this.capgoCurrentTime / this.capgoDuration) * 100 : 0;
    }
    const currentTime = this.getCurrentTime();
    const duration = this.getDuration();
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  }

  private setPlaying(id: string | null, options?: { endOfTrack?: boolean }) {
    this.playingId = id;
    if (id) {
      updateMediaSession(this.currentMetadata ?? undefined);
    } else if (options?.endOfTrack) {
      clearMediaSession();
    }
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
  private waitForAudioReady(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (audio.readyState >= 2) return resolve(); // suficiente para reproducir
      
      const onReady = () => {
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        resolve();
      };

      const onError = (err: any) => {
        audio.removeEventListener('canplaythrough', onReady);
        audio.removeEventListener('error', onError);
        reject(err);
      };

      audio.addEventListener('canplaythrough', onReady, { once: true });
      audio.addEventListener('error', onError, { once: true });
      
      // timeout de seguridad
      setTimeout(() => resolve(), 2000);
    });
  }
}

export const audioManager = new AudioManager();

let mediaSessionSetupDone = false;

function setMediaSessionPaused() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    (navigator.mediaSession as any).playbackState = 'paused';
  } catch (e) {
    console.warn('[AudioManager] setMediaSessionPaused failed:', e);
  }
}

function updateMediaSession(metadata?: AudioPlayMetadata) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    const MediaMetadataCtor = (globalThis as any).MediaMetadata;
    if (!MediaMetadataCtor) return;
    const id = audioManager.getPlayingId();
    (navigator.mediaSession as any).metadata = new MediaMetadataCtor({
      title: metadata?.title || id || 'Imaginario',
      artist: metadata?.artist || 'Imaginario',
      artwork: metadata?.artworkUrl ? [{ src: metadata.artworkUrl }] : [],
    });
    (navigator.mediaSession as any).playbackState = 'playing';
  } catch (e) {
    console.warn('[AudioManager] updateMediaSession failed:', e);
  }
}

function clearMediaSession() {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    const ms = navigator.mediaSession as any;
    ms.metadata = null;
    ms.playbackState = 'none';
  } catch (e) {
    console.warn('[AudioManager] clearMediaSession failed:', e);
  }
}

function setupMediaSession() {
  if (mediaSessionSetupDone) return;
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

  try {
    const ms = navigator.mediaSession as any;

    ms.setActionHandler('pause', () => {
      audioManager.pause();
    });

    ms.setActionHandler('play', () => {
      void (async () => {
        const audio = (window as any).__IMAGINARIO_AUDIO__ as HTMLAudioElement | undefined;
        if (audio?.src && audio.paused) {
          try {
            await audio.play();
            const lastId = (audioManager as any).lastPlayId as string | null;
            if (lastId) {
              (audioManager as any).setPlaying(lastId);
            } else {
              (navigator.mediaSession as any).playbackState = 'playing';
            }
          } catch (e) {
            console.warn('[AudioManager] mediaSession play handler failed:', e);
          }
          return;
        }

        const lastId = (audioManager as any).lastPlayId as string | null;
        const lastSrc = (audioManager as any).lastPlaySrc as string | null;
        const meta = (audioManager as any).currentMetadata as AudioPlayMetadata | null;
        if (lastId && lastSrc) {
          await audioManager.play(lastId, lastSrc, meta ?? undefined);
        }
      })();
    });

    mediaSessionSetupDone = true;
  } catch (e) {
    console.warn('[AudioManager] setupMediaSession failed:', e);
  }
}

// 🧭 Pausar audio automáticamente en cambios de página o visibilidad
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const pauseIfPlaying = () => {
    try {
      // ⛔ Ignorar autopause si ocurre demasiado cerca del inicio de la reproducción
      if (lastPlaybackStartedAt) {
        const elapsed = Date.now() - lastPlaybackStartedAt;
        // Si el autopause llega en los primeros 600 ms, lo consideramos ruido del sistema
        if (elapsed < 600) {
          console.log(
            "[AudioManager] ⏸️ Autopause ignorada (", 
            elapsed, 
            "ms después de iniciar reproducción)"
          );
          return;
        }
      }
      if (audioManager?.isPlaying && audioManager.isPlaying()) {
        console.log('[AudioManager] ⏸️ Pausa automática por cambio de vista.');
        // ⛔ Evitar autopausa en el primer tap después de montar la vista
        if (!allowAutoPause) {
          console.log("[AudioManager] ⏸️ Ignorando autopause inicial (primer tap safe)");
          return;
        }
        if (audioManager.isCapgoStarting()) {
          console.log('[AudioManager] ⏸️ Autopause ignorada: Capgo iniciando');
          return;
        }
        audioManager.pause();
      }
    } catch (err) {
      console.warn('[AudioManager] Error al pausar automáticamente:', err);
    }
  };

  // 🕒 Autopause deshabilitado brevemente tras cargar vista
  // NOTA: El lifecycle hook real (ionViewDidEnter) está en los componentes de Ionic.
  // Este setTimeout se ejecuta al inicializar el módulo para proteger el primer tap,
  // pero idealmente debería ejecutarse en ionViewDidEnter de cada página para mayor precisión.
  const resetAutoPauseFlag = () => {
    allowAutoPause = false;
    setTimeout(() => {
      allowAutoPause = true;
    }, 250);
  };

  // Resetear flag al inicio ANTES de registrar listeners para proteger primer tap
  resetAutoPauseFlag();

  // Cuando se cambia de pestaña o la app pasa a segundo plano
  document.addEventListener('visibilitychange', () => {
    // Ignorar visibilitychange mientras no esté permitido autopause
    if (!allowAutoPause) {
      console.log("[AudioManager] ⏸️ Ignorando visibilitychange inicial (primer tap safe)");
      return;
    }

    // Solo pausar si realmente la app se fue a background
    if (document.visibilityState === 'hidden') {
      if (BACKGROUND_AUDIO_ENABLED) {
        console.log('[AudioManager] Background audio enabled - skipping autopause');
        return;
      }
      pauseIfPlaying();
    }
  });

  // Cuando cambia la ruta interna de Ionic / React Router
  window.addEventListener('beforeunload', pauseIfPlaying);

  // 📱 Pausar audio cuando la app se va al background (modo nativo)
  try {
    App.addListener('pause', () => {
      // Ignorar pausa nativa mientras está en primer tap safe
      if (!allowAutoPause) {
        console.log("[AudioManager] ⏸️ Ignorando App.pause inicial (primer tap safe)");
        return;
      }

      if (BACKGROUND_AUDIO_ENABLED) {
        console.log('[AudioManager] Background audio enabled - skipping autopause');
        return;
      }

      pauseIfPlaying();
    });
  } catch (err) {
    console.warn('[AudioManager] No se pudo registrar App.pause:', err);
  }

  // 🚦 Pausar audio al cambiar de ruta o módulo
  try {
    // Inicializar lastPathname
    audioManager.lastPathname = window.location.pathname;

    // Cuando cambia la ruta interna de Ionic / React Router
    window.addEventListener('ionRouteWillChange', () => {
      const prevPath = audioManager.lastPathname;
      const currentPath = window.location.pathname;
      audioManager.lastPathname = currentPath;
      if (prevPath !== currentPath) {
        pauseIfPlaying();
        resetAutoPauseFlag();
      }
    });

    // También cubrir navegación directa por React Router (push, back, forward)
    window.addEventListener('popstate', () => {
      const prevPath = audioManager.lastPathname;
      const currentPath = window.location.pathname;
      audioManager.lastPathname = currentPath;
      if (prevPath !== currentPath) {
        pauseIfPlaying();
        resetAutoPauseFlag();
      }
    });

    // Monitor global de cambios de URL con MutationObserver (fallback en caso de router.push interno)
    const observer = new MutationObserver(() => {
      const currentPath = window.location.pathname;
      if (currentPath === audioManager.lastPathname) return;

      audioManager.lastPathname = currentPath;
      if (audioManager.isCapgoStarting()) {
        console.log('[AudioManager] ⏸️ Ignorando MutationObserver: Capgo iniciando');
        return;
      }
      if (!allowAutoPause) {
        console.log("[AudioManager] ⏸️ Ignorando cambio DOM inicial (primer tap safe)");
        return;
      }
      if (audioManager.isPlaying()) {
        pauseIfPlaying();
        resetAutoPauseFlag();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  } catch (err) {
    console.warn('[AudioManager] No se pudo registrar listener de cambio de ruta:', err);
  }
}
