import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonIcon,
  IonRange,
  IonSpinner,
  createGesture,
  type GestureDetail,
  type RangeChangeEventDetail,
  type RangeKnobMoveEndEventDetail,
  type RangeKnobMoveStartEventDetail,
} from '@ionic/react';
import {
  play,
  pause,
  playSkipBack,
  playSkipForward,
  playBack,
  playForward,
  musicalNotes,
} from 'ionicons/icons';
import {
  audioManager,
  type AudioSessionSnapshot,
} from '../core/audio/player';
import './GlobalAudioWidget.css';

/** Valor de IonRange (número o dual); @ionic/react no reexporta RangeValue. */
type RangeValue = number | { lower: number; upper: number };

/** Umbral de descarte horizontal (px). Solo izquierda. */
const DISMISS_THRESHOLD_PX = 70;
/** Distancia mínima para capturar el gesto Ionic (px). */
const GESTURE_CAPTURE_PX = 12;
/** Ángulo máx. respecto al eje X antes de ceder al scroll vertical. */
const GESTURE_MAX_ANGLE = 35;
const DISMISS_ANIM_MS = 200;

function formatTime(sec?: number): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function safeFinite(n: unknown, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function rangeValueToNumber(value: RangeValue | undefined | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { lower?: unknown }).lower === 'number' &&
    Number.isFinite((value as { lower: number }).lower)
  ) {
    return (value as { lower: number }).lower;
  }
  return null;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('button, a, input, textarea, select, [role="button"]')
  );
}

/** Detecta inicio de gesto sobre IonRange / scrubber (incluye Shadow DOM). */
function eventStartsOnScrubber(event: Event): boolean {
  const path =
    typeof event.composedPath === 'function' ? event.composedPath() : [];

  for (const node of path) {
    if (!(node instanceof Element)) continue;
    const tag = node.tagName?.toLowerCase?.() ?? '';
    if (tag === 'ion-range') return true;
    if (node.classList?.contains('gaw-scrubber')) return true;
    if (node.classList?.contains('gaw-progress')) return true;
    if (
      node.classList?.contains('range-slider') ||
      node.classList?.contains('range-knob') ||
      node.classList?.contains('range-knob-handle') ||
      node.classList?.contains('range-bar') ||
      node.classList?.contains('range-bar-active')
    ) {
      return true;
    }
  }

  const target = event.target;
  if (target instanceof Element) {
    if (target.closest('.gaw-scrubber, .gaw-progress, ion-range')) return true;
  }

  return false;
}

