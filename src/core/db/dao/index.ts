// Exportaciones específicas para evitar conflictos
export { upsert, softDelete, findByUpdatedAt, listImaginarios, createImagDemo } from './imaginarios';
export { listBirds, getFeaturedBirds, getTopPopular, upsertBird, seedDemo } from './birds';
export { upsertMany, setLocalFavorite, isFavLocal } from './catalog';