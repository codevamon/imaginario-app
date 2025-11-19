// src/modules/bird/widgets/BirdInterviewsWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonIcon, IonItem, IonLabel, IonList, IonSpinner } from '@ionic/react';
import { play, pause } from 'ionicons/icons';
import type { Interview } from '../../../core/db/dao/interviews';
import { audioManager } from '../../../core/audio/player';
import { useAudioProgress } from '../../../core/audio/useAudioProgress';
import { useAudioLoading } from '../../../core/audio/useAudioLoading';
import { useAudioRepairing } from '../../../core/audio/useAudioRepairing';
import { useCachedImage } from "@/core/cache/useCachedImage";

type Props = { 
  items: Interview[];
};

interface InterviewCardProps {
  interview: Interview;
  isPlaying: boolean;
  onToggle: (id: string, url?: string) => void;
}

const InterviewCard: React.FC<InterviewCardProps> = ({ interview, isPlaying, onToggle }) => {
  const { progress, currentTime, duration } = useAudioProgress(isPlaying);
  const isLoading = useAudioLoading(interview.id);
  const isRepairing = useAudioRepairing(interview.id);
  const imgSrc = useCachedImage((interview as any).image_url);

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
      onClick={() => onToggle(interview.id, interview.audio_url!)}
      onKeyDown={(e) => e.key === 'Enter' && onToggle(interview.id, interview.audio_url!)}
    >
      <button
        className="track-card-icon"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(interview.id, interview.audio_url!);
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

      {(interview as any).image_url && (
        <img
          src={imgSrc}
          alt={interview.title || 'Entrevista'}
          className="interview-image"
        />
      )}

      <div className="track-card-info">
        <div className="in-track-card-info">
          <div className="track-card-title">{interview.title || 'Entrevista sin título'}</div>
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

const BirdInterviewsWidget: React.FC<Props> = ({ items }) => {
  const [playingInterview, setPlayingInterview] = useState<string | null>(null);

  useEffect(() => {
    const unsub = audioManager.onChange((playingId) => setPlayingInterview(playingId));
    setPlayingInterview(audioManager.getPlayingId());
    return unsub;
  }, []);

  const handlePlayInterview = (interviewId: string, url?: string) => {
    const interview = items.find(i => i.id === interviewId);
    const resolvedUrl = url || interview?.audio_url;
    if (resolvedUrl) {
      audioManager.toggle(interviewId, resolvedUrl);
    }
  };

  if (!items?.length) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ion-color-medium)' }}>
        No hay entrevistas disponibles
      </div>
    );
  }

  return (
    <div className="bird-widget bird-widget-interviews">
      <div className="tracks-widget-i">
        <div className="in-widget-content">
          <ul className="track-list-i">
            {items.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                isPlaying={playingInterview === interview.id}
                onToggle={handlePlayInterview}
              />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BirdInterviewsWidget;

