import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Network } from '@capacitor/network';
import { getDb } from '../sqlite';
import { listBirds } from '../db/dao/birds';
import { getAllBirdImages } from '../db/dao/bird_images';
import { getAllSings, type Sing } from '../db/dao/sings';
import { getAllTracks, type Track } from '../db/dao/tracks';
import { getAllInterviews, type Interview } from '../db/dao/interviews';

const DEBUG = import.meta.env.VITE_DEBUG_CACHE === 'true';
const DEBUG_AUDIO_PERSISTENCE = true;

function audioPersistenceDebug(label: string, data: Record<string, unknown>) {
  if (!DEBUG_AUDIO_PERSISTENCE) return;
  console.log(`[AudioPersistenceDebug] ${label}`, data);
}

function normalizeAudioUrlForDebug(url: string): string {
  if (!url) return url;
  if (url.includes('?') || url.includes('#')) {
    try {
      const u = new URL(url);
      u.search = '';
      u.hash = '';
      return u.toString();
    } catch {
      return url.split('?')[0].split('#')[0];
    }
  }
  return url;
}

async function statAudioPathForDebug(path: string): Promise<{ exists: boolean; size: number }> {
  try {
    const stat = await Filesystem.stat({ path, directory: Directory.Data });
    return { exists: true, size: stat?.size || 0 };
  } catch {
    return { exists: false, size: 0 };
  }
}

// Configuración
const CACHE_CONFIG = {
  baseDir: 'imaginario',
  imagesDir: 'imaginario/images',
  audioDir: 'imaginario/audio',
  maxSizeBytes: 500 * 1024 * 1024, // 500 MB
  supportedImageExts: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
  supportedAudioExts: ['.mp3'],
} as const;

// Tipos para inventario de audios
export type AudioDownloadStatus = 'downloaded' | 'pending' | 'no_url' | 'corrupted';

export interface AudioInventoryItem {
  id: string;
  table: 'sings' | 'tracks' | 'interviews';
  title?: string;
  audio_url: string | null;
  expectedPath: string;
  exists: boolean;
  size: number;
  status: AudioDownloadStatus;
}

export interface AudioInventorySummary {
  total: number;
  downloaded: number;
  pending: number;
  no_url: number;
  corrupted: number;
  totalSizeMB: number;
  items: AudioInventoryItem[];
}

// Tipos para inventario de imágenes
export type ImageDownloadStatus = 'downloaded' | 'pending' | 'no_url' | 'corrupted';

export interface ImageInventoryItem {
  id: string;
  table: 'birds' | 'bird_images';
  bird_id?: string;
  title?: string;
  image_url: string | null;
  expectedPath: string;
  exists: boolean;
  size: number;
  status: ImageDownloadStatus;
}

export interface ImageInventorySummary {
  total: number;
  downloaded: number;
  pending: number;
  no_url: number;
  corrupted: number;
  totalSizeMB: number;
  items: ImageInventoryItem[];
}

// Helper para logs condicionales
function log(...args: any[]) {
  if (DEBUG) {
    console.log('[MediaCacheService]', ...args);
  }
}

function logWarn(...args: any[]) {
  if (DEBUG) {
    console.warn('[MediaCacheService]', ...args);
  }
}

function logError(...args: any[]) {
  // Los errores siempre se loguean
  console.error('[MediaCacheService]', ...args);
}

/**
 * Genera un hash SHA-1 de la URL para usarlo como nombre de archivo
 */
async function hashUrl(url: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    logError('Error generando hash de URL:', error);
    // Fallback: usar un hash simple basado en la URL
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 40);
  }
}

/**
 * Genera un hash SHA-256 de la URL para usarlo como nombre de archivo
 */
async function sha256(url: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    logError('Error generando hash SHA-256 de URL:', error);
    // Fallback: usar un hash simple basado en la URL
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 64);
  }
}

const AUDIO_CACHE_HEAD_TIMEOUT_MS = 5000;

function canonicalizeAudioUrl(url: string): string {
  // Misma representación que SQLite / player: URL cruda, sin encodeURI.
  return url.trim();
}

async function sha256AudioUrl(url: string): Promise<string> {
  return sha256(canonicalizeAudioUrl(url));
}

function audioPartPath(finalPath: string): string {
  return `${finalPath}.part`;
}

function audioCacheLog(
  event: 'valid' | 'size mismatch' | 'redownloading' | 'download complete' | 'partial download removed',
  data?: Record<string, unknown>
) {
  if (data) {
    console.log(`[AUDIO CACHE] ${event}`, data);
    return;
  }
  console.log(`[AUDIO CACHE] ${event}`);
}

async function deleteAudioCacheFile(path: string): Promise<void> {
  await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
}

async function statAudioFile(path: string): Promise<{ size: number } | null> {
  try {
    const stat = await Filesystem.stat({ path, directory: Directory.Data });
    if (!stat) return null;
    return { size: stat.size || 0 };
  } catch {
    return null;
  }
}

async function getRemoteContentLength(url: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AUDIO_CACHE_HEAD_TIMEOUT_MS);
    const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const header = response.headers.get('content-length');
    if (!header) return null;
    const size = Number.parseInt(header, 10);
    if (!Number.isFinite(size) || size <= 0) return null;
    return size;
  } catch {
    return null;
  }
}

const audioCacheLocks = new Map<string, Promise<unknown>>();

async function withAudioCacheLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T> {
  const previous = audioCacheLocks.get(lockKey) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.then(() => gate);
  audioCacheLocks.set(lockKey, chained);
  try {
    await previous.catch(() => undefined);
    return await fn();
  } finally {
    release();
    if (audioCacheLocks.get(lockKey) === chained) {
      audioCacheLocks.delete(lockKey);
    }
  }
}

async function promoteAudioPart(partPath: string, finalPath: string): Promise<boolean> {
  await deleteAudioCacheFile(finalPath);
  try {
    await Filesystem.rename({
      from: partPath,
      to: finalPath,
      directory: Directory.Data,
    });
    return true;
  } catch {
    try {
      await Filesystem.copy({
        from: partPath,
        to: finalPath,
        directory: Directory.Data,
      });
      await deleteAudioCacheFile(partPath);
      return true;
    } catch {
      await deleteAudioCacheFile(partPath);
      await deleteAudioCacheFile(finalPath);
      return false;
    }
  }
}

