import { isTouch } from '../browser'
import viewportStore from '../stores/viewport'

// store the old transform property so it can be restored after preventAutoscroll
let transformOld = ''

/** Prevent the browser from autoscrolling to this editable element. If the element would be hidden by the virtual keyboard, scrolls just enough to make it visible. */
const preventAutoscroll = (
  el: HTMLElement | null | undefined,
  {
    bottomMargin = 0,
  }: {
    /** Number of pixels to leave between the top edge of the virtual keyboard and the autoscroll element. */
    bottomMargin?: number
  } = {},
) => {
  if (!isTouch || el === document.activeElement || !el) return

  // find the center of the viewport so that the browser does not think it needs to autoscroll
  const { height, y } = el.getBoundingClientRect()
  const { innerHeight, virtualKeyboardHeight } = viewportStore.getState()
  const viewportHeight = innerHeight - virtualKeyboardHeight
  const yOffsetCenter = viewportHeight / 2 - height / 2 - y

  // get the distance of the thought below the keyboard which we can offset to keep the thought in view.
  const yBelowKeyboard = Math.max(0, y + height + bottomMargin - viewportHeight)

  transformOld = el.style.transform
  el.style.transform = `translate(-9999px, ${yOffsetCenter + yBelowKeyboard}px)`

  setTimeout(() => preventAutoscrollEnd(el), 10)

  // return cleanup function
  return () => preventAutoscrollEnd(el)
}

/** Clean up styles from preventAutoscroll. This is called automatically 10 ms after preventAutoscroll, but it can and should be called as soon as focus has fired and the autoscroll window has safely passed. */
export const preventAutoscrollEnd = (el: HTMLElement | null | undefined) => {
  if (!el) return
  el.style.transform = transformOld
}

export default preventAutoscroll
