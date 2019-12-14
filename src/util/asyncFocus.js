// Allow a focus to be set asynchronously on mobile
// See: https://stackoverflow.com/a/45703019/480608
export const AsyncFocus = () => {

  // create invisible dummy input to receive the focus
  const hiddenInput = document.createElement('input')
  hiddenInput.setAttribute('type', 'text')
  hiddenInput.style.position = 'absolute'
  hiddenInput.style.opacity = 0
  hiddenInput.style.height = 0

  // disable auto zoom
  // See: https://stackoverflow.com/questions/2989263/disable-auto-zoom-in-input-text-tag-safari-on-iphone
  hiddenInput.style.fontSize = '16px'

  return {

    // move focus to hidden input
    enable: () => {
      // prepend to body and focus
      document.body.prepend(hiddenInput)
      hiddenInput.focus()
    },

    // remove hidden input (not recommended; instead reuse enable)
    cleanup: () => {
      hiddenInput.remove()
    }

  }
}

// export a global
export const asyncFocus = AsyncFocus()
