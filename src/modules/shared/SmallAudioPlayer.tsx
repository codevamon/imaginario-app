// src/modules/shared/SmallAudioPlayer.tsx
import React, { useEffect, useRef, useState } from 'react';
import { IonIcon, IonButton } from '@ionic/react';
import { play, pause } from 'ionicons/icons';

const SmallAudioPlayer: React.FC<{ src?: string }> = ({ src }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio(src);
    audioRef.current.preload = 'metadata';
    const a = audioRef.current;
    const onEnd = () => setPlaying(false);
    a.addEventListener('ended', onEnd);
    return () => { a.pause(); a.removeEventListener('ended', onEnd); a.src = ''; };
  }, [src]);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else {
      try { await audioRef.current.play(); setPlaying(true); }
      catch (e) { console.warn('Audio play failed', e); }
    }
  };

  return (
    <div className="small-audio-player">
      <IonButton fill="clear" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        <IonIcon icon={playing ? pause : play} />
      </IonButton>
    </div>
  );
};

export default SmallAudioPlayer;
