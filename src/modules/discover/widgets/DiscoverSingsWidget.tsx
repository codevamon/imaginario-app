// src/modules/discover/DiscoverSingsWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonText, IonIcon } from '@ionic/react';
import { play, pause } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { listSings, type Sing } from '../../../core/db/dao/sings';
import { audioManager } from '../../../core/audio/player';
import { useAudioProgress } from '../../../core/audio/useAudioProgress';

type Props = {
  searchTerm?: string;
  orderFilter?: 'name' | 'updated_at';
  rarityFilter?: number;
  popularityFilter?: 'asc' | 'desc';
};

const SingCard: React.FC<{
  sing: Sing;
  isPlaying: boolean;
  onToggle: (id: string, url: string) => void;
}> = ({ sing, isPlaying, onToggle }) => {
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
      onClick={() => onToggle(sing.id, sing.audio_url!)}
      style={{ '--padding-start': '16px' }}
    >
      <IonIcon 
        icon={isPlaying ? pause : play} 
        slot="start"
        style={{ fontSize: '24px', color: isPlaying ? '#3880ff' : '#666' }}
      />
      
      <IonLabel>
        <h2 style={{ fontWeight: '600', marginBottom: '4px' }}>
          {sing.title || 'Canto sin título'}
        </h2>
        {sing.author && (
          <p style={{ 
            fontSize: '14px', 
            color: '#666',
            marginBottom: '4px'
          }}>
            {sing.author}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {sing.community && (
            <IonText style={{ fontSize: '12px', color: '#666' }}>
              {sing.community}
            </IonText>
          )}
          {sing.instruments && (
            <IonText style={{ fontSize: '12px', color: '#666' }}>
              {sing.instruments}
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

const DiscoverSingsWidget: React.FC<Props> = ({ 
  searchTerm = '', 
  orderFilter = 'name', 
  rarityFilter, 
  popularityFilter 
}) => {
  const [sings, setSings] = useState<Sing[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingSing, setPlayingSing] = useState<string | null>(null);
  const router = useIonRouter();

  useEffect(() => {
    const loadSings = async () => {
      try {
        setLoading(true);
        console.log('[DiscoverSingsWidget] Cargando cantos con filtros:', {
          search: searchTerm,
          order: orderFilter === 'name' ? 'title' : 'updated_at'
        });
        
        const singsData = await listSings({
          search: searchTerm,
          order: orderFilter === 'name' ? 'title' : 'updated_at'
        });
        
        setSings(singsData);
        console.log('[DiscoverSingsWidget] ✅ Cantos cargados:', singsData.length);
      } catch (error) {
        console.error('[DiscoverSingsWidget] ❌ Error cargando cantos:', error);
        setSings([]);
      } finally {
        setLoading(false);
      }
    };

    loadSings();
  }, [searchTerm, orderFilter]);

  // Suscribirse a cambios del audioManager
  useEffect(() => {
    const unsubscribe = audioManager.onChange((playingId) => {
      setPlayingSing(playingId);
    });
    
    setPlayingSing(audioManager.getPlayingId());
    
    return unsubscribe;
  }, []);

  const handlePlaySing = (singId: string, url: string) => {
    audioManager.toggle(singId, url);
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
        <IonText>Cargando cantos...</IonText>
      </div>
    );
  }

  if (sings.length === 0) {
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
          {searchTerm ? 'No se encontraron cantos con ese término' : 'No hay cantos disponibles'}
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
        Cantos ({sings.length})
      </h2>
      
      <IonList>
        {sings.map((sing) => (
          <SingCard
            key={sing.id}
            sing={sing}
            isPlaying={playingSing === sing.id}
            onToggle={handlePlaySing}
          />
        ))}
      </IonList>
    </section>
  );
};

export default DiscoverSingsWidget;
