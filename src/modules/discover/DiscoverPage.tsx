import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonButtons,
  IonButton,
  IonIcon,
  IonChip,
  IonText,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { filter, search } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { listBirds, type Bird } from '../../core/db/dao/birds';

const DiscoverPage: React.FC = () => {
  const router = useIonRouter();
  const [birds, setBirds] = useState<Bird[]>([]);
  const [filteredBirds, setFilteredBirds] = useState<Bird[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Nuevos estados para filtros
  const [rarityFilter, setRarityFilter] = useState<number | undefined>(undefined);
  const [orderFilter, setOrderFilter] = useState<'name' | 'updated_at'>('name');
  const [popularityFilter, setPopularityFilter] = useState<'asc' | 'desc' | undefined>(undefined);

  // Hook de carga con filtros
  useEffect(() => {
    const loadBirdsWithFilters = async () => {
      try {
        setLoading(true);
        console.log('[DiscoverPage] Cargando aves con filtros:', {
          search: searchTerm,
          rarity: rarityFilter,
          order: orderFilter,
          popularity: popularityFilter
        });
        
        const birdsData = await listBirds({
          search: searchTerm,
          rarity: rarityFilter,
          order: orderFilter,
          popularity: popularityFilter
        });
        
        setBirds(birdsData);
        setFilteredBirds(birdsData);
        console.log('[DiscoverPage] ✅ Aves cargadas:', birdsData.length);
      } catch (error) {
        console.error('[DiscoverPage] ❌ Error cargando aves:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBirdsWithFilters();
  }, [searchTerm, rarityFilter, orderFilter, popularityFilter]);

  const handleSearchChange = (event: CustomEvent) => {
    setSearchTerm(event.detail.value || '');
  };

  const handleBirdClick = (birdId: string) => {
    router.push(`/bird/${birdId}`);
  };

  const getRarityText = (rarity: number | null | undefined): string => {
    if (rarity === null || rarity === undefined) return 'No especificada';
    if (rarity === 0) return 'Baja';
    if (rarity === 1) return 'Media';
    if (rarity === 2) return 'Alta';
    if (rarity === 3) return 'Muy alta';
    return 'No especificada';
  };

  const getRarityColor = (rarity: number | null | undefined): string => {
    if (rarity === null || rarity === undefined) return 'medium';
    if (rarity === 0) return 'success';
    if (rarity === 1) return 'warning';
    if (rarity === 2) return 'danger';
    if (rarity === 3) return 'dark';
    return 'medium';
  };

  // Funciones helper para los filtros
  const getRarityFilterText = (): string => {
    if (rarityFilter === undefined) return 'Todas';
    return getRarityText(rarityFilter);
  };

  const getPopularityFilterText = (): string => {
    if (popularityFilter === undefined) return 'Todas';
    if (popularityFilter === 'asc') return 'Ascendente';
    if (popularityFilter === 'desc') return 'Descendente';
    return 'Todas';
  };

  const getOrderFilterText = (): string => {
    if (orderFilter === 'name') return 'Nombre';
    if (orderFilter === 'updated_at') return 'Fecha';
    return 'Nombre';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Discover</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setFiltersOpen(!filtersOpen)}>
              <IonIcon icon={filter} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Barra de búsqueda */}
        <div style={{ padding: '8px 16px' }}>
          <IonSearchbar
            placeholder="Buscar aves por nombre o científico..."
            value={searchTerm}
            onIonInput={handleSearchChange}
            showClearButton="focus"
          />
        </div>

        {/* Filtros dinámicos */}
        {filtersOpen && (
          <div style={{ padding: '16px', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Filtro de Rareza */}
              <div>
                <IonLabel style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Rareza: {getRarityFilterText()}
                </IonLabel>
                <IonSelect
                  value={rarityFilter}
                  placeholder="Seleccionar rareza"
                  onIonChange={(e) => setRarityFilter(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value={undefined}>Todas</IonSelectOption>
                  <IonSelectOption value={0}>Baja</IonSelectOption>
                  <IonSelectOption value={1}>Media</IonSelectOption>
                  <IonSelectOption value={2}>Alta</IonSelectOption>
                  <IonSelectOption value={3}>Muy alta</IonSelectOption>
                </IonSelect>
              </div>

              {/* Filtro de Popularidad */}
              <div>
                <IonLabel style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Popularidad: {getPopularityFilterText()}
                </IonLabel>
                <IonSelect
                  value={popularityFilter}
                  placeholder="Seleccionar popularidad"
                  onIonChange={(e) => setPopularityFilter(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value={undefined}>Todas</IonSelectOption>
                  <IonSelectOption value="asc">Ascendente</IonSelectOption>
                  <IonSelectOption value="desc">Descendente</IonSelectOption>
                </IonSelect>
              </div>

              {/* Filtro de Orden */}
              <div>
                <IonLabel style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>
                  Orden: {getOrderFilterText()}
                </IonLabel>
                <IonSelect
                  value={orderFilter}
                  placeholder="Seleccionar orden"
                  onIonChange={(e) => setOrderFilter(e.detail.value)}
                  interface="popover"
                >
                  <IonSelectOption value="name">Nombre</IonSelectOption>
                  <IonSelectOption value="updated_at">Fecha</IonSelectOption>
                </IonSelect>
              </div>
            </div>
          </div>
        )}

        {/* Lista de aves */}
        {loading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <IonText>Cargando aves...</IonText>
          </div>
        ) : filteredBirds.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px'
          }}>
            <IonText color="medium">
              {searchTerm ? 'No se encontraron aves con ese término' : 'No hay aves disponibles'}
            </IonText>
          </div>
        ) : (
          <IonList>
            {filteredBirds.map((bird) => (
              <IonItem 
                key={bird.id} 
                button 
                onClick={() => handleBirdClick(bird.id)}
                style={{ '--padding-start': '16px' }}
              >
                <IonThumbnail slot="start" style={{ width: '60px', height: '60px' }}>
                  {bird.image_url ? (
                    <img 
                      src={bird.image_url} 
                      alt={bird.name}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        borderRadius: '8px'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#f0f0f0',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px'
                    }}>
                      🐦
                    </div>
                  )}
                </IonThumbnail>
                
                <IonLabel>
                  <h2 style={{ fontWeight: '600', marginBottom: '4px' }}>
                    {bird.name}
                  </h2>
                  {bird.scientific_name && (
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#666', 
                      fontStyle: 'italic',
                      marginBottom: '4px'
                    }}>
                      {bird.scientific_name}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <IonChip 
                      color={getRarityColor(Number(bird.rarity) || 0)} 
                      className="chip-small"
                    >
                      <IonLabel>{getRarityText(Number(bird.rarity) || 0)}</IonLabel>
                    </IonChip>
                    {bird.popularity && (
                      <IonText style={{ fontSize: '12px', color: '#666' }}>
                        Popularidad: {bird.popularity}
                      </IonText>
                    )}
                  </div>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}

        {/* Información de resultados */}
        {!loading && filteredBirds.length > 0 && (
          <div style={{ 
            padding: '16px', 
            textAlign: 'center',
            borderTop: '1px solid #eee'
          }}>
            <IonText color="medium" style={{ fontSize: '14px' }}>
              Mostrando {filteredBirds.length} aves
            </IonText>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DiscoverPage;