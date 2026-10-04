import { AnimationPlaybackControls, animate } from 'framer-motion'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import store from '../../../stores/app'
import viewportStore from '../../../stores/viewportStore'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'

/** Provides control over the spring animation. */
let controls: AnimationPlaybackControls | null = null

/** Unsubscribes from the app store. Set while the handler is initialized. */
let unsubscribe: (() => void) | null = null

/** The last value of state.isKeyboardOpen seen by the store subscription, used to react only to changes. */
let wasKeyboardOpen = false

/** Springs virtualKeyboardStore.height to the given height, and closes the store once it settles at 0. */
const animateHeight = (targetHeight: number) => {
  controls?.stop()

  // Keep open: true while the keyboard is animating away so consumers still account for it.
  virtualKeyboardStore.update({ open: true })

  // Same curve as the iOS handlers.
  controls = animate(virtualKeyboardStore.getState().height, targetHeight, {
    type: 'spring',
    stiffness: 3600,
    damping: 220,
    mass: 1.2,
    onUpdate: value => {
      virtualKeyboardStore.update({ height: value })
    },
    onComplete: () => {
      if (targetHeight === 0) {
        virtualKeyboardStore.update({ open: false, height: 0 })
      }
    },
  })
}

/** Opens virtualKeyboardStore at the estimated keyboard height when edit mode starts, and closes it when edit mode ends. */
const onStoreChange = () => {
  const isKeyboardOpen = store.getState().isKeyboardOpen === true
  if (isKeyboardOpen === wasKeyboardOpen) return
  wasKeyboardOpen = isKeyboardOpen

  animateHeight(isKeyboardOpen ? viewportStore.getState().virtualKeyboardHeight : 0)
}

/** Stops following edit mode and closes virtualKeyboardStore. */
const stopSimulating = () => {
  unsubscribe?.()
  unsubscribe = null
  controls?.stop()
  controls = null
  wasKeyboardOpen = false
  virtualKeyboardStore.update({ open: false, height: 0 })
}

/** Hands over to the real keyboard as soon as the browser reports one, since this handler's estimate is no longer needed. */
const onGeometryChange = () => {
  if (navigator.virtualKeyboard.boundingRect.height === 0) return
  navigator.virtualKeyboard.removeEventListener('geometrychange', onGeometryChange)
  stopSimulating()
}

/**
 * A development-only virtual keyboard handler that simulates a software keyboard in desktop Chrome's device
 * emulation (responsive design mode), which is where most mobile development happens.
 *
 * Device emulation reports a touch device with the Chromium VirtualKeyboard API, so the platform switch picks
 * androidWebHandler, but no software keyboard ever appears and geometrychange never reports a height. Nothing writes
 * to virtualKeyboardStore, so keyboard-aware UI such as the Formatting Bar never appears. This handler runs alongside
 * androidWebHandler and springs virtualKeyboardStore open to viewportStore's estimated keyboard height whenever edit
 * mode starts, and closed when it ends.
 *
 * Device emulation cannot be told apart from a real Android phone when the handler is chosen, so the handler stops
 * itself the first time geometrychange reports a real keyboard, e.g. on a phone pointed at the dev server.
 */
const simulatedKeyboardHandler: VirtualKeyboardHandler = {
  init: () => {
    navigator.virtualKeyboard?.addEventListener('geometrychange', onGeometryChange)
    onStoreChange()
    unsubscribe = store.subscribe(onStoreChange)
  },
  destroy: () => {
    navigator.virtualKeyboard?.removeEventListener('geometrychange', onGeometryChange)
    stopSimulating()
  },
}

export default simulatedKeyboardHandler
