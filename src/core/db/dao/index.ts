// Exportaciones específicas para evitar conflictos
export { upsert, softDelete, findByUpdatedAt, listImaginarios, createImagDemo } from './imaginarios';
export { listBirds, getFeaturedBirds, getTopPopular, upsertBird, seedDemo } from './birds';
export { upsertMany, setLocalFavorite, isFavLocal } from './catalog';

// Exportaciones de activity_log
export { 
  logActivity, 
  getRecentActivity, 
  getActivityByCategory, 
  cleanupOldActivity,
  initActivityLog,
  type ActivityLogEntry 
} from './activity_log';

// Exportaciones de sincronización
export { pullAllTables, pullTableDelta, pullBirdsDelta } from '../../sync/pull';