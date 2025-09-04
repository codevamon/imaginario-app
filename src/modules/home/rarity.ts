export function rarityLabel(r?: number | string | null) {
  if (typeof r === 'string') return r;          // por si hay datos antiguos con texto
  const map = ['baja', 'media', 'alta', 'muy alta'];
  const n = Math.max(0, Math.min(3, Number(r ?? 0)));
  return map[n];
}
