import React, { useEffect, useState } from 'react';

import { IonModal, IonText } from '@ionic/react';

import { Preferences } from '@capacitor/preferences';

import { useCacheManager } from '../core/hooks/useCacheManager';



const AppNavbar: React.FC = () => {

  const { clearAndDownloadAll, progress, showProgressModal, setShowProgressModal } = useCacheManager();

  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);

  const [downloading, setDownloading] = useState<boolean>(false);



  useEffect(() => {

    Preferences.get({ key: 'hasDownloaded' }).then((res) => {

      setHasDownloaded(res.value === 'true');

    });

  }, []);



  if (hasDownloaded) return null;



  const handleDownload = async () => {

    setDownloading(true);

    await clearAndDownloadAll();

    setDownloading(false);

    setHasDownloaded(true);

  };



  return (

    <>




      <IonModal isOpen={showProgressModal} backdropDismiss={false}>

        <div

          style={{

            display: 'flex',

            flexDirection: 'column',

            alignItems: 'center',

            justifyContent: 'center',

            height: '100%',

            padding: '24px',

            textAlign: 'center',

          }}

        >

          {progress < 100 ? (

            <>

              <IonText>

                <h3>Descargando contenido...</h3>

              </IonText>

              <div

                style={{

                  width: '80%',

                  height: '12px',

                  background: '#eee',

                  borderRadius: '6px',

                  overflow: 'hidden',

                  margin: '16px 0',

                }}

              >

                <div

                  style={{

                    width: `${progress}%`,

                    height: '100%',

                    background: '#4caf50',

                    transition: 'width 0.3s ease',

                  }}

                />

              </div>

              <IonText>{progress}%</IonText>

            </>

          ) : (

            <>

              <IonText><h3>✅ Descarga completa</h3></IonText>

            </>

          )}

        </div>

      </IonModal>

    </>

  );

};



export default AppNavbar;

