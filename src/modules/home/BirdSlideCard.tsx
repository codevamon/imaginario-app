import { useCachedImage } from '../../core/cache/useCachedImage';
import { Badge } from '../../ui/Badge';
import { FavToggle } from '../../ui/FavToggle';
import { PlayButton } from '../../ui/PlayButton';
import type { Bird } from '../../core/db/dao/birds';

export default function BirdSlideCard({ b }: { b: Bird }) {
  const bg = useCachedImage(b.image_url);
  return (
    <div className="slide-card" style={{ backgroundImage: `url(${bg||''})` }}>
      <div className="slide-top">
        <Badge color="warning">{b.rarity ?? '—'}</Badge>
        <FavToggle onChange={()=>{/* cola de favoritos aquí */}} />
      </div>
      <div className="slide-bottom">
        <div className="info">
          <div className="name">{b.name}</div>
          {b.scientific_name && <div className="sci">{b.scientific_name}</div>}
        </div>
        <PlayButton url={b.audio_url}/>
      </div>
    </div>
  );
}
