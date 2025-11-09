import { play, pause } from 'ionicons/icons';
import { IonIcon, IonSpinner } from '@ionic/react';
import { useAudio } from '../core/audio/useAudio';

export function PlayButton({ url }: { url?: string|null }) {
  const { playing, loading, toggle } = useAudio(url);
  return (
    <button className="play-btn" onClick={toggle} disabled={loading || !url} aria-label="Reproducir">
      {loading ? (
        <IonSpinner style={{ width: '20px', height: '20px' }} />
      ) : (
        <IonIcon icon={playing ? pause : play}/>
      )}
    </button>
  );
}
