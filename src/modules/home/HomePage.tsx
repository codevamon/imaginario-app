// src/modules/home/HomePage.tsx
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSearchbar, IonSpinner,
  IonToast, IonChip, IonText, IonRefresher, IonRefresherContent
} from '@ionic/react';
import { Network } from '@capacitor/network';
import { filter, refresh } from 'ionicons/icons';
import { useEffect, useRef, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { pullAllTables, resyncAllTables, CATALOG_SYNC_COMPLETE_EVENT, CATALOG_SYNC_FINISHED_EVENT, getCatalogBootstrapState } from '../../core/sync/pull';
import { listBirds, type Bird } from '../../core/db/dao/birds';
import { getTracksByBirdId, type Track } from '../../core/db/dao/tracks';
import { getAllSings, type Sing } from '../../core/db/dao/sings';

import SliderWidget from './widgets/SliderWidget';
import WelcomeWidget from './widgets/WelcomeWidget';
import TracksWidget from './widgets/TracksWidget';
import SingsWidget from './widgets/SingsWidget';
import 'swiper/css';
import AboutWidget from './widgets/AboutWidget';
import ContactWidget from '../../ui/ContactWidget';

export default function HomePage() {
  const router = useIonRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [featured, setFeatured] = useState<Bird[]>([]);
  const [popular, setPopular] = useState<Bird[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [sings, setSings] = useState<Sing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const refreshInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const bootstrapFinishedRef = useRef(false);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    const onCatalogSyncComplete = () => {
      void loadData({ showLoading: false });
    };

    const onCatalogSyncFinished = (event: Event) => {
      const success = (event as CustomEvent<{ success?: boolean }>).detail?.success === true;
      bootstrapFinishedRef.current = true;
      void (async () => {
        try {
          if (success) {
            await loadData({ showLoading: false });
          }
        } finally {
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      })();
    };

    window.addEventListener(CATALOG_SYNC_COMPLETE_EVENT, onCatalogSyncComplete);
    window.addEventListener(CATALOG_SYNC_FINISHED_EVENT, onCatalogSyncFinished);

    void (async () => {
      await loadData();

      const bootstrap = getCatalogBootstrapState();
      if (!mountedRef.current) return;

      if (bootstrap.finished) {
        bootstrapFinishedRef.current = true;
        if (bootstrap.success) {
          await loadData({ showLoading: false });
        }
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      window.removeEventListener(CATALOG_SYNC_COMPLETE_EVENT, onCatalogSyncComplete);
      window.removeEventListener(CATALOG_SYNC_FINISHED_EVENT, onCatalogSyncFinished);
    };
  }, []);

  function goDiscover(q?: string) {
    router.push(`/discover${q ? `?q=${encodeURIComponent(q)}` : ''}`);
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
      if (result?.success) {
        setSyncMessage(`✅ Sincronización exitosa: ${result.totalRecords ?? 0} registros actualizados`);
        await loadData();
      } else {
        setSyncMessage(`❌ Error en sincronización: ${Array.isArray(result?.errors) ? result.errors.join(', ') : 'error'}`);
      }
    } catch (error) {
      console.error('[HomePage] Error en sincronización:', error);
      setSyncMessage(`❌ Error crítico: ${String(error)}`);
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
      await loadData();
    } catch (err) {
      console.error('[HomePage] Error en resync:', err);
      setSyncMessage(`❌ Error en resync: ${String(err)}`);
    } finally {
      setIsResyncing(false);
    }
  }

  async function handleRefresh(event: CustomEvent) {
    const complete = () => {
      event.detail?.complete?.();
      console.log('[HomeRefresh] complete');
    };

    if (refreshInFlightRef.current) {
      complete();
      return;
    }

    refreshInFlightRef.current = true;
    console.log('[HomeRefresh] start');

    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        console.log('[HomeRefresh] offline - keeping local content');
        setSyncMessage('Sin conexión. Mostrando contenido guardado.');
        setShowToast(true);
        return;
      }

      await pullAllTables();
      console.log('[HomeRefresh] sync complete');
      await loadData({ showLoading: false });
      console.log('[HomeRefresh] local data reloaded');
      setSyncMessage('Contenido actualizado');
      setShowToast(true);
    } catch (error) {
      console.error('[HomeRefresh] failed');
      setSyncMessage('No se pudo actualizar. Mostrando contenido guardado.');
      setShowToast(true);
    } finally {
      refreshInFlightRef.current = false;
      complete();
    }
  }

  // --- nueva util: adjunta la primera imagen encontrada en bird_images (si existe DAO)
  const attachFirstImages = async (birds: Bird[]) => {
    if (!Array.isArray(birds) || birds.length === 0) return birds;
    try {
      // intento dinamico para evitar romper build si dao no existe
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const imagesDao = require('../../core/db/dao/bird_images');
      if (!imagesDao) return birds;

      const fnGet = imagesDao.getImagesByBirdId || imagesDao.listImagesByBirdId || imagesDao.listByBirdId;
      if (typeof fnGet !== 'function') return birds;
      
      console.log('[HomePage] attachFirstImages used function:', fnGet.name || 'anonymous');

      // parallel fetch - prudente: map + Promise.all
      await Promise.all(birds.map(async (b) => {
        try {
          if (b.image_url) return; // ya tiene
          const imgs = await fnGet(b.id);
          if (Array.isArray(imgs) && imgs.length > 0) {
            // algunos DAOs devuelven objetos con 'url' o 'path'
            const first = imgs[0];
            const url = first.url || first.path || first.image_url;
            if (url) {
              b.image_url = url;
              console.log('[HomePage] bird.image_url after attach', b.id, b.image_url);
            }
          }
        } catch (err) {
          // no interrumpir la carga si falla uno
          // console.warn('[HomePage] attachFirstImages item failed', b.id, err);
        }
      }));
    } catch (err) {
      // DAO no existente o error: silent fallback
      // console.warn('[HomePage] bird_images DAO not available', err);
    }
    return birds;
  };

  async function loadData(options?: { showLoading?: boolean }) {
    const showLoading = options?.showLoading ?? true;
    const generation = ++loadGenerationRef.current;
    let hasLocalCatalog = false;
    try {
      if (showLoading) {
        setLoading(true);
      }
      console.log('[HomePage] Cargando datos desde SQLite (offline-first)...');

      // trae aves desde DAO (offline-first)
      const [featuredBirds, popularBirds] = await Promise.all([
        listBirds({ order: 'updated_at' }),
        listBirds({ popularity: 'desc', order: 'name' })
      ]);

      if (!mountedRef.current || generation !== loadGenerationRef.current) return;

      // adjuntar la primera imagen de bird_images cuando exista
      const [fWithImages, pWithImages] = await Promise.all([
        attachFirstImages(Array.isArray(featuredBirds) ? featuredBirds : []),
        attachFirstImages(Array.isArray(popularBirds) ? popularBirds : [])
      ]);

      if (!mountedRef.current || generation !== loadGenerationRef.current) return;

      hasLocalCatalog = (fWithImages || []).length > 0;

      setFeatured((fWithImages || []).slice(0, 8));
      setPopular((pWithImages || []).slice(0, 8));
      
      // Cargar tracks de muestra — 3 aleatorios globales seguros
      let sampleTracks: Track[] = [];

      try {
        // Escanear hasta los primeros 6 pájaros destacados para obtener variedad
        const birdsToScan = fWithImages.slice(0, 6);

        const results = await Promise.all(
          birdsToScan.map(b => getTracksByBirdId(b.id))
        );

        const allTracks = results.flat().filter(Boolean);

        // Si no hay tracks, cae a array vacío de forma segura
        const randomized = allTracks.sort(() => Math.random() - 0.5);

        sampleTracks = randomized.slice(0, 3); // máximo 3

      } catch (err) {
        console.warn('[HomePage] Error cargando tracks globales:', err);
      }

      if (!mountedRef.current || generation !== loadGenerationRef.current) return;

      setTracks(sampleTracks);
      
      // Cargar sings de muestra
      try {
        const s = await getAllSings();
        console.warn('[home] cargados', s.length, 'sings');
        if (!mountedRef.current || generation !== loadGenerationRef.current) return;
        setSings(s);
      } catch (err) {
        console.warn('[HomePage] no se pudieron traer sings', err);
        if (!mountedRef.current || generation !== loadGenerationRef.current) return;
        setSings([]);
      }
      
      console.log('[HomePage] ✅ Datos cargados desde SQLite local (con imágenes adjuntas)');
    } catch (error) {
      console.error('[HomePage] ❌ Error cargando datos desde SQLite:', error);
      if (!mountedRef.current || generation !== loadGenerationRef.current) return;
      if (showLoading) {
        setFeatured([]);
        setPopular([]);
      } else {
        throw error;
      }
    } finally {
      if (showLoading && mountedRef.current && generation === loadGenerationRef.current) {
        if (hasLocalCatalog || bootstrapFinishedRef.current) {
          setLoading(false);
        }
      }
    }
  }

  const getRarityColor = (rarity: number | null | undefined): string => {
    if (rarity === null || rarity === undefined) return 'medium';
    if (rarity === 0) return 'success';
    if (rarity === 1) return 'warning';
    if (rarity === 2) return 'danger';
    if (rarity === 3) return 'dark';
    return 'medium';
  };

  const getRarityText = (rarity: number | null | undefined): string => {
    if (rarity === null || rarity === undefined) return 'No especificada';
    if (rarity === 0) return 'Baja';
    if (rarity === 1) return 'Media';
    if (rarity === 2) return 'Alta';
    if (rarity === 3) return 'Muy alta';
    return 'No especificada';
  };

  return (
    <IonPage>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon="arrow-down-circle-outline"
            refreshingSpinner="crescent"
            pullingText="Desliza para actualizar"
            refreshingText="Actualizando..."
          />
        </IonRefresher>

        <WelcomeWidget />

        {/* saludo y search omitted for brevity — usa tu markup anterior */}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', flexDirection: 'column', gap: '16px' }}>
            <IonSpinner />
            <IonText>Cargando aves...</IonText>
          </div>
        ) : (
          <>
            <SliderWidget items={featured} title="Guía de Aves" onItemClick={(id: string) => router.push(`/bird/${id}`)} />
            <SingsWidget
              items={sings}
              title="Explora los sonidos"
              onItemClick={(id: string) => console.log('play sing', id)}
            />
            <TracksWidget
              items={tracks}
              title="Explorar por su música"
              onItemClick={(id: string) => console.log('play track', id)}
            />
            <AboutWidget />

            {/* Contact section */}
            <section style={{ marginTop: '5vw', marginBottom: '10vw' }}>
              <ContactWidget />
            </section>
          </>
        )}

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={syncMessage} duration={3000} position="top" />
      </IonContent>
    </IonPage>
  );
}
