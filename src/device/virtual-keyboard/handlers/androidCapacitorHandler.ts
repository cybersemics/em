import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { dismissKeyboardActionCreator as dismissKeyboard } from '../../../actions/dismissKeyboard'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import * as selection from '../../selection'
import getSafeAreaBottom from '../getSafeAreaBottom'

/**
 * A virtual keyboard handler for the Android Capacitor app.
 *
 * On Android the WebView does not resize when the keyboard opens or closes (windowSoftInputMode=adjustNothing,
 * IME inset stripping in MainActivity, and plugins.SystemBars.insetsHandling='disable' so Capacitor does not pad
 * the decor view by the IME inset, mirroring iOS Keyboard resize:'none'), so visualViewport never fires a resize
 * event for the keyboard. Additionally, dismissing the keyboard via the Down Arrow virtual
 * button does not blur the editable, so no blur event fires to dismiss the caret. We listen to the native
 * keyboardDidHide event to exit edit mode and clear the browser selection.
 *
 * A selected range has to go earlier than that. The keyboardDidHide event does not arrive until the keyboard has
 * finished animating away, by which point Android has already rebuilt the text context menu around the still-live
 * range and it has visibly flashed back (#4833). The keyboardWillHide event fires at the start of the animation,
 * while the keyboard is still up, which is early enough for the menu to dismiss in one pass.
 *
 * The Android WebView also does not raise the keyboard when the caret is placed by setting the browser
 * selection rather than by a tap, so the keyboard must be shown explicitly via the Keyboard plugin.
 *
 * Because the viewport never shrinks, the keyboard's height is invisible to the web layer and has to come from the
 * native events instead, or nothing knows which part of the screen the keyboard covers.
 *
 * See: https://github.com/cybersemics/em/issues/3958.
 */

/** Converts a native IME height to the value consumers expect. The raw inset runs to the bottom of the screen, and
 * element positioning always re-adds the safe-area inset, so it is subtracted here as in iOSCapacitorHandler. */
const normalizeKeyboardHeight = (keyboardHeight: number | undefined): number =>
  Math.max(0, (keyboardHeight || 0) - getSafeAreaBottom())

const androidCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    Keyboard.addListener('keyboardWillShow', info => {
      const height = normalizeKeyboardHeight(info.keyboardHeight)
      viewportStore.update({ virtualKeyboardHeight: height })
      virtualKeyboardStore.update({ open: true, height })
    })

    Keyboard.addListener('keyboardWillHide', () => {
      selection.collapse()
    })

    Keyboard.addListener('keyboardDidHide', () => {
      // Cleared here rather than on keyboardWillHide so that elements positioned above the keyboard stay put until it
      // has finished animating away, instead of dropping behind it.
      virtualKeyboardStore.update({ open: false, height: 0 })
      store.dispatch(dismissKeyboard())
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
