// src/modules/home/AboutWidget.tsx
import React from 'react';
import { IonText } from '@ionic/react';
import './AboutWidget.css';

const AboutWidget: React.FC = () => {
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
              src="https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/assets/homepage/picture-aboutwidget.png"
              alt="Acerca del proyecto"
              className="about-card-image"
            />
          </div>

          <div className="about-card-body">
            <div className="about-card-title h3-i _rgl">
              Son de la Sierra: Cantos de las Aves
            </div>
            <IonText className="about-card-text p1-i">
              Un proyecto de creación colectiva, liderado por la Fundación Imaginario
              en alianza con la Organización Wiwa Yugumaiun Bunkuanarrúa Tayrona
              y el Colectivo de Escritores Wiwa.
            </IonText>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutWidget;
