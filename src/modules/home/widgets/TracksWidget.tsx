// src/modules/home/widgets/TracksWidget.tsx
import React, { useEffect, useState } from 'react';
import { play, pause } from 'ionicons/icons';
import { IonIcon, IonSpinner } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import type { Track } from '../../../core/db/dao/tracks';
import { audioManager } from '../../../core/audio/player';
import { useAudioProgress } from '../../../core/audio/useAudioProgress';
import { useAudioLoading } from '../../../core/audio/useAudioLoading';
import { useAudioRepairing } from '../../../core/audio/useAudioRepairing';
import './TracksWidget.css';

type Props = {
  items?: Track[];
  title?: string;
  onItemClick?: (id: string) => void;
  showViewMore?: boolean;      // muestra u oculta el botón "Ver más"
  maxItems?: number;            // limita cantidad de ítems visibles
};

// Subcomponente individual (idéntico a SingCard)
interface TrackCardProps {
  track: Track;
  isPlaying: boolean;
  onToggle: (id: string, url: string) => void;
}

const TrackCard: React.FC<TrackCardProps> = ({ track, isPlaying, onToggle }) => {
  const { progress, currentTime, duration } = useAudioProgress(isPlaying);
  const isLoading = useAudioLoading(track.id);
  const isRepairing = useAudioRepairing(track.id);

  const formatTime = (sec?: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <li
      className="track-card-i _flex"
      role="button"
      tabIndex={0}
      onClick={() => onToggle(track.id, track.audio_url!)}
      onKeyDown={(e) => e.key === 'Enter' && onToggle(track.id, track.audio_url!)}
    >
      <button
        className="track-card-icon"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(track.id, track.audio_url!);
        }}
      >
        {isRepairing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#f59e0b' }}>
            <IonSpinner style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
            <span>Reparando…</span>
          </div>
        ) : isLoading ? (
          <IonSpinner style={{ width: '24px', height: '24px' }} />
        ) : (
          <IonIcon
            icon={isPlaying ? pause : play}
            className={`track-icon ${isPlaying ? 'playing' : ''}`}
          />
        )}
      </button>

      <div className="track-card-info">
        <div className="in-track-card-info">
          <div className="track-card-title h3-i _mdm primary-i">{track.title || 'Sin título'}</div>
          {track.interpreters && (
            <div className="track-card-subtitle h4-i _lgt primary-i">{track.interpreters}</div>
          )}
          <div className="l2-i _rgl primary-i">
            {[track.instruments, track.author]
              .filter(Boolean)
              .join(' | ')}
          </div>
        </div>

        {/* Acordeón de progreso */}
        <div className={`track-card-accordion ${isPlaying ? 'open' : ''}`}>
          <div className="in-track-card-progress">
            <div className="track-progress-bar" aria-label="progreso de reproducción">
              <div
                className={`track-progress-fill ${isPlaying ? 'active' : ''}`}
                style={{ width: `${progress.toFixed(2)}%` }}
              />
            </div>
            <div className="track-progress-time">
              <div className="in-track-card-progress-time">
                <span className="track-progress-time-current">{formatTime(currentTime)}</span>
                <span className="track-progress-time-duration">{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};

const TracksWidget: React.FC<Props> = ({
  items = [],
  title = 'Explorar por su música',
  onItemClick,
  showViewMore = true,
  maxItems = 6,
}) => {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const router = useIonRouter();

  // Escuchar cambios globales en el audioManager
  useEffect(() => {
    const unsub = audioManager.onChange((playingId) => setPlayingTrack(playingId));
    setPlayingTrack(audioManager.getPlayingId());
    return unsub;
  }, []);

  // Variable derivada: limitar ítems visibles
  const visibleItems = items.slice(0, maxItems);

  const handlePlayTrack = (trackId: string, url: string) => {
    audioManager.toggle(trackId, url);
    onItemClick?.(trackId);
  };

  return (
    <div className="tracks-widget-i tracks-widget">
      <div className="in-widget-header">
        <div className="_flex">
          <div className="_base _1">
            <h2 className="h2-i _rgl primary-i">
              <span>{title}</span>
            </h2>
          </div>
          <div className="_base _2">
            {showViewMore && (
              <button className="btn-i l2-i" onClick={() => router.push('/music')}>
                <span>Ver más</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="in-widget-content">
        {visibleItems && visibleItems.length > 0 ? (
          <ul className="track-list-i">
            {visibleItems.map((track) => (
              <TrackCard
                key={track.id}
                track={track}
                isPlaying={playingTrack === track.id}
                onToggle={handlePlayTrack}
              />
            ))}
          </ul>
        ) : (
          <div className="widget-fallback">
            <span>Contenido no disponible aún</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TracksWidget;