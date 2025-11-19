import { Filesystem, Directory } from '@capacitor/filesystem';

export async function ensureCachedImage(url?: string | null): Promise<string | null> {
  try {
    if (!url) return null;

    // Derivar un nombre estable basado en hash simple
    const fileName = url.split('/').pop() || `img_${Date.now()}`;
    const localPath = `imaginario/images/${fileName}`;

    // Verificar si ya existe
    try {
      await Filesystem.stat({
        path: localPath,
        directory: Directory.Data,
      });
      return localPath; // Ya existe
    } catch (_) {
      // No existe → continuar
    }

    // Descargar imagen (binaria)
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Guardar en el sistema de archivos
    await Filesystem.writeFile({
      path: localPath,
      directory: Directory.Data,
      data: base64,
      recursive: true,
    });

    return localPath;

  } catch (err) {
    console.error('[imageCacheService] Error caching image:', err);
    return null;
  }
}

