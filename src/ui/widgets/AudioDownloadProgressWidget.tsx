import React, { useEffect, useState } from 'react';
import { IonProgressBar, IonText } from '@ionic/react';

/**
 * Widget global que muestra el progreso total de descargas de audio.
 * Escucha eventos 'audio:download-progress' emitidos por AudioManager.
 * Se puede colocar en cualquier página de la app.
 */
const AudioDownloadProgressWidget: React.FC = () => {
  const [downloads, setDownloads] = useState<Record<string, number>>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      const { id, progress } = e.detail;
      setDownloads((prev) => {
        const next = { ...prev, [id]: progress };
        const active = (Object.values(next) as number[]).some((p) => p > 0 && p < 1);
        setVisible(active);
        // Eliminar completados (1.0)
        if (progress >= 1) {
          setTimeout(() => {
            setDownloads((p2) => {
              const clean = { ...p2 };
              delete clean[id];
              return clean;
            });
          }, 1000);
        }
        return next;
      });
    };

    window.addEventListener('audio:download-progress', handler);
    return () => window.removeEventListener('audio:download-progress', handler);
  }, []);

  const total = Object.keys(downloads).length;
  const sum = (Object.values(downloads) as number[]).reduce((a, b) => a + b, 0);
  const percent = total ? sum / total : 0;

  if (!visible) return null;

  return (
    <div className="audio-download-widget">
      <IonText className="label">
        Descargando audios… {Math.round(percent * 100)}%
      </IonText>
      <IonProgressBar value={percent} color="success" />
    </div>
  );
};

export default AudioDownloadProgressWidget;


