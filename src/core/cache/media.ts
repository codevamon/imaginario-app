import { Filesystem, Directory } from '@capacitor/filesystem';
import { mediaCacheService } from './mediaCacheService';

const isNative = () => !!(window as any).Capacitor?.isNativePlatform?.();

async function ensureDir(path: string) {
  try { await Filesystem.mkdir({ path, directory: Directory.Data, recursive: true }); }
  catch { /* ya existe */ }
}

async function downloadTo(path: string, url: string) {
  const r = await fetch(url); const blob = await r.blob();
  const b64 = await blobToBase64(blob);
  await Filesystem.writeFile({ path, data: b64, directory: Directory.Data });
}

function blobToBase64(b: Blob) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(b);
  });
}

/**
 * Genera un hash SHA-1 de la URL para usarlo como nombre de archivo
 */
async function generateHash(url: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(url);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('[MediaCacheService] Error generando hash de URL:', error);
    // Fallback: usar un hash simple basado en la URL
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 40);
  }
}

async function writeBlobToCache(blob: Blob, url: string, type: 'image' | 'audio') {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const directory = Directory.Data;
  const folder = type === 'image' ? 'imaginario/images' : 'imaginario/audio';
  const extension = type === 'image' ? '.jpg' : '.mp3';
  const filename = await generateHash(url) + extension;

  await Filesystem.writeFile({
    path: `${folder}/${filename}`,
    data: base64Data,
    directory,
    recursive: true,
  });

  console.log(`[MediaCacheService] ✅ ${type} cacheado: ${filename}`);
  return filename;
}

async function cacheMediaFile(url: string, type: 'image' | 'audio'): Promise<string> {
  try {
    // Normalizar URL (codifica espacios, tildes y otros caracteres)
    const u = new URL(url, 'https://dummy-base/');
    url = u.toString().replace('https://dummy-base/', '');
  } catch (e) {
    // Si no es URL absoluta, forzar encode manual
    url = encodeURI(url);
  }

  console.log('[MediaCacheService] 🔧 Normalized URL:', url);

  let response: Response;
  try {
    // 🔹 Permitir descarga binaria desde Supabase sin CORS bloqueante
    response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors', // evita error "Failed to fetch" en WebView
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[MediaCacheService] ❌ Error inicial en fetch:', err);
    throw new Error(`Error descargando archivo (fetch bloqueado): ${url}`);
  }

  // Algunos servidores devuelven body vacío en no-cors; forzamos blob check
  if (!response || !response.body) {
    console.warn('[MediaCacheService] ⚠️ Respuesta vacía, usando fallback Blob vía XMLHttpRequest');
    const blob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = reject;
      xhr.send();
    });
    return await writeBlobToCache(blob, url, type);
  }

  // Si hay respuesta válida, continuar flujo normal:
  const blob = await response.blob();
  return await writeBlobToCache(blob, url, type);
}

export async function cacheImage(url?: string|null): Promise<string|undefined> {
  return await mediaCacheService.cacheImage(url);
}

export async function cacheAudio(url?: string|null): Promise<string|undefined> {
  return await mediaCacheService.cacheAudio(url);
}
