import { isMobile } from '../browser'
import { NOOP } from '../constants.js'

// Allow a focus to be set asynchronously on mobile
// See: https://stackoverflow.com/a/45703019/480608
export const AsyncFocus = () => {

  // create invisible dummy input to receive the focus
  const hiddenInput = document.createElement('input')

  if (isMobile) {
    hiddenInput.setAttribute('type', 'text')
    hiddenInput.style.position = 'absolute'
    hiddenInput.style.opacity = 0
    hiddenInput.style.height = 0

    // disable auto zoom
    // See: https://stackoverflow.com/questions/2989263/disable-auto-zoom-in-input-text-tag-safari-on-iphone
    hiddenInput.style.fontSize = '16px'

    document.body.prepend(hiddenInput)
  }

  return isMobile
    ? () => hiddenInput.focus()
    : NOOP
}

// export a singleton
export const asyncFocus = AsyncFocus()
