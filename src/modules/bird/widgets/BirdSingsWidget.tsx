// src/modules/bird/widgets/BirdSingsWidget.tsx
import React from 'react';
import SingsWidget from '../../home/widgets/SingsWidget';
import type { Sing } from '../../../core/db/dao/sings';

type Props = { 
  items: Sing[];
};

const BirdSingsWidget: React.FC<Props> = ({ items }) => {
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
      />
    </div>
  );
};

export default BirdSingsWidget;

