import { PluginListenerHandle, registerPlugin } from '@capacitor/core'

export interface KeyboardProgressEvent {
  phase: 'willShow' | 'progress' | 'didShow' | 'willHide' | 'didHide'
  /** The corrected IME height in CSS pixels, including the navigation inset. */
  height: number
  /** The measured fully shown IME height in CSS pixels, used to bound the WebView paint lead. */
  shownHeight: number
  /** Monotonic native sample time in milliseconds; absent in older Android builds. */
  timestampMs?: number
  /** The navigation inset in CSS pixels, used when a blurred editable changes the IME's visible top. */
  navigationInset: number
}

interface VirtualKeyboardTrackerPlugin {
  addListener(
    eventName: 'keyboardProgress',
    listener: (event: KeyboardProgressEvent) => void,
  ): Promise<PluginListenerHandle>
  removeAllListeners(): Promise<void>
}

const VirtualKeyboardTracker = registerPlugin<VirtualKeyboardTrackerPlugin>('VirtualKeyboardTracker')

export default VirtualKeyboardTracker
