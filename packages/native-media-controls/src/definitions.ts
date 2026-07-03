import type { Plugin, PluginListenerHandle } from '@capacitor/core';

export type NativePlaybackState = 'none' | 'playing' | 'paused' | 'stopped';

export type NativeMediaEvent = 'nativeMediaPlay' | 'nativeMediaPause' | 'nativeMediaStop';

export interface NativeMediaMetadata {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  artworkUrl?: string;
  duration?: number;
}

export interface NativeMediaPosition {
  position: number;
  duration?: number;
  playbackRate?: number;
}

export interface NativeMediaConfigureOptions {
  showNotification?: boolean;
  channelId?: string;
  channelName?: string;
}

export interface NativeMediaControlsPlugin extends Plugin {
  configure(options?: NativeMediaConfigureOptions): Promise<void>;
  setMetadata(metadata: NativeMediaMetadata): Promise<void>;
  setPlaybackState(options: { state: NativePlaybackState }): Promise<void>;
  setPosition(options: NativeMediaPosition): Promise<void>;
  clear(): Promise<void>;
  addListener(
    eventName: NativeMediaEvent,
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
}
