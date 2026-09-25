import { PluginListenerHandle, registerPlugin } from '@capacitor/core'
import KeyboardAnimationEvent from '../../@types/KeyboardAnimationEvent'

export interface KeyboardProgressEvent {
  phase: 'willShow' | 'progress' | 'didShow' | 'willHide' | 'didHide'
  /** The corrected IME height in CSS pixels, including the navigation inset. */
  height: number
  /** The measured fully shown IME height in CSS pixels, used to reconcile the animation endpoint. */
  shownHeight: number
  /** Monotonic native sample time in milliseconds; absent in older Android builds. */
  timestampMs?: number
  /** The navigation inset in CSS pixels, included in the IME height. */
  navigationInset: number
}

interface VirtualKeyboardTrackerPlugin {
  getClock(): Promise<{ nativeMs: number }>
  addListener(
    eventName: 'keyboardAnimation',
    listener: (event: KeyboardAnimationEvent) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'keyboardProgress',
    listener: (event: KeyboardProgressEvent) => void,
  ): Promise<PluginListenerHandle>
  removeAllListeners(): Promise<void>
}

const VirtualKeyboardTracker = registerPlugin<VirtualKeyboardTrackerPlugin>('VirtualKeyboardTracker')

export default VirtualKeyboardTracker
