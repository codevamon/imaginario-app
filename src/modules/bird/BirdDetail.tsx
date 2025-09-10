import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSpinner,
  IonText,
  IonChip,
  IonCard,
  IonCardContent
} from '@ionic/react';
import { arrowBack, star, starOutline } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { listBirds, type Bird } from '../../core/db/dao/birds';
import { setLocalFavorite, isFavLocal } from '../../core/db/dao/catalog';

const BirdDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useIonRouter();
  const [bird, setBird] = useState<Bird | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // Cargar datos del ave
  useEffect(() => {
    const loadBird = async () => {
      if (!id) {
        console.error('[BirdDetail] No se proporcionó ID de ave');
        setLoading(false);
        return;
      }

      try {
        console.log('[BirdDetail] Cargando ave con ID:', id);
        const birdsData = await listBirds();
        const foundBird = birdsData.find(b => b.id === id);
        
        if (!foundBird) {
          console.warn('[BirdDetail] Ave no encontrada con ID:', id);
          setLoading(false);
          return;
        }

        setBird(foundBird);
        console.log('[BirdDetail] ✅ Ave cargada:', foundBird.name);

        // Verificar si es favorito
        const isFav = await isFavLocal(id);
        setIsFavorite(isFav);
        console.log('[BirdDetail] Estado de favorito:', isFav);
      } catch (error) {
        console.error('[BirdDetail] ❌ Error cargando ave:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBird();
  }, [id]);

  const handleToggleFavorite = async () => {
    if (!bird || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const newFavoriteState = !isFavorite;
      await setLocalFavorite(bird.id, newFavoriteState);
      setIsFavorite(newFavoriteState);
      console.log('[BirdDetail] ✅ Favorito actualizado:', newFavoriteState);
    } catch (error) {
      console.error('[BirdDetail] ❌ Error actualizando favorito:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const getRarityText = (rarity: number | null | undefined): string => {
    if (rarity === null || rarity === undefined) return 'No especificada';
    if (rarity === 0) return 'Baja';
    if (rarity === 1) return 'Media';
    if (rarity === 2) return 'Alta';
    if (rarity === 3) return 'Muy alta';
    return 'No especificada';
  };

  const getRarityColor = (rarity: number | null | undefined): string => {
    if (rarity === null || rarity === undefined) return 'medium';
    if (rarity === 0) return 'success';
    if (rarity === 1) return 'warning';
    if (rarity === 2) return 'danger';
    if (rarity === 3) return 'dark';
    return 'medium';
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Cargando...</IonTitle>
            <IonButtons slot="start">
              <IonButton onClick={() => router.back()}>
                <IonIcon icon={arrowBack} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <IonSpinner name="crescent" />
            <IonText>Cargando ave...</IonText>
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
            <IonTitle>Ave no encontrada</IonTitle>
            <IonButtons slot="start">
              <IonButton onClick={() => router.back()}>
                <IonIcon icon={arrowBack} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px'
          }}>
            <IonText color="medium" style={{ fontSize: '18px', textAlign: 'center' }}>
              No se pudo encontrar esta ave
            </IonText>
            <IonButton onClick={() => router.back()}>
              Volver
            </IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{bird.name}</IonTitle>
          <IonButtons slot="start">
            <IonButton onClick={() => router.back()}>
              <IonIcon icon={arrowBack} />
            </IonButton>
          </IonButtons>
          <IonButtons slot="end">
            <IonButton 
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? (
                <IonSpinner name="crescent" style={{ width: '20px', height: '20px' }} />
              ) : (
                <IonIcon icon={isFavorite ? star : starOutline} />
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Imagen principal */}
        <div style={{ position: 'relative', width: '100%', height: '200px' }}>
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
        </div>

        {/* Información principal */}
        <div style={{ padding: '20px' }}>
          {/* Nombre y científico */}
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              margin: '0 0 8px 0',
              color: '#333'
            }}>
              {bird.name}
            </h1>
            
            {bird.scientific_name && (
              <p style={{
                fontSize: '18px',
                fontStyle: 'italic',
                color: '#666',
                margin: '0 0 16px 0'
              }}>
                {bird.scientific_name}
              </p>
            )}

            {/* Chips de información */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <IonChip color={getRarityColor(Number(bird.rarity) || 0)}>
                <IonText>Rareza: {getRarityText(Number(bird.rarity) || 0)}</IonText>
              </IonChip>
              
              {bird.popularity && (
                <IonChip color="primary">
                  <IonText>Popularidad: {bird.popularity}</IonText>
                </IonChip>
              )}

              {bird.tags && (
                <IonChip color="secondary">
                  <IonText>{bird.tags}</IonText>
                </IonChip>
              )}
            </div>
          </div>

          {/* Descripción */}
          {bird.description && (
            <IonCard>
              <IonCardContent>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  margin: '0 0 12px 0',
                  color: '#333'
                }}>
                  Descripción
                </h3>
                <p style={{
                  fontSize: '16px',
                  lineHeight: '1.6',
                  color: '#555',
                  margin: 0
                }}>
                  {bird.description}
                </p>
              </IonCardContent>
            </IonCard>
          )}

          {/* Audio si existe */}
          {bird.audio_url && (
            <IonCard style={{ marginTop: '16px' }}>
              <IonCardContent>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  margin: '0 0 12px 0',
                  color: '#333'
                }}>
                  Audio
                </h3>
                <audio 
                  controls 
                  style={{ width: '100%' }}
                  preload="metadata"
                >
                  <source src={bird.audio_url} type="audio/mpeg" />
                  <source src={bird.audio_url} type="audio/wav" />
                  Tu navegador no soporta el elemento de audio.
                </audio>
              </IonCardContent>
            </IonCard>
          )}

          {/* Estado de favorito */}
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            backgroundColor: isFavorite ? '#e8f5e8' : '#f5f5f5',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <IonText color={isFavorite ? 'success' : 'medium'}>
              {isFavorite ? '⭐ Esta ave está en tus favoritos' : 'Agrega esta ave a tus favoritos'}
            </IonText>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default BirdDetail;
