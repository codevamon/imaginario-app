  import { IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
  import React, { useEffect, useState } from 'react';
  import { createImagDemo, listImaginarios } from '../core/db/dao';

  type Imag = { id: string; title: string; body?: string; tags?: string; updated_at: number; created_at: number; deleted_at?: number | null; };

  const Tab1: React.FC = () => {
    const [items, setItems] = useState<Imag[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const rows = await listImaginarios(100);
        setItems(rows as Imag[]);
      } catch (e:any) {
        console.error(e);
        setErr(e?.message || 'Error cargando datos locales');
      } finally {
        setLoading(false);
      }
    }

    async function addDemo() {
      setLoading(true);
      setErr(null);
      try {
        await createImagDemo();
        await load();
      } catch (e:any) {
        console.error(e);
        setErr(e?.message || 'Error creando demo');
      } finally {
        setLoading(false);
      }
    }

    useEffect(() => { load(); }, []);

    return (
      <IonPage>
        <IonHeader><IonToolbar><IonTitle>Feed (offline)</IonTitle></IonToolbar></IonHeader>
        <IonContent fullscreen>
          <div style={{ padding: 12 }}>
           <IonButton onClick={addDemo} /*disabled={loading}*/>Crear demo</IonButton>
            {err && <div style={{color:'red', marginTop:8}}>{err}</div>}
            
            {/* debug visual */}
            <div style={{color:'#999', marginTop:8}}>
              loading: {String(loading)}{err ? ` | error: ${err}` : ''}
            </div>
          </div>
          <IonList>
            {items.map(it => (
              <IonItem key={it.id} lines="full">
                <IonLabel>
                  <h2>{it.title}</h2>
                  <p>{it.body}</p>
                  <small>Actualizado: {new Date(it.updated_at).toLocaleString()}</small>
                </IonLabel>
              </IonItem>
            ))}
            {!items.length && !loading && !err && (
              <IonItem><IonLabel>Sin imaginarios. Toca “Crear demo”.</IonLabel></IonItem>
            )}
          </IonList>
        </IonContent>
      </IonPage>
    );
  };

  export default Tab1;