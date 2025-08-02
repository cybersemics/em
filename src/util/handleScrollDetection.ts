import { dragHoldActionCreator as dragHold } from '../actions/dragHold'
import { dragInProgressActionCreator as dragInProgress } from '../actions/dragInProgress'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { scrollingActionCreator as scrolling } from '../actions/scrolling'
import { LongPressState } from '../constants'
import store from '../stores/app'

let isScrolling = false
let isTouching = false

/** Track scroll behavior in the Redux state in order to prevent drag-and-drop while scrolling. (#3141)
 * Discard events that come in after the touch ends, and short-circuit the handler if scrolling has already been detected.
 * Throttling onScroll is dicey because the scroll could begin at a time arbitrarily close to the start of a long press.
 */
const onScroll = () => {
  if (isScrolling || !isTouching) return
  isScrolling = true

  const state = store.getState()

  // Set isScrolling to true. This should never occur once allowTouchToScroll has activated because scroll events will be blocked. (#3141)
  // If the scroll event comes in out of order, though, we may need to cancel any in-progress long press or drag-and-drop behavior.
  // Hopefully we can fold dragHold and dragInProgress into longPress in the very near future to cut down on the number of moving parts.
  store.dispatch([
    scrolling({ value: true }),
    ...(state.longPress !== LongPressState.Inactive ? [longPress({ value: LongPressState.Inactive })] : []),
    ...(state.dragHold ? [dragHold({ value: false })] : []),
    ...(state.dragInProgress ? [dragInProgress({ value: false })] : []),
  ])
}

/** Start accepting scroll events when the touch begins. */
const onTouchStart = () => (isTouching = true)

/** Stop accepting scroll events when the touch ends, and update the Redux store to mark the end of scrolling. */
const onTouchEnd = () => {
  isTouching = false
  if (isScrolling) store.dispatch(scrolling({ value: false }))
  isScrolling = false
}

/** Attach the relevant event handlers and return a function to de-register them. */
const handleScrollDetection = () => {
  window.addEventListener('scroll', onScroll)
  window.addEventListener('touchstart', onTouchStart)
  window.addEventListener('touchend', onTouchEnd)

  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('touchstart', onTouchStart)
    window.removeEventListener('touchend', onTouchEnd)
  }
}

export default handleScrollDetection
