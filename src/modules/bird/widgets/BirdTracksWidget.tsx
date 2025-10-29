// src/modules/bird/widgets/BirdTracksWidget.tsx
import React from 'react';
import TracksWidget from '../../home/widgets/TracksWidget';
import type { Track } from '../../../core/db/dao/tracks';

type Props = { 
  items: Track[];
};

const BirdTracksWidget: React.FC<Props> = ({ items }) => {
  if (!items?.length) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ion-color-medium)' }}>
        No hay música disponible
      </div>
    );
  }
  
  return (
    <div className="bird-widget bird-widget-tracks">
      <TracksWidget 
        items={items} 
        title="" 
        onItemClick={undefined} 
      />
    </div>
  );
};

export default BirdTracksWidget;

