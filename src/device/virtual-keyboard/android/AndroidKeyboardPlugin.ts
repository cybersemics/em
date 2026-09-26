import { PluginListenerHandle, registerPlugin } from '@capacitor/core'
import AndroidKeyboardAnimationEvent from '../../../@types/AndroidKeyboardAnimationEvent'

/** Android 11+ bridge: animation metadata and discrete geometry, never per-frame position samples. */
interface AndroidKeyboardPlugin {
  getClock(): Promise<{ nativeMs: number }>
  getState(): Promise<{ height: number }>
  addListener(
    eventName: 'keyboardAnimation',
    listener: (event: AndroidKeyboardAnimationEvent) => void,
  ): Promise<PluginListenerHandle>
}

const AndroidKeyboardPlugin = registerPlugin<AndroidKeyboardPlugin>('AndroidKeyboardPlugin')

export default AndroidKeyboardPlugin
