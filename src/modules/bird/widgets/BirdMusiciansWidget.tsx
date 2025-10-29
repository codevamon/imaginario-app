// src/modules/bird/widgets/BirdMusiciansWidget.tsx
import React from 'react';
import { IonList, IonItem, IonLabel } from '@ionic/react';
import type { Musician } from '../../../core/db/dao/musicians';

type Props = { 
  items: Musician[];
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

