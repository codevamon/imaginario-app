// src/modules/discover/widgets/SearchWidget.tsx
import React, { useEffect, useRef } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { search as searchIcon, filter, list, grid } from 'ionicons/icons';
import './SearchWidget.css';

type Props = {
  title?: string;
  subtitle?: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSubmitSearch?: () => void;
  filters: {
    rarity: string | null;
    onChangeRarity: (value: string | null) => void;
    order: string | null;
    onChangeOrder: (value: string | null) => void;
    popularity: string | null;
    onChangePopularity: (value: string | null) => void;
    open: boolean;
    setOpen: (value: boolean) => void;
  };
  viewMode: 'list' | 'carousel';
  onToggleViewMode: () => void;
  autoFocusSearch?: boolean;
};

const SearchWidget: React.FC<Props> = ({
  title = 'Discover',
  subtitle = 'Explora la diversidad de aves',
  searchTerm,
  onSearchChange,
  onSubmitSearch,
  filters,
  viewMode,
  onToggleViewMode,
  autoFocusSearch = false
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusSearch && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [autoFocusSearch]);

  const handleSearchSubmit = () => {
    onSubmitSearch?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  return (
    <section className="search-widget-i">
      <div className="search-widget-header">
        <div className="search-widget-title">
          <h1 className="h1-i _rgl primary-i">{title}</h1>
          <p className="p1-ii _rgl primary-i">{subtitle}</p>
        </div>
      </div>

      <div className="search-widget-controls">
        <div className="search-pill" role="search" aria-label="Buscar aves">
          <div className="search-icon primary-i">
            <IonIcon icon={searchIcon} />
          </div>
          <input
            ref={searchInputRef}
            className="search-input p1-ii _lgt primary-i"
            placeholder="Busca un ave..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="search-widget-buttons">
          <IonButton 
            fill="clear" 
            onClick={onToggleViewMode}
            className="search-widget-button"
            aria-label={`Cambiar a vista ${viewMode === 'list' ? 'carrusel' : 'lista'}`}
          >
            <IonIcon icon={viewMode === 'list' ? grid : list} />
          </IonButton>
          
          <IonButton 
            fill="clear" 
            onClick={() => filters.setOpen(!filters.open)}
            className="search-widget-button"
            aria-label="Abrir filtros"
          >
            <IonIcon icon={filter} />
          </IonButton>
        </div>
      </div>

      {/* Filtros inline */}
      {filters.open && (
        <div className="search-widget-filters">
          <div className="filter-group">
            <label className="filter-label">Rareza</label>
            <select 
              value={filters.rarity || ''} 
              onChange={(e) => filters.onChangeRarity(e.target.value || null)}
              className="filter-select"
            >
              <option value="">Todas</option>
              <option value="0">Baja</option>
              <option value="1">Media</option>
              <option value="2">Alta</option>
              <option value="3">Muy alta</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Orden</label>
            <select 
              value={filters.order || 'name'} 
              onChange={(e) => filters.onChangeOrder(e.target.value)}
              className="filter-select"
            >
              <option value="name">Nombre</option>
              <option value="updated_at">Fecha</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Popularidad</label>
            <select 
              value={filters.popularity || ''} 
              onChange={(e) => filters.onChangePopularity(e.target.value || null)}
              className="filter-select"
            >
              <option value="">Todas</option>
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
        </div>
      )}
    </section>
  );
};

export default SearchWidget;
