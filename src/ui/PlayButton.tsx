import { play, pause } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import { useAudio } from '../core/audio/useAudio';

export function PlayButton({ url }: { url?: string|null }) {
  const { playing, loading, toggle } = useAudio(url);
  return (
    <button className="play-btn" onClick={toggle} disabled={loading || !url} aria-label="Reproducir">
      <IonIcon icon={playing ? pause : play}/>
    </button>
  );
}
