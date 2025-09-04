import { useState } from 'react';
import { heart, heartOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';

export function FavToggle({ initial=false, onChange }:{initial?:boolean; onChange?:(v:boolean)=>void}) {
  const [on, setOn] = useState(initial);
  return (
    <button aria-label="Guardar" className="fav-btn" onClick={() => { const v=!on; setOn(v); onChange?.(v); }}>
      <IonIcon icon={on?heart:heartOutline}/>
    </button>
  );
}
