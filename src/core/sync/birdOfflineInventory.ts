import { getAudioDownloadInventory, getImageDownloadInventory } from '../cache/mediaCacheService';
import { listBirds } from '../db/dao/birds';
import { getAllSings } from '../db/dao/sings';
import { getAllTracks } from '../db/dao/tracks';
import { getAllInterviews } from '../db/dao/interviews';

export type BirdOfflineStatus = {
  bird_id: string;
  name: string;
  scientific_name?: string;
  hasData: boolean;
  imageTotal: number;
  imageDownloaded: number;
  audioTotal: number;
  audioDownloaded: number;
  isComplete: boolean;
  imagePending: number;
  imageCorrupted: number;
  audioPending: number;
  audioCorrupted: number;
};

export type BirdOfflineStatusInventory = {
  total: number;
  complete: number;
  partial: number;
  noData: number;
  items: BirdOfflineStatus[];
};

function emptyInventory(): BirdOfflineStatusInventory {
  return {
    total: 0,
    complete: 0,
    partial: 0,
    noData: 0,
    items: [],
  };
}

export async function getBirdOfflineStatusInventory(): Promise<BirdOfflineStatusInventory> {
  try {
    const [
      birds,
      sings,
      tracks,
      interviews,
      audioInventory,
      imageInventory,
    ] = await Promise.all([
      listBirds({ order: 'name' }),
      getAllSings(),
      getAllTracks(),
      getAllInterviews(),
      getAudioDownloadInventory(),
      getImageDownloadInventory(),
    ]);

    const audioBirdMap = new Map<string, string>();

    for (const sing of sings) {
      audioBirdMap.set(`sings-${sing.id}`, sing.bird_id);
    }

    for (const track of tracks) {
      audioBirdMap.set(`tracks-${track.id}`, track.bird_id);
    }

    for (const interview of interviews) {
      audioBirdMap.set(`interviews-${interview.id}`, interview.bird_id);
    }

    const items: BirdOfflineStatus[] = birds.map((bird) => {
      const birdImages = imageInventory.items.filter((item) => (
        (item.table === 'birds' && item.id === bird.id) ||
        (item.table === 'bird_images' && item.bird_id === bird.id)
      ));

      const birdAudios = audioInventory.items.filter((item) => (
        audioBirdMap.get(`${item.table}-${item.id}`) === bird.id
      ));

      const downloadableImages = birdImages.filter((item) => item.status !== 'no_url');
      const downloadableAudios = birdAudios.filter((item) => item.status !== 'no_url');

      const imageTotal = downloadableImages.length;
      const imageDownloaded = downloadableImages.filter((item) => item.status === 'downloaded').length;
      const imagePending = downloadableImages.filter((item) => item.status === 'pending').length;
      const imageCorrupted = downloadableImages.filter((item) => item.status === 'corrupted').length;

      const audioTotal = downloadableAudios.length;
      const audioDownloaded = downloadableAudios.filter((item) => item.status === 'downloaded').length;
      const audioPending = downloadableAudios.filter((item) => item.status === 'pending').length;
      const audioCorrupted = downloadableAudios.filter((item) => item.status === 'corrupted').length;

      const hasData = true;
      const isComplete = hasData &&
        imageDownloaded === imageTotal &&
        audioDownloaded === audioTotal;

      return {
        bird_id: bird.id,
        name: bird.name,
        scientific_name: bird.scientific_name,
        hasData,
        imageTotal,
        imageDownloaded,
        audioTotal,
        audioDownloaded,
        isComplete,
        imagePending,
        imageCorrupted,
        audioPending,
        audioCorrupted,
      };
    });

    const complete = items.filter((item) => item.isComplete).length;

    return {
      total: items.length,
      complete,
      partial: items.length - complete,
      noData: 0,
      items,
    };
  } catch (error) {
    console.error('[birdOfflineInventory] Error generando inventario por ave:', error);
    return emptyInventory();
  }
}
