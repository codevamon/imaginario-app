// src/modules/home/widgets/WelcomeWidget.tsx
import React, { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircleOutline, search as searchIcon } from 'ionicons/icons';
import { useIonRouter, useIonToast } from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { useAudioVerification } from '../../../core/hooks/useAudioVerification';
import './WelcomeWidget.css';

const WelcomeWidget: React.FC = () => {
  const [q, setQ] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const router = useIonRouter();
  const [presentToast] = useIonToast();
  const { state, repairing, repairCount, totalRepairs } = useAudioVerification();
  const total = state?.total || 0;
  const verified = state?.completed || 0;
  const missing = Math.max(total - verified, 0);

  const goDiscover = () => {
    router.push('/discover', 'forward', 'push');
    // Pasamos el query por state para que Discover pueda prefill si lo desea
    setTimeout(() => history.replaceState({ focusSearch: true, q }, ''), 50);
  };

  const handleTripleTap = async () => {
    setTapCount(prev => prev + 1);
    setTimeout(() => setTapCount(0), 800); // reset rápido

    if (tapCount + 1 === 3) {
      await Preferences.set({ key: 'totalRepairs', value: '0' });
      presentToast({
        message: '🔄 Contador de reparaciones reiniciado',
        duration: 1500,
        position: 'bottom',
        color: 'medium',
      });
      setTapCount(0);
      // opcional: recarga el hook o fuerza actualización
      window.location.reload();
    }
  };

  return (
    <section className="widget-welcome-i ">
      <div className="in-widget">
        <h1 className="h1-i _rgl primary-i">Bienvenidos: Zungui</h1>
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
        <div className="audio-verify-status" style={{ marginTop: '12px'}}>
          <p className="p1-ii _rgl primary-i">
            Verificados <strong>{verified}</strong> de <strong>{total}</strong> audios
            {missing > 0 && <span> — {missing} pendientes</span>}
          </p>
        </div>
      )}
      
      {repairing && (
        <div className="audio-repair-status" style={{ marginTop: '8px', textAlign: 'center' }}>
          <p className="p1-ii _lgt primary-i">🛠️ Reparando audios pendientes…</p>
        </div>
      )}
      
      {repairCount > 0 && (
        <div className="audio-history-status" style={{ marginTop: '6px', textAlign: 'center' }}>
          <p className="p1-ii _lgt primary-i">🧩 {repairCount} audios reparados a lo largo del tiempo</p>
        </div>
      )}
      
      {totalRepairs > 0 && (
        <div style={{ marginTop: '4px', textAlign: 'center' }}>
          <p
            className="p1-ii _lgt primary-i"
            style={{ userSelect: 'none', cursor: 'pointer' }}
            onClick={handleTripleTap}
          >
            🧩 Reparaciones acumuladas: <strong>{totalRepairs}</strong> audios restaurados
          </p>
        </div>
      )}
      
      <div className="search-pill-container">
        
      </div>
    </section>
  );
};

export default WelcomeWidget;
