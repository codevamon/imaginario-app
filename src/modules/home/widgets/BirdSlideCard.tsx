// src/modules/home/widgets/BirdSlideCard.tsx
import React from 'react';
import { useCachedImage } from '../../../core/cache/useCachedImage';
import { Badge } from '../../../ui/Badge';
import { FavToggle } from '../../../ui/FavToggle';
import { PlayButton } from '../../../ui/PlayButton';
import type { Bird } from '../../../core/db/dao/birds';

export default function BirdSlideCard({ b, onClick }: { b: Bird; onClick?: (id: string) => void }) {
  const bg = useCachedImage(b.image_url);
  return (
    <div
      className="slide-card"
      data-bird-id={b.id}
      onClick={() => onClick?.(b.id)}
      role="button"
      tabIndex={0}
      style={{ backgroundImage: `url(${bg || ''})` }}
      aria-label={`Ver ${b.name}`}
    >
      <div className="slide-top">
        <Badge color="warning">{b.rarity ?? '—'}</Badge>
        <FavToggle onChange={() => {/* cola de favoritos aquí */}} />
      </div>
      <div className="slide-bottom">
        <div className="info">
          <div className="name">{b.name}</div>
          {b.scientific_name && <div className="sci">{b.scientific_name}</div>}
        </div>
        {/* <PlayButton url={b.audio_url}/> */}
      </div>
    </div>
  );
}
