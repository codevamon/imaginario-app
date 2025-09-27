// src/modules/home/SliderWidget.tsx
import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle } from '@ionic/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import type { Bird } from '../../core/db/dao/birds';

type Props = {
  items?: Bird[];
  title?: string;
  onItemClick?: (id: string) => void;
};

const SliderWidget: React.FC<Props> = ({ items = [], title = 'Aves', onItemClick }) => {
  return (
    <IonCard>
      <IonCardHeader>
        <IonCardTitle>{title}</IonCardTitle>
      </IonCardHeader>

      <div style={{ padding: 8 }}>
        <Swiper slidesPerView={1.2} spaceBetween={12} freeMode>
          {items.map((bird) => (
            <SwiperSlide key={bird.id}>
              <div
                role="button"
                data-bird-id={bird.id}
                onClick={() => onItemClick?.(bird.id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onItemClick?.(bird.id); }}
                tabIndex={0}
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  height: 260,
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ width: '100%', height: 180, position: 'relative', overflow: 'hidden' }}>
                  {bird.image_url ? (
                    <img src={bird.image_url} alt={bird.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                      🐦
                    </div>
                  )}

                  <div style={{ position: 'absolute', top: 8, right: 8 }}>
                    {/* optional rarity chip could be passed via props or computed elsewhere */}
                  </div>
                </div>

                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{bird.name}</div>
                  {bird.scientific_name && <div style={{ fontSize: 14, fontStyle: 'italic', color: '#666' }}>{bird.scientific_name}</div>}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </IonCard>
  );
};

export default SliderWidget;
