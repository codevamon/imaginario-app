// src/modules/home/widgets/SongsListWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonIcon } from '@ionic/react';
import { play, pause } from 'ionicons/icons';
import { audioManager } from '../../../core/audio/player';

type TrackLocal = { id: string; title?: string; scientific_name?: string; audio_url?: string; };

const mockTracks: TrackLocal[] = [
  { id: 't1', title: 'Dushambo', scientific_name: 'Geranoetus albicaudatus', audio_url: '/assets/audio/dushambo.mp3' },
  { id: 't2', title: 'Kukuna', scientific_name: 'Patagioenas cayennensis', audio_url: '/assets/audio/kukuna.mp3' },
];

const SongsListWidget: React.FC<{ tracksProp?: TrackLocal[] }> = ({ tracksProp }) => {
  const [tracks, setTracks] = useState<TrackLocal[]>(tracksProp ?? []);
  const [playingId, setPlayingId] = useState<string | null>(audioManager.getPlayingId());

  const load = async () => {
    if (tracksProp && tracksProp.length) return;
    try {
      const dao = require('../../../core/db/dao/tracks');
      if (dao && typeof dao.listTracks === 'function') {
        const rows = await dao.listTracks({ limit: 10 });
        setTracks(rows);
        return;
      }
    } catch (e) { /* fallback */ }
    setTracks(mockTracks);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const unsub = audioManager.onChange((id: string | null) => setPlayingId(id));
    const onUpdate = () => load();
    window.addEventListener('db:updated', onUpdate);
    return () => { unsub(); window.removeEventListener('db:updated', onUpdate); };
  }, []);

  const toggle = (t: TrackLocal) => {
    audioManager.toggle(t.id, t.audio_url);
  };

  return (
    <section className="widget-songs-i in-widget">
      <h3 className="widget-title">Explora los cantos</h3>
      <IonList>
        {tracks.map((t) => (
          <IonItem key={t.id} lines="none" button onClick={() => toggle(t)}>
            <IonIcon icon={playingId === t.id ? pause : play} slot="start" />
            <IonLabel>
              <div style={{ fontWeight: 700 }}>{t.title}</div>
              <div style={{ fontStyle: 'italic', color: '#666' }}>{t.scientific_name}</div>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </section>
  );
};

export default SongsListWidget;
