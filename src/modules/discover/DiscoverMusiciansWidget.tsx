// src/modules/discover/DiscoverMusiciansWidget.tsx
import React, { useEffect, useState } from 'react';
import { IonList, IonItem, IonLabel, IonText } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { listMusicians, type Musician } from '../../core/db/dao/musicians';

type Props = {
  searchTerm?: string;
  orderFilter?: 'name' | 'updated_at';
  rarityFilter?: number;
  popularityFilter?: 'asc' | 'desc';
};

const DiscoverMusiciansWidget: React.FC<Props> = ({ 
  searchTerm = '', 
  orderFilter = 'name', 
  rarityFilter, 
  popularityFilter 
}) => {
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useIonRouter();

  useEffect(() => {
    const loadMusicians = async () => {
      try {
        setLoading(true);
        console.log('[DiscoverMusiciansWidget] Cargando músicos con filtros:', {
          search: searchTerm,
          order: orderFilter
        });
        
        const musiciansData = await listMusicians({
          search: searchTerm,
          order: orderFilter
        });
        
        setMusicians(musiciansData);
        console.log('[DiscoverMusiciansWidget] ✅ Músicos cargados:', musiciansData.length);
      } catch (error) {
        console.error('[DiscoverMusiciansWidget] ❌ Error cargando músicos:', error);
        setMusicians([]);
      } finally {
        setLoading(false);
      }
    };

    loadMusicians();
  }, [searchTerm, orderFilter]);

  const handleMusicianClick = (musicianId: string) => {
    // Por ahora solo log, pero podrías navegar a una página de detalle del músico
    console.log('Musician clicked:', musicianId);
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
        <IonText>Cargando músicos...</IonText>
      </div>
    );
  }

  if (musicians.length === 0) {
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
          {searchTerm ? 'No se encontraron músicos con ese término' : 'No hay músicos disponibles'}
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
        Músicos ({musicians.length})
      </h2>
      
      <IonList>
        {musicians.map((musician) => (
          <IonItem 
            key={musician.id} 
            button 
            onClick={() => handleMusicianClick(musician.id)}
            style={{ '--padding-start': '16px' }}
          >
            <IonLabel>
              <h2 style={{ fontWeight: '600', marginBottom: '4px' }}>
                {musician.name}
              </h2>
              {musician.bio && (
                <p style={{ 
                  fontSize: '14px', 
                  color: '#666',
                  marginBottom: '4px'
                }}>
                  {musician.bio.length > 100 
                    ? `${musician.bio.substring(0, 100)}...` 
                    : musician.bio
                  }
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <IonText style={{ fontSize: '12px', color: '#666' }}>
                  ID: {musician.bird_id}
                </IonText>
              </div>
            </IonLabel>
          </IonItem>
        ))}
      </IonList>
    </section>
  );
};

export default DiscoverMusiciansWidget;
