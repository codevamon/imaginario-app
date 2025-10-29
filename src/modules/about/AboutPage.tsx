import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonContent,
  IonImg,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonText,
} from '@ionic/react';
import { Network } from '@capacitor/network';
import birdsLocal from '../../assets/imgs/birds-i.jpg';
import headBird1 from '../../assets/imgs/head-bird-1.png';
import headBird2 from '../../assets/imgs/head-bird-2.png';
import picAbout1 from '../../assets/imgs/pic-about-1.png';
import './AboutPage.css';

type Lang = 'es' | 'da';

const AboutPage: React.FC = () => {
  const [language, setLanguage] = useState<Lang>('es');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const checkNetwork = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
    };

    checkNetwork();
    
    let listenerHandle: any;
    Network.addListener('networkStatusChange', (status) => {
      setIsOnline(status.connected);
    }).then(handle => {
      listenerHandle = handle;
    });

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return (
    <IonPage>
      <IonContent fullscreen>
        {/* Imagen superior */}
        <div className="about-i">
          <div className="about-i-image">
            <img
              src={
                isOnline
                  ? 'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/birds-i.jpg'
                  : birdsLocal
              }
              alt="About"
              className="about-i-image-img"
            />
          </div>
          <div className="about-i-content">
              

            {language === 'es' ? (
              <div className="about-sections">
                <div className="about-section-1">
                  <div className="lang-toggle-i">
                    <button
                      className={`btn-i l1-i ${(language as Lang) === 'es' ? '_active' : ''}`}
                      onClick={() => setLanguage('es')}
                    >
                      Español
                    </button>
                    <button
                      className={`btn-i l1-i ${(language as Lang) === 'da' ? '_active' : ''}`}
                      onClick={() => setLanguage('da')}
                    >
                      Damuna
                    </button>
                  </div>
                  <div className="about-title">
                    <p className="p2-ii _lgt _uppercase">Acerca del proyecto</p>
                    <h1 className="h1-i _rgl ">Son de la Sierra Cantos de las Aves</h1>
                  </div>
                  
                  <div className="about-text">
                    <p className="p1-i _lgt">
                      Es un proyecto de creación colectiva, liderado por la Fundación Imaginario en alianza con la Organización Wiwa Yugumaïun Bunkuannarrúa Tayrona y el Colectivo de Escritores Wiwa.
                    </p>
                  </div>
                </div>
                <div className="about-section-2">
                  <div className="about-image">
                    <img
                      src={
                        isOnline
                          ? 'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/head-bird-1.png'
                          : headBird1
                      }
                      alt="About"
                    />
                  </div>
                  <div className="about-text">
                    <p className="p1-i _lgt">Cantos de las Aves es un proyecto de creación colectiva, liderado por la Fundación Imaginario en alianza con la Organización Wiwa Yugumaiun Bunkuanarrúa Tayrona y el Colectivo de Escritores Wiwa.</p>
                    <p className="p1-i _lgt">En un contexto en el que tanto las poblaciones de aves como las tradiciones indígenas  se encuentran bajo amenaza, le apostamos al monitoreo comunitario, la documentación participativa y la creación de materiales pedagógicos para fortalecer el conocimiento ancestral y científico sobre la avifauna de uno de los ecosistemas más irremplazables del planeta.</p>
                  </div>
                </div>
                <div className="about-section-3">
                  <div className="about-text-1">
                    <h3 className="h1-i _mdm">Conocimiento ancestral y científico sobre la avifauna</h3>
                  </div>
                  <div className="about-image-1">
                    <img
                      src={
                        isOnline
                          ? 'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/pic-about-1.png'
                          : picAbout1
                      }
                      alt="About"
                    />
                  </div>
                  <div className="about-text-2">
                    <p className="p1-i _lgt">Esta aplicación es uno de los resultados de este proceso: una apuesta por enamorar a las nuevas generaciones de las aves que los rodean, y por mantener viva la música, la lengua  y el conocimiento biocultural de sus mayores hacia el futuro.</p>
                  </div>
                  <div className="about-image-2">
                    <img
                      src={
                        isOnline
                          ? 'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/head-bird-2.png'
                          : headBird2
                      }
                      alt="About"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="about-section-1">
                <div className="lang-toggle-i">
                  <button
                    className={`btn-i l1-i ${(language as Lang) === 'es' ? '_active' : ''}`}
                    onClick={() => setLanguage('es')}
                  >
                    Español
                  </button>
                  <button
                    className={`btn-i l1-i ${(language as Lang) === 'da' ? '_active' : ''}`}
                    onClick={() => setLanguage('da')}
                  >
                    Damuna
                  </button>
                </div>
                <div className="about-title">
                  <p className="p2-ii _lgt _capitalize">Shama yuu anaruka</p>
                  <h1 className="h1-i _rgl ">Gängunaka Wimarua - Waninaka Anarukua</h1>
                </div>  
                <div className="about-text">
                  <p className="p1-i _lgt">
                    Wamunka Imaginario Fundação yuga Wiwa Yugumaïun Bunkuannarrúa Tayrona, Wimarua Writer Collective, shama yuu anaruka jizhana anokuna.
                  </p>
                </div>
                  
              </div>
            )}
          </div>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default AboutPage;

