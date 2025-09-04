import { useEffect, useRef, useState } from 'react';
import { cacheAudio } from '../cache/media';

export function useAudio(url?: string|null) {
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { audioRef.current = new Audio(); return () => { audioRef.current?.pause(); }; }, []);

  async function toggle() {
    if (!url || !audioRef.current) return;
    if (!playing) {
      setLoading(true);
      const src = await cacheAudio(url);
      audioRef.current.src = src || url;
      await audioRef.current.play();
      setPlaying(true);
      setLoading(false);
      audioRef.current.onended = () => setPlaying(false);
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
  }
  return { playing, loading, toggle };
}
