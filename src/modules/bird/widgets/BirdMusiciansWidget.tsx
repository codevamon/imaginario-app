// src/modules/bird/widgets/BirdMusiciansWidget.tsx
import React from 'react';
import { IonList, IonItem, IonLabel } from '@ionic/react';
import type { Musician } from '../../../core/db/dao/musicians';
import { useCachedImage } from "@/core/cache/useCachedImage";

type Props = { 
  items: Musician[];
};

const MusicianImage: React.FC<{ url?: string | null; alt: string }> = ({ url, alt }) => {
  const imgSrc = useCachedImage(url);
  if (!url) return null;
  return (
    <img
      src={imgSrc}
      alt={alt}
      className="musician-image"
      slot="start"
    />
  );
};

const BirdMusiciansWidget: React.FC<Props> = ({ items }) => {
  if (!items?.length) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ion-color-medium)' }}>
        No hay intérpretes disponibles
      </div>
    );
  }

  return (
    <div className="bird-widget bird-widget-musicians">
      <IonList>
        {items.map((musician) => (
          <IonItem key={musician.id}>
            <MusicianImage url={(musician as any).image_url} alt={musician.name} />
            <IonLabel>
              <h3 style={{ fontWeight: '600', marginBottom: '4px' }}>
                {musician.name}
              </h3>
              {musician.bio && (
                <p style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  marginBottom: '4px'
                }}>
                  {musician.bio}
                </p>
              )}
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </div>
  );
};

export default BirdMusiciansWidget;

