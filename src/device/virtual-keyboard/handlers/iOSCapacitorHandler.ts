import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { AnimationPlaybackControls, animate } from 'motion'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import viewportStore from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'

/** A virtual keyboard handler for iOS Capacitor that uses native events and spring physics. */
const iOSCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    /** Provides control over the spring animation. */
    let controls: AnimationPlaybackControls | null = null

    Keyboard.addListener('keyboardWillShow', info => {
      const height = info.keyboardHeight || 0
      viewportStore.update({ virtualKeyboardHeight: height })
      virtualKeyboardStore.update({ open: true, source: 'ios-capacitor' })

      // Stop any existing animation to prevent conflicts
      controls?.stop()

      // Start storing animated height values in virtualKeyboardStore
      // The animation provided is an approximation of iOS' keyboard spring animation
      controls = animate(virtualKeyboardStore.getState().height, height, {
        type: 'spring',
        stiffness: 3600,
        damping: 220,
        mass: 1.2,
        onUpdate: value => {
          virtualKeyboardStore.update({ height: value })
        },
      })
    })

    Keyboard.addListener('keyboardDidShow', info => {
      const height = info.keyboardHeight || 0
      controls?.stop()
      virtualKeyboardStore.update({ open: true, height, source: 'ios-capacitor' })
    })

    Keyboard.addListener('keyboardWillHide', () => {
      // note: leave open: true until the keyboard has fully hidden
      virtualKeyboardStore.update({ open: true, source: 'ios-capacitor' })

      // Stop any existing animation to prevent conflict.
      controls?.stop()

      // Start storing animated height values in virtualKeyboardStore.
      controls = animate(virtualKeyboardStore.getState().height, 0, {
        type: 'spring',
        stiffness: 3600,
        damping: 220,
        mass: 1.2,
        onUpdate: value => {
          virtualKeyboardStore.update({ height: value })
        },
      })
    })

    Keyboard.addListener('keyboardDidHide', () => {
      controls?.stop()
      virtualKeyboardStore.update({ open: false, height: 0, source: 'ios-capacitor' })
    })
  },
  destroy: () => {
    Keyboard.removeAllListeners()
  },
}

export default iOSCapacitorHandler