async function downloadAudioAtomically(
  url: string,
  finalPath: string,
  options?: { minSizeBytes?: number; remoteSize?: number | null }
): Promise<{ ok: boolean; size: number; error?: string }> {
  const partPath = audioPartPath(finalPath);
  const minSizeBytes = options?.minSizeBytes ?? 0;
  let remoteSize = options?.remoteSize ?? null;

  const parent = finalPath.split('/').slice(0, -1).join('/');
  if (parent) {
    await Filesystem.mkdir({
      path: parent,
      directory: Directory.Data,
      recursive: true,
    }).catch(() => {});
  }

  await deleteAudioCacheFile(partPath);

  if (remoteSize == null) {
    remoteSize = await getRemoteContentLength(url);
  }

  audioCacheLog('redownloading', { path: finalPath });

  try {
    await Filesystem.downloadFile({
      url,
      directory: Directory.Data,
      path: partPath,
      progress: false,
    });

    const partStat = await statAudioFile(partPath);
    const downloadedSize = partStat?.size ?? 0;

    if (downloadedSize <= 0) {
      await deleteAudioCacheFile(partPath);
      audioCacheLog('partial download removed', { path: partPath, size: downloadedSize });
      return { ok: false, size: 0, error: 'Archivo descargado vacío' };
    }

    if (remoteSize && downloadedSize !== remoteSize) {
      await deleteAudioCacheFile(partPath);
      audioCacheLog('size mismatch', { path: partPath, localSize: downloadedSize, remoteSize });
      audioCacheLog('partial download removed', { path: partPath, size: downloadedSize });
      return {
        ok: false,
        size: 0,
        error: `Tamaño incompleto (${downloadedSize} bytes, esperado ${remoteSize})`,
      };
    }

    if (!remoteSize && minSizeBytes > 0 && downloadedSize < minSizeBytes) {
      await deleteAudioCacheFile(partPath);
      audioCacheLog('partial download removed', { path: partPath, size: downloadedSize });
      return {
        ok: false,
        size: 0,
        error: `Archivo corrupto o incompleto (${downloadedSize} bytes, mínimo ${minSizeBytes} bytes)`,
      };
    }

    const promoted = await promoteAudioPart(partPath, finalPath);
    if (!promoted) {
      return { ok: false, size: 0, error: 'No se pudo promover el archivo descargado' };
    }

    audioCacheLog('download complete', { path: finalPath, size: downloadedSize });
    return { ok: true, size: downloadedSize };
  } catch (error) {
    await deleteAudioCacheFile(partPath);
    audioCacheLog('partial download removed', { path: partPath });
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, size: 0, error: message };
  }
}

async function validateExistingAudio(
  url: string,
  finalPath: string,
  options?: { minSizeBytes?: number; online?: boolean }
): Promise<{ valid: boolean; size: number }> {
  await deleteAudioCacheFile(audioPartPath(finalPath));

  const existing = await statAudioFile(finalPath);
  if (!existing || existing.size <= 0) {
    return { valid: false, size: 0 };
  }

  if (options?.online === false) {
    const minSizeBytes = options?.minSizeBytes ?? 0;
    if (minSizeBytes > 0 && existing.size < minSizeBytes) {
      return { valid: false, size: existing.size };
    }
    return { valid: true, size: existing.size };
  }

  const remoteSize = await getRemoteContentLength(url);
  if (remoteSize && existing.size !== remoteSize) {
    audioCacheLog('size mismatch', {
      path: finalPath,
      localSize: existing.size,
      remoteSize,
    });
    await deleteAudioCacheFile(finalPath);
    audioCacheLog('partial download removed', { path: finalPath, size: existing.size });
    return { valid: false, size: 0 };
  }

  if (remoteSize && existing.size === remoteSize) {
    audioCacheLog('valid', { path: finalPath, size: existing.size });
    return { valid: true, size: existing.size };
  }

  const minSizeBytes = options?.minSizeBytes ?? 0;
  if (minSizeBytes > 0 && existing.size < minSizeBytes) {
    return { valid: false, size: existing.size };
  }

  return { valid: true, size: existing.size };
}

/**
 * Obtiene la extensión del archivo desde la URL
 */
function getExtensionFromUrl(url: string, type: 'image' | 'audio'): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const lastDot = pathname.lastIndexOf('.');
    
    if (lastDot === -1) {
      // Sin extensión, usar la predeterminada según el tipo
      return type === 'image' ? '.jpg' : '.mp3';
    }
    
    const ext = pathname.substring(lastDot);
    
    // Validar que la extensión esté soportada
    if (type === 'image' && CACHE_CONFIG.supportedImageExts.includes(ext as any)) {
      // extensión válida para imagen
      return ext;
    }
    if (type === 'audio' && CACHE_CONFIG.supportedAudioExts.includes(ext as any)) {
      // extensión válida para audio
      return ext;
    }
    
    // Si no está soportada, usar la predeterminada
    return type === 'image' ? '.jpg' : '.mp3';
  } catch (error) {
    logWarn('Error parseando URL para extensión:', error);
    return type === 'image' ? '.jpg' : '.mp3';
  }
}

/**
 * Asegura que un directorio existe, creándolo si es necesario
 */
async function ensureDir(path: string): Promise<void> {
  try {
    await Filesystem.mkdir({
      path,
      directory: Directory.Data,
      recursive: true,
    });
    log('Directorio verificado/creado:', path);
  } catch (error: any) {
    // Si el error es que ya existe, está bien
    if (error.message && error.message.includes('already exists')) {
      log('Directorio ya existe:', path);
      return;
    }
    logWarn('Error creando directorio:', path, error);
    throw error;
  }
}

/**
 * Convierte un Blob a base64 de forma segura
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ⚠️ Punto de IO: descarga de audio
/**
 * Descarga un archivo de audio usando Filesystem.downloadFile nativo
 * (más eficiente que fetch + FileReader + base64)
 */
async function downloadAudioNative(url: string, destPath: string): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) {
    log('[downloadAudioNative] 🚫 URL inválida:', url);
    return false;
  }

  return withAudioCacheLock(destPath, async () => {
    const result = await downloadAudioAtomically(url, destPath, { minSizeBytes: 0 });
    if (!result.ok) {
      log('[downloadAudioNative] ❌ Error descargando archivo', url, result.error);
      return false;
    }

    log('[downloadAudioNative] ✅ Archivo descargado:', destPath, 'bytes:', result.size);
    return true;
  });
}

