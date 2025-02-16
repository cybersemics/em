import { isIOS, isSafari, isTouch } from '../browser'
import * as selection from '../device/selection'
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
const updateKeyboardState = () => {
  const keyboardIsVisible = selection.isActive()
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
}

if (isTouch && isSafari() && !isIOS) {
  updateKeyboardState()
  document.addEventListener('selectionchange', updateKeyboardState)
}

export default safariKeyboardStore
