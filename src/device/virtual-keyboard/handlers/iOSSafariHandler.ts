import { AnimationPlaybackControls, animate } from 'framer-motion'
import _ from 'lodash'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { isSafari, isTouch } from '../../../browser'
import store from '../../../stores/app'
import { updateSize } from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'
import getSafeAreaBottom from '../getSafeAreaBottom'

/** Provides control over the spring animation. */
let controls: AnimationPlaybackControls | null = null

/** Per-orientation virtual keyboard height in raw px (before the safe-area-bottom inset is
 * subtracted). The iOS keyboard height is stable per orientation, so the last measured value is a
 * reliable estimate for the next open. Seeded with a geometric guess until the keyboard can first
 * be measured. */
let kbHeightPortrait = window.innerHeight / 2.275
let kbHeightLandscape = window.innerWidth / 1.7

/** Returns true when ScreenOrientation reports portrait; falls back to media query if unavailable. */
const getIsPortrait = () =>
  window.screen.orientation?.type
    ? window.screen.orientation.type.startsWith('portrait')
    : window.matchMedia('(orientation: portrait)').matches

/** Measures the keyboard's raw height from visualViewport, refreshing the per-orientation cache.
 * Returns the live measurement while the keyboard is open, or the cached/estimated height when it
 * cannot be measured directly (e.g. from a selectionchange before the keyboard has slid in). Safari
 * has no API for the keyboard's final height, so we derive it from the viewport shrinkage. */
const measureKeyboardHeight = (): number => {
  const isPortrait = getIsPortrait()
  const measured = window.visualViewport ? window.innerHeight - window.visualViewport.height : 0
  if (measured > 0) {
    if (isPortrait) kbHeightPortrait = measured
    else kbHeightLandscape = measured
  }
  return measured > 0 ? measured : isPortrait ? kbHeightPortrait : kbHeightLandscape
}

/** The spring's current target height. Unlike Capacitor — which delivers the keyboard's final height
 * upfront via `keyboardWillShow` — Safari only exposes the height progressively, via
 * `visualViewport.resize` events that fire as the keyboard slides in. We must re-target the spring
 * as new measurements arrive; this also covers prediction-bar toggles, emoji-keyboard switches,
 * and orientation changes that resize the keyboard mid-edit. */
let currentTargetHeight: number | null = null

/** The keyboard's predicted final height — the settled height of the previous open. Published to
 * virtualKeyboardStore.targetHeight at open detection so subscribers get the final height upfront
 * (Capacitor-style one-shot semantics) instead of Safari's progressive measurements. Exact after
 * the first open, since iOS keyboard height is stable per orientation. */
let predictedFinalHeight: number | null = null

/** Updates the virtualKeyboardStore state based on the selection. */
const updateIOSSafariKeyboardState = () => {
  // A timeout is necessary to ensure the isKeyboardOpen state is updated after the selection change.
  // This places the function call in the next event loop, after the state has been updated.
  setTimeout(() => {
    // Measure the raw height of the keyboard from visualViewport (falling back to the
    // per-orientation estimate when it can't be measured directly)...
    const rawHeight = measureKeyboardHeight()

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

      // Opening — rather than re-measuring mid-slide or resizing mid-edit — if the keyboard was
      // fully closed (null) or still animating closed (0).
      const isOpening = currentTargetHeight === null || currentTargetHeight === 0

      controls?.stop()

      // Publish the keyboard's *predicted* final height once, at open detection — emulating
      // Capacitor's keyboardWillShow semantics (final height upfront, one targetHeight event per
      // keyboard movement). Safari can only measure the keyboard progressively as it slides (see
      // currentTargetHeight above); publishing every intermediate measurement would fire
      // subscribers like useScrollCursorIntoView 5-10 times per open, restarting the autoscroll
      // mid-flight each time. The prediction is the settled height of the previous open, seeded
      // from measureKeyboardHeight's per-orientation estimate on the first open.
      if (isOpening) {
        predictedFinalHeight = Math.max(targetHeight, predictedFinalHeight ?? targetHeight)
        virtualKeyboardStore.update({ open: true, targetHeight: predictedFinalHeight })
      } else if (targetHeight > virtualKeyboardStore.getState().targetHeight) {
        // The keyboard exceeded the prediction (stale prediction, or the prediction bar toggled
        // on mid-edit): correct upward. Settling *lower* than predicted is left alone — the
        // bottom trigger edge then sits slightly above the keyboard, which over-reveals
        // harmlessly — and the prediction self-corrects when the keyboard closes.
        virtualKeyboardStore.update({ targetHeight })
      }
      currentTargetHeight = targetHeight

      // Approximate iOS' keyboard spring animation (same curve as iOSCapacitorHandler).
      // The spring tracks the *measured* height so keyboard-riding UI (e.g. usePositionFixed)
      // stays accurate even while the published targetHeight holds the prediction.
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

      // Remember the settled height as the prediction for the next open.
      if (currentTargetHeight) predictedFinalHeight = currentTargetHeight

      // Keep open: true during the closing animation so consumers still account for the keyboard
      virtualKeyboardStore.update({ open: true, targetHeight: 0 })
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
