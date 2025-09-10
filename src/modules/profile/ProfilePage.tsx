import React, { useEffect, useState } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonText,
  IonSpinner,
  IonChip
} from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { useIonRouter } from '@ionic/react';
import { getDb } from '../../core/sqlite';
import { listBirds, type Bird } from '../../core/db/dao/birds';

type FavoriteBird = {
  id: string;
  bird_id: string;
  updated_at: number;
  bird?: Bird;
};

const ProfilePage: React.FC = () => {
  const router = useIonRouter();
  const [deviceId, setDeviceId] = useState<string>('');
  const [favorites, setFavorites] = useState<FavoriteBird[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar device_id y favoritos
  useEffect(() => {
    const loadProfileData = async () => {
      try {
        console.log('[ProfilePage] Cargando datos del perfil...');
        
        // Obtener device_id de Preferences
        const deviceIdResult = await Preferences.get({ key: 'device_id' });
        if (deviceIdResult.value) {
          setDeviceId(deviceIdResult.value);
        } else {
          // Generar device_id si no existe
          const newDeviceId = 'device-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
          await Preferences.set({ key: 'device_id', value: newDeviceId });
          setDeviceId(newDeviceId);
          console.log('[ProfilePage] ✅ Nuevo device_id generado:', newDeviceId);
        }

        // Cargar favoritos desde SQLite
        await loadFavorites();
        
      } catch (error) {
        console.error('[ProfilePage] ❌ Error cargando datos del perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const loadFavorites = async () => {
    try {
      const db = await getDb();
      
      // Consultar favoritos locales
      const favoritesResult = await db.query(`
        SELECT id, bird_id, updated_at 
        FROM favorites_local 
        WHERE deleted_at IS NULL 
        ORDER BY updated_at DESC
      `);
      
      const favoritesData = favoritesResult.values || [];
      console.log('[ProfilePage] Favoritos encontrados:', favoritesData.length);

      // Obtener datos completos de las aves
      const birdsData = await listBirds();
      const birdsMap = new Map(birdsData.map(bird => [bird.id, bird]));

      // Combinar favoritos con datos de aves
      const favoritesWithBirds = favoritesData.map((fav: any) => ({
        id: fav.id,
        bird_id: fav.bird_id,
        updated_at: fav.updated_at,
        bird: birdsMap.get(fav.bird_id)
      })).filter(fav => fav.bird); // Solo incluir si la ave existe

      setFavorites(favoritesWithBirds);
      console.log('[ProfilePage] ✅ Favoritos cargados:', favoritesWithBirds.length);
      
    } catch (error) {
      console.error('[ProfilePage] ❌ Error cargando favoritos:', error);
    }
  };

  const handleFavoriteClick = (birdId: string) => {
    router.push(`/bird/${birdId}`);
  };

  const formatDeviceId = (id: string): string => {
    if (id.length <= 12) return id;
    return id.substring(0, 8) + '...' + id.substring(id.length - 4);
  };

  if (loading) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Perfil</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <IonSpinner name="crescent" />
            <IonText>Cargando perfil...</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Información del usuario */}
        <div style={{ padding: '16px' }}>
          <IonCard>
            <IonCardContent>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ 
                  fontSize: '48px', 
                  marginBottom: '16px',
                  color: '#666'
                }}>
                  👤
                </div>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  margin: '0 0 8px 0',
                  color: '#333'
                }}>
                  Invitado
                </h2>
                <IonText color="medium" style={{ fontSize: '14px' }}>
                  ID: {formatDeviceId(deviceId)}
                </IonText>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Lista de favoritos */}
        <div style={{ padding: '0 16px 16px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            margin: '0 0 16px 0',
            color: '#333'
          }}>
            Mis Favoritos ({favorites.length})
          </h3>

          {favorites.length === 0 ? (
            <IonCard>
              <IonCardContent>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                    ⭐
                  </div>
                  <IonText color="medium" style={{ fontSize: '16px' }}>
                    No tienes favoritos aún
                  </IonText>
                  <p style={{ 
                    fontSize: '14px', 
                    margin: '8px 0 0 0',
                    color: '#999'
                  }}>
                    Explora aves y marca tus favoritas con la estrella
                  </p>
                </div>
              </IonCardContent>
            </IonCard>
          ) : (
            <IonList>
              {favorites.map((favorite) => (
                <IonItem 
                  key={favorite.id} 
                  button 
                  onClick={() => handleFavoriteClick(favorite.bird_id)}
                  style={{ '--padding-start': '16px' }}
                >
                  <IonThumbnail slot="start" style={{ width: '50px', height: '50px' }}>
                    {favorite.bird?.image_url ? (
                      <img 
                        src={favorite.bird.image_url} 
                        alt={favorite.bird.name}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          borderRadius: '6px'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#f0f0f0',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        🐦
                      </div>
                    )}
                  </IonThumbnail>
                  
                  <IonLabel>
                    <h2 style={{ fontWeight: '600', marginBottom: '4px' }}>
                      {favorite.bird?.name}
                    </h2>
                    {favorite.bird?.scientific_name && (
                      <p style={{ 
                        fontSize: '14px', 
                        color: '#666', 
                        fontStyle: 'italic',
                        marginBottom: '4px'
                      }}>
                        {favorite.bird.scientific_name}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <IonChip color="warning" className="chip-small">
                        <IonText>⭐ Favorito</IonText>
                      </IonChip>
                      <IonText style={{ fontSize: '12px', color: '#999' }}>
                        Agregado {new Date(favorite.updated_at).toLocaleDateString()}
                      </IonText>
                    </div>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          )}
        </div>

        {/* Información adicional */}
        <div style={{ padding: '0 16px 32px' }}>
          <IonCard>
            <IonCardContent>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <IonText color="medium" style={{ fontSize: '14px' }}>
                  Tus favoritos se guardan localmente en tu dispositivo
                </IonText>
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ProfilePage;
