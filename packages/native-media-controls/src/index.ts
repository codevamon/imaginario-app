import { registerPlugin } from '@capacitor/core';

import type { NativeMediaControlsPlugin } from './definitions';

const NativeMediaControls = registerPlugin<NativeMediaControlsPlugin>(
  'NativeMediaControls',
  {
    web: () =>
      import('./web').then((module) => new module.NativeMediaControlsWeb()),
  }
);

export * from './definitions';
export { NativeMediaControls };
