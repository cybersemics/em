import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import getSafeAreaBottom from '../getSafeAreaBottom'

/** Converts a native IME height to the value consumers expect. The raw inset runs to the bottom of the screen, and
 * element positioning always re-adds the safe-area inset, so it is subtracted here as in iOSCapacitorHandler. */
const normalizeKeyboardHeight = (keyboardHeight: number | undefined): number =>
  Math.max(0, (keyboardHeight || 0) - getSafeAreaBottom())

/** Reports Android keyboard lifecycle and height through the shared keyboard store.
 * Editor selection and edit-mode effects are handled separately by initKeyboardSelection.
 *
 * The WebView does not resize when the keyboard opens (windowSoftInputMode=adjustNothing, IME inset stripping in
 * MainActivity, and plugins.SystemBars.insetsHandling='disable' so Capacitor does not pad the decor view by the IME
 * inset), so the keyboard's height is invisible to the web layer and has to come from the native events instead, or
 * nothing knows which part of the screen the keyboard covers. */
const androidCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    Keyboard.addListener('keyboardWillShow', info => {
      const height = normalizeKeyboardHeight(info.keyboardHeight)
      viewportStore.update({ virtualKeyboardHeight: height })
      virtualKeyboardStore.update({ open: true, height })
    })

    Keyboard.addListener('keyboardWillHide', () => {
      virtualKeyboardStore.update({ phase: 'closing' })
    })

    Keyboard.addListener('keyboardDidHide', () => {
      // The height is cleared here rather than on keyboardWillHide so that elements positioned above the keyboard stay
      // put until it has finished animating away, instead of dropping behind it.
      virtualKeyboardStore.update({ open: false, height: 0, phase: 'closed' })
    })
  },
  destroy: () => {
    Keyboard.removeAllListeners()
  },
  show: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    Keyboard.show()
  },
}

export default androidCapacitorHandler
