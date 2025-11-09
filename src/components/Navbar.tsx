import React, { useEffect, useState, useRef } from 'react';
import { IonButton, IonToast } from '@ionic/react';
import { Network } from '@capacitor/network';
import { PluginListenerHandle } from '@capacitor/core';
import { useAudioVerification } from '../core/hooks/useAudioVerification';

const DEBUG = import.meta.env.VITE_DEBUG_CACHE === 'true';

export const Navbar: React.FC = () => {
  // 🔍 Dónde se invoca useAudioVerification()
  const { progress, running, startVerification } = useAudioVerification();
  const [isOnline, setIsOnline] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const previousRunningRef = useRef(false);
  const previousMissingRef = useRef(0);

  // Verificar estado de conexión
  useEffect(() => {
    let listenerHandle: PluginListenerHandle | null = null;

    const checkNetwork = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
    };

    checkNetwork();

    (async () => {
      listenerHandle = await Network.addListener('networkStatusChange', (status) => {
        setIsOnline(status.connected);
      });
    })();

    return () => {
      (async () => {
        if (listenerHandle) {
          await listenerHandle.remove();
        }
      })();
    };
  }, []);

  // Detectar cuando finaliza la verificación y mostrar toast
  useEffect(() => {
    if (previousRunningRef.current && !running) {
      // La verificación acaba de finalizar
      if (progress.missing === 0) {
        setToastMessage('✅ Todo disponible offline');
      } else {
        setToastMessage(`⚠️ ${progress.missing} audios faltantes`);
      }
      setShowToast(true);
    }
    previousRunningRef.current = running;
  }, [running, progress.missing]);

  // 🔍 Condiciones que pueden ocultar el botón:
  // - Si no hay internet (isOnline === false) Y no está en modo DEBUG
  // - El componente retorna null si shouldShowButton es false
  const shouldShowButton = isOnline || DEBUG;
  const verifiedCount = progress.completed || 0;
  const totalCount = progress.total || 0;

  // Si no hay botón pero hay datos de verificación, mostrar solo el indicador
  if (!shouldShowButton) {
    if (totalCount > 0) {
      return (
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#999', 
          padding: '8px',
          textAlign: 'right'
        }}>
          {verifiedCount}/{totalCount} audios verificados
        </div>
      );
    }
    return null;
  }

  // 🔍 Dónde se renderiza el navbar (botón de verificación)
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
        <IonButton
          color="medium"
          fill="clear"
          disabled={running}
          onClick={startVerification}
          style={{ fontSize: '0.9rem' }}
        >
          {running ? `Verificando ${progress.checked}/${progress.total}` : 'Verificar audios'}
        </IonButton>
        
        {totalCount > 0 && (
          <div className="text-xs text-gray-400" style={{ 
            fontSize: '0.75rem', 
            color: '#999', 
            marginLeft: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {verifiedCount}/{totalCount} audios verificados
          </div>
        )}
      </div>

      {running && (
        <div
          style={{
            height: '3px',
            background: '#999',
            width: `${progress.total > 0 ? (progress.checked / progress.total) * 100 : 0}%`,
            transition: 'width 0.3s',
          }}
        />
      )}

      <IonToast
        isOpen={showToast}
        onDidDismiss={() => setShowToast(false)}
        message={toastMessage}
        duration={3000}
        position="top"
      />
    </>
  );
};

export default Navbar;

// 🔎 DIAGNÓSTICO:
// - Hook useAudioVerification: presente (línea 11)
// - Botón visible: sí, condicionalmente (líneas 86-94)
// - Indicador de estado: presente (líneas 96-105) - muestra verifiedCount/totalCount
// - Render condicional: sí (línea 66: if (!shouldShowButton) return null o solo indicador)
// - Componente exportado: Navbar (export default Navbar, línea 130)
// - Condiciones de visibilidad: 
//   * isOnline === true (hay conexión a internet)
//   * DEBUG === true (modo desarrollo con VITE_DEBUG_CACHE='true')
// - El hook SIEMPRE se monta, pero el botón puede estar oculto si no hay internet y no está en modo DEBUG
// - ✅ Componente importado y renderizado en App.tsx (línea 39 y 282)
//   * Se renderiza globalmente en todas las páginas como navbar fijo en la parte superior
//   * El componente AppNavbar.tsx es diferente (para descargas iniciales, no verificación de audios)
// - Indicador de estado: Muestra "X/Y audios verificados" siempre que totalCount > 0

