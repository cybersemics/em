import _ from 'lodash'
import VirtualKeyboardHandler from '../../../@types/VirtualKeyboardHandler'
import { isSafari, isTouch } from '../../../browser'
import store from '../../../stores/app'
import viewportStore, { updateSize } from '../../../stores/viewport'
import virtualKeyboardStore from '../../../stores/virtualKeyboardStore'

// An approximation of how long it takes the keyboard to open
const VIRTUAL_KEYBOARD_OPEN_DURATION = 400
// An approximation of how long it takes the keyboard to close
const VIRTUAL_KEYBOARD_CLOSE_DURATION = 350

let openingInterval: ReturnType<typeof setInterval> | null = null
let closingInterval: ReturnType<typeof setInterval> | null = null

/** Updates the virtualKeyboardStore state based on the selection. */
const updateIOSSafariKeyboardState = () => {
  // A timeout is necessary to ensure the isKeyboardOpen state is updated after the selection change.
  // This places the function call in the next event loop, after the state has been updated.
  setTimeout(() => {
    const { virtualKeyboardHeight } = viewportStore.getState()
    const targetHeight = virtualKeyboardHeight || 0

    const isKeyboardOpen = store.getState().isKeyboardOpen
    const keyboardIsVisible = isKeyboardOpen === true

    if (keyboardIsVisible && !virtualKeyboardStore.getState().open) {
      if (openingInterval) clearInterval(openingInterval)
      if (closingInterval) clearInterval(closingInterval)

      // Animate the keyboard opening
      const start = Date.now()
      openingInterval = setInterval(() => {
        const duration = Date.now() - start
        const progress = Math.min(1, duration / VIRTUAL_KEYBOARD_OPEN_DURATION)
        const height = targetHeight * progress
        virtualKeyboardStore.update({
          open: true,
          height: height || 0,
          source: 'ios-safari',
        })
        if (progress === 1) {
          clearInterval(openingInterval!)
          openingInterval = null
        }
      }, 16.666)
    } else if (!keyboardIsVisible && virtualKeyboardStore.getState().open) {
      if (openingInterval) clearInterval(openingInterval)
      if (closingInterval) clearInterval(closingInterval)

      // Animate the keyboard closing
      const start = Date.now()
      closingInterval = setInterval(() => {
        const duration = Date.now() - start
        const progress = Math.min(1, duration / VIRTUAL_KEYBOARD_CLOSE_DURATION)
        const height = targetHeight * (1 - progress)
        virtualKeyboardStore.update({
          open: progress < 1,
          height: height || 0,
          source: 'ios-safari',
        })
        if (progress === 1) {
          clearInterval(closingInterval!)
          closingInterval = null
        }
      }, 16.666)
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
    if (openingInterval) clearInterval(openingInterval)
    if (closingInterval) clearInterval(closingInterval)
  },
}

export default iOSSafariHandler
