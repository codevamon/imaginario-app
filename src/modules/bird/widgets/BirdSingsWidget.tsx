// src/modules/bird/widgets/BirdSingsWidget.tsx
import React, { useEffect } from 'react';
import SingsWidget from '../../home/widgets/SingsWidget';
import type { Sing } from '../../../core/db/dao/sings';

type Props = {
  items: Sing[];
  onVisibleItemsChange?: (items: Sing[]) => void;
  onBeforePlay?: (id: string) => void;
};

const BirdSingsWidget: React.FC<Props> = ({ items, onVisibleItemsChange, onBeforePlay }) => {
  useEffect(() => {
    if (!items?.length) {
      onVisibleItemsChange?.([]);
    }
  }, [items, onVisibleItemsChange]);

  if (!items?.length) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ion-color-medium)' }}>
        No hay cantos disponibles
      </div>
    );
  }
  
  return (
    <div className="bird-widget bird-widget-sings">
      <SingsWidget 
        items={items} 
        title="" 
        onItemClick={() => {}}
        onVisibleItemsChange={onVisibleItemsChange}
        onBeforePlay={onBeforePlay}
      />
    </div>
  );
};

export default BirdSingsWidget;