export async function downloadAudioItem(
  audioUrl: string,
  options?: {
    destPath?: string;
    onProgress?: (percent: number) => void;
    minSizeBytes?: number;
  }
): Promise<{ success: boolean; path: string; size: number; error?: string }> {
  if (!audioUrl || audioUrl.trim() === '') {
    const error = 'audioUrl vacío';
    logWarn('[downloadAudioItem] 🚫', error);
    return { success: false, path: '', size: 0, error };
  }

  const minSizeBytes = options?.minSizeBytes ?? 30 * 1024;
  let path = options?.destPath ?? '';

  try {
    const hash = await sha256AudioUrl(audioUrl);
    path = path || `imaginario/audio/${hash}.mp3`;

    return await withAudioCacheLock(path, async () => {
      log('[downloadAudioItem] ⬇️ Descargando:', audioUrl, '→', path);
      options?.onProgress?.(0);

      let online = true;
      try {
        const net = await Network.getStatus();
        online = !!net.connected;
      } catch {
        online = true;
      }

      const existing = await validateExistingAudio(audioUrl, path, {
        minSizeBytes,
        online,
      });
      if (existing.valid) {
        options?.onProgress?.(100);
        return { success: true, path, size: existing.size };
      }

      const result = await downloadAudioAtomically(audioUrl, path, { minSizeBytes });
      if (!result.ok) {
        audioPersistenceDebug('delete requested', {
          path,
          reason: 'download-below-threshold',
          size: result.size,
          caller: 'downloadAudioItem',
        });
        logWarn('[downloadAudioItem] ❌', result.error, path);
        return { success: false, path, size: 0, error: result.error };
      }

      console.log('[mediaCache] audio descargado; limpieza automática omitida para preservar offline');
      options?.onProgress?.(100);

      log('[downloadAudioItem] ✅ Descarga completada:', path, 'bytes:', result.size);
      return { success: true, path, size: result.size };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('[downloadAudioItem] ❌ Error descargando audio:', audioUrl, message);
    return { success: false, path, size: 0, error: message };
  }
}

// ⚠️ Punto de IO: descarga de imagen
/**
 * Descarga una imagen usando Filesystem.downloadFile nativo
 * (evita OutOfMemory al no pasar datos grandes por el bridge de Capacitor)
 */
async function downloadImageStreaming(path: string, url: string): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) {
    log('[downloadImageStreaming] 🚫 URL inválida o vacía:', url);
    return false;
  }

  // Asegurar carpeta padre (por si no existe)
  const parent = path.split('/').slice(0, -1).join('/');
  if (parent) {
    await Filesystem.mkdir({
      path: parent,
      directory: Directory.Data,
      recursive: true,
    }).catch(() => {
      // carpeta ya existe
    });
  }

  try {
    log('[ImageCache] usando Filesystem.downloadFile para:', url, '→', path);

    const result = await Filesystem.downloadFile({
      url,
      directory: Directory.Data,
      path,
      progress: false,
    });

    // Verificar tamaño > 0
    const stat = await Filesystem.stat({
      path,
      directory: Directory.Data,
    });

    if (!stat || !stat.size || stat.size <= 0) {
      log('[downloadImageStreaming] ❌ Archivo con tamaño 0 después de downloadFile:', path);
      return false;
    }

    log('[downloadImageStreaming] ✅ Archivo descargado:', path, 'bytes:', stat.size);
    return true;
  } catch (error) {
    log('[downloadImageStreaming] ❌ Error descargando archivo', url, error);
    return false;
  }
}

export async function downloadImageItem(
  imageUrl: string,
  options?: {
    destPath?: string;
    onProgress?: (progress: number) => void;
  }
): Promise<{ success: boolean; path: string; size: number; error?: string }> {
  if (!imageUrl || imageUrl.trim() === '') {
    const error = 'imageUrl vacío';
    logWarn('[downloadImageItem] 🚫', error);
    return { success: false, path: '', size: 0, error };
  }

  let path = options?.destPath ?? '';

  try {
    if (!path) {
      const hash = await hashUrl(imageUrl);
      const ext = getExtensionFromUrl(imageUrl, 'image');
      path = `${CACHE_CONFIG.imagesDir}/${hash}${ext}`;
    }

    const parent = path.split('/').slice(0, -1).join('/');
    if (parent) {
      await Filesystem.mkdir({
        path: parent,
        directory: Directory.Data,
        recursive: true,
      }).catch(() => {
        // carpeta ya existe
      });
    }

    log('[downloadImageItem] ⬇️ Descargando:', imageUrl, '→', path);

    const ok = await downloadImageStreaming(path, imageUrl);
    if (!ok) {
      const error = 'No se pudo descargar la imagen';
      logWarn('[downloadImageItem] ❌', error, path);
      return { success: false, path, size: 0, error };
    }

    const stat = await Filesystem.stat({
      path,
      directory: Directory.Data,
    });
    const size = stat?.size || 0;

    if (size < 100) {
      await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
      const error = `Imagen corrupta o incompleta (${size} bytes, mínimo 100 bytes)`;
      logWarn('[downloadImageItem] ❌', error, path);
      return { success: false, path, size, error };
    }

    console.log('[mediaCache] imagen descargada; limpieza automática omitida para preservar offline');
    options?.onProgress?.(100);

    log('[downloadImageItem] ✅ Descarga completada:', path, 'bytes:', size);
    return { success: true, path, size };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('[downloadImageItem] ❌ Error descargando imagen:', imageUrl, message);
    return { success: false, path, size: 0, error: message };
  }
}

// ⚠️ Punto de IO: descarga genérica (usada como fallback para audios)
/**
 * Descarga un archivo usando Filesystem.downloadFile nativo
 * (evita OutOfMemory al no pasar datos grandes por el bridge de Capacitor)
 */
async function downloadTo(path: string, url: string): Promise<boolean> {
  if (!url || !/^https?:\/\//i.test(url)) {
    log('[downloadTo] 🚫 URL inválida o vacía:', url);
    return false;
  }

  const result = await downloadAudioAtomically(url, path, { minSizeBytes: 0 });
  if (!result.ok) {
    log('[downloadTo] ❌ Error descargando archivo', url, result.error);
    return false;
  }

  log('[downloadTo] ✅ Archivo guardado en caché:', path, 'bytes:', result.size);
  return true;
}

/**
 * Calcula el tamaño total del caché en bytes
 */
async function getTotalCacheSize(): Promise<number> {
  async function dirSize(path: string): Promise<number> {
    const entries = await Filesystem.readdir({ directory: Directory.Data, path }).catch(() => ({ files: [] as any[] }));
    let total = 0;
    for (const e of entries.files || []) {
      const subPath = `${path}/${e.name}`;
      if (e.type === 'directory') {
        total += await dirSize(subPath);
      } else {
        const st = await Filesystem.stat({ directory: Directory.Data, path: subPath }).catch(() => null);
        if (st?.size) total += st.size;
      }
    }
    return total;
  }
  const root = 'imaginario';
  const exists = await Filesystem.stat({ directory: Directory.Data, path: root }).catch(() => null);
  if (!exists) return 0;
  return await dirSize(root);
}

/**
 * Obtiene información de todos los archivos del caché ordenados por fecha de modificación
 */
