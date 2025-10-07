import { useEffect, useState, useRef } from 'react';

export function useAudioProgress(isPlaying: boolean) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const frameRef = useRef<number | null>(null);

  const updateProgress = () => {
    const audio =
      (window as any).__IMAGINARIO_AUDIO__ as HTMLAudioElement | undefined;
    if (audio && audio.duration > 0) {
      const pct = (audio.currentTime / audio.duration) * 100;
      setProgress(pct);
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration);
    }
    frameRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    const audio =
      (window as any).__IMAGINARIO_AUDIO__ as HTMLAudioElement | undefined;
    if (!audio) return;

    if (isPlaying) {
      frameRef.current = requestAnimationFrame(updateProgress);
    } else if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isPlaying]);

  return { progress, currentTime, duration };
}