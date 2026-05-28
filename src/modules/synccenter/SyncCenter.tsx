import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonSpinner, IonToast, IonCard, IonCardContent,
  IonProgressBar, IonBadge, IonList, IonItem, IonLabel
} from '@ionic/react';
import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { pullAllTables, resyncAllTables } from '../../core/sync/pull';
import { mediaCacheService, type AudioInventorySummary } from '../../core/cache/mediaCacheService';

export default function SyncCenter() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [audioInventory, setAudioInventory] = useState<AudioInventorySummary | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Cargar inventario al montar el componente
  useEffect(() => {
    loadAudioInventory();
  }, []);

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
      setSyncMessage('✅ Resync completo terminado');
    } catch (error) {
      console.error('[SyncCenter] Error en resync completo:', error);
      setSyncMessage(`❌ Error en resync completo: ${error}`);
    } finally {
      setIsResyncing(false);
    }
  }

  async function handleCheckAudioInventory() {
    console.log('[SyncCenter] 🔍 Ejecutando inventario de audios...');
    
    setInventoryLoading(true);
    try {
      const inventory = await mediaCacheService.getAudioDownloadInventory();
      setAudioInventory(inventory);
      
      // Log del resumen
      console.log('[SyncCenter] 📊 Resumen de audios:', {
        total: inventory.total,
        downloaded: inventory.downloaded,
        pending: inventory.pending,
        no_url: inventory.no_url,
        corrupted: inventory.corrupted,
        totalSizeMB: inventory.totalSizeMB
      });
      
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
      
      setSyncMessage(`✅ Inventario actualizado: ${inventory.downloaded}/${inventory.total} descargados`);
      setShowToast(true);
    } catch (error) {
      console.error('[SyncCenter] Error al obtener inventario de audios:', error);
      setSyncMessage(`❌ Error al verificar audios: ${error}`);
      setShowToast(true);
    } finally {
      setInventoryLoading(false);
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
            {inventoryLoading ? 'Revisando...' : 'Sincronizado'}
          </p>

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
                        {problemItems.map((item, index) => (
                          <IonItem key={`${item.table}-${item.id}-${index}`}>
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
                            </IonLabel>
                          </IonItem>
                        ))}
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

          {/* Botón Verificar audios */}
          <div style={{ marginBottom: '8px' }}>
            <IonButton 
              expand="block" 
              color="warning" 
              onClick={handleCheckAudioInventory}
              disabled={inventoryLoading}
              style={{ height: '48px' }}
            >
              {inventoryLoading ? <IonSpinner name="crescent" /> : 'Verificar audios descargados'}
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

          {/* Botón Sync rápido */}
          <div style={{ marginBottom: '8px' }}>
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
              Sincroniza solo los cambios nuevos
            </p>
          </div>

          {/* Botón Resync completo */}
          <div style={{ marginBottom: '8px' }}>
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
              Descarga todos los datos desde cero
            </p>
          </div>

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
