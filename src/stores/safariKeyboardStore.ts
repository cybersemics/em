import store from './app'
import reactMinistore from './react-ministore'
import viewportStore from './viewport'

// An approximation of how long it takes the keyboard to open
const VIRTUAL_KEYBOARD_OPEN_DURATION = 200
// An approximation of how long it takes the keyboard to close
const VIRTUAL_KEYBOARD_CLOSE_DURATION = 150

/** A store that tracks the state of the Safari virtual keyboard. */
const safariKeyboardStore = reactMinistore({
  open: false,
  height: 0,
})

/** Updates the safariKeyboardStore state based on the selection. */
export const updateSafariKeyboardState = () => {
  // A timeout is necessary to ensure the isKeyboardOpen state is updated after the selection change.
  // This places the function call in the next event loop, after the state has been updated.
  setTimeout(() => {
    const { virtualKeyboardHeight } = viewportStore.getState()
    const isKeyboardOpen = store.getState().isKeyboardOpen
    const keyboardIsVisible = isKeyboardOpen === true
    if (keyboardIsVisible && !safariKeyboardStore.getState().open) {
      // Animate the keyboard opening
      const start = Date.now()
      const interval = setInterval(() => {
        const duration = Date.now() - start
        const progress = Math.min(1, duration / VIRTUAL_KEYBOARD_OPEN_DURATION)
        const height = virtualKeyboardHeight * progress
        safariKeyboardStore.update({
          open: true,
          height,
        })
        if (progress === 1) {
          clearInterval(interval)
        }
      }, 16.666)
    } else if (!keyboardIsVisible && safariKeyboardStore.getState().open) {
      // Animate the keyboard closing
      const start = Date.now()
      const interval = setInterval(() => {
        const duration = Date.now() - start
        const progress = Math.min(1, duration / VIRTUAL_KEYBOARD_CLOSE_DURATION)
        const height = virtualKeyboardHeight * (1 - progress)
        safariKeyboardStore.update({
          open: progress < 1,
          height,
        })
        if (progress === 1) {
          clearInterval(interval)
        }
      }, 16.666)
    }
  }, 0)
}

export default safariKeyboardStore
