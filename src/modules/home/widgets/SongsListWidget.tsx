// src/modules/home/widgets/SongsListWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonIcon, IonSpinner } from '@ionic/react';
import { play, pause } from 'ionicons/icons';
import { audioManager, type AudioQueueItem } from '../../../core/audio/player';
import {
  buildSingleAudioQueue,
  shouldSkipSetQueue,
} from '../../../core/audio/buildAudioQueue';
import { useAudioLoading } from '../../../core/audio/useAudioLoading';

type TrackLocal = { id: string; title?: string; scientific_name?: string; audio_url?: string; };

const mockTracks: TrackLocal[] = [
  { id: 't1', title: 'Dushambo', scientific_name: 'Geranoetus albicaudatus', audio_url: '/assets/audio/dushambo.mp3' },
  { id: 't2', title: 'Kukuna', scientific_name: 'Patagioenas cayennensis', audio_url: '/assets/audio/kukuna.mp3' },
];

const SongItem: React.FC<{ 
  track: TrackLocal; 
  isPlaying: boolean; 
  onToggle: (t: TrackLocal) => void;
}> = ({ track, isPlaying, onToggle }) => {
  const isLoading = useAudioLoading(track.id);
  
  return (
    <IonItem lines="none" button onClick={() => onToggle(track)}>
      {isLoading ? (
        <IonSpinner slot="start" style={{ width: '24px', height: '24px' }} />
      ) : (
        <IonIcon icon={isPlaying ? pause : play} slot="start" />
      )}
      <IonLabel>
        <div style={{ fontWeight: 700 }}>{track.title}</div>
        <div style={{ fontStyle: 'italic', color: '#666' }}>{track.scientific_name}</div>
      </IonLabel>
    </IonItem>
  );
};

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
    if (!t.audio_url) return;
    // Lista legacy: cola = ítems visibles con URL (orden actual de `tracks`)
    let queue: AudioQueueItem[] = tracks
      .filter((item) => !!item.id && !!item.audio_url)
      .map((item) => ({
        id: item.id,
        src: item.audio_url!,
        metadata: {
          title: item.title || 'Sin título',
          artist: item.scientific_name || 'Imaginario',
        },
      }));
    if (queue.length === 0) {
      queue = buildSingleAudioQueue({
        id: t.id,
        src: t.audio_url,
        metadata: {
          title: t.title || 'Sin título',
          artist: t.scientific_name || 'Imaginario',
        },
      });
    }
    if (
      queue.length > 0 &&
      !shouldSkipSetQueue(
        audioManager.getSessionSnapshot(),
        t.id,
        queue,
        audioManager.getQueue()
      )
    ) {
      audioManager.setQueue(queue, t.id);
    }
    audioManager.toggle(t.id, t.audio_url, {
      title: t.title || 'Sin título',
      artist: t.scientific_name || 'Imaginario',
    });
  };

  return (
    <section className="widget-songs-i in-widget">
      <h3 className="widget-title">Explora los cantos</h3>
      <IonList>
        {tracks.map((t) => (
          <SongItem 
            key={t.id}
            track={t}
            isPlaying={playingId === t.id}
            onToggle={toggle}
          />
        ))}
      </IonList>
    </section>
  );
};

export default SongsListWidget;
