// src/modules/discover/widgets/DiscoverInterviewsWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonText, IonIcon, IonSpinner } from '@ionic/react';
import { play, pause } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { listInterviews, type Interview } from '../../../core/db/dao/interviews';
import { audioManager } from '../../../core/audio/player';
import { useAudioProgress } from '../../../core/audio/useAudioProgress';
import { useAudioLoading } from '../../../core/audio/useAudioLoading';
import { useAudioRepairing } from '../../../core/audio/useAudioRepairing';

type Props = {
  searchTerm?: string;
  orderFilter?: 'name' | 'updated_at';
  rarityFilter?: number;
  popularityFilter?: 'asc' | 'desc';
};

const InterviewCard: React.FC<{
  interview: Interview;
  isPlaying: boolean;
  onToggle: (id: string, url: string) => void;
}> = ({ interview, isPlaying, onToggle }) => {
  const { progress, currentTime, duration } = useAudioProgress(isPlaying);
  const isLoading = useAudioLoading(interview.id);
  const isRepairing = useAudioRepairing(interview.id);

  const formatTime = (sec?: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <IonItem 
      button 
      onClick={() => onToggle(interview.id, interview.audio_url!)}
      style={{ '--padding-start': '16px' }}
    >
      {isRepairing ? (
        <div slot="start" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#f59e0b' }}>
          <IonSpinner style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
          <span>Reparando…</span>
        </div>
      ) : isLoading ? (
        <IonSpinner 
          slot="start"
          style={{ width: '24px', height: '24px' }}
        />
      ) : (
        <IonIcon 
          icon={isPlaying ? pause : play} 
          slot="start"
          style={{ fontSize: '24px', color: isPlaying ? '#3880ff' : '#666' }}
        />
      )}
      
      <IonLabel>
        <h2 style={{ fontWeight: '600', marginBottom: '4px' }}>
          {interview.title || 'Entrevista sin título'}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <IonText style={{ fontSize: '12px', color: '#666' }}>
            ID Ave: {interview.bird_id}
          </IonText>
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

const DiscoverInterviewsWidget: React.FC<Props> = ({ 
  searchTerm = '', 
  orderFilter = 'name', 
  rarityFilter, 
  popularityFilter 
}) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingInterview, setPlayingInterview] = useState<string | null>(null);
  const router = useIonRouter();

  useEffect(() => {
    const loadInterviews = async () => {
      try {
        setLoading(true);
        console.log('[DiscoverInterviewsWidget] Cargando entrevistas con filtros:', {
          search: searchTerm,
          order: orderFilter === 'name' ? 'title' : 'updated_at'
        });
        
        const interviewsData = await listInterviews({
          search: searchTerm,
          order: orderFilter === 'name' ? 'title' : 'updated_at'
        });
        
        setInterviews(interviewsData);
        console.log('[DiscoverInterviewsWidget] ✅ Entrevistas cargadas:', interviewsData.length);
      } catch (error) {
        console.error('[DiscoverInterviewsWidget] ❌ Error cargando entrevistas:', error);
        setInterviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadInterviews();
  }, [searchTerm, orderFilter]);

  // Suscribirse a cambios del audioManager
  useEffect(() => {
    const unsubscribe = audioManager.onChange((playingId) => {
      setPlayingInterview(playingId);
    });
    
    setPlayingInterview(audioManager.getPlayingId());
    
    return unsubscribe;
  }, []);

  const handlePlayInterview = (interviewId: string, url: string) => {
    audioManager.toggle(interviewId, url);
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
        <IonText>Cargando entrevistas...</IonText>
      </div>
    );
  }

  if (interviews.length === 0) {
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
          {searchTerm ? 'No se encontraron entrevistas con ese término' : 'No hay entrevistas disponibles'}
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
        Entrevistas ({interviews.length})
      </h2>
      
      <IonList>
        {interviews.map((interview) => (
          <InterviewCard
            key={interview.id}
            interview={interview}
            isPlaying={playingInterview === interview.id}
            onToggle={handlePlayInterview}
          />
        ))}
      </IonList>
    </section>
  );
};

export default DiscoverInterviewsWidget;
