import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { SpringValue } from '@react-spring/web'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import viewportStore from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'

/** A virtual keyboard handler for iOS Capacitor that uses native events and spring physics. */
const iOSCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    /**
     * This value is used to provide animated height updates to virtualKeyboardStore.
     * It uses the same spring physics as the native iOS keyboard.
     */
    const animatedHeight = new SpringValue(0, {
      config: { tension: 3600, friction: 220, mass: 1.2 },
    })

    Keyboard.addListener('keyboardWillShow', info => {
      const height = info.keyboardHeight || 0
      viewportStore.update({ virtualKeyboardHeight: height })
      virtualKeyboardStore.update({ open: true, source: 'ios-capacitor' })

      // Start storing animated height values in virtualKeyboardStore.
      animatedHeight.start({
        to: height,
        onChange: value => {
          virtualKeyboardStore.update({ height: value as unknown as number })
        },
      })
    })

    Keyboard.addListener('keyboardDidShow', info => {
      const height = info.keyboardHeight || 0
      animatedHeight.set(height)
      virtualKeyboardStore.update({ open: true, height, source: 'ios-capacitor' })
    })

    Keyboard.addListener('keyboardWillHide', () => {
      // note: leave open: true until the keyboard has fully hidden
      virtualKeyboardStore.update({ open: true, source: 'ios-capacitor' })

      // Start storing animated height values in virtualKeyboardStore.
      animatedHeight.start({
        to: 0,
        onChange: value => {
          virtualKeyboardStore.update({ height: value as unknown as number })
        },
      })
    })

    Keyboard.addListener('keyboardDidHide', () => {
      animatedHeight.set(0)
      virtualKeyboardStore.update({ open: false, height: 0, source: 'ios-capacitor' })
    })
  },
  destroy: () => {
    Keyboard.removeAllListeners()
  },
}

export default iOSCapacitorHandler
