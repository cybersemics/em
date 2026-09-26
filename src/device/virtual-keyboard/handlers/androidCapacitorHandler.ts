import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { dismissKeyboardActionCreator as dismissKeyboard } from '../../../actions/dismissKeyboard'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import * as selection from '../../selection'
import VirtualKeyboardTracker from '../VirtualKeyboardTracker'
import androidKeyboardAnimation from '../androidKeyboardAnimation'

/** Returns true when this Android build includes the native per-frame IME tracker. */
const hasTracker = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('VirtualKeyboardTracker')

/** The Android 11+ tracker owns keyboard lifecycle because its decor-view animation callback supersedes
 * Capacitor Keyboard's callback. Older Android versions retain the Capacitor hide-event behavior. */
const androidCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    if (!hasTracker()) {
      Keyboard.addListener('keyboardWillHide', () => selection.collapse())
      Keyboard.addListener('keyboardDidHide', () => store.dispatch(dismissKeyboard()))
      return
    }

    document.documentElement.style.setProperty('--virtual-keyboard-height', '0px')
    androidKeyboardAnimation.init()
    VirtualKeyboardTracker.addListener('keyboardProgress', event => {
      const { phase, height } = event
      androidKeyboardAnimation.progress(event)
      document.documentElement.style.setProperty('--virtual-keyboard-height', `${height}px`)

      if (phase === 'willShow') {
        virtualKeyboardStore.update({ open: true })
      } else if (phase === 'didShow') {
        viewportStore.update({ virtualKeyboardHeight: height })
        virtualKeyboardStore.update({ open: true, height })
      } else if (phase === 'willHide') {
        selection.collapse()
      } else if (phase === 'didHide') {
        viewportStore.update({ virtualKeyboardHeight: 0 })
        virtualKeyboardStore.update({ open: false, height: 0 })
        store.dispatch(dismissKeyboard())
      }
    })
  },
  destroy: () => {
    Keyboard.removeAllListeners()
    if (hasTracker()) {
      androidKeyboardAnimation.destroy()
      VirtualKeyboardTracker.removeAllListeners()
      document.documentElement.style.removeProperty('--virtual-keyboard-height')
    }
  },
  show: () => {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Keyboard')) Keyboard.show()
  },
}

export default androidCapacitorHandler
