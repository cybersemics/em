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

      // Animate to safe-area-bottom instead of 0 so bottom-anchored elements
      // smoothly settle at the safe area inset rather than snapping.
      const safeAreaDiv = document.createElement('div')
      safeAreaDiv.style.cssText = 'position:fixed;bottom:0;height:env(safe-area-inset-bottom);visibility:hidden'
      document.body.appendChild(safeAreaDiv)
      const safeAreaBottom = safeAreaDiv.getBoundingClientRect().height
      document.body.removeChild(safeAreaDiv)

      controls = animate(virtualKeyboardStore.getState().height, safeAreaBottom, {
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
      virtualKeyboardStore.update({ open: false, source: 'ios-capacitor' })
    })
  },
  destroy: () => {
    Keyboard.removeAllListeners()
  },
}

export default iOSCapacitorHandler
