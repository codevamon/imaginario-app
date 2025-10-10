// src/modules/discover/DiscoverTracksWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonText, IonIcon } from '@ionic/react';
import { play, pause } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { listTracks, type Track } from '../../core/db/dao/tracks';
import { audioManager } from '../../core/audio/player';
import { useAudioProgress } from '../../core/audio/useAudioProgress';

type Props = {
  searchTerm?: string;
  orderFilter?: 'name' | 'updated_at';
  rarityFilter?: number;
  popularityFilter?: 'asc' | 'desc';
};

const TrackCard: React.FC<{
  track: Track;
  isPlaying: boolean;
  onToggle: (id: string, url: string) => void;
}> = ({ track, isPlaying, onToggle }) => {
  const { progress, currentTime, duration } = useAudioProgress(isPlaying);

  const formatTime = (sec?: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <IonItem 
      button 
      onClick={() => onToggle(track.id, track.audio_url!)}
      style={{ '--padding-start': '16px' }}
    >
      <IonIcon 
        icon={isPlaying ? pause : play} 
        slot="start"
        style={{ fontSize: '24px', color: isPlaying ? '#3880ff' : '#666' }}
      />
      
      <IonLabel>
        <h2 style={{ fontWeight: '600', marginBottom: '4px' }}>
          {track.title || 'Sin título'}
        </h2>
        {track.interpreters && (
          <p style={{ 
            fontSize: '14px', 
            color: '#666',
            marginBottom: '4px'
          }}>
            {track.interpreters}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {track.community && (
            <IonText style={{ fontSize: '12px', color: '#666' }}>
              {track.community}
            </IonText>
          )}
          {track.instruments && (
            <IonText style={{ fontSize: '12px', color: '#666' }}>
              {track.instruments}
            </IonText>
          )}
          {track.author && (
            <IonText style={{ fontSize: '12px', color: '#666' }}>
              {track.author}
            </IonText>
          )}
        </div>
        
        {isPlaying && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ 
              width: '100%', 
              height: '4px', 
              backgroundColor: '#e0e0e0', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${progress.toFixed(2)}%`, 
                height: '100%', 
                backgroundColor: '#3880ff',
                transition: 'width 0.1s ease'
              }} />
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '12px', 
              color: '#666',
              marginTop: '4px'
            }}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </IonLabel>
    </IonItem>
  );
};

const DiscoverTracksWidget: React.FC<Props> = ({ 
  searchTerm = '', 
  orderFilter = 'name', 
  rarityFilter, 
  popularityFilter 
}) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const router = useIonRouter();

  useEffect(() => {
    const loadTracks = async () => {
      try {
        setLoading(true);
        console.log('[DiscoverTracksWidget] Cargando pistas con filtros:', {
          search: searchTerm,
          order: orderFilter === 'name' ? 'title' : 'updated_at'
        });
        
        const tracksData = await listTracks({
          search: searchTerm,
          order: orderFilter === 'name' ? 'title' : 'updated_at'
        });
        
        setTracks(tracksData);
        console.log('[DiscoverTracksWidget] ✅ Pistas cargadas:', tracksData.length);
      } catch (error) {
        console.error('[DiscoverTracksWidget] ❌ Error cargando pistas:', error);
        setTracks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, [searchTerm, orderFilter]);

  // Escuchar cambios globales en el audioManager
  useEffect(() => {
    const unsub = audioManager.onChange((playingId) => setPlayingTrack(playingId));
    setPlayingTrack(audioManager.getPlayingId());
    return unsub;
  }, []);

  const handlePlayTrack = (trackId: string, url: string) => {
    audioManager.toggle(trackId, url);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <IonText>Cargando pistas...</IonText>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px'
      }}>
        <IonText color="medium">
          {searchTerm ? 'No se encontraron pistas con ese término' : 'No hay pistas disponibles'}
        </IonText>
      </div>
    );
  }

  return (
    <section style={{ marginBottom: '24px' }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: '600', 
        marginBottom: '16px',
        padding: '0 16px'
      }}>
        Pistas ({tracks.length})
      </h2>
      
      <IonList>
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            isPlaying={playingTrack === track.id}
            onToggle={handlePlayTrack}
          />
        ))}
      </IonList>
    </section>
  );
};

export default DiscoverTracksWidget;
