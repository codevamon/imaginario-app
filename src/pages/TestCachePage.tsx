import React, { useState } from 'react';
import { IonPage, IonContent, IonButton, IonText, IonImg } from '@ionic/react';
import { mediaCacheService } from '../core/cache/mediaCacheService';

const imageUrls = [
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-images/colibri.jpg',
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-images/crotophaga-ani.jpg',
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-images/turdus-leucomelas-albiventer.jpg',
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-images/tyto-alba.jpg'
];

const audioUrls = [
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-tracks/colibri/Whatuko Msinduzhi - Rongoy - Ambrosio Chimosquero y Eduardo Gil.mp3',
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-tracks/turdus-leucomelas-albiventer/Whatuko Dusherra - Rongon.mp3',
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-tracks/crotophaga-ani/Whatuko Abi - Tezhumake - Hilario Bolanos.mp3',
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-interviews/colibri/Historia Msinduzhi - Ambrosio Chimosquero.mp3',
  'https://fkqqpndpginvqmdqajvb.supabase.co/storage/v1/object/public/bird-interviews/turdus-leucomelas-albiventer/Historia Dusherra - Ambrosio.mp3'
];

const testImage = imageUrls[0];
const testAudio = audioUrls[0];

const TestCachePage: React.FC = () => {
  const [img, setImg] = useState<string | undefined>(undefined);
  const [logs, setLogs] = useState<string[]>([]);
  const [cacheSize, setCacheSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [cacheInfo, setCacheInfo] = useState<string>('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleDownloadImage = async () => {
    try {
      setLoading(true);
      addLog('Iniciando descarga de imagen...');
      const uri = await mediaCacheService.cacheImage(encodeURI(testImage));
      if (uri) {
        setImg(uri);
        addLog(`✅ Imagen cacheada: ${uri}`);
      } else {
        addLog('⚠️ No se pudo obtener URI de la imagen');
      }
    } catch (error) {
      addLog(`❌ Error descargando imagen: ${error}`);
      console.error('[TestCachePage] Error descargando imagen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAudio = async () => {
    try {
      setLoading(true);
      addLog('Iniciando descarga de audio...');
      const uri = await mediaCacheService.cacheAudio(encodeURI(testAudio));
      if (uri) {
        addLog(`✅ Audio cacheado: ${uri}`);
        // Verificar que se guardó (sin reproducir)
        addLog('✅ Audio guardado en caché correctamente');
        // Comentado: ya no reproducimos audio
        // try {
        //   const audio = new Audio(uri);
        //   await audio.play();
        //   addLog('🔊 Audio reproducido exitosamente');
        // } catch (playError) {
        //   addLog(`⚠️ Audio cacheado pero no se pudo reproducir: ${playError}`);
        //   console.warn('[TestCachePage] Error reproduciendo audio:', playError);
        // }
      } else {
        addLog('⚠️ No se pudo obtener URI del audio');
      }
    } catch (error) {
      addLog(`❌ Error descargando audio: ${error}`);
      console.error('[TestCachePage] Error descargando audio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCacheSize = async () => {
    try {
      setLoading(true);
      addLog('Calculando tamaño del caché...');
      const size = await mediaCacheService.getCacheSize();
      const sizeInMB = size / 1024 / 1024;
      setCacheSize(sizeInMB);
      addLog(`📊 Tamaño del caché: ${sizeInMB.toFixed(2)} MB (${size} bytes)`);
    } catch (error) {
      addLog(`❌ Error obteniendo tamaño: ${error}`);
      console.error('[TestCachePage] Error obteniendo tamaño:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setLoading(true);
      addLog('Limpiando caché...');
      await mediaCacheService.clearCache();
      setImg(undefined);
      setCacheSize(null);
      setCachedCount(0);
      setCacheInfo('');
      addLog('✅ Caché limpiado exitosamente');
    } catch (error) {
      addLog(`❌ Error limpiando caché: ${error}`);
      console.error('[TestCachePage] Error limpiando caché:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCacheStats = async () => {
    const totalSize = await mediaCacheService.getCacheSize();
    const mb = (totalSize / 1024 / 1024).toFixed(2);
    setCacheInfo(`Tamaño total: ${mb} MB`);
  };

  const downloadAllMedia = async () => {
    try {
      setLoading(true);
      addLog('🚀 Iniciando descarga masiva de imágenes y audios...');
      let total = 0;
      
      for (const url of imageUrls) {
        const res = await mediaCacheService.cacheImage(encodeURI(url));
        if (res) total++;
      }
      
      for (const url of audioUrls) {
        const res = await mediaCacheService.cacheAudio(encodeURI(url));
        if (res) total++;
      }
      
      setCachedCount(total);
      addLog(`✅ Descargados y cacheados ${total} archivos.`);
      await updateCacheStats();
    } catch (error) {
      addLog(`❌ Error en descarga masiva: ${error}`);
      console.error('[TestCachePage] Error en descarga masiva:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
        <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <IonText>
            <h2>Prueba de Caché de Medios</h2>
          </IonText>

          {/* Botones de acción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <IonButton
              expand="block"
              color="success"
              onClick={downloadAllMedia}
              disabled={loading}
            >
              DESCARGAR TODO
            </IonButton>

            <IonButton
              expand="block"
              onClick={handleDownloadImage}
              disabled={loading}
            >
              Descargar imagen
            </IonButton>

            <IonButton
              expand="block"
              onClick={handleDownloadAudio}
              disabled={loading}
            >
              Descargar audio
            </IonButton>

            <IonButton
              expand="block"
              onClick={handleGetCacheSize}
              disabled={loading}
              color="secondary"
            >
              Ver tamaño de caché
            </IonButton>

            <IonButton
              expand="block"
              onClick={handleClearCache}
              disabled={loading}
              color="danger"
            >
              Limpiar caché
            </IonButton>
          </div>

          {/* Información del tamaño del caché */}
          <div style={{ padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
            <IonText>
              {cacheInfo && <div><strong>{cacheInfo}</strong></div>}
              {cacheSize !== null && (
                <div><strong>Tamaño actual del caché: {cacheSize.toFixed(2)} MB</strong></div>
              )}
              <div style={{ marginTop: '8px' }}>
                <strong>Archivos cacheados: {cachedCount}</strong>
              </div>
            </IonText>
          </div>

          {/* Imagen cacheada */}
          {img && (
            <div style={{ marginTop: '16px' }}>
              <IonText>
                <p>Imagen cacheada:</p>
              </IonText>
              <IonImg
                src={img}
                alt="Imagen cacheada"
                style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }}
              />
            </div>
          )}

          {/* Logs */}
          <div style={{ marginTop: '16px', width: '100%' }}>
            <IonText>
              <h3>Logs:</h3>
            </IonText>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#1e1e1e',
                color: '#fff',
                borderRadius: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '12px',
                marginTop: '8px',
              }}
            >
              {logs.length === 0 ? (
                <IonText style={{ color: '#888' }}>No hay logs aún...</IonText>
              ) : (
                logs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '4px' }}>
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* URLs de prueba */}
          <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            <IonText>
              <p style={{ fontSize: '12px', margin: 0 }}>
                <strong>URLs de prueba:</strong>
              </p>
              <p style={{ fontSize: '11px', margin: '4px 0', wordBreak: 'break-all' }}>
                Imagen: {testImage}
              </p>
              <p style={{ fontSize: '11px', margin: '4px 0', wordBreak: 'break-all' }}>
                Audio: {testAudio}
              </p>
            </IonText>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TestCachePage;

