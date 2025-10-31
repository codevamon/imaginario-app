// src/core/audio/player.ts
// Robust AudioManager singleton: controla 1 <audio> global, normaliza URLs y maneja errores.
import { cacheAudioFile, getLocalAudioUrl } from './cacheAudioFile';
import { Network } from '@capacitor/network';
type OnChangeCb = (playingId: string | null) => void;
type OnProgressCb = (currentTime: number, duration: number, progress: number) => void;

interface ProgressData {
  currentTime: number;
  duration: number;
  progress: number;
}

// Helper insertado: preparar fuente local/offline antes de usar en el reproductor
async function prepareSource(originalSrc: string, id: string): Promise<string> {
  try {
    const { connected } = await Network.getStatus();

    // Si la fuente ya es local (file://), no hacer nada
    if (originalSrc.startsWith('file://')) return originalSrc;

    // Si estamos offline y no hay conexión, intentar buscar archivo local
    const fileName = id + '.mp3';
    const localPath = `audios/${fileName}`;

    if (!connected) {
      try {
        const localUrl = await getLocalAudioUrl(localPath);
        if (localUrl) return localUrl;
      } catch {
        console.warn('[AudioManager] Offline, sin archivo local:', localPath);
      }
      return originalSrc;
    }

    // Online: descargar y cachear si no existe
    const path = await cacheAudioFile(originalSrc, fileName, (p) => {
      window.dispatchEvent(
        new CustomEvent('audio:download-progress', {
          detail: { id, progress: p },
        })
      );
    });

    const localUrl = await getLocalAudioUrl(path);
    return localUrl || originalSrc;
  } catch (err) {
    console.warn('[AudioManager] prepareSource error:', err);
    return originalSrc;
  }
}

class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private playingId: string | null = null;
  private cbs: OnChangeCb[] = [];
  private progressCbs: OnProgressCb[] = [];
  private animationFrameId: number | null = null;
  private lastProgressUpdate: number = 0;

  private startProgressLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const updateProgress = (timestamp: number) => {
      // Throttle: actualizar máximo cada 100ms para optimizar rendimiento
      if (timestamp - this.lastProgressUpdate < 100) {
        this.animationFrameId = requestAnimationFrame(updateProgress);
        return;
      }

      this.lastProgressUpdate = timestamp;

      if (!this.audio || this.audio.paused || this.audio.ended) {
        this.animationFrameId = null;
        return;
      }

      try {
        const currentTime = this.audio.currentTime || 0;
        const duration = this.audio.duration || 0;
        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

        // Emitir eventos de progreso
        this.progressCbs.forEach(cb => {
          try {
            cb(currentTime, duration, progress);
          } catch (e) {
            console.warn('[AudioManager] onProgress callback failed:', e);
          }
        });

        // Continuar el loop si sigue reproduciéndose
        if (!this.audio.paused && !this.audio.ended) {
          this.animationFrameId = requestAnimationFrame(updateProgress);
        }
      } catch (error) {
        console.warn('[AudioManager] Progress update error:', error);
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(updateProgress);
  }

  private stopProgressLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

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

  async checkUrlExists(url: string) {
    try {
      if (!url) return false;
      // 🔹 Bypass CORS y HEAD requests
      console.warn('[AudioManager] Skipping HEAD request (dev mode bypass)');
      return true;
    } catch (err) {
      console.warn('[AudioManager] URL check skipped (CORS):', err);
      return true;
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
        this.stopProgressLoop();
        this.setPlaying(null);
        console.log('[AudioManager] paused current track:', id);
      } else if (this.audio) {
        this.audio.play().catch((e) => {
          console.warn('[AudioManager] resume failed:', e);
          this.setPlaying(null);
        });
        this.setPlaying(id);
        this.startProgressLoop();
        console.log('[AudioManager] resumed track:', id);
      }
      return;
    }

    // nueva pista: detener la anterior
    if (this.audio) {
      try { 
        this.audio.pause(); 
        this.stopProgressLoop();
        this.audio.src = '';
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch (e) {
        console.warn('[AudioManager] cleanup failed:', e);
      }
    }

    // crear o reutilizar audio element
    this.audio = this.audio ?? document.createElement('audio');

    // preparar fuente local/offline antes de asignar
    // Nota: inserción segura justo antes de asignar this.audio.src
    const preparedSrc = await prepareSource(normalizedSrc, id);
    this.audio.src = preparedSrc;
    this.audio.preload = 'metadata';
    
    // Exponer el elemento global para acceso desde hooks
    (window as any).__IMAGINARIO_AUDIO__ = this.audio;
    
    this.audio.onended = () => {
      console.log('[AudioManager] track ended:', id);
      this.stopProgressLoop();
      this.setPlaying(null);
    };
    this.audio.onerror = (e) => {
      console.warn('[AudioManager] audio error:', e, 'for src:', normalizedSrc);
      this.stopProgressLoop();
      this.setPlaying(null);
    };

    // intentar reproducir
    try {
      await this.audio.play();
      this.setPlaying(id);
      this.startProgressLoop();
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
      this.stopProgressLoop();
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

  onProgress(cb: OnProgressCb) {
    this.progressCbs.push(cb);
    return () => { this.progressCbs = this.progressCbs.filter(x => x !== cb); };
  }

  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }

  getProgress(): number {
    const currentTime = this.getCurrentTime();
    const duration = this.getDuration();
    return duration > 0 ? (currentTime / duration) * 100 : 0;
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