async function getAllCacheFiles(): Promise<Array<{ path: string; size: number; mtime: number }>> {
  const files: Array<{ path: string; size: number; mtime: number }> = [];
  
  // Obtener archivos de imágenes
  try {
    const imagesDir = await Filesystem.readdir({
      path: CACHE_CONFIG.imagesDir,
      directory: Directory.Data,
    });
    
    for (const file of imagesDir.files || []) {
      try {
        const stat = await Filesystem.stat({
          path: `${CACHE_CONFIG.imagesDir}/${file.name}`,
          directory: Directory.Data,
        });
        files.push({
          path: `${CACHE_CONFIG.imagesDir}/${file.name}`,
          size: stat.size || 0,
          mtime: stat.mtime || 0,
        });
      } catch {
        // Ignorar archivos que no se pueden leer
      }
    }
  } catch (error: any) {
    if (!error.message?.includes('does not exist')) {
      logWarn('Error leyendo directorio de imágenes:', error);
    }
  }
  
  // Obtener archivos de audios
  try {
    const audioDir = await Filesystem.readdir({
      path: CACHE_CONFIG.audioDir,
      directory: Directory.Data,
    });
    
    for (const file of audioDir.files || []) {
      try {
        const stat = await Filesystem.stat({
          path: `${CACHE_CONFIG.audioDir}/${file.name}`,
          directory: Directory.Data,
        });
        files.push({
          path: `${CACHE_CONFIG.audioDir}/${file.name}`,
          size: stat.size || 0,
          mtime: stat.mtime || 0,
        });
      } catch {
        // Ignorar archivos que no se pueden leer
      }
    }
  } catch (error: any) {
    if (!error.message?.includes('does not exist')) {
      logWarn('Error leyendo directorio de audios:', error);
    }
  }
  
  // Ordenar por fecha de modificación (más antiguos primero)
  return files.sort((a, b) => a.mtime - b.mtime);
}

/**
 * Aplica el límite de tamaño del caché eliminando archivos antiguos si es necesario
 */
async function enforceCacheLimit(): Promise<void> {
  try {
    const currentSize = await getTotalCacheSize();
    log('Tamaño actual del caché:', (currentSize / 1024 / 1024).toFixed(2), 'MB');
    
    if (currentSize <= CACHE_CONFIG.maxSizeBytes) {
      log('Caché dentro del límite, no se requiere limpieza');
      return;
    }
    
    logWarn('Caché excede el límite, eliminando archivos antiguos...');
    
    const files = await getAllCacheFiles();
    let freedBytes = 0;
    let deletedCount = 0;
    
    // Eliminar archivos más antiguos hasta estar bajo el límite
    for (const file of files) {
      if (currentSize - freedBytes <= CACHE_CONFIG.maxSizeBytes) {
        break;
      }

      if (
        file.path === CACHE_CONFIG.audioDir ||
        file.path.startsWith(`${CACHE_CONFIG.audioDir}/`)
      ) {
        console.log('[Cache] preserving offline audio from cache eviction:', file.path);
        continue;
      }

      if (
        file.path === CACHE_CONFIG.imagesDir ||
        file.path.startsWith(`${CACHE_CONFIG.imagesDir}/`)
      ) {
        console.log('[Cache] preserving offline image from cache eviction:', file.path);
        continue;
      }
      
      try {
        await Filesystem.deleteFile({
          path: file.path,
          directory: Directory.Data,
        });
        freedBytes += file.size;
        deletedCount++;
        log('Archivo eliminado:', file.path);
      } catch (error) {
        logWarn('Error eliminando archivo:', file.path, error);
      }
    }
    
    log(`Limpieza completada: ${deletedCount} archivos eliminados, ${(freedBytes / 1024 / 1024).toFixed(2)} MB liberados`);
  } catch (error) {
    logError('Error aplicando límite de caché:', error);
  }
}

/**
 * Cachea una imagen desde una URL
 */
async function cacheImage(url?: string | null): Promise<string | undefined> {
  if (!url) {
    log('URL vacía, retornando undefined');
    return undefined;
  }
  
  // Verificar si estamos en plataforma nativa
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (!isNative) {
    log('No es plataforma nativa, retornando URL original');
    return url;
  }
  
  try {
    // Asegurar que el directorio existe
    await ensureDir(CACHE_CONFIG.imagesDir);
    
    // Generar hash y obtener extensión
    const hash = await hashUrl(url);
    const ext = getExtensionFromUrl(url, 'image');
    const fileName = `${hash}${ext}`;
    const filePath = `${CACHE_CONFIG.imagesDir}/${fileName}`;
    
    // Verificar si el archivo ya existe
    try {
      await Filesystem.stat({
        path: filePath,
        directory: Directory.Data,
      });
      log('Imagen ya cacheada:', filePath);
    } catch {
      // El archivo no existe, descargarlo
      log('Imagen no encontrada en caché, descargando...');
      await downloadImageStreaming(filePath, url);
      
      // Verificar límite después de descargar
      await enforceCacheLimit();
    }
    
    // Obtener URI local
    const uriResult = await Filesystem.getUri({
      path: filePath,
      directory: Directory.Data,
    });
    
    log('URI local generada:', uriResult.uri);
    return uriResult.uri;
  } catch (error) {
    logError('Error cacheando imagen:', url, error);
    // En caso de error, retornar la URL original como fallback
    return url;
  }
}

/**
 * Cachea un audio desde una URL (versión 2025-11 reforzada con verificación, retry y mutex).
 */
