// src/modules/home/TracksWidget.tsx
import React, { useEffect, useState } from 'react';
import { play, pause } from 'ionicons/icons';
import { IonIcon, IonText } from '@ionic/react';
import type { Track } from '../../core/db/dao/tracks';
import './TracksWidget.css';

type Props = {
  items?: Track[];
  title?: string;
  onItemClick?: (id: string) => void;
};

const TracksWidget: React.FC<Props> = ({ items = [], title = 'Explora los cantos', onItemClick }) => {
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [displayTracks, setDisplayTracks] = useState<Track[]>([]);

  useEffect(() => {
    if (!items || items.length === 0) return;
    // shuffle aleatorio + limitar a 3
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    setDisplayTracks(shuffled.slice(0, 3));
  }, [items]);

  const handlePlayTrack = (trackId: string, url: string) => {
    const audio = document.getElementById(`audio-${trackId}`) as HTMLAudioElement;

    if (!audio) return;

    // Pausar el track actual si es otro
    if (playingTrack && playingTrack !== trackId) {
      const currentAudio = document.getElementById(`audio-${playingTrack}`) as HTMLAudioElement;
      if (currentAudio) {
        currentAudio.pause();
      }
    }

    if (playingTrack === trackId) {
      // Pausar el actual
      audio.pause();
      setPlayingTrack(null);
    } else {
      // Reproducir el nuevo
      audio.play();
      setPlayingTrack(trackId);
    }
  };

  return (
    <div className="tracks-widget-i">
      <div className="in-widget-header ">
        <div className="_flex">
          <div className="_base _1">
            <h2 className="h2-i _rgl primary-i">
              <span>{title}</span>
            </h2>
          </div>
          <div className="_base _2">
            <button className="btn-i">
              <span>Ver más</span>
            </button>
          </div>
        </div>
      </div>

      <div className="in-widget-content">
        {displayTracks && displayTracks.length > 0 ? (
          <ul className="track-list-i">
            {displayTracks.map((track) => (
              <li
                key={track.id}
                className="track-card-i _flex"
                role="button"
                tabIndex={0}
                onClick={() => {
                  handlePlayTrack(track.id, track.audio_url!);
                  onItemClick?.(track.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePlayTrack(track.id, track.audio_url!);
                    onItemClick?.(track.id);
                  }
                }}
              >
                <button
                  className="track-card-icon"
                  onClick={(e) => {
                    e.stopPropagation(); // evita duplicar el click
                    handlePlayTrack(track.id, track.audio_url!);
                  }}
                >
                  <IonIcon
                    icon={playingTrack === track.id ? pause : play}
                    className={`track-icon ${playingTrack === track.id ? 'playing' : ''}`}
                  />
                </button>

                <div className="track-card-info">
                  <div className="track-card-title h3-i _rgl primary-i">{track.title}</div>
                  {track.interpreters && (
                    <IonText color="medium">{track.interpreters}</IonText>
                  )}
                  <div className="l2-i _rgl primary-i">
                    {[
                      track.community,
                      track.instruments,
                      track.author
                    ].filter(Boolean).join(' | ')}
                  </div>
                </div>

                {/* Audio oculto */}
                <audio
                  id={`audio-${track.id}`}
                  src={track.audio_url || ''}
                  preload="none"
                  onEnded={() => setPlayingTrack(null)}
                  style={{ display: 'none' }}
                />
              </li>
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