const GlobalAudioWidget: React.FC = () => {
  const [snapshot, setSnapshot] = useState<AudioSessionSnapshot>(() =>
    audioManager.getSessionSnapshot()
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const scrubbingRef = useRef(false);
  const scrubTrackIdRef = useRef<string | null>(null);
  /** Evita seek duplicado entre ionKnobMoveEnd e ionChange. */
  const scrubSeekCommittedRef = useRef(false);
  const scrubPreviewRef = useRef(0);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dismissInFlightRef = useRef(false);
  const stopFiredRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshNavFlags = useCallback(() => {
    setHasPrev(audioManager.hasPrevious());
    setHasNext(audioManager.hasNext());
  }, []);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current != null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const resetVisualOffset = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    el.classList.remove('is-swiping', 'is-dismissing', 'is-restoring');
    el.style.transform = '';
    el.style.opacity = '';
  }, []);

  const fireStopAndClear = useCallback(() => {
    if (stopFiredRef.current) return;
    stopFiredRef.current = true;
    clearDismissTimer();
    audioManager.stopAndClearSession();
  }, [clearDismissTimer]);

  const cancelScrub = useCallback(() => {
    scrubbingRef.current = false;
    scrubTrackIdRef.current = null;
    scrubSeekCommittedRef.current = false;
    scrubPreviewRef.current = 0;
    setIsScrubbing(false);
  }, []);

  const beginScrub = useCallback((initialSeconds: number) => {
    scrubbingRef.current = true;
    scrubSeekCommittedRef.current = false;
    scrubTrackIdRef.current = audioManager.getSessionSnapshot().currentId;
    const dur = safeFinite(audioManager.getSessionSnapshot().duration, 0);
    const clamped = dur > 0 ? clamp(initialSeconds, 0, dur) : 0;
    scrubPreviewRef.current = clamped;
    setScrubTime(clamped);
    setIsScrubbing(true);
  }, []);

  const commitScrubSeek = useCallback(
    (rawSeconds: number | null) => {
      if (scrubSeekCommittedRef.current) return;

      const trackId = scrubTrackIdRef.current;
      const live = audioManager.getSessionSnapshot();

      // Sesión cerrada, otra pista, o scrub cancelado → no aplicar seek antiguo.
      if (
        !scrubbingRef.current ||
        live.status === 'idle' ||
        !trackId ||
        live.currentId !== trackId
      ) {
        cancelScrub();
        return;
      }

      const dur = safeFinite(live.duration, 0);
      if (dur <= 0 || rawSeconds == null || !Number.isFinite(rawSeconds)) {
        cancelScrub();
        return;
      }

      const target = clamp(rawSeconds, 0, dur);
      scrubSeekCommittedRef.current = true;
      audioManager.seekTo(target);

      const after = audioManager.getSessionSnapshot();
      setCurrentTime(safeFinite(after.currentTime, target));
      setDuration(safeFinite(after.duration, dur));

      // Cierra preview; mantiene commit guard hasta el próximo beginScrub.
      scrubbingRef.current = false;
      scrubTrackIdRef.current = null;
      scrubPreviewRef.current = 0;
      setIsScrubbing(false);
    },
    [cancelScrub]
  );

  useEffect(() => {
    const initial = audioManager.getSessionSnapshot();
    setSnapshot(initial);
    setCurrentTime(safeFinite(initial.currentTime));
    setDuration(safeFinite(initial.duration));
    refreshNavFlags();

    const unsubSession = audioManager.onSessionChange((next) => {
      setSnapshot(next);
      const nextDur = safeFinite(next.duration);
      const nextTime = safeFinite(next.currentTime);
      setDuration(nextDur);

      if (scrubbingRef.current) {
        if (
          next.status === 'idle' ||
          next.currentId !== scrubTrackIdRef.current
        ) {
          cancelScrub();
          setCurrentTime(nextTime);
        }
        refreshNavFlags();
        return;
      }

      setCurrentTime(nextTime);
      refreshNavFlags();
    });

    const unsubProgress = audioManager.onProgress((t, d) => {
      const safeD = safeFinite(d);
      const safeT = safeFinite(t);
      setDuration(safeD);
      if (scrubbingRef.current) return;
      setCurrentTime(safeT);
    });

    return () => {
      unsubSession();
      unsubProgress();
      cancelScrub();
    };
  }, [refreshNavFlags, cancelScrub]);

  const visible = snapshot.status !== 'idle';

  useEffect(() => {
    document.documentElement.classList.toggle('audio-widget-visible', visible);
    document.body.classList.toggle('audio-widget-visible', visible);
    return () => {
      document.documentElement.classList.remove('audio-widget-visible');
      document.body.classList.remove('audio-widget-visible');
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      clearDismissTimer();
      dismissInFlightRef.current = false;
      stopFiredRef.current = false;
      resetVisualOffset(rootRef.current);
      cancelScrub();
    }
  }, [visible, clearDismissTimer, resetVisualOffset, cancelScrub]);

  useEffect(() => {
    if (!visible) return;

    const el = rootRef.current;
    if (!el) return;

    resetVisualOffset(el);
    dismissInFlightRef.current = false;
    stopFiredRef.current = false;

    const applyDrag = (dx: number) => {
      const left = Math.min(0, dx);
      el.style.transform = `translate3d(${left}px, 0, 0)`;
      const fade = 1 - Math.min(0.55, Math.abs(left) / 220);
      el.style.opacity = String(fade);
    };

    const restorePosition = () => {
      if (dismissInFlightRef.current) return;
      el.classList.remove('is-swiping');
      if (prefersReducedMotion()) {
        resetVisualOffset(el);
        return;
      }
      el.classList.add('is-restoring');
      el.style.transform = 'translate3d(0, 0, 0)';
      el.style.opacity = '1';
      let settled = false;
      const onEnd = () => {
        if (settled) return;
        settled = true;
        el.removeEventListener('transitionend', onEnd);
        if (!dismissInFlightRef.current) {
          resetVisualOffset(el);
        }
      };
      el.addEventListener('transitionend', onEnd);
      window.setTimeout(onEnd, DISMISS_ANIM_MS + 40);
    };

    const beginDismissAnimation = () => {
      if (dismissInFlightRef.current) return;
      dismissInFlightRef.current = true;
      cancelScrub();
      el.classList.remove('is-swiping', 'is-restoring');

      if (prefersReducedMotion()) {
        resetVisualOffset(el);
        fireStopAndClear();
        return;
      }

      el.classList.add('is-dismissing');
      el.style.transform = 'translate3d(-120%, 0, 0)';
      el.style.opacity = '0';

      const finish = () => {
        el.removeEventListener('transitionend', onTransitionEnd);
        fireStopAndClear();
      };
      const onTransitionEnd = (ev: TransitionEvent) => {
        if (ev.target !== el) return;
        if (ev.propertyName !== 'transform' && ev.propertyName !== 'opacity') {
          return;
        }
        finish();
      };
      el.addEventListener('transitionend', onTransitionEnd);
      clearDismissTimer();
      dismissTimerRef.current = setTimeout(finish, DISMISS_ANIM_MS + 40);
    };

    const gesture = createGesture({
      el,
      gestureName: 'gaw-swipe-dismiss',
      direction: 'x',
      threshold: GESTURE_CAPTURE_PX,
      maxAngle: GESTURE_MAX_ANGLE,
      gesturePriority: 20,
      passive: false,
      canStart: (detail: GestureDetail) => {
        if (dismissInFlightRef.current) return false;
        if (scrubbingRef.current) return false;
        if (eventStartsOnScrubber(detail.event)) return false;
        if (isInteractiveTarget(detail.event.target)) return false;
        return true;
      },
      onStart: () => {
        if (dismissInFlightRef.current) return;
        el.classList.remove('is-restoring', 'is-dismissing');
        el.classList.add('is-swiping');
      },
      onMove: (detail: GestureDetail) => {
        if (dismissInFlightRef.current) return;
        applyDrag(detail.deltaX);
      },
      onEnd: (detail: GestureDetail) => {
        if (dismissInFlightRef.current) return;
        el.classList.remove('is-swiping');

        const dx = detail.deltaX;
        const dy = detail.deltaY;
        const predominatelyHorizontal = Math.abs(dx) >= Math.abs(dy);
        const leftEnough = dx <= -DISMISS_THRESHOLD_PX;
        const flickLeft =
          detail.velocityX < -0.4 && dx < -(DISMISS_THRESHOLD_PX * 0.45);

        if (predominatelyHorizontal && (leftEnough || flickLeft)) {
          beginDismissAnimation();
          return;
        }
        restorePosition();
      },
      notCaptured: () => {
        if (!dismissInFlightRef.current) {
          restorePosition();
        }
      },
    });

    gesture.enable(true);

    return () => {
      clearDismissTimer();
      gesture.destroy();
      resetVisualOffset(el);
    };
  }, [
    visible,
    clearDismissTimer,
    resetVisualOffset,
    fireStopAndClear,
    cancelScrub,
  ]);

  const withBusy = useCallback(async (fn: () => unknown | Promise<unknown>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } finally {
      busyRef.current = false;
      setBusy(false);
      refreshNavFlags();
    }
  }, [refreshNavFlags]);

  const handlePrevious = () => {
    if (!audioManager.hasPrevious() || busy) return;
    cancelScrub();
    void withBusy(async () => {
      await audioManager.playPrevious();
    });
  };

  const handleNext = () => {
    if (!audioManager.hasNext() || busy) return;
    cancelScrub();
    void withBusy(async () => {
      await audioManager.playNext();
    });
  };

  const handleSeekBack = () => {
    if (busy || snapshot.status === 'loading') return;
    cancelScrub();
    audioManager.seekBy(-15);
  };

  const handleSeekForward = () => {
    if (busy || snapshot.status === 'loading') return;
    cancelScrub();
    audioManager.seekBy(15);
  };

  const handlePlayPause = () => {
    if (busy) return;
    const { status, currentId } = snapshot;

    if (status === 'playing') {
      audioManager.pause();
      return;
    }

    if (status === 'paused') {
      void withBusy(async () => {
        await audioManager.resume();
      });
      return;
    }

    if (status === 'ended' && currentId) {
      void withBusy(async () => {
        const queue = audioManager.getQueue();
        const item =
          queue.find((q) => q.id === currentId) ??
          (audioManager.getQueueIndex() >= 0
            ? queue[audioManager.getQueueIndex()]
            : undefined);
        if (item?.src) {
          await audioManager.play(item.id, item.src, item.metadata);
        }
      });
    }
  };

  /**
   * HOTFIX 6.1: IonRange emite `ionInput` desde valueChanged() también cuando
   * React actualiza `value` por onProgress (no solo por gesto del usuario).
   * Antes, handleRangeInput/onIonChange llamaban beginScrub() ante esos eventos
   * programáticos → scrubbingRef quedaba true sin knobMoveEnd → onProgress
   * ignorado → barra/tiempo congelados en ~0:00 mientras el audio seguía.
   *
   * Contrato: SOLO ionKnobMoveStart inicia scrub; ionInput solo actualiza
   * preview si ya hay scrub activo; confirmación en knobMoveEnd/ionChange.
   */
  const handleKnobMoveStart = useCallback(
    (ev: CustomEvent<RangeKnobMoveStartEventDetail>) => {
      const start = rangeValueToNumber(ev.detail.value);
      beginScrub(start ?? safeFinite(currentTime));
    },
    [beginScrub, currentTime]
  );

  const handleRangeInput = useCallback(
    (ev: CustomEvent<RangeChangeEventDetail>) => {
      // Ignorar ionInput programáticos (actualización de value por progreso).
      if (!scrubbingRef.current) return;
      const dur = safeFinite(duration);
      const next = rangeValueToNumber(ev.detail.value);
      if (next == null || dur <= 0) return;
      const clamped = clamp(next, 0, dur);
      scrubPreviewRef.current = clamped;
      setScrubTime(clamped);
    },
    [duration]
  );

  const handleKnobMoveEnd = useCallback(
    (ev: CustomEvent<RangeKnobMoveEndEventDetail>) => {
      if (!scrubbingRef.current) return;
      const endVal = rangeValueToNumber(ev.detail.value);
      commitScrubSeek(endVal ?? scrubPreviewRef.current);
    },
    [commitScrubSeek]
  );

  const handleRangeChange = useCallback(
    (ev: CustomEvent<RangeChangeEventDetail>) => {
      // ionChange solo se emite por interacción de usuario (no por value prop).
      // Si knobMoveEnd ya confirmó, no repetir seek.
      if (scrubSeekCommittedRef.current) return;
      if (!scrubbingRef.current) return;
      const val = rangeValueToNumber(ev.detail.value);
      commitScrubSeek(val ?? scrubPreviewRef.current);
    },
    [commitScrubSeek]
  );

  if (!visible) {
    return null;
  }

  const title = snapshot.metadata?.title || 'Audio';
  const artist = snapshot.metadata?.artist || 'Imaginario';
  const artworkUrl = snapshot.metadata?.artworkUrl;
  const isPlaying = snapshot.status === 'playing';
  const isLoading = snapshot.status === 'loading';
  const isError = snapshot.status === 'error';
  const controlsLocked = busy || isLoading;
  const playDisabled =
    controlsLocked ||
    (snapshot.status !== 'playing' &&
      snapshot.status !== 'paused' &&
      snapshot.status !== 'ended');

  const safeDuration = safeFinite(duration);
  const scrubReady =
    safeDuration > 0 &&
    !isLoading &&
    snapshot.status !== 'error' &&
    (snapshot.status === 'playing' ||
      snapshot.status === 'paused' ||
      snapshot.status === 'ended');

  const displayTime = isScrubbing ? scrubTime : safeFinite(currentTime);
  const rangeValue = scrubReady
    ? clamp(isScrubbing ? scrubTime : safeFinite(currentTime), 0, safeDuration)
    : 0;

  return (
    <div
      ref={rootRef}
      className={`global-audio-widget${isError ? ' is-error' : ''}`}
      role="region"
      aria-label="Reproductor de audio"
    >
      <div className="gaw-row gaw-meta">
        <div className="gaw-artwork" aria-hidden="true">
          {artworkUrl ? (
            <img src={artworkUrl} alt="" className="gaw-artwork-img" />
          ) : (
            <div className="gaw-artwork-fallback">
              <IonIcon icon={musicalNotes} />
            </div>
          )}
        </div>
        <div className="gaw-text">
          <div className="gaw-title">{title}</div>
          <div className="gaw-artist">{artist}</div>
          {isError && (
            <div className="gaw-error-hint">No se pudo reproducir</div>
          )}
        </div>
        {isLoading && (
          <IonSpinner className="gaw-spinner" name="crescent" />
        )}
      </div>

      <div className="gaw-row gaw-progress">
        <span className="gaw-time">{formatTime(displayTime)}</span>
        <IonRange
          className={`gaw-scrubber${isScrubbing ? ' is-scrubbing' : ''}`}
          aria-label="Posición de reproducción"
          min={0}
          max={scrubReady ? safeDuration : 1}
          step={0.1}
          snaps={false}
          ticks={false}
          pin={false}
          dualKnobs={false}
          disabled={!scrubReady}
          value={rangeValue}
          onIonKnobMoveStart={handleKnobMoveStart}
          onIonInput={handleRangeInput}
          onIonKnobMoveEnd={handleKnobMoveEnd}
          onIonChange={handleRangeChange}
        />
        <span className="gaw-time">{formatTime(safeDuration)}</span>
      </div>

      <div className="gaw-row gaw-controls">
        <button
          type="button"
          className="gaw-btn"
          aria-label="Audio anterior"
          disabled={!hasPrev || controlsLocked}
          onClick={handlePrevious}
        >
          <IonIcon icon={playSkipBack} />
        </button>
        <button
          type="button"
          className="gaw-btn"
          aria-label="Retroceder quince segundos"
          disabled={controlsLocked || isError}
          onClick={handleSeekBack}
        >
          <IonIcon icon={playBack} />
          <span className="gaw-seek-label">15</span>
        </button>
        <button
          type="button"
          className="gaw-btn gaw-btn-main"
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          disabled={playDisabled && !isPlaying}
          onClick={handlePlayPause}
        >
          {isLoading ? (
            <IonSpinner name="crescent" />
          ) : (
            <IonIcon icon={isPlaying ? pause : play} />
          )}
        </button>
        <button
          type="button"
          className="gaw-btn"
          aria-label="Adelantar quince segundos"
          disabled={controlsLocked || isError}
          onClick={handleSeekForward}
        >
          <IonIcon icon={playForward} />
          <span className="gaw-seek-label">15</span>
        </button>
        <button
          type="button"
          className="gaw-btn"
          aria-label="Audio siguiente"
          disabled={!hasNext || controlsLocked}
          onClick={handleNext}
        >
          <IonIcon icon={playSkipForward} />
        </button>
      </div>
    </div>
  );
};

export default GlobalAudioWidget;