async function cacheAudio(url?: string | null): Promise<string | undefined> {
  if (!url) {
    log('[CacheAudio] URL vacía, retornando undefined');
    return undefined;
  }

  const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
  if (!isNative) {
    log('[CacheAudio] No es plataforma nativa, retornando URL original');
    return url;
  }

  const hashHex = await sha256AudioUrl(url);
  const path = `imaginario/audio/${hashHex}.mp3`;

  return withAudioCacheLock(path, async () => {
    try {
      let online = true;
      try {
        const net = await Network.getStatus();
        online = !!net.connected;
      } catch {
        online = true;
      }

      const existing = await validateExistingAudio(url, path, {
        minSizeBytes: 1024,
        online,
      });
      if (existing.valid && existing.size > 1024) {
        log(`[CacheAudio] 🟢 Ya en caché (${(existing.size / 1024).toFixed(1)} KB)`);
        const uriRes = await Filesystem.getUri({ path, directory: Directory.Data });
        return uriRes.uri;
      }

      if (!online) {
        log('[CacheAudio] Sin conexión y sin archivo local válido');
        return undefined;
      }

      log(`[CacheAudio] ⬇️ Descargando (nativo): ${url}`);

      for (let attempt = 1; attempt <= 2; attempt++) {
        const result = await downloadAudioAtomically(url, path, { minSizeBytes: 1024 });

        if (result.ok && result.size > 1024) {
          log(
            `[CacheAudio] ✅ Guardado OK (${(result.size / 1024).toFixed(1)} KB): ${path}`,
          );
          const uriRes = await Filesystem.getUri({ path, directory: Directory.Data });
          return uriRes.uri;
        }

        console.warn(
          `[CacheAudio] ⚠️ Archivo sospechoso (${result.size || 0} bytes), reintentando (${attempt})`,
        );
        audioPersistenceDebug('delete requested', {
          path,
          reason: 'cache-audio-below-1kb',
          size: result.size || 0,
          caller: 'cacheAudio',
        });
        await deleteAudioCacheFile(path);
        await deleteAudioCacheFile(audioPartPath(path));

        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      console.error(`[CacheAudio] ❌ No se pudo guardar ${url} tras 2 intentos`);
      console.warn(`[DebugCacheAudio] Fallo al guardar: ${url}`);
      return undefined;
    } catch (err) {
      console.error('[CacheAudio] ❌ Error general:', url, err);
      console.warn(`[DebugCacheAudio] Fallo al guardar: ${url}`);
      return undefined;
    }
  });
}

// ✅ Helper para reintentar descarga de imágenes corruptas
async function retryDownloadIfCorrupt(url: string, path: string): Promise<string> {
  try {
    // Verificar tamaño del archivo
    const stat = await Filesystem.stat({ path, directory: Directory.Data });
    if (stat.size && stat.size > 0) return path;

    console.log("[IMG-RETRY] Archivo corrupto, reintentando:", url);

    // Intento 2: descargar de nuevo usando streaming
    const ok = await downloadImageStreaming(path, url);
    if (!ok) {
      console.warn("[IMG-RETRY] Falló el reintento con streaming, usando la URL original.");
      return url;
    }

    const stat2 = await Filesystem.stat({ path, directory: Directory.Data });
    if (stat2.size && stat2.size > 0) {
      console.log("[IMG-RETRY] Recuperada correctamente:", url);
      return path;
    }

    console.warn("[IMG-RETRY] Falló el reintento, usando la URL original.");
    return url; 
  } catch (err) {
    console.warn("[IMG-RETRY] Error inesperado:", err);
    return url;
  }
}

// ✅ Helper unificado para medios
export async function ensureCachedMedia(url?: string | null, type: 'audio' | 'image' = 'audio'): Promise<string | undefined> {
  if (!url) {
    log(`[ensureCachedMedia] URL vacía (${type}), omitiendo.`);
    return undefined;
  }

  try {
    const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (!isNative) return url;

    const { Network } = await import('@capacitor/network');
    const net = await Network.getStatus();
    const isOffline = !net.connected;

    if (type === 'audio') {
      const hash = await sha256AudioUrl(url);
      const relPath = `imaginario/audio/${hash}.mp3`;

      return await withAudioCacheLock(relPath, async () => {
        const existing = await validateExistingAudio(url, relPath, {
          minSizeBytes: 0,
          online: !isOffline,
        });

        if (!existing.valid) {
          if (isOffline) {
            return url;
          }

          const ok = await downloadTo(relPath, url);
          if (!ok) return url;
        }

        const uriRes = await Filesystem.getUri({ path: relPath, directory: Directory.Data });
        const fileUri = uriRes?.uri?.startsWith('file://') ? uriRes.uri : `file://${uriRes?.uri}`;
        log(`[ensureCachedMedia] ▶️ URI local lista (${type}):`, fileUri);
        return fileUri;
      });
    }

    const hash = await sha256(url);
    const relPath = `imaginario/images/${hash}.jpg`;

    const existing = await Filesystem.stat({ path: relPath, directory: Directory.Data }).catch(() => null);
    if (!existing) {
      if (!isOffline) {
        const ok = await downloadImageStreaming(relPath, url);
        if (!ok) return url;

        const retryResult = await retryDownloadIfCorrupt(url, relPath);
        if (retryResult === url) {
          return url;
        }
      } else {
        return url;
      }
    }

    const retryResult = await retryDownloadIfCorrupt(url, relPath);
    if (retryResult !== relPath) {
      return url;
    }

    const uriRes = await Filesystem.getUri({ path: relPath, directory: Directory.Data });
    const fileUri = uriRes?.uri?.startsWith('file://') ? uriRes.uri : `file://${uriRes?.uri}`;
    log(`[ensureCachedMedia] ▶️ URI local lista (${type}):`, fileUri);
    return fileUri;
  } catch (error) {
    log(`[ensureCachedMedia] ❌ Error cacheando ${type}:`, error);
    return url;
  }
}

/**
 * Obtiene el tamaño total del caché en bytes
 */
async function getCacheSize(): Promise<number> {
  return await getTotalCacheSize();
}

/**
 * Limpia todo el caché de medios
 */
async function clearCache(): Promise<void> {
  try {
    log('Iniciando limpieza completa del caché...');
    
    // Eliminar directorio de imágenes
    try {
      await Filesystem.rmdir({
        path: CACHE_CONFIG.imagesDir,
        directory: Directory.Data,
        recursive: true,
      });
      log('Directorio de imágenes eliminado');
    } catch (error: any) {
      if (!error.message?.includes('does not exist')) {
        logWarn('Error eliminando directorio de imágenes:', error);
      }
    }
    
    // Eliminar directorio de audios
    try {
      await Filesystem.rmdir({
        path: CACHE_CONFIG.audioDir,
        directory: Directory.Data,
        recursive: true,
      });
      log('Directorio de audios eliminado');
    } catch (error: any) {
      if (!error.message?.includes('does not exist')) {
        logWarn('Error eliminando directorio de audios:', error);
      }
    }
    
    // Intentar eliminar el directorio base si está vacío
    try {
      await Filesystem.rmdir({
        path: CACHE_CONFIG.baseDir,
        directory: Directory.Data,
        recursive: true,
      });
      log('Directorio base eliminado');
    } catch (error: any) {
      // No es crítico si falla
      logWarn('Error eliminando directorio base:', error);
    }
    
    log('Limpieza del caché completada');
  } catch (error) {
    logError('Error limpiando caché:', error);
    throw error;
  }
}

/**
 * Servicio centralizado de caché de medios
 */
export const mediaCacheService = {
  cacheImage,
  cacheAudio,
  downloadAudioItem,
  downloadImageItem,
  getCacheSize,
  clearCache,
  getAudioDownloadInventory,
  getImageDownloadInventory,
};

// Exportar funciones individuales para compatibilidad
export { cacheImage, cacheAudio, getCacheSize, clearCache };

/**
 * Garantiza que el directorio de audios exista, sin lanzar error si ya está creado.
 */
async function ensureAudioDir() {
  try {
    await Filesystem.mkdir({
      path: 'imaginario/audio',
      directory: Directory.Data,
      recursive: true,
    });
  } catch (err: any) {
    if (err?.message?.includes('already exists')) {
      // Silencio: carpeta ya creada
    } else {
      console.warn('[AudioCache] ⚠️ mkdir error no crítico:', err.message);
    }
  }
}

// ⚠️ Punto de IO: descarga de audio grande (usada en verifyAudioCache)
/**
 * Descarga un archivo de audio usando Filesystem.downloadFile nativo
 * (evita OutOfMemory incluso para archivos grandes >10MB)
 */
async function downloadAudioStream(url: string, destPath: string): Promise<void> {
  await ensureAudioDir();

  const result = await withAudioCacheLock(destPath, async () => {
    return downloadAudioAtomically(url, destPath, { minSizeBytes: 0 });
  });

  if (!result.ok) {
    console.error(`[StreamSave] ❌ Error descargando archivo grande: ${url}`, result.error);
    throw new Error(result.error || 'Error descargando archivo grande');
  }

  console.log(`[StreamSave] ✅ Guardado OK (${(result.size / 1024 / 1024).toFixed(2)} MB) en ${destPath}`);
  await enforceCacheLimit();
}

/**
 * Versión ajustada de verifyAudioCache() con manejo de mkdir y verificación final
 */
export async function verifyAudioCache(): Promise<{ total: number; missing: number; refreshed: number }> {
  console.log('[VerifyCache] 🔍 Iniciando verificación de audios...');
  let total = 0;
  let missing = 0;
  let refreshed = 0;

  await ensureAudioDir();

  try {
    // Usar la conexión compartida de la base de datos
    const dbConn = await getDb();

    const res = await dbConn.query('SELECT id, audio_url, updated_at FROM tracks WHERE deleted_at IS NULL');
    const tracks = res.values || [];
    total = tracks.length;

    const status = await Network.getStatus();
    const isOnline = status.connected;

    for (const track of tracks) {
      const url = track.audio_url;
      if (!url) continue;
      const hashHex = await sha256AudioUrl(url);
      const path = `imaginario/audio/${hashHex}.mp3`;

      const existing = await validateExistingAudio(url, path, {
        minSizeBytes: 100,
        online: isOnline,
      });
      if (existing.valid) {
        continue;
      }

      missing++;
      console.warn(`[VerifyCache] ❌ Faltante: ${url}`);

      if (isOnline) {
        try {
          const contentLength = await getRemoteContentLength(url);
          if (contentLength && contentLength > 10 * 1024 * 1024) {
            await downloadAudioStream(url, path);
          } else {
            await cacheAudio(url);
          }
          await enforceCacheLimit();
          refreshed++;
        } catch (err) {
          console.error(`[VerifyCache] ⚠️ Error al recuperar ${url}`, err);
        }
      }
    }

    // Nota: No cerramos la conexión ya que getDb() maneja una conexión compartida
  } catch (err) {
    console.error('[VerifyCache] 🛑 Error general en verificación', err);
  }

  console.log(`[VerifyCache] ✅ Finalizado: total=${total}, faltantes=${missing}, recuperados=${refreshed}`);
  return { total, missing, refreshed };
}

/**
 * Verifica el caché de audios con progreso continuo y validación real de archivos
 * @param onProgress Callback opcional que se llama cada vez que se verifica un audio
 * @returns Resumen final con total, missing y completed
 */
export async function verifyAudioCacheWithProgress(
  onProgress?: (status: { total: number; checked: number; missing: number; downloading: number; completed: number; }) => void
): Promise<{ total: number; missing: number; completed: number; }> {
  console.log('[DebugVerify] Iniciando verificación progresiva de audios...');
  console.log('[VerifyAudio] 🔍 Iniciando verificación de audios con progreso...');
  
  let total = 0;
  let checked = 0;
  let missing = 0;
  let downloading = 0;
  let completed = 0;
  const MIN_SIZE_BYTES = 30 * 1024; // 30 KB

  await ensureAudioDir();

  try {
    // Usar la conexión compartida de la base de datos
    const dbConn = await getDb();

    const res = await dbConn.query(`
      SELECT id, audio_url, updated_at, 'tracks' as audio_type FROM tracks WHERE deleted_at IS NULL
      UNION ALL
      SELECT id, audio_url, updated_at, 'sings' as audio_type FROM sings WHERE deleted_at IS NULL
      UNION ALL
      SELECT id, audio_url, updated_at, 'interviews' as audio_type FROM interviews WHERE deleted_at IS NULL
    `);
    const allAudios = res.values || [];
    total = allAudios.length;

    const status = await Network.getStatus();
    const isOnline = status.connected;

    // Función helper para notificar progreso
    const notifyProgress = () => {
      onProgress?.({ total, checked, missing, downloading, completed });
    };

    for (const audio of allAudios) {
      const url = audio.audio_url;
      if (!url) {
        checked++;
        notifyProgress();
        continue;
      }

      console.log(`[DebugVerify] Revisión ${checked + 1}/${total} → ${url}`);

      const hashHex = await sha256AudioUrl(url);
      const path = `imaginario/audio/${hashHex}.mp3`;
      const audioType = audio.audio_type || 'unknown';

      const existing = await validateExistingAudio(url, path, {
        minSizeBytes: MIN_SIZE_BYTES,
        online: isOnline,
      });

      let fileExists = existing.size > 0 || existing.valid;
      let fileSizeValid = existing.valid;
      let verifySize = existing.size;

      if (fileSizeValid) {
        completed++;
        checked++;
        console.log(`[VerifyAudio] ✅ Audio completo: ${url} (${(verifySize / 1024).toFixed(1)} KB)`);
        audioPersistenceDebug('verify', {
          id: audio.id,
          type: audioType,
          url,
          expectedPath: path,
          exists: true,
          size: verifySize,
          threshold: MIN_SIZE_BYTES,
          action: 'keep',
        });
        notifyProgress();
        continue;
      }

      if (!fileExists) {
        console.log(`[DebugVerify] Archivo no existe: ${path}`);
      } else {
        console.warn(`[DebugVerify] Archivo sospechoso o vacío: ${path} (tamaño: ${verifySize} bytes, mínimo requerido: ${MIN_SIZE_BYTES} bytes)`);
        console.warn(`[VerifyAudio] ⚠️ Audio incompleto: ${url} (${verifySize} bytes, mínimo requerido: ${MIN_SIZE_BYTES} bytes)`);
      }

      // Si el archivo no existe o es incompleto, intentar descargarlo
      if (!fileExists || !fileSizeValid) {
        missing++;
        checked++;
        notifyProgress();

        let verifyAction: 'redownload' | 'delete' | 'pending' = isOnline ? 'redownload' : 'pending';

        if (isOnline) {
          downloading++;
          notifyProgress();

          let downloadSuccess = false;
          let attempts = 0;
          const maxAttempts = 2;

          while (attempts < maxAttempts && !downloadSuccess) {
            attempts++;
            try {
              console.log(`[VerifyAudio] ⬇️ Descargando (intento ${attempts}/${maxAttempts}): ${url}`);

              // Descargar usando API nativa
              const ok = await downloadAudioNative(url, path);

              if (ok) {
                // Verificar tamaño después de la descarga
                try {
                  const stat = await Filesystem.stat({ path, directory: Directory.Data });
                  if (stat?.size && stat.size >= MIN_SIZE_BYTES) {
                    downloadSuccess = true;
                    completed++;
                    verifySize = stat.size;
                    console.log(`[VerifyAudio] ✅ Descarga exitosa: ${url} (${(stat.size / 1024).toFixed(1)} KB)`);
                  } else {
                    console.warn(`[DebugVerify] Archivo descargado sospechoso o vacío: ${path} (tamaño: ${stat?.size || 0} bytes, mínimo requerido: ${MIN_SIZE_BYTES} bytes)`);
                    console.warn(`[VerifyAudio] ⚠️ Archivo descargado incompleto (${stat.size || 0} bytes), reintentando...`);
                    audioPersistenceDebug('delete requested', {
                      path,
                      reason: 'verify-redownload-below-threshold',
                      size: stat?.size || 0,
                      caller: 'verifyAudioCacheWithProgress',
                    });
                    verifyAction = 'delete';
                    // Eliminar archivo incompleto antes de reintentar
                    await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(() => {});
                    if (attempts < maxAttempts) {
                      await new Promise(r => setTimeout(r, 500)); // Pequeña pausa antes de reintentar
                    }
                  }
                } catch (statError) {
                  console.error(`[DebugVerify] Error al verificar archivo descargado: ${path}`, statError);
                  console.error(`[VerifyAudio] ❌ Error verificando archivo descargado: ${url}`, statError);
                  if (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 500));
                  }
                }
              } else {
                console.warn(`[VerifyAudio] ⚠️ Falla en downloadAudioNative (intento ${attempts}/${maxAttempts}) para ${url}`);
                if (attempts < maxAttempts) {
                  await new Promise(r => setTimeout(r, 500));
                }
              }

              // Aplicar límite del caché tras descarga individual
              await enforceCacheLimit();
            } catch (err) {
              console.error(`[VerifyAudio] ❌ Error al descargar (intento ${attempts}/${maxAttempts}): ${url}`, err);
              if (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 500));
              }
            }
          }

          if (!downloadSuccess) {
            console.error(`[VerifyAudio] ❌ No se pudo descargar/validar ${url} tras ${maxAttempts} intentos, marcado como incompleto`);
          } else {
            verifyAction = 'redownload';
          }

          downloading--;
          notifyProgress();
        } else {
          console.warn(`[VerifyAudio] ⚠️ Sin conexión, no se puede descargar: ${url}`);
        }

        audioPersistenceDebug('verify', {
          id: audio.id,
          type: audioType,
          url,
          expectedPath: path,
          exists: fileExists,
          size: verifySize,
          threshold: MIN_SIZE_BYTES,
          action: verifyAction,
        });
      }
    }

    // Nota: No cerramos la conexión ya que getDb() maneja una conexión compartida
  } catch (err) {
    console.error('[VerifyAudio] 🛑 Error general en verificación', err);
  }

  const summary = `[VerifyAudio] ✅ Finalizado: ${total} audios, ${completed} completos, ${missing} faltantes.`;
  console.log(summary);
  console.log(`[DebugVerify] ✅ Finalizado — total=${total}, completos=${completed}, faltantes=${missing}`);
  
  return { total, missing, completed };
}

