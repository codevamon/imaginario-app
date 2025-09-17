import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonText,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonIcon,
  IonSpinner
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { play, pause } from 'ionicons/icons';
import { getBirdById, type Bird } from '../../core/db/dao/birds';
import { getTracksByBirdId, type Track } from '../../core/db/dao/tracks';
import { getMusiciansByBirdId, type Musician } from '../../core/db/dao/musicians';

const BirdDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bird, setBird] = useState<Bird | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError('ID de ave no proporcionado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const birdData = await getBirdById(id);
        if (!birdData) {
          setError('Ave no encontrada');
          return;
        }
        setBird(birdData);

        const birdTracks = await getTracksByBirdId(id);
        setTracks(birdTracks);

        const birdMusicians = await getMusiciansByBirdId(id);
        setMusicians(birdMusicians);

      } catch (err) {
        console.error('[BirdDetail] Error:', err);
        setError('Error cargando ave');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handlePlayTrack = (trackId: string, url: string) => {
    const audio = document.getElementById(`audio-${trackId}`) as HTMLAudioElement;
    
    if (!audio) return;

    // Pausar cualquier track que esté reproduciéndose
    if (playingTrack && playingTrack !== trackId) {
      const currentAudio = document.getElementById(`audio-${playingTrack}`) as HTMLAudioElement;
      if (currentAudio) {
        currentAudio.pause();
      }
    }

    if (playingTrack === trackId) {
      // Pausar el track actual
      audio.pause();
      setPlayingTrack(null);
    } else {
      // Reproducir el nuevo track
      audio.play();
      setPlayingTrack(trackId);
    }
  };


  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/discover" />
            </IonButtons>
            <IonTitle>Cargando...</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <IonSpinner />
            <IonText>Cargando ave...</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (error) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/discover" />
            </IonButtons>
            <IonTitle>Error</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px'
          }}>
            <IonText color="danger" style={{ fontSize: '18px', textAlign: 'center' }}>
              {error}
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!bird) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonBackButton defaultHref="/discover" />
            </IonButtons>
            <IonTitle>Ave no encontrada</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px'
          }}>
            <IonText color="medium" style={{ fontSize: '18px', textAlign: 'center' }}>
              Ave no encontrada
            </IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/discover" />
          </IonButtons>
          <IonTitle>{bird.name}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Sección Hero */}
        <div style={{ position: 'relative', width: '100%', height: '250px' }}>
          {bird.image_url ? (
            <img 
              src={bird.image_url} 
              alt={bird.name}
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px'
            }}>
              🐦
            </div>
          )}
          
          {/* Overlay gradiente */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '16px'
          }}>
            <h1 style={{ 
              color: 'white', 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: 'bold',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              {bird.name}
            </h1>
            {bird.scientific_name && (
              <IonText style={{ 
                color: 'white', 
                fontStyle: 'italic',
                fontSize: '16px',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}>
                {bird.scientific_name}
              </IonText>
            )}
          </div>
        </div>

        {/* Detalles básicos */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {bird.size && (
              <IonText style={{ fontWeight: '500' }}>
                Tamaño: <span style={{ fontWeight: 'normal' }}>{bird.size}</span>
              </IonText>
            )}
            {bird.weight && (
              <IonText style={{ fontWeight: '500' }}>
                Peso: <span style={{ fontWeight: 'normal' }}>{bird.weight}</span>
              </IonText>
            )}
            {bird.stage && (
              <IonText style={{ fontWeight: '500' }}>
                Etapa: <span style={{ fontWeight: 'normal' }}>{bird.stage}</span>
              </IonText>
            )}
          </div>
        </div>

        {/* Secciones expandibles */}
        <IonAccordionGroup>
          {/* Descripción */}
          <IonAccordion value="description">
            <IonItem slot="header" color="light">
              <IonLabel>Descripción</IonLabel>
            </IonItem>
            <div slot="content" style={{ padding: '16px' }}>
              <IonText>
                {bird.description || 'No hay descripción disponible para esta ave.'}
              </IonText>
            </div>
          </IonAccordion>

          {/* Cantos */}
          <IonAccordion value="songs">
            <IonItem slot="header" color="light">
              <IonLabel>Cantos ({tracks.length})</IonLabel>
            </IonItem>
            <div slot="content">
              {tracks.length === 0 ? (
                <div style={{ padding: '16px' }}>
                  <IonText color="medium">No hay cantos disponibles</IonText>
                </div>
              ) : (
                tracks.map((track) => (
                  <div key={track.id}>
                    <IonItem button onClick={() => handlePlayTrack(track.id, track.url)}>
                      <IonIcon 
                        icon={playingTrack === track.id ? pause : play} 
                        slot="start"
                        style={{ 
                          fontSize: '24px',
                          color: playingTrack === track.id ? 'var(--ion-color-primary)' : 'var(--ion-color-medium)'
                        }}
                      />
                      <IonLabel>{track.title}</IonLabel>
                    </IonItem>
                    <audio 
                      id={`audio-${track.id}`}
                      src={track.url}
                      preload="none"
                      onEnded={() => setPlayingTrack(null)}
                      style={{ display: 'none' }}
                    />
                  </div>
                ))
              )}
            </div>
          </IonAccordion>

          {/* Música */}
          <IonAccordion value="music">
            <IonItem slot="header" color="light">
              <IonLabel>Música ({musicians.length})</IonLabel>
            </IonItem>
            <div slot="content">
              {musicians.length === 0 ? (
                <div style={{ padding: '16px' }}>
                  <IonText color="medium">No hay música disponible</IonText>
                </div>
              ) : (
                musicians.map((musician) => (
                  <div key={musician.id}>
                    <IonItem button onClick={() => handlePlayTrack(musician.id, musician.url)}>
                      <IonIcon 
                        icon={playingTrack === musician.id ? pause : play} 
                        slot="start"
                        style={{ 
                          fontSize: '24px',
                          color: playingTrack === musician.id ? 'var(--ion-color-primary)' : 'var(--ion-color-medium)'
                        }}
                      />
                      <IonLabel>{musician.name}</IonLabel>
                    </IonItem>
                    <audio 
                      id={`audio-${musician.id}`}
                      src={musician.url}
                      preload="none"
                      onEnded={() => setPlayingTrack(null)}
                      style={{ display: 'none' }}
                    />
                  </div>
                ))
              )}
            </div>
          </IonAccordion>
        </IonAccordionGroup>
      </IonContent>
    </IonPage>
  );
};

export default BirdDetail;