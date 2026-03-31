import { AnimationPlaybackControls, animate } from 'framer-motion'
import _ from 'lodash'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { isSafari, isTouch } from '../../../browser'
import store from '../../../stores/app'
import viewportStore, { updateSize } from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import measureSafeAreaBottom from '../measureSafeAreaBottom'

/** Provides control over the spring animation. */
let controls: AnimationPlaybackControls | null = null

/** Updates the virtualKeyboardStore state based on the selection. */
const updateIOSSafariKeyboardState = () => {
  // A timeout is necessary to ensure the isKeyboardOpen state is updated after the selection change.
  // This places the function call in the next event loop, after the state has been updated.
  setTimeout(() => {
    // Get the raw height of the keyboard from the viewport store...
    const { virtualKeyboardHeight } = viewportStore.getState()
    const rawHeight = virtualKeyboardHeight || 0

    // ...then subtract the safe-area-bottom inset to get the height above the safe-area baseline.
    // Because we always add a safe-area-bottom inset whenever we position elements, this normalized height
    // is the value we actually need. Consider this an additional 'safe area inset' that applies only when the keyboard is open.
    const targetHeight = rawHeight - measureSafeAreaBottom()

    const isKeyboardOpen = store.getState().isKeyboardOpen
    const keyboardIsVisible = isKeyboardOpen === true

    if (keyboardIsVisible && !virtualKeyboardStore.getState().open) {
      // Stop any existing animation to prevent conflicts
      controls?.stop()

      virtualKeyboardStore.update({ open: true, source: 'ios-safari' })

      // Approximate iOS' keyboard spring animation (same curve as iOSCapacitorHandler)
      controls = animate(virtualKeyboardStore.getState().height, targetHeight, {
        type: 'spring',
        stiffness: 3600,
        damping: 220,
        mass: 1.2,
        onUpdate: value => {
          virtualKeyboardStore.update({ height: value })
        },
      })
    } else if (!keyboardIsVisible && virtualKeyboardStore.getState().open) {
      // Stop any existing animation to prevent conflicts
      controls?.stop()

      // Keep open: true during the closing animation so consumers still account for the keyboard
      virtualKeyboardStore.update({ open: true, source: 'ios-safari' })

      controls = animate(virtualKeyboardStore.getState().height, 0, {
        type: 'spring',
        stiffness: 3600,
        damping: 220,
        mass: 1.2,
        onUpdate: value => {
          virtualKeyboardStore.update({ height: value })
        },
        onComplete: () => {
          virtualKeyboardStore.update({ open: false, height: 0, source: 'ios-safari' })
        },
      })
    }
  }, 0)
}

/** Handles viewport resize events. */
const onResize = _.throttle(() => {
  updateSize() // Ensure viewportStore is updated
  updateIOSSafariKeyboardState()
}, 16.666)

/** A virtual keyboard handler for iOS Safari. */
const iOSSafariHandler: VirtualKeyboardHandler = {
  init: () => {
    if (!isTouch || !isSafari()) return
    document.addEventListener('selectionchange', updateIOSSafariKeyboardState)
    const resizeHost = window.visualViewport || window
    resizeHost.addEventListener('resize', onResize)
  },
  destroy: () => {
    document.removeEventListener('selectionchange', updateIOSSafariKeyboardState)
    const resizeHost = window.visualViewport || window
    resizeHost.removeEventListener('resize', onResize)
    controls?.stop()
  },
}

export default iOSSafariHandler
