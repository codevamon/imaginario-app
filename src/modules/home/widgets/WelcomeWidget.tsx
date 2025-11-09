// src/modules/home/widgets/WelcomeWidget.tsx
import React, { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { search as searchIcon } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useAudioVerification } from '../../../core/hooks/useAudioVerification';
import './WelcomeWidget.css';

const WelcomeWidget: React.FC = () => {
  const [q, setQ] = useState('');
  const router = useIonRouter();
  const { state } = useAudioVerification();
  const total = state?.total || 0;
  const verified = state?.completed || 0;
  const missing = Math.max(total - verified, 0);

  const goDiscover = () => {
    router.push('/discover', 'forward', 'push');
    // Pasamos el query por state para que Discover pueda prefill si lo desea
    setTimeout(() => history.replaceState({ focusSearch: true, q }, ''), 50);
  };

  return (
    <section className="widget-welcome-i ">
      <div className="in-widget">
        <h1 className="h1-i _rgl primary-i">Bienvenidos</h1>
        <p className="p1-ii _rgl primary-i">Explora la diversidad de aves de la Sierra</p>
      </div>

      <div className="search-pill" role="search" aria-label="Buscar aves">
        <div className="search-icon primary-i">
          <IonIcon icon={searchIcon} />
        </div>
        <input
          className="search-input p1-ii _lgt primary-i"
          placeholder="Busca un ave..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(ev) => { if (ev.key === 'Enter') goDiscover(); }}
          onClick={() => router.push('/discover?focus=search')}
        />
        
      </div>
      
      {total > 0 && verified < total && (
        <div className="audio-verify-status" style={{ marginTop: '12px', textAlign: 'center' }}>
          <p className="p1-ii _rgl primary-i">
            🔄 Verificados <strong>{verified}</strong> de <strong>{total}</strong> audios
            {missing > 0 && <span> — {missing} pendientes</span>}
          </p>
        </div>
      )}
      
      <div className="search-pill-container">
        
      </div>
    </section>
  );
};

export default WelcomeWidget;
