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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonButton,
  IonSegment,
  IonSegmentButton
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { play, pause, star, starOutline } from 'ionicons/icons';
import { getBirdById, type Bird } from '../../core/db/dao/birds';
import { getTracksByBirdId, type Track } from '../../core/db/dao/tracks';
import { getMusiciansByBirdId, type Musician } from '../../core/db/dao/musicians';
import { setLocalFavorite, isFavLocal } from '../../core/db/dao/catalog';
import { getImagesByBirdId, type BirdImage } from '../../core/db/dao/bird_images';
import { getSingsByBirdId, type Sing } from '../../core/db/dao/sings';
import { getTranslationsByBirdId, type BirdTranslation } from '../../core/db/dao/bird_translations';
import { getInterviewsByBirdId, type Interview } from '../../core/db/dao/interviews';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

const BirdDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bird, setBird] = useState<Bird | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [isFav, setIsFav] = useState<boolean>(false);
  const [images, setImages] = useState<BirdImage[]>([]);
  const [sings, setSings] = useState<Sing[]>([]);
  const [translations, setTranslations] = useState<BirdTranslation[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [descriptionTab, setDescriptionTab] = useState<'description' | 'translation'>('description');

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

        const fav = await isFavLocal(id);
        setIsFav(fav);

        const birdTracks = await getTracksByBirdId(id);
        setTracks(birdTracks);

        const birdMusicians = await getMusiciansByBirdId(id);
        setMusicians(birdMusicians);

        const birdImages = await getImagesByBirdId(id);
        setImages(birdImages);

        const birdSings = await getSingsByBirdId(id);
        setSings(birdSings);

        const birdTranslations = await getTranslationsByBirdId(id);
        setTranslations(birdTranslations);

        const birdInterviews = await getInterviewsByBirdId(id);
        setInterviews(birdInterviews);

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

  const handleToggleFavorite = async () => {
    if (!bird) return;
    const newFav = !isFav;
    await setLocalFavorite(bird.id, newFav);
    setIsFav(newFav);
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

  // Debug: Verificar datos cargados
  console.log('[BirdDetail] 🔍 Debug - tracks:', tracks);
  console.log('[BirdDetail] 🔍 Debug - interviews:', interviews);
  console.log('[BirdDetail] 🔍 Debug - tracks.length:', tracks.length);
  console.log('[BirdDetail] 🔍 Debug - interviews.length:', interviews.length);
  
  // Verificar si los accordions deberían mostrar contenido
  console.log('[BirdDetail] 🔍 Should show tracks accordion:', tracks.length > 0);
  console.log('[BirdDetail] 🔍 Should show interviews accordion:', interviews.length > 0);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/discover" />
          </IonButtons>
          <IonTitle>{bird.name}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleToggleFavorite}>
              <IonIcon
                slot="icon-only"
                icon={isFav ? star : starOutline}
                color={isFav ? 'warning' : 'medium'}
              />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Sección Hero - Carrusel */}
        <div style={{ position: 'relative', width: '100%', height: '250px' }}>
          {images.length > 0 ? (
            <Swiper
              spaceBetween={0}
              slidesPerView={1}
              loop={images.length > 1}
              autoplay={images.length > 1 ? { delay: 3000 } : false}
            >
              {images.map((image) => (
                <SwiperSlide key={image.id}>
                  <img 
                    src={image.url} 
                    alt={image.description || bird.name}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover'
                    }}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : bird.image_url ? (
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
          {/* Descripción con traducción */}
          <IonAccordion value="description">
            <IonItem slot="header" color="light">
              <IonLabel>Descripción</IonLabel>
            </IonItem>
            <div slot="content" style={{ padding: '16px' }}>
              {translations.length > 0 && (
                <IonSegment 
                  value={descriptionTab} 
                  onIonChange={(e) => setDescriptionTab(e.detail.value as 'description' | 'translation')}
                  style={{ marginBottom: '16px' }}
                >
                  <IonSegmentButton value="description">
                    <IonLabel>Español</IonLabel>
                  </IonSegmentButton>
                  <IonSegmentButton value="translation">
                    <IonLabel>{translations[0].lang}</IonLabel>
                  </IonSegmentButton>
                </IonSegment>
              )}
              
              {descriptionTab === 'description' ? (
                <IonText>
                  {bird.description || 'No hay descripción disponible para esta ave.'}
                </IonText>
              ) : (
                <div>
                  <IonText>
                    {translations[0]?.description || 'No hay traducción disponible.'}
                  </IonText>
                  {translations[0]?.audio_url && (
                    <div style={{ marginTop: '16px' }}>
                      <IonButton 
                        onClick={() => handlePlayTrack(`translation-${translations[0].id}`, translations[0].audio_url!)}
                        fill="outline"
                        size="small"
                      >
                        <IonIcon 
                          icon={playingTrack === `translation-${translations[0].id}` ? pause : play} 
                          slot="start"
                        />
                        Reproducir traducción
                      </IonButton>
                      <audio 
                        id={`audio-translation-${translations[0].id}`}
                        src={translations[0].audio_url}
                        preload="none"
                        onEnded={() => setPlayingTrack(null)}
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </IonAccordion>

          {/* Cantos */}
          <IonAccordion value="sings">
            <IonItem slot="header" color="light">
              <IonLabel>Cantos</IonLabel>
            </IonItem>
            <div slot="content">
              {sings.length === 0 ? (
                <div style={{ padding: '16px' }}>
                  <IonText color="medium">No hay cantos disponibles</IonText>
                </div>
              ) : (
                sings.map((sing) => (
                  <div key={sing.id}>
                    <IonItem button onClick={() => handlePlayTrack(sing.id, sing.audio_url)}>
                      <IonIcon 
                        icon={playingTrack === sing.id ? pause : play} 
                        slot="start"
                        style={{ 
                          fontSize: '24px',
                          color: playingTrack === sing.id ? 'var(--ion-color-primary)' : 'var(--ion-color-medium)'
                        }}
                      />
                      <IonLabel>{sing.title || 'Canto sin título'}</IonLabel>
                    </IonItem>
                    <audio 
                      id={`audio-${sing.id}`}
                      src={sing.audio_url}
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
              <IonLabel>Música</IonLabel>
            </IonItem>
            <div slot="content">
              {tracks.length === 0 ? (
                <div style={{ padding: '16px' }}>
                  <IonText color="medium">No hay música disponible</IonText>
                </div>
              ) : (
                tracks.map((track) => (
                  <div key={track.id}>
                    <IonItem button onClick={() => handlePlayTrack(track.id, track.audio_url)}>
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
                      src={track.audio_url}
                      preload="none"
                      onEnded={() => setPlayingTrack(null)}
                      style={{ display: 'none' }}
                    />
                  </div>
                ))
              )}
            </div>
          </IonAccordion>

          {/* Intérpretes */}
          <IonAccordion value="musicians">
            <IonItem slot="header" color="light">
              <IonLabel>Intérpretes</IonLabel>
            </IonItem>
            <div slot="content">
              {musicians.length === 0 ? (
                <div style={{ padding: '16px' }}>
                  <IonText color="medium">No hay intérpretes disponibles</IonText>
                </div>
              ) : (
                musicians.map((musician) => (
                  <IonItem key={musician.id}>
                    <IonLabel>
                      <h3>{musician.name}</h3>
                      {musician.bio && <p>{musician.bio}</p>}
                    </IonLabel>
                  </IonItem>
                ))
              )}
            </div>
          </IonAccordion>

          {/* Entrevistas */}
          <IonAccordion value="interviews">
            <IonItem slot="header" color="light">
              <IonLabel>Entrevistas</IonLabel>
            </IonItem>
            <div slot="content">
              {interviews.length === 0 ? (
                <div style={{ padding: '16px' }}>
                  <IonText color="medium">No hay entrevistas disponibles</IonText>
                </div>
              ) : (
                interviews.map((interview) => (
                  <div key={interview.id}>
                    <IonItem button onClick={() => handlePlayTrack(interview.id, interview.audio_url)}>
                      <IonIcon 
                        icon={playingTrack === interview.id ? pause : play} 
                        slot="start"
                        style={{ 
                          fontSize: '24px',
                          color: playingTrack === interview.id ? 'var(--ion-color-primary)' : 'var(--ion-color-medium)'
                        }}
                      />
                      <IonLabel>{interview.title}</IonLabel>
                    </IonItem>
                    <audio 
                      id={`audio-${interview.id}`}
                      src={interview.audio_url}
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