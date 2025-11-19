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
import { useCachedImage } from "@/core/cache/useCachedImage";
import birdsLocal from '../../assets/imgs/birds-i.jpg';
import headBird1 from '../../assets/imgs/head-bird-1.png';
import headBird2 from '../../assets/imgs/head-bird-2.png';
import picAbout1 from '../../assets/imgs/pic-about-1.png';
import './AboutPage.css';

type Lang = 'es' | 'da';

// Componentes wrapper para imágenes con useCachedImage
const AboutImage: React.FC<{ remoteUrl: string; localAsset: string; isOnline: boolean; alt?: string; className?: string }> = ({ remoteUrl, localAsset, isOnline, alt, className }) => {
  const imgSrc = useCachedImage(isOnline ? remoteUrl : localAsset);
  return <img src={imgSrc} alt={alt} className={className} />;
};

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

  const imgBirdsI = useCachedImage(
    isOnline
      ? 'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/birds-i.jpg'
      : birdsLocal
  );

  return (
    <IonPage>
      <IonContent fullscreen>
        {/* Imagen superior */}
        <div className="about-i">
          <div className="about-i-image">
            <img
              src={imgBirdsI}
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
                      Dʉmʉna
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
                    <AboutImage
                      remoteUrl="https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/head-bird-1.png"
                      localAsset={headBird1}
                      isOnline={isOnline}
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
                    <AboutImage
                      remoteUrl="https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/pic-about-1.png"
                      localAsset={picAbout1}
                      isOnline={isOnline}
                      alt="About"
                    />
                  </div>
                  <div className="about-text-2">
                    <p className="p1-i _lgt">Esta aplicación es uno de los resultados de este proceso: una apuesta por enamorar a las nuevas generaciones de las aves que los rodean, y por mantener viva la música, la lengua  y el conocimiento biocultural de sus mayores hacia el futuro.</p>
                  </div>
                  <div className="about-image-2">
                    <AboutImage
                      remoteUrl="https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/head-bird-2.png"
                      localAsset={headBird2}
                      isOnline={isOnline}
                      alt="About"
                    />
                  </div>
                </div>
              </div>
            ) : (
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
                      Dʉmʉna
                    </button>
                  </div>
                  <div className="about-title">
                    <p className="p2-ii _lgt _capitalize">ZUNGUI YUU ANARUKA</p>
                    <h1 className="h1-i _rgl ">Gonawindua zhana suzhi tua ukuzhi </h1>
                  </div>
                  
                  <div className="about-text">
                    <p className="p1-i _lgt">
                    Gonawindua zhanandzina: “suzhindzina maiama” zhinguirru ingui iba bugui nazhi kʉnzhanekanka 
kimʉna, memanzhe shamunku zhinguirru zhaguinuka fundación imaginario. nʉnashka, organización 
wiwa yugumaiʉn bunkunarua Tayrona win ingui zhinzhoma gogandzina colectivo de escritores nʉn 
zhigʉñishi shambunanka. 2015 mʉndzi iba uguia aunukurra cine, ciencia nʉn shikanzhe uruama win 
ya guneka awega ima zhishizhama zhiguiega, kaiarru gunekega ima zhamaiama agʉñi kuazha nanega. 
Iyaru igu Gonawindua nekʉkuazha nugame. 
                    </p>
                  </div>
                </div>
                <div className="about-section-2">
                  <div className="about-image">
                    <AboutImage
                      remoteUrl="https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/head-bird-1.png"
                      localAsset={headBird1}
                      isOnline={isOnline}
                      alt="About"
                    />
                  </div>
                  <div className="about-text">
                    <p className="p1-i _lgt">Iwa ya ime shikandzina kua suzhindzina asinumpana aunukamba, nawiga kʉzhigabihi naiʉn nukurra 
mema gunamandzina kena, shikanzhe zhinzhoma asheshishi awemdzingua she ʉnkango awega 
memengui ikuia she mʉkʉndzia awakuaga, ima guamandzina duma tuega, awashkangui ima 
zhinzhoma científico agʉñi duma tua awega washka ekʉnagangua Suzhi ingegua dzinguakʉntengui 
nugame. Memerru zhinchiki nazhi duma tua awega ima suzhindzina, ia asina aweru agʉñi tun 
nanazhingurra nʉname. </p>
                  </div>
                </div>
                <div className="about-section-3">
                  <div className="about-text-1">
                    <h3 className="h1-i _mdm">Ancestral yuga científico anaruka jizhana anokuna waninaka anarukua</h3>
                  </div>
                  <div className="about-image-1">
                    <AboutImage
                      remoteUrl="https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/pic-about-1.png"
                      localAsset={picAbout1}
                      isOnline={isOnline}
                      alt="About"
                    />
                  </div>
                  <div className="about-text-2">
                    <p className="p1-i _lgt">Memerru ima aplicación zhinguirru, ingui nana she ambunanka kimʉna mema ibamba mʉndzi 
atunanka. Imamba mʉndzi nawiga sakʉn nukurra iwazhana dugandzina agʉñi shindzia awega 
nawinzhe guama kinki, washkanguazi ima zhamaiama agʉñi duma tuega, nawi ashekurrayengui kua 
nawinzhimamandzinaga nekʉmasha awanaingui.  </p>
                  </div>
                  <div className="about-image-2">
                    <AboutImage
                      remoteUrl="https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/head-bird-2.png"
                      localAsset={headBird2}
                      isOnline={isOnline}
                      alt="About"
                    />
                  </div>
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

