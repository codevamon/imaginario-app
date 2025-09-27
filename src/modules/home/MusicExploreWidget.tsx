// src/modules/home/MusicExploreWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { audioManager } from '../../core/audio/player';

type TrackLocal = { id: string; name?: string; scientific_name?: string; community?: string; instruments?: string[]; audio_url?: string };

const mockTracks: TrackLocal[] = [
  { id: 't1', name: 'Dushambo', scientific_name: 'Geranoetus albicaudatus', community: 'Comunidad', instruments: ['Instrumento 1'], audio_url: '/assets/audio/dushambo.mp3' },
  { id: 't2', name: 'Kukuna', scientific_name: 'Patagioenas cayennensis', community: 'Comunidad', instruments: ['Instrumento 1', 'Instrumento 2'], audio_url: '/assets/audio/kukuna.mp3' },
];

const MusicExploreWidget: React.FC<{ tracksProp?: TrackLocal[] }> = ({ tracksProp }) => {
  const router = useIonRouter();
  const [tracks, setTracks] = useState<TrackLocal[]>(tracksProp ?? []);
  const [playingId, setPlayingId] = useState<string | null>(audioManager.getPlayingId());

  const load = async () => {
    if (tracksProp && tracksProp.length) return;
    try {
      const dao = require('../../core/db/dao/tracks');
      if (dao && typeof dao.listTracks === 'function') {
        const rows = await dao.listTracks({ limit: 12 });
        setTracks(rows);
        return;
      }
    } catch (e) { /* fallback */ }
    setTracks(mockTracks);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const unsub = audioManager.onChange((id) => setPlayingId(id));
    const onUpdate = () => load();
    window.addEventListener('db:updated', onUpdate);
    return () => { unsub(); window.removeEventListener('db:updated', onUpdate); };
  }, []);

  return (
    <section className="widget-music-i in-widget">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Explorar por su música</h3>
        <button className="see-more">Ver más</button>
      </div>

      <IonList lines="full">
        {tracks.map(t => (
          <IonItem key={t.id} button onClick={() => audioManager.toggle(t.id, t.audio_url)}>
            <div style={{ width: 44, height: 44, borderRadius: 44, border: '2px solid #a87b45', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <div>{playingId === t.id ? '⏸' : '▶'}</div>
            </div>
            <IonLabel>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ fontStyle: 'italic', color: '#666' }}>{t.scientific_name}</div>
              <div style={{ fontSize: 12, color: '#7b9b96' }}>{t.community ?? '—'} {t.instruments ? `| ${t.instruments.join(' | ')}` : ''}</div>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </section>
  );
};

export default MusicExploreWidget;
