import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonSpinner, IonToast
} from '@ionic/react';
import { useState } from 'react';
import { pullAllTables, resyncAllTables } from '../../core/sync/pull';

export default function SyncCenter() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  async function handleSync() {
    if (isSyncing) return;
    
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

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Sync Center</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          paddingTop: '20px'
        }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: '700', 
            margin: '0 0 8px 0',
            textAlign: 'center'
          }}>
            Centro de Sincronización
          </h2>
          
          <p style={{ 
            fontSize: '16px', 
            color: '#666', 
            textAlign: 'center',
            margin: '0 0 32px 0'
          }}>
            Gestiona la sincronización de datos con el servidor
          </p>

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
            marginTop: '32px',
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
              <li><strong>Sync rápido:</strong> Solo descarga cambios nuevos desde la última sincronización</li>
              <li><strong>Resync completo:</strong> Descarga todos los datos desde cero, útil para resolver problemas</li>
              <li>Ambas operaciones requieren conexión a internet</li>
              <li>Los datos se almacenan localmente para uso offline</li>
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
