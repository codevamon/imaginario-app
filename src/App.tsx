import React, { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact,
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { triangle, ellipse, square } from 'ionicons/icons';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

import Tab1 from './pages/Tab1';
import Tab2 from './pages/Tab2';
import Tab3 from './pages/Tab3';
import HomePage from './modules/home/HomePage';
import DiscoverPage from './modules/discover/DiscoverPage';
import { initDb } from './core/sqlite';

setupIonicReact();

// Layout de Tabs (v5)
const Tabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/tabs/tab1" component={Tab1} />
      <Route exact path="/tabs/tab2" component={Tab2} />
      <Route exact path="/tabs/tab3" component={Tab3} />
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
    </IonTabBar>
  </IonTabs>
);

const App: React.FC = () => {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('[App] 🚀 Inicializando base de datos...');
        await initDb();
        setDbReady(true);
        console.log('[App] ✅ Base de datos lista y funcionando correctamente');
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
            onClick={() => window.location.reload()}
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

          {/* Layout de tabs */}
          <Route path="/tabs" component={Tabs} />

          {/* Fallbacks rutas antiguas */}
          <Route exact path="/tab1"><Redirect to="/tabs/tab1" /></Route>
          <Route exact path="/tab2"><Redirect to="/tabs/tab2" /></Route>
          <Route exact path="/tab3"><Redirect to="/tabs/tab3" /></Route>

          {/* Landing */}
          <Route exact path="/"><Redirect to="/home" /></Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;
