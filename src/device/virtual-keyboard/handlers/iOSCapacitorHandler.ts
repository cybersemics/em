import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { AnimationPlaybackControls, animate } from 'framer-motion'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { LongPressState } from '../../../constants'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import getSafeAreaBottom from '../getSafeAreaBottom'

/** A virtual keyboard handler for iOS Capacitor that uses native events and spring physics.
 * Normalizes native keyboard height by subtracting safe-area-bottom, so the store value
 * represents the keyboard's contribution above the safe-area baseline. */
const iOSCapacitorHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('Keyboard')) return

    /** Provides control over the spring animation. */
    let controls: AnimationPlaybackControls | null = null

    Keyboard.addListener('keyboardWillShow', info => {
      // Ignore the transient keyboard show that iOS fires from the unpreventable long-press onFocus during a
      // drag (#4683). We dismiss the keyboard immediately when a drag begins, but reacting to this show would
      // animate the virtual keyboard height up and then straight back down, making the drag-and-drop alert
      // jump. Skip the layout update while a drag gesture is active; the keyboard should never be open then.
      if (store.getState().longPress !== LongPressState.Inactive) return

      // Get the raw height of the keyboard from the event...
      const rawHeight = info.keyboardHeight || 0

      // ...then subtract the safe-area-bottom inset to get the height above the safe-area baseline.
      // Because we always add a safe-area-bottom inset whenever we position elements, this normalized height
      // is the value we actually need. Consider this an additional 'safe area inset' that applies only when the keyboard is open.
      const targetHeight = rawHeight - getSafeAreaBottom()
      viewportStore.update({ virtualKeyboardHeight: targetHeight })
      virtualKeyboardStore.update({ open: true })

      // Stop any existing animation to prevent conflicts
      controls?.stop()

      // Start storing animated height values in virtualKeyboardStore
      // The animation provided is an approximation of iOS' keyboard spring animation
      controls = animate(virtualKeyboardStore.getState().height, targetHeight, {
        type: 'spring',
        stiffness: 3600,
        damping: 220,
        mass: 1.2,
        onUpdate: value => {
          virtualKeyboardStore.update({ height: value })
        },
      })
    })

    Keyboard.addListener('keyboardWillHide', () => {
      // note: leave open: true until the keyboard has fully hidden
      virtualKeyboardStore.update({ open: true })

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
        onComplete: () => {
          virtualKeyboardStore.update({ open: false, height: 0 })
        },
      })
    })
  },
  destroy: () => {
    Keyboard.removeAllListeners()
  },
}

export default iOSCapacitorHandler
