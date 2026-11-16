import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import getSafeAreaBottom from '../getSafeAreaBottom'

/** Reports Android keyboard lifecycle through the shared keyboard store.
 * Editor selection and edit-mode effects are handled separately by initKeyboardSelection. */
const androidCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    Keyboard.addListener('keyboardWillShow', info => {
      const height = Math.max(0, info.keyboardHeight - getSafeAreaBottom())
      viewportStore.update({ virtualKeyboardHeight: height })
      virtualKeyboardStore.update({ open: true, height, phase: 'opening' })
    })

    Keyboard.addListener('keyboardDidShow', () => {
      virtualKeyboardStore.update({ phase: 'open' })
    })

    Keyboard.addListener('keyboardWillHide', () => {
      virtualKeyboardStore.update({ phase: 'closing' })
    })

    Keyboard.addListener('keyboardDidHide', () => {
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
