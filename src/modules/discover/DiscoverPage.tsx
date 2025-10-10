import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonText,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { filter } from 'ionicons/icons';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';

// Importar los nuevos widgets
import DiscoverBirdsWidget from './DiscoverBirdsWidget';
import DiscoverSingsWidget from './DiscoverSingsWidget';
import DiscoverTracksWidget from './DiscoverTracksWidget';
import DiscoverMusiciansWidget from './DiscoverMusiciansWidget';
import DiscoverInterviewsWidget from './DiscoverInterviewsWidget';

const DiscoverPage: React.FC = () => {
  const router = useIonRouter();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Estados para filtros
  const [rarityFilter, setRarityFilter] = useState<number | undefined>(undefined);
  const [orderFilter, setOrderFilter] = useState<'name' | 'updated_at'>('name');
  const [popularityFilter, setPopularityFilter] = useState<'asc' | 'desc' | undefined>(undefined);

  // Manejar parámetros URL para enfoque automático y filtros
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldFocus = params.get('focus') === 'search';
    const filter = params.get('filter');

    if (shouldFocus) {
      const searchInput = document.querySelector('ion-searchbar input') as HTMLInputElement;
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 100);
      }
    }

    if (filter === 'tracks') {
      // Aquí podrías agregar lógica específica para tracks si es necesario
      console.log('[DiscoverPage] Filtro de tracks aplicado');
    } else if (filter === 'sings') {
      // Aquí podrías agregar lógica específica para sings si es necesario
      console.log('[DiscoverPage] Filtro de sings aplicado');
    }
  }, [location]);


  const handleSearchChange = (event: CustomEvent) => {
    setSearchTerm(event.detail.value || '');
  };

  const getRarityText = (rarity: number | null | undefined): string => {
    if (rarity === null || rarity === undefined) return 'No especificada';
    if (rarity === 0) return 'Baja';
    if (rarity === 1) return 'Media';
    if (rarity === 2) return 'Alta';
    if (rarity === 3) return 'Muy alta';
    return 'No especificada';
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
            placeholder="Buscar aves, cantos, pistas, músicos..."
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

        {/* Widgets de contenido */}
        <DiscoverBirdsWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter}
          rarityFilter={rarityFilter}
          popularityFilter={popularityFilter}
        />
        
        <DiscoverSingsWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter}
          rarityFilter={rarityFilter}
          popularityFilter={popularityFilter}
        />
        
        <DiscoverTracksWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter}
          rarityFilter={rarityFilter}
          popularityFilter={popularityFilter}
        />
        
        <DiscoverMusiciansWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter}
          rarityFilter={rarityFilter}
          popularityFilter={popularityFilter}
        />
        
        <DiscoverInterviewsWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter}
          rarityFilter={rarityFilter}
          popularityFilter={popularityFilter}
        />
      </IonContent>
    </IonPage>
  );
};

export default DiscoverPage;