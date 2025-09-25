// src/core/db/dao/utils/dateHelpers.ts

/**
 * Convierte un valor (number, string o null) a fecha ISO string.
 * Retorna undefined si no se puede convertir.
 */
export function toIso(value: any): string | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'number') {
    try {
      return new Date(value).toISOString();
    } catch {
      return undefined;
    }
  }

  const parsed = Date.parse(value);
  return isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

/**
 * Convierte un valor (number, string o null) a fecha ISO string.
 * Retorna null si no se puede convertir.
 */
export function toIsoOrNull(value: any): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    try {
      return new Date(value).toISOString();
    } catch {
      return null;
    }
  }

  const parsed = Date.parse(value);
  return isNaN(parsed) ? null : new Date(parsed).toISOString();
}
