import { getDb, getMetaValue } from '../sqlite';

type LastSyncSummary = {
  birds: number | null;
  bird_images: number | null;
  bird_translations: number | null;
  sings: number | null;
  tracks: number | null;
  interviews: number | null;
  musicians: number | null;
  global: number | null;
};

export type LocalDataSummary = {
  birds: number;
  sings: number;
  tracks: number;
  interviews: number;
  bird_images: number;
  bird_translations: number;
  musicians: number;
  total_audio: number;
  last_sync: LastSyncSummary;
};

const EMPTY_LAST_SYNC: LastSyncSummary = {
  birds: null,
  bird_images: null,
  bird_translations: null,
  sings: null,
  tracks: null,
  interviews: null,
  musicians: null,
  global: null,
};

function emptySummary(): LocalDataSummary {
  return {
    birds: 0,
    sings: 0,
    tracks: 0,
    interviews: 0,
    bird_images: 0,
    bird_translations: 0,
    musicians: 0,
    total_audio: 0,
    last_sync: { ...EMPTY_LAST_SYNC },
  };
}

function parseMetaNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getLocalDataSummary(): Promise<LocalDataSummary> {
  try {
    const db = await getDb();

    async function countRows(table: string, where: string): Promise<number> {
      try {
        const result = await db.query(`SELECT COUNT(*) as c FROM ${table} WHERE ${where}`);
        return Number(result.values?.[0]?.c ?? 0);
      } catch (error) {
        console.error(`[localDataSummary] Error contando ${table}:`, error);
        return 0;
      }
    }

    async function getLastSync(table: keyof Omit<LastSyncSummary, 'global'>): Promise<number | null> {
      try {
        return parseMetaNumber(await getMetaValue(`${table}_last_sync`));
      } catch (error) {
        console.error(`[localDataSummary] Error leyendo ${table}_last_sync:`, error);
        return null;
      }
    }

    const [
      birds,
      sings,
      tracks,
      interviews,
      bird_images,
      bird_translations,
      musicians,
      birdsLastSync,
      birdImagesLastSync,
      birdTranslationsLastSync,
      singsLastSync,
      tracksLastSync,
      interviewsLastSync,
      musiciansLastSync,
    ] = await Promise.all([
      countRows('birds', 'deleted_at IS NULL'),
      countRows('sings', 'deleted_at IS NULL'),
      countRows('tracks', 'deleted_at IS NULL'),
      countRows('interviews', 'deleted_at IS NULL'),
      countRows('bird_images', "deleted_at IS NULL OR deleted_at = ''"),
      countRows('bird_translations', 'deleted_at IS NULL'),
      countRows('musicians', 'deleted_at IS NULL'),
      getLastSync('birds'),
      getLastSync('bird_images'),
      getLastSync('bird_translations'),
      getLastSync('sings'),
      getLastSync('tracks'),
      getLastSync('interviews'),
      getLastSync('musicians'),
    ]);

    const syncValues = [
      birdsLastSync,
      birdImagesLastSync,
      birdTranslationsLastSync,
      singsLastSync,
      tracksLastSync,
      interviewsLastSync,
      musiciansLastSync,
    ].filter((value): value is number => value !== null);

    return {
      birds,
      sings,
      tracks,
      interviews,
      bird_images,
      bird_translations,
      musicians,
      total_audio: sings + tracks + interviews,
      last_sync: {
        birds: birdsLastSync,
        bird_images: birdImagesLastSync,
        bird_translations: birdTranslationsLastSync,
        sings: singsLastSync,
        tracks: tracksLastSync,
        interviews: interviewsLastSync,
        musicians: musiciansLastSync,
        global: syncValues.length > 0 ? Math.max(...syncValues) : null,
      },
    };
  } catch (error) {
    console.error('[localDataSummary] Error generando resumen local:', error);
    return emptySummary();
  }
}
