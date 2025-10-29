import React, { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact,
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { triangle, ellipse, square, refreshCircle } from 'ionicons/icons';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
// import '@ionic/react/css/palettes/dark.system.css'; // ⚠️ DESACTIVADO: Forzamos siempre modo claro
import './theme/variables.css';

import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';
import HomePage from './modules/home/HomePage';
import DiscoverPage from './modules/discover/DiscoverPage';
import MusicPage from './modules/music/MusicPage';
import BirdDetail from './modules/bird/BirdDetail';
import ProfilePage from './modules/profile/ProfilePage';
import SyncCenter from './modules/synccenter/SyncCenter';
import AboutPage from './modules/about/AboutPage';
import { initDb, resetDb, isDbReady } from './core/sqlite';
import { pullAllTables } from './core/sync/pull';
import Footbar from './ui/Footbar';
import './theme/fonts.css';
import './theme/global.css';

setupIonicReact();

// Layout de Tabs (v5)
const Tabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/tabs/tab1" component={Tab1} />
      <Route exact path="/tabs/tab2" component={Tab2} />
      <Route exact path="/tabs/tab3" component={Tab3} />
      <Route exact path="/tabs/synccenter" component={SyncCenter} />
      <Route exact path="/tabs">
        <Redirect to="/tabs/tab1" />
      </Route>
    </IonRouterOutlet>

    <IonTabBar slot="bottom">
      <IonTabButton tab="tab1" href="/tabs/tab1">
        <IonIcon aria-hidden="true" icon={triangle} />
        <IonLabel>Tab 1</IonLabel>
      </IonTabButton>
      <IonTabButton tab="tab2" href="/tabs/tab2">
        <IonIcon aria-hidden="true" icon={ellipse} />
        <IonLabel>Tab 2</IonLabel>
      </IonTabButton>
      <IonTabButton tab="tab3" href="/tabs/tab3">
        <IonIcon aria-hidden="true" icon={square} />
        <IonLabel>Tab 3</IonLabel>
      </IonTabButton>
      <IonTabButton tab="synccenter" href="/tabs/synccenter">
        <IonIcon aria-hidden="true" icon={refreshCircle} />
        <IonLabel>Sync</IonLabel>
      </IonTabButton>
    </IonTabBar>
  </IonTabs>
);

const App: React.FC = () => {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // 🌞 Forzar siempre modo claro (light mode)
  useEffect(() => {
    document.body.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');
  }, []);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('[App] 🚀 Inicializando base de datos...');
        
        // Verificar si ya está inicializada
        if (isDbReady()) {
          console.log('[App] ✅ Base de datos ya está lista');
          setDbReady(true);
          return;
        }
        
        await initDb();
        setDbReady(true);
        console.log('[App] ✅ Base de datos lista y funcionando correctamente');
        
        // Sincronización automática inicial
        try {
          await pullAllTables();
          console.log('[App] ✅ Sync inicial completada');
        } catch (syncError) {
          console.warn('[App] ⚠️ Sync inicial falló, app continúa:', syncError);
        }
      } catch (error) {
        console.error('[App] ❌ Error inicializando base de datos:', error);
        setDbError((error as Error).message);
      }
    };

    initDatabase();
  }, []);

  // Mostrar loading mientras se inicializa la DB
  if (!dbReady && !dbError) {
    return (
      <IonApp>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div>Inicializando base de datos...</div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Configurando SQLite nativo...
          </div>
        </div>
      </IonApp>
    );
  }

  // Mostrar error si falló la inicialización
  if (dbError) {
    return (
      <IonApp>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          flexDirection: 'column',
          gap: '16px',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>
            Error inicializando base de datos
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            {dbError}
          </div>
          <button 
            onClick={async () => {
              setDbError(null);
              setDbReady(false);
              try {
                await resetDb();
                setDbReady(true);
              } catch (error) {
                setDbError((error as Error).message);
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet id="main">
          {/* Páginas sin TabBar */}
          <Route exact path="/home" component={HomePage} />
          <Route exact path="/discover" component={DiscoverPage} />
          <Route exact path="/music" component={MusicPage} />
          <Route exact path="/bird/:id" component={BirdDetail} />
          <Route exact path="/profile" component={ProfilePage} />
          <Route exact path="/about" component={AboutPage} />
          <Route exact path="/synccenter" component={SyncCenter} />

          {/* Layout de tabs */}
          <Route path="/tabs" component={Tabs} />

          {/* Fallbacks rutas antiguas */}
          <Route exact path="/tab1"><Redirect to="/tabs/tab1" /></Route>
          <Route exact path="/tab2"><Redirect to="/tabs/tab2" /></Route>
          <Route exact path="/tab3"><Redirect to="/tabs/tab3" /></Route>

          {/* Landing */}
          <Route exact path="/"><Redirect to="/home" /></Route>
        </IonRouterOutlet>
        
        {/* Footbar persistente */}
        <Footbar />
      </IonReactRouter>
    </IonApp>
  );
};

export default App;

// Estilos para asegurar que el Footbar quede encima del contenido
// pero no tape modales ni toasts
const footbarStyles = `
  ion-footer, .footbar-container {
    z-index: 1000;
  }
  
  /* Asegurar que modales y toasts tengan z-index más alto */
  ion-modal {
    z-index: 10000;
  }
  
  ion-toast {
    z-index: 10001;
  }
  
  /* Asegurar que el contenido no se tape con el footbar */
  ion-content {
    --padding-bottom: 80px;
  }
  
  /* Para páginas que usan IonPage directamente */
  ion-page {
    padding-bottom: 80px;
  }
  
  /* Asegurar que el footbar no interfiera con el contenido */
  .footbar-container {
    position: fixed !important;
    bottom: 10px !important;
    left: 10px !important;
    right: 10px !important;
    z-index: 1000 !important;
  }
`;

// Inyectar estilos
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = footbarStyles;
  document.head.appendChild(styleElement);
}
