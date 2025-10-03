// Utilidades para simular metadatos en datos fake

/**
 * Devuelve un timestamp "updated_at" coherente en milisegundos
 * por defecto: ahora mismo
 */
export function fakeUpdatedAt(offsetMs: number = 0): string {
  return String(Date.now() + offsetMs);
}

/**
 * Devuelve un timestamp "deleted_at" coherente
 * por defecto: null (registro activo)
 */
export function fakeDeletedAt(isDeleted: boolean = false): string | null {
  return isDeleted ? String(Date.now()) : null;
}
