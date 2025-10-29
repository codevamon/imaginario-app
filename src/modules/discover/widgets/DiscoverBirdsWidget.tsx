// src/modules/discover/DiscoverBirdsWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonThumbnail, IonChip, IonText } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import './DiscoverBirdsWidget.css';
import { listBirds, type Bird } from '../../../core/db/dao/birds';

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
      <Swiper
        slidesPerView={'auto'}
        centeredSlides={true}
        spaceBetween={5}
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
            >
              <div 
                className="discover-card-image-wrapper"
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
                <div className="discover-card-overlay-content">
                  <h3 className="h1-i _rgl light-i">
                    {bird.name}
                  </h3>
                  {bird.scientific_name && (
                    <p className="h4-i _lgt light-i">
                      {bird.scientific_name}
                    </p>
                  )}
                  <button className="button-primary-i">
                    <span className="button-primary-i-text">Conoce esta ave</span>
                  </button>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
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
    <section className="discover-widget-i">      
      {viewMode === 'list' ? (
        <div className="discover-bird-list">
          {birds.map((bird) => (
            <div className="discover-bird-item" 
              key={bird.id} 
              onClick={() => handleBirdClick(bird.id)}
            >
              <div className="discover-bird-image" >
                <img src={bird.image_url || '/assets/default-bird.svg'} alt={bird.name} />
                  
              </div>
              
              <div className="discover-bird-info">
                <div className="discover-bird-info-header">
                  <h2 className="h3-i _bld primary-i">
                    {bird.name}
                  </h2>
                  {bird.scientific_name && (
                    <p className="p2-ii _lgt primary-i">
                      {bird.scientific_name}
                    </p>
                  )}
                </div>
                {/* <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                </div> */}
              </div>
            </div>
          ))}
        </div>
      ) : (
        renderCarouselView()
      )}
    </section>
  );
};

export default DiscoverBirdsWidget;
