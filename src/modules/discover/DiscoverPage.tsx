import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonPage
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';

// Importar los widgets
import SearchWidget from './widgets/SearchWidget';
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
  const [viewMode, setViewMode] = useState<'list' | 'carousel'>('list');
  
  // Estados para filtros
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>('name');
  const [popularityFilter, setPopularityFilter] = useState<string | null>(null);

  // Manejar parámetros URL para enfoque automático y filtros
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldFocus = params.get('focus') === 'search';

    if (shouldFocus) {
      // El SearchWidget manejará el auto-focus
      console.log('[DiscoverPage] Auto-focus habilitado para búsqueda');
    }

    const filter = params.get('filter');
    if (filter === 'tracks') {
      console.log('[DiscoverPage] Filtro de tracks aplicado');
    } else if (filter === 'sings') {
      console.log('[DiscoverPage] Filtro de sings aplicado');
    }
  }, [location]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSubmitSearch = () => {
    console.log('[DiscoverPage] Búsqueda enviada:', searchTerm);
  };

  const handleRarityChange = (value: string | null) => {
    setRarityFilter(value);
  };

  const handleOrderChange = (value: string | null) => {
    setOrderFilter(value || 'name');
  };

  const handlePopularityChange = (value: string | null) => {
    setPopularityFilter(value);
  };

  return (
    <IonPage>
      <IonContent>
        <SearchWidget
          title="Discover"
          subtitle="Explora la diversidad de aves"
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          onSubmitSearch={handleSubmitSearch}
          filters={{
            rarity: rarityFilter,
            onChangeRarity: handleRarityChange,
            order: orderFilter,
            onChangeOrder: handleOrderChange,
            popularity: popularityFilter,
            onChangePopularity: handlePopularityChange,
            open: filtersOpen,
            setOpen: setFiltersOpen
          }}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode(viewMode === 'list' ? 'carousel' : 'list')}
          autoFocusSearch={location.search.includes('focus=search')}
        />

        {/* Widgets de contenido */}
        <DiscoverBirdsWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter as 'name' | 'updated_at'}
          rarityFilter={rarityFilter ? parseInt(rarityFilter) : undefined}
          popularityFilter={popularityFilter as 'asc' | 'desc' | undefined}
          viewMode={viewMode}
        />
        
        {/* <DiscoverSingsWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter as 'name' | 'updated_at'}
          rarityFilter={rarityFilter ? parseInt(rarityFilter) : undefined}
          popularityFilter={popularityFilter as 'asc' | 'desc' | undefined}
        />
        
        <DiscoverTracksWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter as 'name' | 'updated_at'}
          rarityFilter={rarityFilter ? parseInt(rarityFilter) : undefined}
          popularityFilter={popularityFilter as 'asc' | 'desc' | undefined}
        />
        
        <DiscoverMusiciansWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter as 'name' | 'updated_at'}
          rarityFilter={rarityFilter ? parseInt(rarityFilter) : undefined}
          popularityFilter={popularityFilter as 'asc' | 'desc' | undefined}
        />
        
        <DiscoverInterviewsWidget 
          searchTerm={searchTerm}
          orderFilter={orderFilter as 'name' | 'updated_at'}
          rarityFilter={rarityFilter ? parseInt(rarityFilter) : undefined}
          popularityFilter={popularityFilter as 'asc' | 'desc' | undefined}
        /> */}
      </IonContent>
    </IonPage>
  );
};

export default DiscoverPage;