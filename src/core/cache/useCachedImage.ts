import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Network } from "@capacitor/network";

import { ensureCachedMedia } from "./mediaCacheService";
import { cacheImage } from "./media";
import { ensureCachedImage } from "./imageCacheService";

/**
 * Hook seguro para obtener una URI local cacheada para imágenes.
 * Si falla (offline o error), simplemente retorna la URL original.
 * No modifica ninguna lógica existente.
 */
export function useCachedImage(url?: string | null) {
  const [localSrc, setLocalSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        // Detectar estado de red
        const netStatus = await Network.getStatus();
        const isOnline = netStatus.connected;

        // Verificación offline: intentar usar ensureCachedImage
        if (!isOnline) {
          const cached = await ensureCachedImage(url);
          if (cached) {
            const safe = await safeConvert(cached);
            if (active) setLocalSrc(safe);
            return;
          }
        }

        const local = await cacheImage(url);
        if (local) {
          const safe = await safeConvert(local);
          if (active) setLocalSrc(safe);
        } else {
          if (active) setLocalSrc(local);
        }
      } catch {
        if (active) setLocalSrc(url || undefined);
      }
    })();

    return () => {
      active = false;
    };
  }, [url]);

  return localSrc || url || "/assets/default-bird.svg";
}

async function safeConvert(localPath: string): Promise<string> {
  try {
    // --- REEMPLAZAR SOLO ESTE BLOQUE ---
    // Si el archivo ya es un path Android nativo, forzar file:// y convertir
    if (
      localPath.startsWith('/data/') ||
      localPath.startsWith('/storage/')
    ) {
      const fixed = 'file://' + localPath.replace(/^(file:\/{0,3})?/, '');
      return Capacitor.convertFileSrc(fixed);
    }
    if (localPath.startsWith('file:/')) {
      return Capacitor.convertFileSrc(localPath);
    }
    // ------------------------------------
    
    // Si es una ruta relativa, obtener la URI primero
    const { uri } = await Filesystem.getUri({
      path: localPath,
      directory: Directory.Data,
    });

    return Capacitor.convertFileSrc(uri);
  } catch (e) {
    console.error("[safeConvert] fallback to raw path", e);
    return localPath;
  }
}
