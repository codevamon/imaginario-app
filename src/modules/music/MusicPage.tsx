import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonText
} from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { useLocation } from 'react-router-dom';

// Importar los widgets reutilizables
import SearchWidget from '../discover/widgets/SearchWidget';
import TracksWidget from '../home/widgets/TracksWidget';
import { listTracks, type Track } from '../../core/db/dao/tracks';
import './MusicPage.css';

const MusicPage: React.FC = () => {
  const router = useIonRouter();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Estados para filtros de instrumentos
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  
  // Estados para filtros adicionales (manteniendo compatibilidad con SearchWidget)
  const [orderFilter, setOrderFilter] = useState<string>('name');
  
  // Estados para tracks
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar tracks con filtros aplicados
  useEffect(() => {
    const loadTracks = async () => {
      try {
        setLoading(true);
        console.log('[MusicPage] Cargando pistas con filtros:', {
          search: searchTerm,
          order: orderFilter === 'name' ? 'title' : 'updated_at',
          instruments: selectedInstruments
        });
        
        const tracksData = await listTracks({
          search: searchTerm,
          order: orderFilter === 'name' ? 'title' : 'updated_at',
          instruments: selectedInstruments.length > 0 ? selectedInstruments : undefined
        });
        
        setTracks(tracksData);
        console.log('[MusicPage] ✅ Pistas cargadas:', tracksData.length);
      } catch (error) {
        console.error('[MusicPage] ❌ Error cargando pistas:', error);
        setTracks([]);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, [searchTerm, orderFilter, selectedInstruments]);

  // Extraer instrumentos únicos de todos los tracks al cargar
  useEffect(() => {
    const loadInstruments = async () => {
      try {
        const allTracks = await listTracks();
        const instrumentsSet = new Set<string>();
        
        allTracks.forEach(track => {
          if (track.instruments) {
            // Dividir por comas y limpiar espacios
            const instruments = track.instruments.split(',').map(i => i.trim()).filter(i => i);
            instruments.forEach(inst => instrumentsSet.add(inst));
          }
        });
        
        const sortedInstruments = Array.from(instrumentsSet).sort();
        setAvailableInstruments(sortedInstruments);
        console.log('[MusicPage] Instrumentos disponibles:', sortedInstruments);
      } catch (error) {
        console.error('[MusicPage] Error cargando instrumentos:', error);
      }
    };

    loadInstruments();
  }, []);

  // Manejar parámetros URL para enfoque automático
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldFocus = params.get('focus') === 'search';

    if (shouldFocus) {
      console.log('[MusicPage] Auto-focus habilitado para búsqueda');
    }
  }, [location]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleSubmitSearch = () => {
    console.log('[MusicPage] Búsqueda enviada:', searchTerm);
  };

  const handleOrderChange = (value: string | null) => {
    setOrderFilter(value || 'name');
  };

  const handleToggleInstrument = (instrument: string) => {
    setSelectedInstruments(prev => {
      if (prev.includes(instrument)) {
        return prev.filter(i => i !== instrument);
      } else {
        return [...prev, instrument];
      }
    });
  };

  const handleClearInstruments = () => {
    setSelectedInstruments([]);
  };

  return (
    <IonPage>
      <IonContent>
        <section className="music-search-widget-i">
          <SearchWidget
              title="Explora los cantos"
              subtitle="Escucha e identifica las aves con melodías, cantos e instrumentos"
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onSubmitSearch={handleSubmitSearch}
              filters={{
                rarity: null,
                onChangeRarity: () => {},
                order: orderFilter,
                onChangeOrder: handleOrderChange,
                popularity: null,
                onChangePopularity: () => {},
                open: filtersOpen,
                setOpen: setFiltersOpen
              }}
              viewMode="list"
              onToggleViewMode={() => {}}
              autoFocusSearch={location.search.includes('focus=search')}
            />

            {/* Sección de filtros por instrumentos */}
            {availableInstruments.length > 0 && (
              <section className="instruments-filter-section">
                <div className="instruments-filter-header">
                  <h3 className="l1-i _mdm black-i">Instrumentos</h3>
                  {selectedInstruments.length > 0 && (
                    <button 
                      className="clear-filters-button p2-ii _lgt primary-i"
                      onClick={handleClearInstruments}
                    >
                      Limpiar ({selectedInstruments.length})
                    </button>
                  )}
                </div>
                
                <div className="instruments-pills-container">
                  {availableInstruments.map(instrument => (
                    <label 
                      key={instrument} 
                      className={`instrument-pill ${selectedInstruments.includes(instrument) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="instrument-checkbox"
                        checked={selectedInstruments.includes(instrument)}
                        onChange={() => handleToggleInstrument(instrument)}
                      />
                      <span className="instrument-pill-text p2-ii _lgt">
                        {instrument}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Widget de tracks con filtros aplicados */}
            {loading ? (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '200px',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <IonText>Cargando pistas...</IonText>
              </div>
            ) : (
              <TracksWidget
                items={tracks}
                title="Cantos y Melodías"
                showViewMore={false}
                maxItems={Infinity}
              />
            )}
        </section>
        
      </IonContent>
    </IonPage>
  );
};

export default MusicPage;

