// src/modules/home/widgets/AboutWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonText } from '@ionic/react';
import { Network } from '@capacitor/network';
import birdsLocal from '../../../assets/imgs/birds-i.jpg';
import './AboutWidget.css';

const AboutWidget: React.FC = () => {
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
    <div className="about-widget-i">
      <div className="in-widget-header ">
        <div className="_flex">
          <div className="_base _1">
            <h2 className="h2-i _rgl primary-i">
              <span>Acerca del proyecto</span>
            </h2>
          </div>
          <div className="_base _2">
          </div>
        </div>
      </div>

      <div className="in-widget-content">
        <div className="about-card-i">
          <div className="about-card-image-wrapper">
            <img
              src={
                isOnline
                  ? 'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/birds-i.jpg'
                  : birdsLocal
              }
              alt="Acerca del proyecto"
              className="about-card-image"
            />
          </div>

          <div className="about-card-body">
            <div className="about-card-title s1-i _mdm primary-i">
              Son de la Sierra: <br /> Cantos de las Aves
            </div>
            <p className="about-card-text p1-i _rgl primary-i">
              Un proyecto de creación colectiva, liderado por la Fundación Imaginario
              en alianza con la Organización Wiwa Yugumaiun Bunkuanarrúa Tayrona
              y el Colectivo de Escritores Wiwa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutWidget;
