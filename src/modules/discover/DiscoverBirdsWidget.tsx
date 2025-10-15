// src/modules/discover/DiscoverBirdsWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonThumbnail, IonChip, IonText } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import './DiscoverBirdsWidget.css';
import { listBirds, type Bird } from '../../core/db/dao/birds';

type Props = {
  searchTerm?: string;
  orderFilter?: 'name' | 'updated_at';
  rarityFilter?: number;
  popularityFilter?: 'asc' | 'desc';
  viewMode?: 'list' | 'carousel';
};

const DiscoverBirdsWidget: React.FC<Props> = ({ 
  searchTerm = '', 
  orderFilter = 'name', 
  rarityFilter, 
  popularityFilter,
  viewMode = 'list'
}) => {
  const [birds, setBirds] = useState<Bird[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useIonRouter();

  useEffect(() => {
    const loadBirds = async () => {
      try {
        setLoading(true);
        console.log('[DiscoverBirdsWidget] Cargando aves con filtros:', {
          search: searchTerm,
          rarity: rarityFilter,
          order: orderFilter,
          popularity: popularityFilter
        });
        
        const birdsData = await listBirds({
          search: searchTerm,
          rarity: rarityFilter,
          order: orderFilter,
          popularity: popularityFilter
        });
        
        setBirds(birdsData);
        console.log('[DiscoverBirdsWidget] ✅ Aves cargadas:', birdsData.length);
      } catch (error) {
        console.error('[DiscoverBirdsWidget] ❌ Error cargando aves:', error);
        setBirds([]);
      } finally {
        setLoading(false);
      }
    };

    loadBirds();
  }, [searchTerm, orderFilter, rarityFilter, popularityFilter]);

  const handleBirdClick = (birdId: string) => {
    router.push(`/bird/${birdId}`);
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

  const renderCarouselView = () => (
    <div style={{ padding: '0 20px' }}>
      <Swiper
        slidesPerView={'auto'}
        centeredSlides={true}
        spaceBetween={16}
        className="discover-swiper"
      >
        {birds.map((bird) => (
          <SwiperSlide key={bird.id} className="discover-swiper-slide">
            <div
              role="button"
              onClick={() => handleBirdClick(bird.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleBirdClick(bird.id); }}
              tabIndex={0}
              className="discover-card"
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                height: '280px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                backgroundColor: 'white',
                width: '80vw',
                maxWidth: '300px'
              }}
            >
              <div 
                className="discover-card-image-wrapper"
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  zIndex: 0
                }}
              >
                <img
                  src={bird.image_url || '/assets/default-bird.svg'}
                  alt={bird.name}
                  className="discover-card-image"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0), #0A3731)',
                    zIndex: 1
                  }}
                />
              </div>

              <div 
                className="discover-card-overlay"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '20px'
                }}
              >
                <div style={{ color: 'white' }}>
                  <h3 style={{ 
                    fontWeight: '600', 
                    marginBottom: '4px',
                    fontSize: '18px',
                    textTransform: 'capitalize'
                  }}>
                    {bird.name}
                  </h3>
                  {bird.scientific_name && (
                    <p style={{ 
                      fontSize: '14px', 
                      fontStyle: 'italic',
                      marginBottom: '8px',
                      opacity: 0.9
                    }}>
                      {bird.scientific_name}
                    </p>
                  )}
                  <div style={{ 
                    fontSize: '12px', 
                    opacity: 0.8,
                    fontWeight: '500'
                  }}>
                    Conoce esta ave
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );

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
        <IonText>Cargando aves...</IonText>
      </div>
    );
  }

  if (birds.length === 0) {
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
          {searchTerm ? 'No se encontraron aves con ese término' : 'No hay aves disponibles'}
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
        Aves ({birds.length})
      </h2>
      
      {viewMode === 'list' ? (
        <IonList>
          {birds.map((bird) => (
            <IonItem 
              key={bird.id} 
              button 
              onClick={() => handleBirdClick(bird.id)}
              style={{ '--padding-start': '16px' }}
            >
              <IonThumbnail slot="start" style={{ width: '60px', height: '60px' }}>
                {bird.image_url ? (
                  <img 
                    src={bird.image_url} 
                    alt={bird.name}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    🐦
                  </div>
                )}
              </IonThumbnail>
              
              <IonLabel>
                <h2 style={{ fontWeight: '600', marginBottom: '4px' }}>
                  {bird.name}
                </h2>
                {bird.scientific_name && (
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#666', 
                    fontStyle: 'italic',
                    marginBottom: '4px'
                  }}>
                    {bird.scientific_name}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <IonChip 
                    color={getRarityColor(Number(bird.rarity) || 0)} 
                    className="chip-small"
                  >
                    <IonLabel>{getRarityText(Number(bird.rarity) || 0)}</IonLabel>
                  </IonChip>
                  {bird.popularity && (
                    <IonText style={{ fontSize: '12px', color: '#666' }}>
                      Popularidad: {bird.popularity}
                    </IonText>
                  )}
                </div>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      ) : (
        renderCarouselView()
      )}
    </section>
  );
};

export default DiscoverBirdsWidget;
