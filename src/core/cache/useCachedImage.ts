import { useEffect, useState } from 'react';
import { cacheImage } from './media';
export function useCachedImage(url?: string|null) {
  const [src, setSrc] = useState<string>();
  useEffect(() => { let on = true; (async () => {
    const p = await cacheImage(url); if (on) setSrc(p);
  })(); return () => { on = false; }; }, [url]);
  return src;
}
