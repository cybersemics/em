import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { dismissCaretOnKeyboardClose } from '../../../util/handleKeyboardVisibility'

/**
 * A virtual keyboard handler for the Android Capacitor app.
 *
 * On Android the WebView does not resize when the keyboard opens or closes (windowSoftInputMode=adjustNothing
 * plus IME inset stripping in MainActivity, mirroring iOS Keyboard resize:'none'), so visualViewport never
 * fires a resize event for the keyboard. Additionally, dismissing the keyboard via the Down Arrow virtual
 * button does not blur the editable, so no blur event fires to dismiss the caret. We listen to the native
 * keyboardDidHide event to exit edit mode and clear the caret.
 *
 * See: https://github.com/cybersemics/em/issues/3958.
 */
const androidCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    Keyboard.addListener('keyboardDidHide', () => {
      dismissCaretOnKeyboardClose()
    })
  },
  destroy: () => {
    Keyboard.removeAllListeners()
  },
}

export default androidCapacitorHandler
