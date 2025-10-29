// src/modules/music/widgets/MusicTracksWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { play, pause } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { type Track } from '../../../core/db/dao/tracks';
import { audioManager } from '../../../core/audio/player';
import { useAudioProgress } from '../../../core/audio/useAudioProgress';
import './MusicTracksWidget.css';

type Props = {
  items: Track[];
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
    <div 
      className="item-track track-card-i"
      onClick={() => onToggle(track.id, track.audio_url!)}
    >
      <button 
        className="track-card-icon"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(track.id, track.audio_url!);
        }}
      >
        <IonIcon 
          icon={isPlaying ? pause : play} 
          className="track-icon"
        />
      </button>
      
      <div className="track-card-content">
        <h2 className="p2-i">
          {track.title || 'Sin título'}
        </h2>
        {track.interpreters && (
          <p className="p3-i">
            {track.interpreters}
          </p>
        )}
        <div className="track-meta-info">
          {track.community && (
            <span className="p3-i">
              {track.community}
            </span>
          )}
          {track.instruments && (
            <span className="p3-i">
              {track.instruments}
            </span>
          )}
          {track.author && (
            <span className="p3-i">
              {track.author}
            </span>
          )}
        </div>
        
        {isPlaying && (
          <div className="track-progress-container">
            <div className="track-progress-bar">
              <div 
                className="track-progress-fill"
                style={{ width: `${progress.toFixed(2)}%` }}
              />
            </div>
            <div className="track-progress-times">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MusicTracksWidget: React.FC<Props> = ({ items }) => {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const router = useIonRouter();

  // Escuchar cambios globales en el audioManager
  useEffect(() => {
    const unsub = audioManager.onChange((playingId) => setPlayingTrack(playingId));
    setPlayingTrack(audioManager.getPlayingId());
    return unsub;
  }, []);

  const handlePlayTrack = (trackId: string, url: string) => {
    audioManager.toggle(trackId, url);
  };

  if (items.length === 0) {
    return (
      <div className="tracks-empty-state">
        <span className="p3-i">
          No hay pistas disponibles
        </span>
      </div>
    );
  }

  return (
    <section className="tracks-widget-i">
      <div className="in-widget-content">
        <h2 className="h3-i">
          Pistas musicales ({items.length})
        </h2>
        
        <div className="track-list-i">
          {items.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              isPlaying={playingTrack === track.id}
              onToggle={handlePlayTrack}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MusicTracksWidget;

