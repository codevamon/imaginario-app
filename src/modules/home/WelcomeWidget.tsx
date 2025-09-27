// src/modules/home/WelcomeWidget.tsx
import React, { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { search as searchIcon } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';

const WelcomeWidget: React.FC = () => {
  const [q, setQ] = useState('');
  const router = useIonRouter();

  const goDiscover = () => {
    router.push('/discover', 'forward', 'push');
    // Pasamos el query por state para que Discover pueda prefill si lo desea
    setTimeout(() => history.replaceState({ focusSearch: true, q }, ''), 50);
  };

  return (
    <section className="widget-welcome-i in-widget">
      <h1 className="welcome-title">Bienvenidos!</h1>
      <p className="welcome-sub">Explora la diversidad de aves de la Sierra</p>

      <div className="search-pill" role="search" aria-label="Buscar aves">
        <div className="search-icon">
          <IonIcon icon={searchIcon} />
        </div>
        <input
          className="search-input"
          placeholder="Busca un ave..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(ev) => { if (ev.key === 'Enter') goDiscover(); }}
        />
        <IonButton fill="clear" size="small" onClick={goDiscover} aria-label="Buscar">
          Buscar
        </IonButton>
      </div>
    </section>
  );
};

export default WelcomeWidget;
