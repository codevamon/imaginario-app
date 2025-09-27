// src/core/audio/player.ts
// Robust AudioManager singleton: controla 1 <audio> global, normaliza URLs y maneja errores.
type OnChangeCb = (playingId: string | null) => void;

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private playingId: string | null = null;
  private cbs: OnChangeCb[] = [];

  private normalizeSrc(src: string): string {
    // Si ya es una URL completa, dejarla como está
    if (src.startsWith('http')) {
      return src;
    }
    
    // Si es una ruta relativa, agregar origin
    if (src.startsWith('/')) {
      return location.origin + src;
    }
    
    // Si es file://, intentar convertir con Capacitor si está disponible
    if (src.startsWith('file://')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Capacitor } = require('@capacitor/core');
        if (Capacitor && typeof Capacitor.convertFileSrc === 'function') {
          return Capacitor.convertFileSrc(src);
        }
      } catch (e) {
        console.warn('[AudioManager] Capacitor not available for file conversion:', e);
      }
      return src;
    }
    
    // Por defecto, asumir que es relativa y agregar origin
    return location.origin + '/' + src;
  }

  private async checkUrlExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (e) {
      console.warn('[AudioManager] URL check failed:', url, e);
      return false;
    }
  }

  async play(id: string, src?: string) {
    if (!id || !src) {
      console.warn('[AudioManager] play called with missing id or src:', { id, src });
      return;
    }

    const normalizedSrc = this.normalizeSrc(src);
    console.log('[AudioManager] normalized src:', src, '->', normalizedSrc);

    // Verificar que la URL existe antes de intentar reproducir
    const urlExists = await this.checkUrlExists(normalizedSrc);
    if (!urlExists) {
      console.warn('[AudioManager] URL not found (404):', normalizedSrc);
      this.setPlaying(null);
      return;
    }

    // si es la misma pista, toggle play/pause
    if (this.playingId === id) {
      if (this.audio && !this.audio.paused) {
        this.audio.pause();
        this.setPlaying(null);
        console.log('[AudioManager] paused current track:', id);
      } else if (this.audio) {
        this.audio.play().catch((e) => {
          console.warn('[AudioManager] resume failed:', e);
          this.setPlaying(null);
        });
        this.setPlaying(id);
        console.log('[AudioManager] resumed track:', id);
      }
      return;
    }

    // nueva pista: detener la anterior
    if (this.audio) {
      try { 
        this.audio.pause(); 
        this.audio.src = '';
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch (e) {
        console.warn('[AudioManager] cleanup failed:', e);
      }
    }

    // crear o reutilizar audio element
    this.audio = this.audio ?? document.createElement('audio');
    this.audio.src = normalizedSrc;
    this.audio.preload = 'metadata';
    this.audio.onended = () => {
      console.log('[AudioManager] track ended:', id);
      this.setPlaying(null);
    };
    this.audio.onerror = (e) => {
      console.warn('[AudioManager] audio error:', e, 'for src:', normalizedSrc);
      this.setPlaying(null);
    };

    // intentar reproducir
    try {
      await this.audio.play();
      this.setPlaying(id);
      console.log('[AudioManager] playing track:', id, 'from:', normalizedSrc);
    } catch (e) {
      console.warn('[AudioManager] play failed:', e, 'for src:', normalizedSrc);
      this.setPlaying(null);
    }
  }

  pause() {
    if (!this.audio) return;
    try {
      this.audio.pause();
      this.setPlaying(null);
      console.log('[AudioManager] paused');
    } catch (e) {
      console.warn('[AudioManager] pause failed:', e);
    }
  }

  toggle(id: string, src?: string) {
    if (this.playingId === id) {
      this.pause();
    } else {
      this.play(id, src);
    }
  }

  getPlayingId() { return this.playingId; }

  onChange(cb: OnChangeCb) {
    this.cbs.push(cb);
    return () => { this.cbs = this.cbs.filter(x => x !== cb); };
  }

  private setPlaying(id: string | null) {
    this.playingId = id;
    this.cbs.forEach(cb => {
      try { cb(this.playingId); } catch (e) {
        console.warn('[AudioManager] onChange callback failed:', e);
      }
    });
  }
}

export const audioManager = new AudioManager();
