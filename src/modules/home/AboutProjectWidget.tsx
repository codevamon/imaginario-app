// src/modules/home/AboutProjectWidget.tsx
import React from 'react';
import { IonCard, IonCardContent, IonButton } from '@ionic/react';

const AboutProjectWidget: React.FC = () => {
  return (
    <section className="widget-about-i in-widget">
      <IonCard className="about-card">
        <img src="/assets/about-illustration.jpg" alt="Acerca del proyecto" className="about-image" />
        <IonCardContent>
          <h4>Son de la Sierra: Cantos de las Aves</h4>
          <p className="about-text">Un proyecto de creación colectiva, liderado por la Fundación Imaginario...</p>
          <IonButton expand="full" color="success" className="contact-cta">Contactános — info@avesdelasierra.com</IonButton>
        </IonCardContent>
      </IonCard>
    </section>
  );
};

export default AboutProjectWidget;
