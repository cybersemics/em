import { AnimationPlaybackControls, animate } from 'framer-motion'
import _ from 'lodash'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { isSafari, isTouch } from '../../../browser'
import store from '../../../stores/app'
import viewportStore, { updateSize } from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import getSafeAreaBottom from '../getSafeAreaBottom'

/** Provides control over the spring animation. */
let controls: AnimationPlaybackControls | null = null

/** The spring's current target height. Unlike Capacitor — which delivers the keyboard's final height
 * upfront via `keyboardWillShow` — Safari only exposes the height progressively, via
 * `visualViewport.resize` events that fire as the keyboard slides in. We must re-target the spring
 * as new measurements arrive; this also covers prediction-bar toggles, emoji-keyboard switches,
 * and orientation changes that resize the keyboard mid-edit. */
let currentTargetHeight: number | null = null

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
    const targetHeight = rawHeight - getSafeAreaBottom()

    const isKeyboardOpen = store.getState().isKeyboardOpen
    const keyboardIsVisible = isKeyboardOpen === true

    if (keyboardIsVisible) {
      // No-op for cursor-move events that don't change the keyboard height (e.g. selectionchange
      // while already editing).
      if (targetHeight === currentTargetHeight) return

      controls?.stop()
      virtualKeyboardStore.update({ open: true })
      currentTargetHeight = targetHeight

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
    } else if (virtualKeyboardStore.getState().open) {
      if (currentTargetHeight === 0) return

      controls?.stop()

      // Keep open: true during the closing animation so consumers still account for the keyboard
      virtualKeyboardStore.update({ open: true })
      currentTargetHeight = 0

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
          currentTargetHeight = null
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
    currentTargetHeight = null
  },
}

export default iOSSafariHandler
