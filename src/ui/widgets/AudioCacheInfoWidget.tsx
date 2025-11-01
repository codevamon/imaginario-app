import React, { useEffect, useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { IonText, IonIcon, IonSpinner, IonButton, IonAlert } from '@ionic/react';
import { musicalNotesOutline } from 'ionicons/icons';
// import { updateCachedPath } from '../../core/db/dao/tracks';
// Nota: no existe export directo de `db`; usamos getDb para ejecutar SQL
import { getDb } from '../../core/sqlite';

/**
 * Muestra el número total de audios cacheados y el tamaño total ocupado en disco.
 * Ideal para mostrar dentro del Sync Center.
 */
const AudioCacheInfoWidget: React.FC = () => {
  const [count, setCount] = useState<number | null>(null);
  const [sizeMB, setSizeMB] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  // Evitar warning de import no usado si la configuración de lint es estricta
  // void updateCachedPath;

  useEffect(() => {
    async function calculateCacheInfo() {
      try {
        const dir = await Filesystem.readdir({
          directory: Directory.Data,
          path: 'audios',
        });

        const files = dir.files || [];
        let totalBytes = 0;
        for (const file of files) {
          try {
            const stat = await Filesystem.stat({
              directory: Directory.Data,
              path: `audios/${file.name}`,
            });
            totalBytes += stat.size ?? 0;
          } catch {
            // ignorar archivos no legibles
          }
        }

        setCount(files.length);
        setSizeMB(totalBytes / 1024 / 1024);
      } catch (err) {
        console.warn('[AudioCacheInfoWidget] Error al obtener info de caché:', err);
        setCount(0);
        setSizeMB(0);
      } finally {
        setLoading(false);
      }
    }

    calculateCacheInfo();
  }, []);

  async function clearCache() {
    try {
      // 1. Eliminar todos los archivos de audio locales
      await Filesystem.rmdir({
        path: 'audios',
        directory: Directory.Data,
        recursive: true,
      });

      // 2. Reiniciar las columnas cached_path en SQLite para tracks e interviews
      try {
        const dbConn = await getDb();
        await dbConn.run('UPDATE tracks SET cached_path = NULL;');
        await dbConn.run('UPDATE interviews SET cached_path = NULL;');
        await dbConn.run('UPDATE sings SET cached_path = NULL;');
        console.log('[AudioCacheInfoWidget] cached_path reseteado en tracks, interviews y sings');
      } catch (err) {
        console.warn('[AudioCacheInfoWidget] No se pudo limpiar cached_path en alguna tabla:', err);
      }

      // 3. Actualizar el estado visual
      setCount(0);
      setSizeMB(0);
    } catch (err) {
      console.warn('[AudioCacheInfoWidget] Error al borrar caché:', err);
    }
  }

  if (loading)
    return (
      <div className="audio-cache-info">
        <IonSpinner name="dots" />
        <IonText className="text">Calculando caché de audios...</IonText>
      </div>
    );

  return (
    <div className="audio-cache-info">
      <IonIcon icon={musicalNotesOutline} className="icon" />
      <IonText className="text">
        {count ?? 0} audios cacheados — {sizeMB?.toFixed(2) ?? 0} MB
      </IonText>
      <IonButton
        expand="block"
        color="medium"
        size="small"
        onClick={() => setConfirmClear(true)}
      >
        Borrar caché de audios
      </IonButton>
      <IonAlert
        isOpen={confirmClear}
        header="Confirmar limpieza"
        message="¿Seguro que deseas eliminar todos los audios guardados localmente?"
        buttons={[
          { text: 'Cancelar', role: 'cancel', handler: () => setConfirmClear(false) },
          {
            text: 'Borrar',
            role: 'destructive',
            handler: async () => {
              await clearCache();
              setConfirmClear(false);
            },
          },
        ]}
      />
    </div>
  );
};

export default AudioCacheInfoWidget;


