// src/modules/home/SingsWidget.tsx
import React, { useEffect, useState } from 'react';
import { play, pause } from 'ionicons/icons';
import { IonIcon, IonText } from '@ionic/react';
import type { Sing } from '../../core/db/dao/sings';

type Props = {
  items?: Sing[];
  title?: string;
  onItemClick?: (id: string) => void;
};

const SingsWidget: React.FC<Props> = ({ items = [], title = 'Explora los cantos', onItemClick }) => {
  const [playingSing, setPlayingSing] = useState<string | null>(null);
  const [displaySings, setDisplaySings] = useState<Sing[]>([]);

  useEffect(() => {
    if (!items || items.length === 0) return;
    // shuffle aleatorio + limitar a 3
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    setDisplaySings(shuffled.slice(0, 3));
  }, [items]);

  const handlePlaySing = (singId: string, url: string) => {
    const audio = document.getElementById(`audio-${singId}`) as HTMLAudioElement;

    if (!audio) return;

    // Pausar el sing actual si es otro
    if (playingSing && playingSing !== singId) {
      const currentAudio = document.getElementById(`audio-${playingSing}`) as HTMLAudioElement;
      if (currentAudio) {
        currentAudio.pause();
      }
    }

    if (playingSing === singId) {
      // Pausar el actual
      audio.pause();
      setPlayingSing(null);
    } else {
      // Reproducir el nuevo
      audio.play();
      setPlayingSing(singId);
    }
  };

  return (
    <div className="tracks-widget-i">
      <div className="in-widget-header">
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
        {displaySings && displaySings.length > 0 ? (
          <ul className="track-list-i">
            {displaySings.map((sing) => (
              <li
                key={sing.id}
                className="track-card-i _flex"
                role="button"
                tabIndex={0}
                onClick={() => {
                  handlePlaySing(sing.id, sing.audio_url!);
                  onItemClick?.(sing.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePlaySing(sing.id, sing.audio_url!);
                    onItemClick?.(sing.id);
                  }
                }}
              >
                <button
                  className="track-card-icon"
                  onClick={(e) => {
                    e.stopPropagation(); // evita duplicar el click
                    handlePlaySing(sing.id, sing.audio_url!);
                  }}
                >
                  <IonIcon
                    icon={playingSing === sing.id ? pause : play}
                    className={`track-icon ${playingSing === sing.id ? 'playing' : ''}`}
                  />
                </button>

                <div className="track-card-info">
                  <div className="track-card-title">{sing.title || 'Canto sin título'}</div>
                  {sing.author && (
                    <div className="track-card-subtitle">{sing.author}</div>
                  )}
                  <div className="l2-i _rgl primary-i">
                    {[
                      sing.author
                    ].filter(Boolean).join(' | ')}
                  </div>
                </div>

                {/* Audio oculto */}
                <audio
                  id={`audio-${sing.id}`}
                  src={sing.audio_url || ''}
                  preload="none"
                  onEnded={() => setPlayingSing(null)}
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

export default SingsWidget;
