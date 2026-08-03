import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { dismissKeyboardActionCreator as dismissKeyboard } from '../../../actions/dismissKeyboard'
import store from '../../../stores/app'

/**
 * A virtual keyboard handler for the Android Capacitor app.
 *
 * On Android the WebView does not resize when the keyboard opens or closes (windowSoftInputMode=adjustNothing
 * plus IME inset stripping in MainActivity, mirroring iOS Keyboard resize:'none'), so visualViewport never
 * fires a resize event for the keyboard. Additionally, dismissing the keyboard via the Down Arrow virtual
 * button does not blur the editable, so no blur event fires to dismiss the caret. We listen to the native
 * keyboardDidHide event to exit edit mode and clear the browser selection.
 *
 * The Android WebView also does not raise the keyboard when the caret is placed by setting the browser
 * selection rather than by a tap, so the keyboard must be shown explicitly via the Keyboard plugin.
 *
 * See: https://github.com/cybersemics/em/issues/3958.
 */
const androidCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    Keyboard.addListener('keyboardDidHide', () => {
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
