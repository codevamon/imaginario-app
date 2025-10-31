import { Filesystem, Directory } from '@capacitor/filesystem';

export async function cacheAudioFile(remoteUrl: string, fileName: string, onProgress?: (p: number) => void): Promise<string> {
  const response = await fetch(remoteUrl);
  const reader = response.body?.getReader();
  const contentLength = +response.headers.get('Content-Length')!;
  let received = 0;
  const chunks: Uint8Array[] = [];

  if (!reader) throw new Error('No reader available for this fetch stream.');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      if (onProgress && contentLength) onProgress(received / contentLength);
    }
  }

  const blob = new Blob(chunks);
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

  const path = `audios/${fileName}`;
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
  });

  return path; // local path saved in device storage
}

export async function getLocalAudioUrl(path: string): Promise<string> {
  const file = await Filesystem.getUri({ directory: Directory.Data, path });
  return file.uri;
}


