import { isTouch, isSafari } from '../browser'
import { NOOP } from '../constants'

/**
 * Allow a focus to be set asynchronously on Mobile Safari.
 *
 * If there is no active selection, Mobile Safari will only allow programmatic selection within a click or touch event handler. Otherwise trying to focus or set the selection does nothing. To be able to set the selection in an asynchronous callback, you have to first set the selection to an arbitrary element in the initial click or touch handler. Then setting the selection will work.
 *
 * See: https://stackoverflow.com/a/45703019/480608.
 */
export const AsyncFocus = (): (() => void) => {
  if (!isTouch || !isSafari) return NOOP

  // create invisible dummy input to receive the focus
  const hiddenInput = document.createElement('input')

  hiddenInput.setAttribute('type', 'text')
  hiddenInput.style.position = 'absolute'
  hiddenInput.style.opacity = '0'

  // even with position:absolute having a positive width can affect the body width at very small screen sizes
  hiddenInput.style.height = '0'
  hiddenInput.style.width = '0'
  hiddenInput.style.minWidth = '0'
  hiddenInput.style.minHeight = '0'

  // disable auto zoom
  // See: https://stackoverflow.com/questions/2989263/disable-auto-zoom-in-input-text-tag-safari-on-iphone
  hiddenInput.style.fontSize = '16px'

  document.body.prepend(hiddenInput)
  return () => hiddenInput.focus()
}

// export a singleton
export const asyncFocus = AsyncFocus()
