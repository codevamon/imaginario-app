import { WebPlugin } from '@capacitor/core';

import type {
  NativeMediaConfigureOptions,
  NativeMediaControlsPlugin,
  NativeMediaMetadata,
  NativeMediaPosition,
  NativePlaybackState,
} from './definitions';

const LOG_PREFIX = '[NativeMediaControls]';

export class NativeMediaControlsWeb
  extends WebPlugin
  implements NativeMediaControlsPlugin
{
  async configure(options?: NativeMediaConfigureOptions): Promise<void> {
    console.log(`${LOG_PREFIX} configure (no-op)`, options ?? {});
  }

  async setMetadata(metadata: NativeMediaMetadata): Promise<void> {
    console.log(`${LOG_PREFIX} setMetadata (no-op)`, metadata);
  }

  async setPlaybackState(options: { state: NativePlaybackState }): Promise<void> {
    console.log(`${LOG_PREFIX} setPlaybackState (no-op)`, options);
  }

  async setPosition(options: NativeMediaPosition): Promise<void> {
    console.log(`${LOG_PREFIX} setPosition (no-op)`, options);
  }

  async clear(): Promise<void> {
    console.log(`${LOG_PREFIX} clear (no-op)`);
  }
}
