import { useState } from 'react';

import { Filesystem, Directory } from '@capacitor/filesystem';

import { Preferences } from '@capacitor/preferences';

import { mediaCacheService, ensureCachedMedia } from '../cache/mediaCacheService';

import { getAllTracks } from '../db/dao/tracks';

import { getAllSings } from '../db/dao/sings';

import { getAllInterviews } from '../db/dao/interviews';

import { getDb } from '../sqlite';

import { ensureCachedImage } from "../cache/imageCacheService";

import { listBirds } from "../db/dao/birds";

import { getImagesByBirdId } from "../db/dao/bird_images";



export function useCacheManager() {

  const [progress, setProgress] = useState(0);

  const [isDownloading, setIsDownloading] = useState(false);

  const [showProgressModal, setShowProgressModal] = useState(false);



  async function clearCache() {

    try {

      await mediaCacheService.clearCache();

    } catch (err) {

      console.error('[useCacheManager] Error al limpiar caché:', err);

    }

  }



  async function getAllBirdImages() {

    try {

      const db = await getDb();

      const result = await db.query(`

        SELECT * FROM bird_images 

        WHERE deleted_at IS NULL 

        ORDER BY updated_at DESC

      `);

      return (result.values || []).map((row: any) => ({

        id: row.id,

        bird_id: row.bird_id,

        url: row.url,

        updated_at: row.updated_at,

      }));

    } catch (error) {

      console.error('[useCacheManager] Error obteniendo imágenes:', error);

      return [];

    }

  }



  async function clearAndDownloadAll() {

    setIsDownloading(true);

    setShowProgressModal(true);

    setProgress(0);



    try {

      // Paso 1: limpiar caché

      await clearCache();



      // Paso 2: recolectar URLs

      const [tracks, sings, interviews, images] = await Promise.all([

        getAllTracks(),

        getAllSings(),

        getAllInterviews(),

        getAllBirdImages(),

      ]);



      const allUrls: { url: string; type: 'audio' | 'image' }[] = [];

      tracks.forEach(t => t.audio_url && allUrls.push({ url: t.audio_url, type: 'audio' }));

      sings.forEach(s => s.audio_url && allUrls.push({ url: s.audio_url, type: 'audio' }));

      interviews.forEach(i => i.audio_url && allUrls.push({ url: i.audio_url, type: 'audio' }));

      images.forEach(img => img.url && allUrls.push({ url: img.url, type: 'image' }));

      console.log('[CacheManager] 🟢 tracks totales:', tracks.length);

      console.log('[CacheManager] 🟢 sings totales:', sings.length);

      console.log('[CacheManager] 🟢 interviews totales:', interviews.length);

      console.log('[CacheManager] 🟢 images totales:', images.length);

      console.log('[CacheManager] 🧮 total URLs a procesar:', allUrls.length);



      const total = allUrls.length;

      let completed = 0;



      for (const item of allUrls) {

        try {

          const result = await ensureCachedMedia(item.url, item.type);

        if (result) completed++;

        } catch (e) {

          console.warn('[useCacheManager] Error cacheando:', e);

        }

        const pct = Math.min(100, Math.round((completed / total) * 100));

        setProgress(pct);

      }



      /* ------------------------------------------

         🔹 Fase nueva: descargar TODAS las imágenes

      ------------------------------------------- */

      try {

        const birds = await listBirds();

        console.log("[IMG-DL] → Descargando imágenes… Total aves:", birds.length);

        for (const b of birds) {

          console.log("[IMG-DL] Bird:", b.id, b.name);

          if (b.image_url) {

            console.log("[IMG-DL]   Principal:", b.image_url);

            const cached = await ensureCachedImage(b.image_url);

            console.log("[IMG-DL]   Guardada como:", cached);

          }



          const imgs = await getImagesByBirdId(b.id);

          console.log("[IMG-DL]   Imágenes secundarias:", imgs.length);

          for (const img of imgs) {

            if (img.url) {

              console.log("[IMG-DL]     →", img.url);

              const cachedImg = await ensureCachedImage(img.url);

              console.log("[IMG-DL]       Guardada como:", cachedImg);

            }

          }

        }

        console.log("[IMG-DL] ✔ Fase imágenes completada");

      } catch (imgErr) {

        console.warn("[CacheManager] Error descargando imágenes:", imgErr);

      }



      await Preferences.set({ key: 'hasDownloaded', value: 'true' });

      return true;

    } catch (err) {

      console.error('[useCacheManager] Error en descarga total:', err);

      return false;

    } finally {

      setTimeout(() => {

        setIsDownloading(false);

        setShowProgressModal(false);

      }, 2500);

    }

  }



  return {

    progress,

    isDownloading,

    showProgressModal,

    setShowProgressModal,

    clearAndDownloadAll,

  };

}

