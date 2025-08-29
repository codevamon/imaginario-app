// src/core/session/device.ts
import { Preferences } from '@capacitor/preferences';

const KEY = 'device_id';

function genId() {
  return 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

export async function getDeviceId() {
  const { value } = await Preferences.get({ key: KEY });
  if (value) return value;
  const id = genId();
  await Preferences.set({ key: KEY, value: id });
  return id;
}