/**
 * Genera un inventario completo de audios comparando SQLite contra Filesystem
 * @returns Resumen con total, descargados, pendientes y detalles de cada audio
 */
export async function getAudioDownloadInventory(): Promise<AudioInventorySummary> {
  console.log('[AudioInventory] 🔍 Generando inventario de audios...');
  
  const items: AudioInventoryItem[] = [];
  let totalSize = 0;
  const MIN_SIZE_BYTES = 30 * 1024; // 30 KB mínimo para considerar válido

  try {
    // 1. Obtener todos los audios de SQLite
    const [sings, tracks, interviews] = await Promise.all([
      getAllSings(),
      getAllTracks(),
      getAllInterviews(),
    ]);

    console.log(`[AudioInventory] Audios en SQLite: ${sings.length} sings, ${tracks.length} tracks, ${interviews.length} interviews`);

    // 2. Procesar cada tipo de audio
    // Procesar sings
    for (const sing of sings) {
      const item = await processAudioItem(sing, 'sings', MIN_SIZE_BYTES);
      items.push(item);
      totalSize += item.size;
    }

    // Procesar tracks
    for (const track of tracks) {
      const item = await processAudioItem(track, 'tracks', MIN_SIZE_BYTES);
      items.push(item);
      totalSize += item.size;
    }

    // Procesar interviews
    for (const interview of interviews) {
      const item = await processAudioItem(interview, 'interviews', MIN_SIZE_BYTES);
      items.push(item);
      totalSize += item.size;
    }

    // 3. Calcular resumen
    const summary: AudioInventorySummary = {
      total: items.length,
      downloaded: items.filter(i => i.status === 'downloaded').length,
      pending: items.filter(i => i.status === 'pending').length,
      no_url: items.filter(i => i.status === 'no_url').length,
      corrupted: items.filter(i => i.status === 'corrupted').length,
      totalSizeMB: totalSize / (1024 * 1024),
      items,
    };

    console.log('[AudioInventory] ✅ Inventario completado:', {
      total: summary.total,
      downloaded: summary.downloaded,
      pending: summary.pending,
      no_url: summary.no_url,
      corrupted: summary.corrupted,
      totalSizeMB: summary.totalSizeMB.toFixed(2),
    });

    return summary;
  } catch (error) {
    console.error('[AudioInventory] ❌ Error generando inventario:', error);
    // Retornar inventario vacío en caso de error
    return {
      total: 0,
      downloaded: 0,
      pending: 0,
      no_url: 0,
      corrupted: 0,
      totalSizeMB: 0,
      items: [],
    };
  }
}

