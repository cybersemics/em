import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'

/** Reports Android keyboard lifecycle through the shared keyboard store.
 * Editor selection and edit-mode effects are handled separately by initKeyboardSelection. */
const androidCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    Keyboard.addListener('keyboardWillHide', () => {
      virtualKeyboardStore.update({ phase: 'closing' })
    })

    Keyboard.addListener('keyboardDidHide', () => {
      virtualKeyboardStore.update({ phase: 'closed' })
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
