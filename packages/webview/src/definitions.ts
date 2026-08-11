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
   * Reports whether the app has an action to undo or redo, which iOS reads to decide whether to offer the
   * native history gesture. Gestures it does offer are confirmed with an overlay, so an app that does not
   * report its availability has iOS confirming an undo or redo that does nothing.
   */
  setHistoryAvailability(options: { canUndo: boolean; canRedo: boolean }): Promise<void>

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
