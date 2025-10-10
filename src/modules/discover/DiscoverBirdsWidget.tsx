// src/modules/discover/DiscoverBirdsWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonThumbnail, IonChip, IonText } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { listBirds, type Bird } from '../../core/db/dao/birds';

type Props = {
  searchTerm?: string;
  orderFilter?: 'name' | 'updated_at';
  rarityFilter?: number;
  popularityFilter?: 'asc' | 'desc';
};

const DiscoverBirdsWidget: React.FC<Props> = ({ 
  searchTerm = '', 
  orderFilter = 'name', 
  rarityFilter, 
  popularityFilter 
}) => {
  const [birds, setBirds] = useState<Bird[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useIonRouter();

  useEffect(() => {
    const loadBirds = async () => {
      try {
        setLoading(true);
        console.log('[DiscoverBirdsWidget] Cargando aves con filtros:', {
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
        console.log('[DiscoverBirdsWidget] ✅ Aves cargadas:', birdsData.length);
      } catch (error) {
        console.error('[DiscoverBirdsWidget] ❌ Error cargando aves:', error);
        setBirds([]);
      } finally {
        setLoading(false);
      }
    };

    loadBirds();
  }, [searchTerm, orderFilter, rarityFilter, popularityFilter]);

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

  if (loading) {
    return (
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
    );
  }

  if (birds.length === 0) {
    return (
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
    );
  }

  return (
    <section style={{ marginBottom: '24px' }}>
      <h2 style={{ 
        fontSize: '20px', 
        fontWeight: '600', 
        marginBottom: '16px',
        padding: '0 16px'
      }}>
        Aves ({birds.length})
      </h2>
      
      <IonList>
        {birds.map((bird) => (
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
    </section>
  );
};

export default DiscoverBirdsWidget;
