// src/core/audio/buildAudioQueue.ts
// Builders puros: convierten entidades DAO en AudioQueueItem[] sin tocar runtime.

import type { AudioQueueItem } from './player';
import type { Sing } from '../db/dao/sings';
import type { Track } from '../db/dao/tracks';
import type { Interview } from '../db/dao/interviews';

export type BuildInterviewsQueueOptions = {
  artist?: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function buildSingsQueue(sings: Sing[]): AudioQueueItem[] {
  const queue: AudioQueueItem[] = [];
  for (const sing of sings) {
    if (!isNonEmptyString(sing?.id)) continue;
    if (!isNonEmptyString(sing?.audio_url)) {
      console.log(`[AudioQueueBuilder] skipped sing ${sing?.id ?? '(no-id)'}: missing audio_url`);
      continue;
    }
    queue.push({
      id: sing.id,
      src: sing.audio_url,
      metadata: {
        title: sing.title || 'Canto sin título',
        artist:
          sing.author ||
          sing.community ||
          sing.interpreters ||
          'Imaginario',
      },
    });
  }
  return queue;
}

export function buildTracksQueue(tracks: Track[]): AudioQueueItem[] {
  const queue: AudioQueueItem[] = [];
  for (const track of tracks) {
    if (!isNonEmptyString(track?.id)) continue;
    if (!isNonEmptyString(track?.audio_url)) {
      console.log(`[AudioQueueBuilder] skipped track ${track?.id ?? '(no-id)'}: missing audio_url`);
      continue;
    }
    queue.push({
      id: track.id,
      src: track.audio_url,
      metadata: {
        title: track.title || 'Sin título',
        artist:
          track.interpreters ||
          track.author ||
          track.community ||
          'Imaginario',
      },
    });
  }
  return queue;
}

export function buildInterviewsQueue(
  interviews: Interview[],
  options?: BuildInterviewsQueueOptions
): AudioQueueItem[] {
  const artist = options?.artist || 'Imaginario';
  const queue: AudioQueueItem[] = [];
  for (const interview of interviews) {
    if (!isNonEmptyString(interview?.id)) continue;
    if (!isNonEmptyString(interview?.audio_url)) {
      console.log(
        `[AudioQueueBuilder] skipped interview ${interview?.id ?? '(no-id)'}: missing audio_url`
      );
      continue;
    }
    queue.push({
      id: interview.id,
      src: interview.audio_url,
      metadata: {
        title: interview.title || 'Entrevista',
        artist,
      },
    });
  }
  return queue;
}

export function combineAudioQueues(...queues: AudioQueueItem[][]): AudioQueueItem[] {
  const combined: AudioQueueItem[] = [];
  for (const queue of queues) {
    for (const item of queue) {
      combined.push(item);
    }
  }
  return combined;
}
