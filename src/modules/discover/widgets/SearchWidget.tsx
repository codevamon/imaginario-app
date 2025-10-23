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
          <h1 className="h1-i _rgl primary-i">Guía de Aves</h1>
          <p className="p2-ii _lgt primary-i">Consulta las especies registradas.</p>
        </div>
        <div className="search-widget-buttons">
        <IonButton 
          fill="clear" 
          onClick={onToggleViewMode}
          className="search-widget-button"
          aria-label={`Cambiar a vista ${viewMode === 'list' ? 'carrusel' : 'lista'}`}
        >
          {viewMode === 'list' ? (
            // Icono de Sliders (para cambiar a carrusel)
            <svg width="31" height="24" viewBox="0 0 31 24" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M22.1225 0.5H8.58335C7.57561 0.5 6.75867 1.28113 6.75867 2.24471V20.9829C6.75867 21.9465 7.57561 22.7276 8.58335 22.7276H22.1225C23.1303 22.7276 23.9472 21.9465 23.9472 20.9829V2.24471C23.9472 1.28113 23.1303 0.5 22.1225 0.5Z" stroke="#0A3731" strokeMiterlimit="10" strokeLinecap="round"/>
              <path d="M27.0674 2.99494V19.8663" stroke="#0A3731" strokeMiterlimit="10" strokeLinecap="round"/>
              <path d="M30.1876 5.36775V17.4063" stroke="#0A3731" strokeMiterlimit="10" strokeLinecap="round"/>
              <path d="M3.62021 19.8663V2.99494" stroke="#0A3731" strokeMiterlimit="10" strokeLinecap="round"/>
              <path d="M0.5 17.4935V5.45499" stroke="#0A3731" strokeMiterlimit="10" strokeLinecap="round"/>
            </svg>
          ) : (
            // Icono de Lista (para cambiar a lista)
            <svg width="27" height="20" viewBox="0 0 27 20" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M5.65422 1.32282H26.1899" stroke="#0A3731" strokeMiterlimit="10" strokeLinecap="round"/>
              <path d="M1.36291 2.64565C2.11562 2.64565 2.72582 2.0534 2.72582 1.32282C2.72582 0.592248 2.11562 0 1.36291 0C0.610195 0 0 0.592248 0 1.32282C0 2.0534 0.610195 2.64565 1.36291 2.64565Z" fill="#0E3336"/>
              <path d="M5.65422 10.1178H26.1899" stroke="#0A3731" strokeMiterlimit="10" strokeLinecap="round"/>
              <path d="M1.36291 11.4406C2.11562 11.4406 2.72582 10.8484 2.72582 10.1178C2.72582 9.38723 2.11562 8.79498 1.36291 8.79498C0.610195 8.79498 0 9.38723 0 10.1178C0 10.8484 0.610195 11.4406 1.36291 11.4406Z" fill="#0E3336"/>
              <path d="M5.65422 18.5731H26.1899" stroke="#0A3731" strokeMiterlimit="10" strokeLinecap="round"/>
              <path d="M1.36291 19.896C2.11562 19.896 2.72582 19.3037 2.72582 18.5731C2.72582 17.8426 2.11562 17.2503 1.36291 17.2503C0.610195 17.2503 0 17.8426 0 18.5731C0 19.3037 0.610195 19.896 1.36291 19.896Z" fill="#0E3336"/>
            </svg>
          )}
        </IonButton>
        {/* 
          <IonButton 
            fill="clear" 
            onClick={() => filters.setOpen(!filters.open)}
            className="search-widget-button"
            aria-label="Abrir filtros"
          >
            <IonIcon icon={filter} />
          </IonButton> */}
        </div>
      </div>

      <div className="search-widget-controls">
        <div className="search-pill" role="search" aria-label="Busca un ave...">
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