/**
 * Procesa un item de audio individual para determinar su estado
 */
async function processAudioItem(
  audio: Sing | Track | Interview,
  table: 'sings' | 'tracks' | 'interviews',
  minSizeBytes: number
): Promise<AudioInventoryItem> {
  // Caso 1: Sin URL
  if (!audio.audio_url || audio.audio_url.trim() === '') {
    return {
      id: audio.id,
      table,
      title: audio.title,
      audio_url: null,
      expectedPath: '',
      exists: false,
      size: 0,
      status: 'no_url',
    };
  }

  // Caso 2: Con URL - calcular hash y verificar archivo
  try {
    // Generar hash SHA-256 de la URL (misma lógica que usa mediaCacheService)
    const hash = await sha256AudioUrl(audio.audio_url);
    const expectedPath = `imaginario/audio/${hash}.mp3`;

    // Verificar si el archivo existe
    try {
      const stat = await Filesystem.stat({
        path: expectedPath,
        directory: Directory.Data,
      });

      const size = stat.size || 0;

      // Determinar status según tamaño
      let status: AudioDownloadStatus;
      if (size < minSizeBytes) {
        status = 'corrupted';
      } else {
        status = 'downloaded';
      }

      const item = {
        id: audio.id,
        table,
        title: audio.title,
        audio_url: audio.audio_url,
        expectedPath,
        exists: true,
        size,
        status,
      };
      await logAudioInventoryPersistence(item, hash);
      return item;
    } catch (statError) {
      // Archivo no existe
      const item = {
        id: audio.id,
        table,
        title: audio.title,
        audio_url: audio.audio_url,
        expectedPath,
        exists: false,
        size: 0,
        status: 'pending' as AudioDownloadStatus,
      };
      await logAudioInventoryPersistence(item, hash);
      return item;
    }
  } catch (error) {
    console.error(`[AudioInventory] Error procesando audio ${audio.id}:`, error);
    // En caso de error, marcar como pending
    return {
      id: audio.id,
      table,
      title: audio.title,
      audio_url: audio.audio_url,
      expectedPath: '',
      exists: false,
      size: 0,
      status: 'pending',
    };
  }
}

