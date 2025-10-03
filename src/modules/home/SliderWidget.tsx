// src/modules/home/SliderWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonText } from '@ionic/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import './SliderWidget.css';
import type { Bird } from '../../core/db/dao/birds';
import { getImagesByBirdId } from '../../core/db/dao/bird_images';

type Props = {
  items?: Bird[];
  title?: string;
  onItemClick?: (id: string) => void;
};

const SliderWidget: React.FC<Props> = ({ items = [], title = 'Aves', onItemClick }) => {
  const [displayItems, setDisplayItems] = useState<Bird[]>([]);

  useEffect(() => {
    if (!items || items.length === 0) return;

    // shuffle aleatorio
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    const limited = shuffled.slice(0, 9);

    // adjuntar primera imagen desde bird_images si no tienen image_url
    Promise.all(
      limited.map(async (bird) => {
        if (bird.image_url) return bird;
        try {
          const imgs = await getImagesByBirdId(bird.id);
          if (imgs && imgs.length > 0) {
            return { ...bird, image_url: imgs[0].url };
          }
        } catch {
          return bird;
        }
        return bird;
      })
    ).then(setDisplayItems);
  }, [items]);

  return (
    <div className="slider-widget-i">
      <div className="in-widget-header">
        <div className="_flex">
          <div className="_base _1">
            <h2 className="h2-i _rgl primary-i">
              <span>{title}</span>
            </h2>
          </div>
          <div className="_base _2">
            <button className="btn-i">
              <span>Ver más</span>
            </button>
          </div>
        </div>
      </div>
      <div className="in-widget-content _flex-column">
        <div className="slider-widget">
          {displayItems && displayItems.length > 0 ? (
            <Swiper
              slidesPerView={'auto'}
              centeredSlides={true}
              spaceBetween={16}
              className="slider-widget-swiper"
            >
              {displayItems.map((bird) => (
                <SwiperSlide key={bird.id} className="slider-widget-slide">
                  <div
                    role="button"
                    data-bird-id={bird.id}
                    onClick={() => onItemClick?.(bird.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onItemClick?.(bird.id); }}
                    tabIndex={0}
                    className="slider-card"
                  >
                    <div className="slider-card-image-wrapper">
                      <img
                        src={bird.image_url || '/assets/default-bird.svg'}
                        alt={bird.name}
                        className="slider-card-image"
                      />
                    </div>

                    <div className="slider-card-overlay">
                      <div className="in-slide">
                        <div className="h3-i _rgl _capitalize whites">{bird.name}</div>
                        {bird.scientific_name && (
                          <div className="h4-i _lgt whites">{bird.scientific_name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <div className="widget-fallback">
              <img src="/assets/default-bird.svg" alt="Default bird" className="widget-fallback-img" />
              <IonText className="widget-fallback-text">Contenido no disponible aún</IonText>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SliderWidget;
