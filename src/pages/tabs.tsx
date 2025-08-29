import { IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import React, { useEffect, useState } from 'react';
import { listBirds, isFavLocal } from '../core/db/dao.catalog';
import { pullBirdsDelta } from '../core/sync/pull';
import { toggleFavorite } from '../core/api/favorites';
import { heart, heartOutline } from 'ionicons/icons';

type Bird = { id:string; name:string; description?:string; rarity?:number; popularity?:number; tags?:string; image_url?:string; updated_at:number; deleted_at?:number|null };

const Tab1: React.FC = () => {
  const [items, setItems] = useState<Bird[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [favMap, setFavMap] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true); setErr(null);
    try {
      const rows = await listBirds(200);
      const flags: Record<string, boolean> = {};
      for (const b of rows) flags[b.id] = await isFavLocal(b.id);
      setFavMap(flags);
      setItems(rows as Bird[]);
    } catch (e:any) { console.error(e); setErr(e?.message || 'Error cargando aves'); }
    finally { setLoading(false); }
  }

  async function syncNow() {
    setLoading(true); setErr(null);
    try {
      const n = await pullBirdsDelta();
      console.log('[sync] birds pulled:', n);
      await load();
    } catch (e:any) { console.error(e); setErr(e?.message || 'Error de sync'); }
    finally { setLoading(false); }
  }

  async function onToggleFav(id: string) {
    try {
      const res = await toggleFavorite(id);
      const on = !!res?.added && !res?.removed ? true : res?.removed ? false : !favMap[id];
      setFavMap(prev => ({ ...prev, [id]: on }));
    } catch (e:any) { console.error(e); setErr(e?.message || 'Error al marcar favorito'); }
  }

  useEffect(() => { load(); }, []);

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Aves (offline-first)</IonTitle></IonToolbar></IonHeader>
      <IonContent fullscreen>
        <div style={{ padding: 12, display:'flex', gap:8 }}>
          <IonButton onClick={syncNow} disabled={loading}>Sync ahora</IonButton>
        </div>
        {err && <div style={{color:'red', margin:12}}>{err}</div>}
        <IonList>
          {items.map(b => (
            <IonItem key={b.id} lines="full">
              <IonLabel>
                <h2>{b.name}</h2>
                <p>{b.description}</p>
                <small>Actualizado: {new Date(b.updated_at).toLocaleString()}</small>
              </IonLabel>
              <IonButton slot="end" fill="clear" onClick={() => onToggleFav(b.id)}>
                <IonIcon icon={favMap[b.id] ? heart : heartOutline} />
              </IonButton>
            </IonItem>
          ))}
          {!items.length && !loading && !err && (
            <IonItem><IonLabel>No hay aves aún. Toca “Sync ahora”.</IonLabel></IonItem>
          )}
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
