import { isSafari, isTouch } from '../browser'
import * as selection from './selection'

/** Focuses an editable and places the caret without allowing iOS WebKit to change the scroll position. */
const focusWithoutAutoscroll = (el: HTMLElement | null | undefined, { offset }: { offset: number }): void => {
  if (!el) return

  // Keep the existing implicit-focus selection behavior on other platforms. iOS is the only platform
  // switching from native autoscroll to em's scrollCursorIntoView policy.
  if (!isTouch || !isSafari()) {
    selection.set(el, { offset })
    return
  }

  const wasFocused = el === document.activeElement
  const currentOffset = wasFocused ? selection.offsetThought() : null
  if (wasFocused && currentOffset === offset) return

  if (!wasFocused) el.focus({ preventScroll: true })

  // Setting a Range inside a contenteditable can trigger a second native reveal independently of
  // focus. Selection has no preventScroll option, so restore any synchronous movement before paint.
  const scrollY = window.scrollY
  selection.set(el, { offset })
  if (window.scrollY !== scrollY) window.scrollTo(window.scrollX, scrollY)
}

export default focusWithoutAutoscroll
