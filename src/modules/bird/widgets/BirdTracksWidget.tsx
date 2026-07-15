// src/modules/bird/widgets/BirdTracksWidget.tsx
import React, { useEffect } from 'react';
import TracksWidget from '../../home/widgets/TracksWidget';
import type { Track } from '../../../core/db/dao/tracks';

type Props = {
  items: Track[];
  onVisibleItemsChange?: (items: Track[]) => void;
  onBeforePlay?: (id: string) => void;
};

const BirdTracksWidget: React.FC<Props> = ({ items, onVisibleItemsChange, onBeforePlay }) => {
  useEffect(() => {
    if (!items?.length) {
      onVisibleItemsChange?.([]);
    }
  }, [items, onVisibleItemsChange]);

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
        limit={null}
        onItemClick={undefined}
        onVisibleItemsChange={onVisibleItemsChange}
        onBeforePlay={onBeforePlay}
      />
    </div>
  );
};

export default BirdTracksWidget;
