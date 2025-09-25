import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSearchbar, IonItem, IonList,
  IonSpinner, IonToast, IonChip, IonText, IonRefresher, IonRefresherContent
} from '@ionic/react';
import { filter, refresh } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { supabase } from '../../core/supabase';
import { pullAllTables, resyncAllTables } from '../../core/sync/pull';
import { listBirds, type Bird } from '../../core/db/dao/birds';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

export default function HomePage() {
  const router = useIonRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [featured, setFeatured] = useState<Bird[]>([]);
  const [popular, setPopular] = useState<Bird[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  function goDiscover(q?: string) {
    router.push(`/discover${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }

  async function handleSync() {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncMessage('Sincronizando datos...');
    setShowToast(true); // Solo mostrar toast en sincronización manual
    
    try {
      const result = await pullAllTables();
      
      if (result.success) {
        setSyncMessage(`✅ Sincronización exitosa: ${result.totalRecords} registros actualizados`);
        // Recargar datos después de la sincronización
        await loadData();
      } else {
        setSyncMessage(`❌ Error en sincronización: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('[HomePage] Error en sincronización:', error);
      setSyncMessage(`❌ Error crítico: ${error}`);
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
      await loadData();
    } catch (err) {
      console.error('[HomePage] Error en resync:', err);
      setSyncMessage(`❌ Error en resync: ${err}`);
    } finally {
      setIsResyncing(false);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      console.log('[HomePage] Cargando datos desde SQLite (offline-first)...');
      
      // Cargar desde SQLite local (offline-first)
      const [featuredBirds, popularBirds] = await Promise.all([
        listBirds({ order: 'updated_at' }),
        listBirds({ popularity: 'desc', order: 'name' })
      ]);
      
      setFeatured(featuredBirds.slice(0, 8));
      setPopular(popularBirds.slice(0, 8));
      console.log('[HomePage] ✅ Datos cargados desde SQLite local');
    } catch (error) {
      console.error('[HomePage] ❌ Error cargando datos desde SQLite:', error);
      setFeatured([]);
      setPopular([]);
    } finally {
      setLoading(false);
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
      <IonHeader collapse="fade">
        <IonToolbar>
          <IonTitle>Home</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? <IonSpinner name="crescent" /> : <IonIcon icon={refresh} />}
            </IonButton>
            <IonButton onClick={handleResync} disabled={isResyncing}>
              {isResyncing ? <IonSpinner name="crescent" /> : 'Resync'}
            </IonButton>
            <IonButton onClick={() => setFiltersOpen(v => !v)}>
              <IonIcon icon={filter} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={async (e) => {
          await handleResync();
          e.detail.complete();
        }}>
          <IonRefresherContent
            pullingIcon="arrow-down-circle-outline"
            refreshingSpinner="crescent"
            pullingText="Desliza para resync completo"
            refreshingText="Sincronizando..."
          />
        </IonRefresher>
        
        {/* Saludo */}
        <div style={{ padding: '12px 16px', fontSize: 22, fontWeight: 700 }}>
          Te damos la bienvenida 👋
        </div>

        {/* Búsqueda → Discover */}
        <div style={{ padding: '0 12px 8px' }}>
          <IonSearchbar
            placeholder="Buscar aves"
            onIonFocus={() => goDiscover()}
            onIonChange={(e) => { /* opcional: podríamos prefetch */ }}
            onKeyUp={(e: any) => { if (e.key === 'Enter') goDiscover(e.target.value); }}
          />
          {filtersOpen && (
            <div className="filters-collapse" style={{ padding: '8px 4px' }}>
              <div className="chip-row">
                <button className="chip">Rareza: baja</button>
                <button className="chip">Rareza: media</button>
                <button className="chip">Orden: popularidad</button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <IonSpinner />
            <IonText>Cargando aves...</IonText>
          </div>
        ) : (
          <>
            {/* Featured Birds (Novedades) */}
            <div style={{ padding: '0 16px 8px' }}>
              <IonTitle style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                Favoritos de la semana
              </IonTitle>
            </div>
            
            {featured.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <IonText color="medium">No hay aves disponibles</IonText>
              </div>
            ) : (
              <div style={{ padding: '0 8px 24px' }}>
                <Swiper slidesPerView={1.2} spaceBetween={12} freeMode>
                  {featured.map((bird) => (
                    <SwiperSlide key={bird.id}>
                      <div 
                        style={{
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          overflow: 'hidden',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                        onClick={() => router.push(`/bird/${bird.id}`)}
                      >
                        {/* Imagen */}
                        <div style={{ 
                          width: '100%', 
                          height: '180px', 
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {bird.image_url ? (
                            <img 
                              src={bird.image_url} 
                              alt={bird.name}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              height: '100%',
                              backgroundColor: '#f0f0f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '48px'
                            }}>
                              🐦
                            </div>
                          )}
                          
                          {/* Chip de rareza */}
                          <div style={{ 
                            position: 'absolute', 
                            top: '8px', 
                            right: '8px' 
                          }}>
                            <IonChip color={getRarityColor(bird.rarity)}>
                              {getRarityText(bird.rarity)}
                            </IonChip>
                          </div>
                        </div>
                        
                        {/* Contenido */}
                        <div style={{ padding: '12px' }}>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: '16px',
                            marginBottom: '4px'
                          }}>
                            {bird.name}
                          </div>
                          {bird.scientific_name && (
                            <div style={{ 
                              fontSize: '14px', 
                              fontStyle: 'italic',
                              color: '#666'
                            }}>
                              {bird.scientific_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}

            {/* Popular Birds */}
            <div style={{ padding: '0 16px 8px' }}>
              <IonTitle style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                Aves populares
              </IonTitle>
            </div>
            
            {popular.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <IonText color="medium">No hay aves disponibles</IonText>
              </div>
            ) : (
              <div style={{ padding: '0 8px 24px' }}>
                <Swiper slidesPerView={1.2} spaceBetween={12} freeMode>
                  {popular.map((bird) => (
                    <SwiperSlide key={bird.id}>
                      <div 
                        style={{
                          borderRadius: '12px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          overflow: 'hidden',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                        onClick={() => router.push(`/bird/${bird.id}`)}
                      >
                        {/* Imagen */}
                        <div style={{ 
                          width: '100%', 
                          height: '180px', 
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          {bird.image_url ? (
                            <img 
                              src={bird.image_url} 
                              alt={bird.name}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              height: '100%',
                              backgroundColor: '#f0f0f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '48px'
                            }}>
                              🐦
                            </div>
                          )}
                          
                          {/* Chip de rareza */}
                          <div style={{ 
                            position: 'absolute', 
                            top: '8px', 
                            right: '8px' 
                          }}>
                            <IonChip color={getRarityColor(bird.rarity)}>
                              {getRarityText(bird.rarity)}
                            </IonChip>
                          </div>
                        </div>
                        
                        {/* Contenido */}
                        <div style={{ padding: '12px' }}>
                          <div style={{ 
                            fontWeight: '600', 
                            fontSize: '16px',
                            marginBottom: '4px'
                          }}>
                            {bird.name}
                          </div>
                          {bird.scientific_name && (
                            <div style={{ 
                              fontSize: '14px', 
                              fontStyle: 'italic',
                              color: '#666'
                            }}>
                              {bird.scientific_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </>
        )}

        {/* Toast para mostrar mensajes de sincronización */}
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
