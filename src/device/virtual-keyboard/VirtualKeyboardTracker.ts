import { PluginListenerHandle, registerPlugin } from '@capacitor/core'

export interface KeyboardProgressEvent {
  phase: 'willShow' | 'progress' | 'didShow' | 'willHide' | 'didHide'
  /** The corrected IME height in CSS pixels, including the navigation inset. */
  height: number
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