async function logAudioInventoryPersistence(
  item: {
    id: string;
    table: 'sings' | 'tracks' | 'interviews';
    audio_url: string | null;
    expectedPath: string;
    exists: boolean;
    size: number;
    status: AudioDownloadStatus;
  },
  hashRaw: string
): Promise<void> {
  if (!DEBUG_AUDIO_PERSISTENCE || !item.audio_url) return;

  const normalizedUrl = normalizeAudioUrlForDebug(item.audio_url);
  const hashNormalized = await sha256(normalizedUrl);
  const expectedPathNormalized = `imaginario/audio/${hashNormalized}.mp3`;
  const normalizedStat = await statAudioPathForDebug(expectedPathNormalized);

  audioPersistenceDebug('inventory', {
    id: item.id,
    type: item.table,
    url: item.audio_url,
    normalizedUrl,
    hashRaw,
    hashNormalized,
    expectedPathRaw: item.expectedPath,
    expectedPathNormalized,
    rawExists: item.exists,
    rawSize: item.size,
    normalizedExists: normalizedStat.exists,
    normalizedSize: normalizedStat.size,
    status: item.status,
  });
}

/**
 * Genera un inventario completo de imágenes comparando SQLite contra Filesystem
 * @returns Resumen con total, descargadas, pendientes y detalles de cada imagen
 */
export async function getImageDownloadInventory(): Promise<ImageInventorySummary> {
  console.log('[ImageInventory] 🔍 Generando inventario de imágenes...');

  const items: ImageInventoryItem[] = [];
  let totalSize = 0;
  const MIN_SIZE_BYTES = 100;

  try {
    const [birds, birdImages] = await Promise.all([
      listBirds(),
      getAllBirdImages(),
    ]);

    console.log(`[ImageInventory] Imágenes en SQLite: ${birds.length} birds, ${birdImages.length} bird_images`);

    for (const bird of birds) {
      const item = await processImageItem({
        id: bird.id,
        table: 'birds',
        title: bird.name,
        imageUrl: bird.image_url,
      }, MIN_SIZE_BYTES);
      items.push(item);
      totalSize += item.size;
    }

    for (const image of birdImages) {
      const item = await processImageItem({
        id: image.id,
        table: 'bird_images',
        bird_id: image.bird_id,
        title: image.description,
        imageUrl: image.url,
      }, MIN_SIZE_BYTES);
      items.push(item);
      totalSize += item.size;
    }

    const summary: ImageInventorySummary = {
      total: items.length,
      downloaded: items.filter(i => i.status === 'downloaded').length,
      pending: items.filter(i => i.status === 'pending').length,
      no_url: items.filter(i => i.status === 'no_url').length,
      corrupted: items.filter(i => i.status === 'corrupted').length,
      totalSizeMB: totalSize / (1024 * 1024),
      items,
    };

    console.log('[ImageInventory] ✅ Inventario completado:', {
      total: summary.total,
      downloaded: summary.downloaded,
      pending: summary.pending,
      no_url: summary.no_url,
      corrupted: summary.corrupted,
      totalSizeMB: summary.totalSizeMB.toFixed(2),
    });

    return summary;
  } catch (error) {
    console.error('[ImageInventory] ❌ Error generando inventario:', error);
    return {
      total: 0,
      downloaded: 0,
      pending: 0,
      no_url: 0,
      corrupted: 0,
      totalSizeMB: 0,
      items: [],
    };
  }
}

async function processImageItem(
  image: {
    id: string;
    table: 'birds' | 'bird_images';
    bird_id?: string;
    title?: string;
    imageUrl?: string | null;
  },
  minSizeBytes: number
): Promise<ImageInventoryItem> {
  if (!image.imageUrl || image.imageUrl.trim() === '') {
    return {
      id: image.id,
      table: image.table,
      bird_id: image.bird_id,
      title: image.title,
      image_url: null,
      expectedPath: '',
      exists: false,
      size: 0,
      status: 'no_url',
    };
  }

  try {
    const hash = await hashUrl(image.imageUrl);
    const ext = getExtensionFromUrl(image.imageUrl, 'image');
    const expectedPath = `${CACHE_CONFIG.imagesDir}/${hash}${ext}`;

    try {
      const stat = await Filesystem.stat({
        path: expectedPath,
        directory: Directory.Data,
      });

      const size = stat.size || 0;
      const status: ImageDownloadStatus = size < minSizeBytes ? 'corrupted' : 'downloaded';

      return {
        id: image.id,
        table: image.table,
        bird_id: image.bird_id,
        title: image.title,
        image_url: image.imageUrl,
        expectedPath,
        exists: true,
        size,
        status,
      };
    } catch (statError) {
      return {
        id: image.id,
        table: image.table,
        bird_id: image.bird_id,
        title: image.title,
        image_url: image.imageUrl,
        expectedPath,
        exists: false,
        size: 0,
        status: 'pending',
      };
    }
  } catch (error) {
    console.error(`[ImageInventory] Error procesando imagen ${image.id}:`, error);
    return {
      id: image.id,
      table: image.table,
      bird_id: image.bird_id,
      title: image.title,
      image_url: image.imageUrl,
      expectedPath: '',
      exists: false,
      size: 0,
      status: 'pending',
    };
  }
}

