import store from './app'
import reactMinistore from './react-ministore'

const VIRTUAL_KEYBOARD_CLOSE_DURATION = 800

const safariKeyboardStore = reactMinistore<{
  open: boolean
  closing: boolean
}>({
  open: false,
  closing: false,
})

/** Updates the safariKeyboardStore state based on the selection. */
export const updateSafariKeyboardState = () => {
  // A timeout is necessary to ensure the editing state is updated after the selection change.
  // This places the function call in the next event loop, after the state has been updated.
  setTimeout(() => {
    const editing = store.getState().editing
    const keyboardIsVisible = editing === true
    if (safariKeyboardStore.getState().open && !keyboardIsVisible) {
      safariKeyboardStore.update({
        closing: true,
      })
      setTimeout(() => {
        safariKeyboardStore.update({
          closing: false,
        })
      }, VIRTUAL_KEYBOARD_CLOSE_DURATION)
    }
    safariKeyboardStore.update({
      open: keyboardIsVisible,
    })
  }, 0)
}

export default safariKeyboardStore
