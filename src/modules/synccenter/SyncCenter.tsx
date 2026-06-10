import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonSpinner, IonToast, IonCard, IonCardContent,
  IonProgressBar, IonBadge, IonList, IonItem, IonLabel
} from '@ionic/react';
import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { pullAllTables, resyncAllTables } from '../../core/sync/pull';
import { getLocalDataSummary, type LocalDataSummary } from '../../core/sync/localDataSummary';
import { getBirdOfflineStatusInventory, type BirdOfflineStatusInventory } from '../../core/sync/birdOfflineInventory';
import { mediaCacheService, type AudioInventoryItem, type AudioInventorySummary, type ImageInventoryItem, type ImageInventorySummary } from '../../core/cache/mediaCacheService';

type DownloadState = {
  downloading: boolean;
  progress: number;
  error?: string | null;
};

export default function SyncCenter() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [localDataSummary, setLocalDataSummary] = useState<LocalDataSummary | null>(null);
  const [localDataLoading, setLocalDataLoading] = useState(false);
  const [birdOfflineInventory, setBirdOfflineInventory] = useState<BirdOfflineStatusInventory | null>(null);
  const [birdOfflineLoading, setBirdOfflineLoading] = useState(false);
  const [audioInventory, setAudioInventory] = useState<AudioInventorySummary | null>(null);
  const [imageInventory, setImageInventory] = useState<ImageInventorySummary | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [imageInventoryLoading, setImageInventoryLoading] = useState(false);
  const [downloadStates, setDownloadStates] = useState<Record<string, DownloadState>>({});
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [downloadingImageId, setDownloadingImageId] = useState<string | null>(null);
  const [downloadingMissingImages, setDownloadingMissingImages] = useState(false);
  const [imageDownloadProgress, setImageDownloadProgress] = useState(0);

  // Cargar inventario al montar el componente
  useEffect(() => {
    loadLocalDataSummary();
    loadBirdOfflineInventory();
    loadAudioInventory();
    loadImageInventory();
  }, []);

  async function loadLocalDataSummary() {
    setLocalDataLoading(true);
    try {
      const summary = await getLocalDataSummary();
      setLocalDataSummary(summary);
      console.log('[SyncCenter] 📊 Estado de datos cargado:', summary);
    } catch (error) {
      console.error('[SyncCenter] Error al cargar estado de datos:', error);
    } finally {
      setLocalDataLoading(false);
    }
  }

  async function loadBirdOfflineInventory() {
    setBirdOfflineLoading(true);
    try {
      const inventory = await getBirdOfflineStatusInventory();
      setBirdOfflineInventory(inventory);
      console.log('[SyncCenter] 📊 Estado por ave cargado:', inventory);
    } catch (error) {
      console.error('[SyncCenter] Error al cargar estado por ave:', error);
    } finally {
      setBirdOfflineLoading(false);
    }
  }

  async function loadAudioInventory() {
    setInventoryLoading(true);
    try {
      const inventory = await mediaCacheService.getAudioDownloadInventory();
      setAudioInventory(inventory);
      console.log('[SyncCenter] 📊 Inventario cargado:', inventory);
    } catch (error) {
      console.error('[SyncCenter] Error al cargar inventario:', error);
    } finally {
      setInventoryLoading(false);
    }
  }

  async function loadImageInventory() {
    setImageInventoryLoading(true);
    try {
      const inventory = await mediaCacheService.getImageDownloadInventory();
      setImageInventory(inventory);
      console.log('[SyncCenter] 📊 Inventario de imágenes cargado:', inventory);
    } catch (error) {
      console.error('[SyncCenter] Error al cargar inventario de imágenes:', error);
    } finally {
      setImageInventoryLoading(false);
    }
  }

  async function handleSync() {
    if (isSyncing) return;
    
    const status = await Network.getStatus();
    if (!status.connected) {
      console.warn('[Sync] 🚫 Sin conexión: refresco cancelado.');
      setSyncMessage('🚫 Sin conexión a Internet');
      setShowToast(true);
      return;
    }
    
    setIsSyncing(true);
    setSyncMessage('Sincronizando datos...');
    setShowToast(true);
    
    try {
      const result = await pullAllTables();
      
      if (result.success) {
        setSyncMessage(`✅ Sync rápido completado: ${result.totalRecords} registros actualizados`);
      } else {
        setSyncMessage(`❌ Error en sync rápido: ${result.errors.join(', ')}`);
      }

      await Promise.all([
        loadLocalDataSummary(),
        loadBirdOfflineInventory(),
        loadAudioInventory(),
        loadImageInventory(),
      ]);
    } catch (error) {
      console.error('[SyncCenter] Error en sync rápido:', error);
      setSyncMessage(`❌ Error crítico en sync rápido: ${error}`);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleResync() {
    if (isResyncing) return;
    
    const status = await Network.getStatus();
    if (!status.connected) {
      console.warn('[Sync] 🚫 Sin conexión: refresco cancelado.');
      setSyncMessage('🚫 Sin conexión a Internet');
      setShowToast(true);
      return;
    }
    
    setIsResyncing(true);
    setSyncMessage('🔄 Resync completo en progreso...');
    setShowToast(true);
    
    try {
      await resyncAllTables();
      await Promise.all([
        loadLocalDataSummary(),
        loadBirdOfflineInventory(),
        loadAudioInventory(),
        loadImageInventory(),
      ]);
      setSyncMessage('✅ Resync completo terminado');
    } catch (error) {
      console.error('[SyncCenter] Error en resync completo:', error);
      setSyncMessage(`❌ Error en resync completo: ${error}`);
    } finally {
      setIsResyncing(false);
    }
  }

  async function handleCheckAudioInventory() {
    console.log('[SyncCenter] 🔍 Ejecutando inventario de descargas...');
    
    setInventoryLoading(true);
    setImageInventoryLoading(true);
    setLocalDataLoading(true);
    setBirdOfflineLoading(true);
    try {
      const [inventory, imagesInventory, dataSummary, birdInventory] = await Promise.all([
        mediaCacheService.getAudioDownloadInventory(),
        mediaCacheService.getImageDownloadInventory(),
        getLocalDataSummary(),
        getBirdOfflineStatusInventory(),
      ]);
      setAudioInventory(inventory);
      setImageInventory(imagesInventory);
      setLocalDataSummary(dataSummary);
      setBirdOfflineInventory(birdInventory);
      
      // Log del resumen
      console.log('[SyncCenter] 📊 Resumen de audios:', {
        total: inventory.total,
        downloaded: inventory.downloaded,
        pending: inventory.pending,
        no_url: inventory.no_url,
        corrupted: inventory.corrupted,
        totalSizeMB: inventory.totalSizeMB
      });

      console.log('[SyncCenter] 📊 Resumen de imágenes:', {
        total: imagesInventory.total,
        downloaded: imagesInventory.downloaded,
        pending: imagesInventory.pending,
        no_url: imagesInventory.no_url,
        corrupted: imagesInventory.corrupted,
        totalSizeMB: imagesInventory.totalSizeMB
      });

      console.log('[SyncCenter] 📊 Estado de datos:', dataSummary);
      console.log('[SyncCenter] 📊 Estado por ave:', birdInventory);
      
      // Log de los primeros 20 items con status pending o corrupted
      const problemItems = inventory.items
        .filter(item => item.status === 'pending' || item.status === 'corrupted')
        .slice(0, 20);
      
      if (problemItems.length > 0) {
        console.log(`[SyncCenter] ⚠️ Items con problemas (primeros 20):`);
        console.table(problemItems);
      } else {
        console.log('[SyncCenter] ✅ No hay items pendientes o corruptos');
      }

      const problemImageItems = imagesInventory.items
        .filter(item => item.status === 'pending' || item.status === 'corrupted')
        .slice(0, 20);
      
      if (problemImageItems.length > 0) {
        console.log(`[SyncCenter] ⚠️ Imágenes con problemas (primeras 20):`);
        console.table(problemImageItems);
      } else {
        console.log('[SyncCenter] ✅ No hay imágenes pendientes o corruptas');
      }
      
      setSyncMessage(`✅ Inventario actualizado: ${inventory.downloaded}/${inventory.total} audios, ${imagesInventory.downloaded}/${imagesInventory.total} imágenes`);
      setShowToast(true);
    } catch (error) {
      console.error('[SyncCenter] Error al obtener inventario de descargas:', error);
      setSyncMessage(`❌ Error al verificar descargas: ${error}`);
      setShowToast(true);
    } finally {
      setInventoryLoading(false);
      setImageInventoryLoading(false);
      setLocalDataLoading(false);
      setBirdOfflineLoading(false);
    }
  }

  function getItemKey(item: AudioInventoryItem) {
    return `${item.table}-${item.id}`;
  }

  async function handleDownloadAudioItem(item: AudioInventoryItem) {
    if (!item.audio_url) {
      setSyncMessage('❌ Este audio no tiene URL de descarga');
      setShowToast(true);
      return;
    }

    const key = getItemKey(item);

    setDownloadStates(prev => ({
      ...prev,
      [key]: { downloading: true, progress: 0, error: null },
    }));

    try {
      const result = await mediaCacheService.downloadAudioItem(item.audio_url, {
        destPath: item.expectedPath || undefined,
        onProgress: (percent) => {
          setDownloadStates(prev => ({
            ...prev,
            [key]: {
              ...(prev[key] ?? { downloading: true, progress: 0, error: null }),
              progress: percent,
            },
          }));
        },
      });

      if (result.success) {
        setDownloadStates(prev => ({
          ...prev,
          [key]: {
            ...(prev[key] ?? { downloading: true, progress: 0, error: null }),
            progress: 100,
            error: null,
          },
        }));
        setSyncMessage('✅ Audio descargado');
        setShowToast(true);
        await loadAudioInventory();
      } else {
        const error = result.error || 'Error desconocido';
        setDownloadStates(prev => ({
          ...prev,
          [key]: {
            ...(prev[key] ?? { downloading: true, progress: 0 }),
            error,
          },
        }));
        setSyncMessage(`❌ Error descargando audio: ${error}`);
        setShowToast(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDownloadStates(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] ?? { downloading: true, progress: 0 }),
          error: message,
        },
      }));
      setSyncMessage(`❌ Error descargando audio: ${message}`);
      setShowToast(true);
    } finally {
      setDownloadStates(prev => ({
        ...prev,
        [key]: {
          ...(prev[key] ?? { progress: 0, error: null }),
          downloading: false,
        },
      }));
    }
  }

  async function handleDownloadMissingAudios() {
    if (!audioInventory || bulkDownloading) return;

    const itemsToDownload = audioInventory.items.filter(
      item => (item.status === 'pending' || item.status === 'corrupted') && item.audio_url
    );

    if (itemsToDownload.length === 0) {
      setSyncMessage('✅ No hay audios faltantes para descargar');
      setShowToast(true);
      return;
    }

    setBulkDownloading(true);
    setBulkProgress({ done: 0, total: itemsToDownload.length });

    try {
      for (let index = 0; index < itemsToDownload.length; index++) {
        await handleDownloadAudioItem(itemsToDownload[index]);
        setBulkProgress({ done: index + 1, total: itemsToDownload.length });
      }

      await loadAudioInventory();
      await loadBirdOfflineInventory();
      setSyncMessage(`✅ Descarga de faltantes completada: ${itemsToDownload.length}/${itemsToDownload.length}`);
      setShowToast(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSyncMessage(`❌ Error descargando faltantes: ${message}`);
      setShowToast(true);
    } finally {
      setBulkDownloading(false);
    }
  }

  async function handleDownloadImageItem(item: ImageInventoryItem) {
    if (!item.image_url) {
      setSyncMessage('❌ Esta imagen no tiene URL de descarga');
      setShowToast(true);
      return;
    }

    const itemKey = `${item.table}-${item.id}`;
    setDownloadingImageId(itemKey);
    setImageDownloadProgress(0);

    try {
      const result = await mediaCacheService.downloadImageItem(item.image_url, {
        destPath: item.expectedPath || undefined,
        onProgress: setImageDownloadProgress,
      });

      if (result.success) {
        setSyncMessage('✅ Imagen descargada');
      } else {
        setSyncMessage(`❌ Error descargando imagen: ${result.error || 'Error desconocido'}`);
      }

      setShowToast(true);
      const inventory = await mediaCacheService.getImageDownloadInventory();
      setImageInventory(inventory);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSyncMessage(`❌ Error descargando imagen: ${message}`);
      setShowToast(true);
    } finally {
      setDownloadingImageId(null);
      setImageDownloadProgress(0);
    }
  }

  async function handleDownloadMissingImages() {
    if (!imageInventory || downloadingMissingImages) return;

    const itemsToDownload = imageInventory.items.filter(
      item => (item.status === 'pending' || item.status === 'corrupted') && item.image_url
    );

    if (itemsToDownload.length === 0) {
      setSyncMessage('No hay imágenes pendientes');
      setShowToast(true);
      return;
    }

    setDownloadingMissingImages(true);
    setImageDownloadProgress(0);

    let success = 0;
    let fail = 0;
    const total = itemsToDownload.length;

    try {
      for (let index = 0; index < total; index++) {
        const item = itemsToDownload[index];
        const result = await mediaCacheService.downloadImageItem(item.image_url!, {
          destPath: item.expectedPath || undefined,
        });

        if (result.success) {
          success++;
        } else {
          fail++;
        }

        setImageDownloadProgress(Math.round(((index + 1) / total) * 100));
      }

      const inventory = await mediaCacheService.getImageDownloadInventory();
      setImageInventory(inventory);
      await loadBirdOfflineInventory();
      setSyncMessage(`Imágenes descargadas: ${success}/${total}`);
      setShowToast(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSyncMessage(`❌ Error descargando imágenes: ${message}`);
      setShowToast(true);
    } finally {
      if (fail > 0) {
        console.warn(`[SyncCenter] Imágenes fallidas: ${fail}/${total}`);
      }
      setDownloadingMissingImages(false);
      setImageDownloadProgress(0);
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Monitor de Descargas</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          paddingTop: '20px',
          paddingBottom: '100px'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            margin: '0 0 8px 0',
            textAlign: 'center'
          }}>
            Monitor de Descargas
          </h2>
          
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            textAlign: 'center',
            margin: '0 0 16px 0'
          }}>
            {inventoryLoading || imageInventoryLoading || localDataLoading || birdOfflineLoading ? 'Revisando...' : 'Sincronizado'}
          </p>

          {/* Estado de datos */}
          {localDataSummary && (
            <IonCard>
              <IonCardContent>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Estado de datos
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  <IonBadge color="primary">Aves: {localDataSummary.birds}</IonBadge>
                  <IonBadge color="primary">Imágenes: {localDataSummary.bird_images}</IonBadge>
                  <IonBadge color="secondary">Cantos: {localDataSummary.sings}</IonBadge>
                  <IonBadge color="secondary">Tracks: {localDataSummary.tracks}</IonBadge>
                  <IonBadge color="secondary">Entrevistas: {localDataSummary.interviews}</IonBadge>
                  <IonBadge color="tertiary">Músicos: {localDataSummary.musicians}</IonBadge>
                  <IonBadge color="success">Total audio: {localDataSummary.total_audio}</IonBadge>
                </div>

                <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                  Último sync global:{' '}
                  {localDataSummary.last_sync.global
                    ? new Date(localDataSummary.last_sync.global).toLocaleString()
                    : 'Sin sincronizar'}
                </p>
              </IonCardContent>
            </IonCard>
          )}

          {/* Estado por ave */}
          {birdOfflineInventory && (
            <IonCard>
              <IonCardContent>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Estado por ave
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  <IonBadge color="primary">Total: {birdOfflineInventory.total}</IonBadge>
                  <IonBadge color="success">Completas: {birdOfflineInventory.complete}</IonBadge>
                  <IonBadge color="warning">Pendientes: {birdOfflineInventory.partial}</IonBadge>
                </div>

                {(() => {
                  const incompleteBirds = birdOfflineInventory.items
                    .filter(item => !item.isComplete)
                    .slice(0, 10);

                  return incompleteBirds.length > 0 ? (
                    <IonList>
                      {incompleteBirds.map((item) => (
                        <IonItem key={item.bird_id}>
                          <IonLabel>
                            <h3>{item.name}</h3>
                            {item.scientific_name && (
                              <p style={{ fontStyle: 'italic' }}>{item.scientific_name}</p>
                            )}
                            <p>
                              Imágenes: {item.imageDownloaded} / {item.imageTotal}
                            </p>
                            <p>
                              Audios: {item.audioDownloaded} / {item.audioTotal}
                            </p>
                          </IonLabel>
                          <IonBadge slot="end" color={item.isComplete ? 'success' : 'warning'}>
                            {item.isComplete ? 'Completa' : 'Pendiente'}
                          </IonBadge>
                        </IonItem>
                      ))}
                    </IonList>
                  ) : (
                    <p style={{ fontSize: '16px', color: '#4caf50', margin: 0, textAlign: 'center' }}>
                      ✅ Todas las aves están completas
                    </p>
                  );
                })()}
              </IonCardContent>
            </IonCard>
          )}

          {/* Resumen de audios */}
          {audioInventory && (
            <>
              <IonCard>
                <IonCardContent>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                    Resumen de Audios
                  </h3>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    <IonBadge color="primary">Total: {audioInventory.total}</IonBadge>
                    <IonBadge color="success">Descargados: {audioInventory.downloaded}</IonBadge>
                    <IonBadge color="warning">Pendientes: {audioInventory.pending}</IonBadge>
                    <IonBadge color="medium">Sin URL: {audioInventory.no_url}</IonBadge>
                    <IonBadge color="danger">Corruptos: {audioInventory.corrupted}</IonBadge>
                  </div>
                  
                  <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>
                    Tamaño total: {audioInventory.totalSizeMB.toFixed(2)} MB
                  </p>
                  
                  <IonProgressBar 
                    value={audioInventory.total > 0 ? audioInventory.downloaded / audioInventory.total : 0}
                    style={{ height: '8px', borderRadius: '4px' }}
                  />
                  
                  <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0', textAlign: 'center' }}>
                    {audioInventory.downloaded} / {audioInventory.total} audios descargados
                  </p>

                  <IonButton
                    expand="block"
                    color="success"
                    onClick={handleDownloadMissingAudios}
                    disabled={bulkDownloading || inventoryLoading || !audioInventory}
                    style={{ height: '48px', marginTop: '16px' }}
                  >
                    {bulkDownloading
                      ? `Descargando ${bulkProgress.done}/${bulkProgress.total}...`
                      : 'Descargar audios faltantes'}
                  </IonButton>

                  {bulkDownloading && (
                    <IonProgressBar
                      value={bulkProgress.total > 0 ? bulkProgress.done / bulkProgress.total : 0}
                      style={{ height: '8px', borderRadius: '4px', marginTop: '8px' }}
                    />
                  )}
                </IonCardContent>
              </IonCard>

              {/* Lista de items con problemas */}
              {(() => {
                const problemItems = audioInventory.items
                  .filter(item => item.status === 'pending' || item.status === 'corrupted')
                  .slice(0, 10);
                
                return problemItems.length > 0 ? (
                  <IonCard>
                    <IonCardContent>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
                        Audios Pendientes o Corruptos ({problemItems.length})
                      </h3>
                      
                      <IonList>
                        {problemItems.map((item, index) => {
                          const key = getItemKey(item);
                          const state = downloadStates[key];
                          const downloading = !!state?.downloading;
                          const progress = state?.progress ?? 0;

                          return (
                            <IonItem key={`${key}-${index}`}>
                              <IonLabel>
                                <h3>{item.title || 'Sin título'}</h3>
                                <p>
                                  <IonBadge color="medium" style={{ marginRight: '4px' }}>
                                    {item.table}
                                  </IonBadge>
                                  <IonBadge color={item.status === 'corrupted' ? 'danger' : 'warning'}>
                                    {item.status === 'corrupted' ? 'Corrupto' : 'Pendiente'}
                                  </IonBadge>
                                </p>

                                {downloading && (
                                  <IonProgressBar
                                    value={progress / 100}
                                    style={{ height: '6px', borderRadius: '4px', marginTop: '8px' }}
                                  />
                                )}

                                {state?.error && (
                                  <p style={{ fontSize: '12px', color: '#d32f2f', marginTop: '6px' }}>
                                    {state.error}
                                  </p>
                                )}
                              </IonLabel>

                              <IonButton
                                slot="end"
                                size="small"
                                color={item.status === 'corrupted' ? 'danger' : 'warning'}
                                disabled={downloading}
                                onClick={() => handleDownloadAudioItem(item)}
                              >
                                {downloading ? 'Descargando...' : 'Descargar'}
                              </IonButton>
                            </IonItem>
                          );
                        })}
                      </IonList>
                    </IonCardContent>
                  </IonCard>
                ) : (
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '24px' }}>
                      <p style={{ fontSize: '16px', color: '#4caf50', margin: 0 }}>
                        ✅ Todos los audios están descargados correctamente
                      </p>
                    </IonCardContent>
                  </IonCard>
                );
              })()}
            </>
          )}

          {/* Resumen de imágenes */}
          {imageInventory && (
            <>
              <IonCard>
                <IonCardContent>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                    Resumen de Imágenes
                  </h3>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    <IonBadge color="primary">Total: {imageInventory.total}</IonBadge>
                    <IonBadge color="success">Descargadas: {imageInventory.downloaded}</IonBadge>
                    <IonBadge color="warning">Pendientes: {imageInventory.pending}</IonBadge>
                    <IonBadge color="medium">Sin URL: {imageInventory.no_url}</IonBadge>
                    <IonBadge color="danger">Corruptas: {imageInventory.corrupted}</IonBadge>
                  </div>
                  
                  <p style={{ fontSize: '14px', color: '#666', margin: '0 0 8px 0' }}>
                    Tamaño total: {imageInventory.totalSizeMB.toFixed(2)} MB
                  </p>
                  
                  <IonProgressBar 
                    value={imageInventory.total > 0 ? imageInventory.downloaded / imageInventory.total : 0}
                    style={{ height: '8px', borderRadius: '4px' }}
                  />
                  
                  <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0', textAlign: 'center' }}>
                    {imageInventory.downloaded} / {imageInventory.total} imágenes descargadas
                  </p>

                  <IonButton
                    expand="block"
                    color="success"
                    onClick={handleDownloadMissingImages}
                    disabled={
                      !imageInventory ||
                      downloadingMissingImages ||
                      !imageInventory.items.some(item => (item.status === 'pending' || item.status === 'corrupted') && item.image_url)
                    }
                    style={{ height: '48px', marginTop: '16px' }}
                  >
                    {downloadingMissingImages ? 'Descargando imágenes...' : 'Descargar imágenes faltantes'}
                  </IonButton>

                  {(downloadingMissingImages || downloadingImageId) && (
                    <>
                      <IonProgressBar
                        value={imageDownloadProgress / 100}
                        style={{ height: '8px', borderRadius: '4px', marginTop: '8px' }}
                      />
                      <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0', textAlign: 'center' }}>
                        {imageDownloadProgress}%
                      </p>
                    </>
                  )}
                </IonCardContent>
              </IonCard>

              {(() => {
                const problemItems = imageInventory.items
                  .filter(item => item.status === 'pending' || item.status === 'corrupted')
                  .slice(0, 10);
                
                return problemItems.length > 0 ? (
                  <IonCard>
                    <IonCardContent>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
                        Imágenes Pendientes o Corruptas ({problemItems.length})
                      </h3>
                      
                      <IonList>
                        {problemItems.map((item, index) => {
                          const itemKey = `${item.table}-${item.id}`;
                          const downloading = downloadingImageId === itemKey;

                          return (
                            <IonItem key={`${itemKey}-${index}`}>
                              <IonLabel>
                                <h3>{item.title || item.id}</h3>
                                <p>
                                  <IonBadge color="medium" style={{ marginRight: '4px' }}>
                                    {item.table}
                                  </IonBadge>
                                  <IonBadge color={item.status === 'corrupted' ? 'danger' : 'warning'}>
                                    {item.status === 'corrupted' ? 'Corrupta' : 'Pendiente'}
                                  </IonBadge>
                                </p>
                              </IonLabel>

                              <IonButton
                                slot="end"
                                size="small"
                                color={item.status === 'corrupted' ? 'danger' : 'warning'}
                                disabled={downloadingMissingImages || downloading}
                                onClick={() => handleDownloadImageItem(item)}
                              >
                                {downloading ? 'Descargando...' : 'Descargar'}
                              </IonButton>
                            </IonItem>
                          );
                        })}
                      </IonList>
                    </IonCardContent>
                  </IonCard>
                ) : (
                  <IonCard>
                    <IonCardContent style={{ textAlign: 'center', padding: '24px' }}>
                      <p style={{ fontSize: '16px', color: '#4caf50', margin: 0 }}>
                        ✅ Todas las imágenes están descargadas correctamente
                      </p>
                    </IonCardContent>
                  </IonCard>
                );
              })()}
            </>
          )}

          {/* Botón Verificar estado */}
          <div style={{ marginBottom: '8px' }}>
            <IonButton 
              expand="block" 
              color="warning" 
              onClick={handleCheckAudioInventory}
              disabled={inventoryLoading || imageInventoryLoading || localDataLoading || birdOfflineLoading}
              style={{ height: '48px' }}
            >
              {inventoryLoading || imageInventoryLoading || localDataLoading || birdOfflineLoading ? <IonSpinner name="crescent" /> : 'Verificar estado'}
            </IonButton>
            <p style={{ 
              fontSize: '14px', 
              color: '#666', 
              textAlign: 'center',
              margin: '8px 0 0 0'
            }}>
              Actualiza el estado de las descargas
            </p>
          </div>

          {/* Opciones avanzadas */}
          <details style={{
            marginBottom: '8px',
            padding: '16px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <summary style={{ fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
              Opciones avanzadas
            </summary>

            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <IonButton 
                expand="block" 
                onClick={handleSync} 
                disabled={isSyncing}
                style={{ height: '48px' }}
              >
                {isSyncing ? <IonSpinner name="crescent" /> : 'Sync rápido'}
              </IonButton>
              <p style={{ 
                fontSize: '14px', 
                color: '#666', 
                textAlign: 'center',
                margin: '8px 0 0 0'
              }}>
                Actualiza cambios nuevos desde Supabase.
              </p>
            </div>

            <div>
              <IonButton 
                expand="block" 
                color="danger" 
                onClick={handleResync} 
                disabled={isResyncing}
                style={{ height: '48px' }}
              >
                {isResyncing ? <IonSpinner name="crescent" /> : 'Resync completo'}
              </IonButton>
              <p style={{ 
                fontSize: '14px', 
                color: '#666', 
                textAlign: 'center',
                margin: '8px 0 0 0'
              }}>
                Recrea los datos locales desde cero. Úsalo solo si algo no coincide.
              </p>
            </div>
          </details>

          {/* Información adicional */}
          <div style={{ 
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              margin: '0 0 8px 0',
              color: '#495057'
            }}>
              ℹ️ Información
            </h3>
            <ul style={{ 
              fontSize: '14px', 
              color: '#666', 
              margin: '0',
              paddingLeft: '20px'
            }}>
              <li><strong>Verificar audios:</strong> Revisa el estado de todos los audios descargados</li>
              <li><strong>Sync rápido:</strong> Sincroniza cambios nuevos desde el servidor</li>
              <li><strong>Resync completo:</strong> Descarga todos los datos desde cero</li>
              <li>Los audios se descargan automáticamente al reproducirlos</li>
            </ul>
          </div>
        </div>

        {/* Toast para mostrar mensajes */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={syncMessage}
          duration={3000}
          position="top"
        />
      </IonContent>
    </IonPage>
  );
}
