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
  IonIcon,
  IonSpinner,
  IonButton,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { play, pause } from 'ionicons/icons';
import { getBirdById, type Bird } from '../../core/db/dao/birds';
import { getTracksByBirdId, type Track } from '../../core/db/dao/tracks';
import { listMusicians, type Musician } from '../../core/db/dao/musicians';
import { setLocalFavorite, isFavLocal } from '../../core/db/dao/catalog';
import { audioManager } from '../../core/audio/player';
import { getImagesByBirdId, type BirdImage } from '../../core/db/dao/bird_images';
import { getSingsByBirdId, type Sing } from '../../core/db/dao/sings';
import { getTranslationsByBirdId, type BirdTranslation } from '../../core/db/dao/bird_translations';
import { getInterviewsByBirdId, type Interview } from '../../core/db/dao/interviews';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import './BirdDetail.css';
import BirdTracksWidget from './widgets/BirdTracksWidget';
import BirdSingsWidget from './widgets/BirdSingsWidget';
import BirdMusiciansWidget from './widgets/BirdMusiciansWidget';
import BirdInterviewsWidget from './widgets/BirdInterviewsWidget';
import './widgets/bird-widgets.css';
import AccordionI from '../../ui/AccordionI';
import ArrowLeft from '../../assets/icons/ArrowLeft.svg';

const BirdDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bird, setBird] = useState<Bird | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFav, setIsFav] = useState<boolean>(false);
  const [images, setImages] = useState<BirdImage[]>([]);
  const [sings, setSings] = useState<Sing[]>([]);
  const [translations, setTranslations] = useState<BirdTranslation[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [descriptionTab, setDescriptionTab] = useState<'description' | 'translation'>('description');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  // Escuchar cambios del audioManager
  useEffect(() => {
    const unsub = audioManager.onChange((playingId) => setPlayingAudio(playingId));
    setPlayingAudio(audioManager.getPlayingId());
    return unsub;
  }, []);

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

        const musicians = await listMusicians();
        // Si existe un id de ave, filtra localmente
        const filteredMusicians = musicians.filter(m => m.bird_id === id);
        setMusicians(filteredMusicians);

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
          <div className="bird-loading">
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
          <div className="bird-error">
            <IonText color="danger">
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
          <div className="bird-notfound">
            <IonText color="medium">
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
      <IonContent>
        <div className="bird-i">
          <div className="btn-back" onClick={() => window.history.back()}>
            <img src={ArrowLeft} alt="Volver" />
          </div>
          <div className="bird-pictures">
            
            <div className="bird-pictures-swiper">
              <Swiper
                modules={[Pagination]}
                spaceBetween={0}
                slidesPerView={1}
                pagination={{
                  clickable: true,
                  bulletClass: 'swiper-pagination-bullet',
                  bulletActiveClass: 'swiper-pagination-bullet-active',
                }}
                loop={images.length > 1}
                autoplay={images.length > 1 ? { delay: 3000 } : false}
              >
                {(images.length > 0 ? images : [{ id: 'fallback', url: bird.image_url || '/assets/default-bird.jpg', description: 'Imagen no disponible' }]).map((image) => (
                  <SwiperSlide key={image.id}>
                    <img
                      src={image.url}
                      alt={image.description || bird.name}
                      className="bird-image"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
              
              {/* Overlay gradiente */}
            </div>
          </div>
          <div className="bird-content">
            <div className="bird-content-header">
              <div className="in-header">
                <h1 className="h2-i _rgl">{bird.name}</h1>
                <p className="h4-i _rgl">{bird.scientific_name}</p>
              </div>
            </div>
            <div className="bird-content-details">
              <div className="in-details">
                <div>
                  <div className="in-details-item">
                    {bird.size && (
                      <p  className="l2-i _rgl">
                        Tamaño / Damana: <span className="l2-i _rgl">{bird.size}</span>
                      </p>
                    )}
                    {bird.weight && (
                      <p  className="l2-i _rgl">
                        Peso / Damana: <span className="l2-i _rgl">{bird.weight}</span>
                      </p>
                    )}
                    {bird.stage && (
                      <p  className="l2-i _rgl">
                        Etapa / Damana: <span className="l2-i _rgl">{bird.stage}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bird-accordions">
          {/* Descripción con traducción */}
          <AccordionI title="Descripción" defaultOpen={true}>
            <div className="bird-description">
              {translations.length > 0 && (
                <IonSegment 
                  value={descriptionTab} 
                  onIonChange={(e) => setDescriptionTab(e.detail.value as 'description' | 'translation')}
                  className="bird-translation-segment"
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
                    <div className="bird-translation-button">
                      <IonButton 
                        onClick={() => audioManager.toggle(`translation-${translations[0].id}`, translations[0].audio_url!)}
                        fill="outline"
                        size="small"
                      >
                        <IonIcon 
                          icon={playingAudio === `translation-${translations[0].id}` ? pause : play} 
                          slot="start"
                        />
                        Reproducir traducción
                      </IonButton>
                    </div>
                  )}
                </div>
              )}
            </div>
          </AccordionI>

          {/* Cantos */}
          <AccordionI title="Cantos">
            <BirdSingsWidget items={sings} />
          </AccordionI>


          {/* Música */}
          <AccordionI title="Música">
            <BirdTracksWidget items={tracks} />
          </AccordionI>

          {/* Intérpretes */}
          <AccordionI title="Intérpretes">
            <BirdMusiciansWidget items={musicians} />
          </AccordionI>

          {/* Entrevistas */}
          <AccordionI title="Entrevistas">
            <BirdInterviewsWidget items={interviews} />
          </AccordionI>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BirdDetail;