import { Filesystem, Directory } from '@capacitor/filesystem';

const DEBUG = import.meta.env.VITE_DEBUG_CACHE === 'true';

// Configuración
const CACHE_CONFIG = {
  baseDir: 'imaginario',
  imagesDir: 'imaginario/images',
  audioDir: 'imaginario/audio',
  maxSizeBytes: 500 * 1024 * 1024, // 500 MB
  supportedImageExts: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
  supportedAudioExts: ['.mp3'],
} as const;

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

// ✅ Descarga robusta: mkdir padre + write base64 + verificación de bytes
async function downloadTo(path: string, url: string): Promise<boolean> {
  try {
    log('[downloadTo] Iniciando descarga:', url, '→', path);

    if (!url || !/^https?:\/\//i.test(url)) {
      log('[downloadTo] 🚫 URL inválida o vacía:', url);
      return false;
    }

    const { Network } = await import('@capacitor/network');
    const { connected } = await Network.getStatus();
    if (!connected) {
      log('[downloadTo] ⚠️ Sin conexión, se omite descarga de', url);
      return false;
    }

    // Descarga HTTP
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`[downloadTo] HTTP ${resp.status} ${resp.statusText} → ${url}`);
    const blob = await resp.blob();

    // Blob → base64 (solo payload, sin "data:...;base64,")
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onloadend = () => {
        const result = String(reader.result || '');
        const payload = result.includes(',') ? result.split(',')[1] : result;
        resolve(payload);
      };
      reader.readAsDataURL(blob);
    });

    // Asegurar carpeta padre
    const parent = path.split('/').slice(0, -1).join('/');
    if (parent) {
      await Filesystem.mkdir({
        path: parent,
        directory: Directory.Data,
        recursive: true,
      }).catch(() => { /* ya existe */ });
    }

    // Escribir en Data con encoding base64
    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Data,
      recursive: true,
    });

    // Verificación de bytes > 0
    const stat = await Filesystem.stat({ path, directory: Directory.Data });
    if (!stat || (stat.size ?? 0) <= 0) {
      log('[downloadTo] ❌ Archivo con tamaño 0:', path);
      return false;
    }

    log('[downloadTo] ✅ Archivo guardado en caché:', path, 'bytes:', stat.size);
    return true;
  } catch (error) {
    log('[downloadTo] ❌ Error al descargar/guardar', url, error);
    return false;
  }
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
      await downloadTo(filePath, url);
      
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
 * Cachea un audio desde una URL
 */
async function cacheAudio(url?: string | null): Promise<string | undefined> {
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
    await ensureDir(CACHE_CONFIG.audioDir);
    
    // Generar hash y obtener extensión
    const hash = await hashUrl(url);
    const ext = getExtensionFromUrl(url, 'audio');
    const fileName = `${hash}${ext}`;
    const filePath = `${CACHE_CONFIG.audioDir}/${fileName}`;
    
    // Verificar si el archivo ya existe
    try {
      await Filesystem.stat({
        path: filePath,
        directory: Directory.Data,
      });
      log('Audio ya cacheado:', filePath);
    } catch {
      // El archivo no existe, descargarlo
      log('Audio no encontrado en caché, descargando...');
      await downloadTo(filePath, url);
      
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
    logError('Error cacheando audio:', url, error);
    // En caso de error, retornar la URL original como fallback
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

    const hash = await sha256(url);
    const ext = type === 'image' ? '.jpg' : '.mp3';
    const relPath = `imaginario/${type === 'image' ? 'images' : 'audio'}/${hash}${ext}`;

    // ¿Ya existe?
    const existing = await Filesystem.stat({ path: relPath, directory: Directory.Data }).catch(() => null);
    if (!existing) {
      // Descargar si hay red
      const ok = await downloadTo(relPath, url);
      if (!ok) {
        log(`[ensureCachedMedia] ⚠️ No se pudo cachear ${type}, dejo URL original.`);
        return url;
      }
    }

    // Resolver URI nativa segura
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
  getCacheSize,
  clearCache,
};

// Exportar funciones individuales para compatibilidad
export { cacheImage, cacheAudio, getCacheSize, clearCache };

