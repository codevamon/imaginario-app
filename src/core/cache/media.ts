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

export async function cacheImage(url?: string|null): Promise<string|undefined> {
  return await mediaCacheService.cacheImage(url);
}

export async function cacheAudio(url?: string|null): Promise<string|undefined> {
  return await mediaCacheService.cacheAudio(url);
}
