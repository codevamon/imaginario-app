// src/modules/home/widgets/SingsWidget.tsx
import React, { useEffect, useState, useRef } from 'react';
import { play, pause } from 'ionicons/icons';
import { IonIcon, IonText, IonSpinner } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import type { Sing } from '../../../core/db/dao/sings';
import { audioManager } from '../../../core/audio/player';
import { useAudioProgress } from '../../../core/audio/useAudioProgress';
import { useAudioLoading } from '../../../core/audio/useAudioLoading';
import { useAudioRepairing } from '../../../core/audio/useAudioRepairing';
import './SingsWidget.css';

type Props = {
  items?: Sing[];
  title?: string;
  onItemClick?: (id: string) => void;
};

// Subcomponente para cada tarjeta de sing individual
interface SingCardProps {
  sing: Sing;
  isPlaying: boolean;
  onToggle: (id: string, url: string) => void;
}

const SingCard: React.FC<SingCardProps> = ({ sing, isPlaying, onToggle }) => {
  const { progress, currentTime, duration } = useAudioProgress(isPlaying);
  const isLoading = useAudioLoading(sing.id);
  const isRepairing = useAudioRepairing(sing.id);

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
      onClick={() => {
        onToggle(sing.id, sing.audio_url!);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          onToggle(sing.id, sing.audio_url!);
        }
      }}
    >
      <button
        className="track-card-icon"
        onClick={(e) => {
          e.stopPropagation(); // evita duplicar el click
          onToggle(sing.id, sing.audio_url!);
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
          <div className="track-card-title h3-i _mdm primary-i">{sing.title || 'Canto sin título'}</div>
          {sing.author && (
            <div className="track-card-subtitle h4-i _lgt primary-i">{sing.author}</div>
          )}
          {/* <div className="l2-i p2-i _rgl primary-i">
            {[
              sing.community,
              sing.instruments,
              sing.author
            ].filter(Boolean).join(' | ')}
          </div> */}
        </div>
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

const SingsWidget: React.FC<Props> = ({ items = [], title = 'Explora los cantos', onItemClick }) => {
  const [playingSing, setPlayingSing] = useState<string | null>(null);
  const [displaySings, setDisplaySings] = useState<Sing[]>([]);
  const router = useIonRouter();

  // Suscribirse a cambios del audioManager
  useEffect(() => {
    const unsubscribe = audioManager.onChange((playingId) => {
      setPlayingSing(playingId);
    });
    
    // Establecer el estado inicial
    setPlayingSing(audioManager.getPlayingId());
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!items || items.length === 0) return;
    // shuffle aleatorio + limitar a 3
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    setDisplaySings(shuffled.slice(0, 3));
  }, [items]);

  const handlePlaySing = (singId: string, url: string) => {
    audioManager.toggle(singId, url);
    onItemClick?.(singId);
  };

  return (
    <div className="tracks-widget-i sings-widget">
      <div className="in-widget-header">
        <div className="_flex">
          <div className="_base _1">
            <h2 className="h2-i _rgl primary-i">
              <span>{title}</span>
            </h2>
          </div>
          <div className="_base _2">
            <button className="btn-i l2-i" onClick={() => router.push('/music')}>
              <span>Ver más</span>
            </button>
          </div>
        </div>
      </div>

      <div className="in-widget-content">
        {displaySings && displaySings.length > 0 ? (
          <ul className="track-list-i">
            {displaySings.map((sing) => (
              <SingCard
                key={sing.id}
                sing={sing}
                isPlaying={playingSing === sing.id}
                onToggle={handlePlaySing}
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

export default SingsWidget;
