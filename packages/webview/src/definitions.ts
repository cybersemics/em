import type { PluginListenerHandle } from '@capacitor/core'

export interface NativeHistoryEvent {
  /**
   * Which native history gesture was performed.
   */
  type: 'undo' | 'redo'
}

export interface WebviewBackgroundPlugin {
  changeBackgroundColor(options: { color: string }): Promise<void>

  /**
   * Emitted when the user performs a native undo/redo gesture on iOS (three-finger swipe, shake-to-undo,
   * or the Edit menu). The webview's own undo is never run, so the app is free to apply its own.
   */
  addListener(
    eventName: 'nativeHistory',
    listenerFunc: (event: NativeHistoryEvent) => void,
  ): Promise<PluginListenerHandle>

  /**
   * Removes all listeners registered on this plugin.
   */
  removeAllListeners(): Promise<void>
}
