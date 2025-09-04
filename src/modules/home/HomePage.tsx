import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonButton, IonIcon, IonSearchbar, IonItem, IonList,
} from '@ionic/react';
import { filter } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import BirdSlideCard from './BirdSlideCard';
import { supabase } from '../../core/supabase';

import 'swiper/css';                 // asegúrate de tener "swiper" instalado
import { Swiper, SwiperSlide } from 'swiper/react';

type Bird = {
  id: string;
  name: string;
  description: string | null;
  rarity: number;
  popularity: number;
  tags: string | null;
  image_url: string | null;
  scientific_name?: string | null;
};

export default function HomePage() {
  const router = useIonRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [featured, setFeatured] = useState<Bird[]>([]);
  const [popular, setPopular] = useState<Bird[]>([]);

  useEffect(() => {
    (async () => {
      try {
        console.log('[HomePage] Cargando datos desde Supabase...');
        const { data, error } = await supabase
          .from('birds')
          .select('*')
          .order('popularity', { ascending: false });
        if (error) throw error;

        const all = data || [];
        setFeatured(all.slice(0, 8));
        setPopular(all.slice(0, 5));
        console.log('[HomePage] ✅ Datos cargados desde Supabase');
      } catch (error) {
        console.error('[HomePage] ❌ Error cargando datos:', error);
        // En caso de error, mostrar arrays vacíos en lugar de fallar
        setFeatured([]);
        setPopular([]);
      }
    })();
  }, []);

  function goDiscover(q?: string) {
    router.push(`/discover${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }

  return (
    <IonPage>
      <IonHeader collapse="fade">
        <IonToolbar>
          <IonTitle>Home</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setFiltersOpen(v => !v)}>
              <IonIcon icon={filter} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {/* 1. Saludo */}
        <div style={{ padding: '12px 16px', fontSize: 22, fontWeight: 700 }}>
          Te damos la bienvenida 👋
        </div>

        {/* 2. Búsqueda → Discover */}
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

        {/* 3. Carrusel */}
        <div style={{ padding: '0 12px 8px', fontWeight: 700 }}>Favoritos de la semana</div>
        <div style={{ padding: '0 8px 16px' }}>
          <Swiper slidesPerView={1.1} spaceBetween={12}>
            {featured.map(b => (
              <SwiperSlide key={b.id}><BirdSlideCard b={b} /></SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* 4. Top 5 populares */}
        <div style={{ padding: '0 12px 8px', fontWeight: 700 }}>Aves populares</div>
        <IonList inset>
          {popular.map((b: Bird) => (
            <IonItem key={b.id} button detail onClick={() => router.push(`/bird/${b.id}`)}>
              <div slot="start" className="thumb"
                   style={{width:56,height:56,borderRadius:8,background:'#eee',overflow:'hidden'}}>
                <img alt={b.name} src={b.image_url||''} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{b.name}</div>
                {b.scientific_name && <div style={{ fontSize: 12, opacity:.7 }}>{b.scientific_name}</div>}
              </div>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
