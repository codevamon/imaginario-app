// src/modules/home/GuideCarouselWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonCard, IonCardHeader, IonCardTitle, useIonRouter } from '@ionic/react';
import './GuideCarouselWidget.css';

// Tipo local y mock (reemplaza por DAO cuando tengas listBirds)
type BirdLocal = {
  id: string;
  name: string;
  scientific_name?: string;
  image_url?: string;
};

const mockBirds: BirdLocal[] = [
  { id: 'tyto-alba', name: 'Lechuza común', image_url: '/assets/tyto-alba.jpg' },
  { id: 'turdus', name: 'Mirla patiamarilla', image_url: '/assets/turdus.jpg' },
  { id: 'b1', name: 'Bujushensha', scientific_name: 'Thryophilus rufalbus', image_url: '/assets/b1.jpg' },
  { id: 'b2', name: 'Ave X', scientific_name: 'Specimen x', image_url: '/assets/b2.jpg' },
];

const GuideCarouselWidget: React.FC = () => {
  const router = useIonRouter();
  const [items, setItems] = useState<BirdLocal[]>(mockBirds);

  // carga inicial: si existe DAO, usarlo; además escuchar eventos db:updated para recargar
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        // intento dinámico para evitar errores en build si el DAO no está listo
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const birdsDao = require('../../core/db/dao/birds');
        const birdImagesDao = require('../../core/db/dao/bird_images');
        
        if (birdsDao && typeof birdsDao.listBirds === 'function') {
          const rows = await birdsDao.listBirds({ search: '', order: 'name' });
          if (!mounted) return;
          
          // Obtener primera imagen para cada ave si existe el DAO de imágenes
          if (birdImagesDao && typeof birdImagesDao.getImagesByBirdId === 'function') {
            const birdsWithImages = await Promise.all(
              (Array.isArray(rows) ? rows.slice(0, 6) : mockBirds).map(async (bird) => {
                try {
                  const images = await birdImagesDao.getImagesByBirdId(bird.id);
                  if (images && images.length > 0) {
                    bird.image_url = bird.image_url || images[0].url;
                  }
                } catch (e) {
                  console.warn(`[GuideCarouselWidget] Error loading images for bird ${bird.id}:`, e);
                }
                return bird;
              })
            );
            setItems(birdsWithImages);
          } else {
            setItems(Array.isArray(rows) ? rows.slice(0, 6) : mockBirds);
          }
          return;
        }
      } catch (e) {
        // fallback a mocks si algo falla
        // console.warn('[GuideCarouselWidget] DAO not available, using mocks', e);
      }
      if (mounted) setItems(mockBirds);
    };

    load();

    const onUpdate = () => {
      load();
    };

    window.addEventListener('db:updated', onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('db:updated', onUpdate);
    };
  }, []);

  const goToBird = (id: string) => {
    console.log('[GuideCarouselWidget] click ->', id);
    router.push(`/bird/${id}`);
  };

  // Log de diagnóstico
  console.log('[GuideCarouselWidget] bird ids:', items.map(i => i.id));

  return (
    <section className="widget-guide-i in-widget">
      <IonCard>
        <IonCardHeader>
          <IonCardTitle>Guía de Aves</IonCardTitle>
        </IonCardHeader>

        <div className="guide-scroll" role="list" aria-label="Guía de aves">
          {items.map((b) => (
            <article
              key={b.id}
              className="guide-card"
              role="listitem"
              data-bird-id={b.id}
              onClick={() => goToBird(b.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') goToBird(b.id); }}
              tabIndex={0}
              aria-label={`Ver detalle ${b.name}`}
            >
              <div className="guide-image-wrap">
                <img src={b.image_url ?? '/assets/placeholder-bird.jpg'} alt={b.name} className="guide-image" />
                <div className="guide-overlay">
                  <div className="guide-name">{b.name}</div>
                  {b.scientific_name && <div className="guide-scientific">{b.scientific_name}</div>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </IonCard>
    </section>
  );
};

export default GuideCarouselWidget;
