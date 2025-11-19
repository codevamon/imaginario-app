// src/modules/bird/widgets/BirdSingsWidget.tsx
import React from 'react';
import SingsWidget from '../../home/widgets/SingsWidget';
import type { Sing } from '../../../core/db/dao/sings';
import { audioManager } from '../../../core/audio/player';

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
        onItemClick={(id: string) => {
          const sing = items.find(s => s.id === id);
          if (sing?.audio_url) {
            audioManager.toggle(id, sing.audio_url);
          }
        }} 
      />
    </div>
  );
};

export default BirdSingsWidget;

