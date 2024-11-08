import { isTouch } from '../browser'
import viewportStore from '../stores/viewport'

/** Duration after preventAutoscroll is called before the temporary styles are reset. */
export const PREVENT_AUTOSCROLL_TIMEOUT = 10

// store the existinp css properties so they can be restored after preventAutoscroll
let transformOld = ''
let paddingBottomOld = ''
let paddingTopOld = ''

let timeoutId: number | undefined

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
  const yCenter = yOffsetCenter + yBelowKeyboard

  transformOld = el.style.transform
  paddingBottomOld = el.style.paddingBottom
  paddingTopOld = el.style.paddingTop
  el.setAttribute('data-prevent-autoscroll', 'true')

  // below center
  if (yCenter < 0) {
    // paddingTop keeps the actual text in the same place, despite the element being translated up to prevent autoscroll.
    // Otherwise we are stuck with two bad options:
    // - Only use transform (previous implementation): The browser selection becomes invisible on iOS 17. getSelection still returns the correct node and offset, so it is programmatically undetectable.
    // - Add a setTimeout to the preventAutoscrollEnd that is called in Editable.onFocus: The browser selection is visible, but the timeout introduces enough delay that the thought is re-rendered before its style is restored. This causes the thought to blink out of existence for a split second.
    el.style.transform = `translate(0, ${yCenter * 2}px)`
    el.style.paddingTop = `${-yCenter * 2}px`
  }
  // above center
  else {
    // When the bottom edge of element is below the bottom edge of the screen, autoscroll is disabled completely.
    // TODO: Allow autoscroll if thought is above the top edge of the screen (can that happen?)
    el.style.paddingBottom = `${viewportHeight}px`
  }

  // 10ms should be plenty of time for Editable.onFocus to fire after preventAutoscroll is first called, and thus call preventAutoscrollEnd, but if for some reason that does not happen we should go ahead and call it to clean up. This will result in a noticeable blink, but it is better than the thought getting stuck.
  timeoutId = setTimeout(() => preventAutoscrollEnd(el), PREVENT_AUTOSCROLL_TIMEOUT) as unknown as number

  // return cleanup function
  return () => preventAutoscrollEnd(el)
}

/** Clean up styles from preventAutoscroll. This is called automatically 10 ms after preventAutoscroll, but it can and should be called as soon as focus has fired and the autoscroll window has safely passed. */
export const preventAutoscrollEnd = (el: HTMLElement | null | undefined) => {
  clearTimeout(timeoutId)
  timeoutId = undefined

  if (!el) return

  el.style.transform = transformOld
  el.style.paddingBottom = paddingBottomOld
  el.style.paddingTop = paddingTopOld
  el.removeAttribute('data-prevent-autoscroll')
}

/** Returns true if preventAutoscroll is currently in progress. */
export const isPreventAutoscrollInProgress = () => !!timeoutId

export default preventAutoscroll
