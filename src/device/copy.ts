import ClipboardJS from 'clipboard'

/** Copies a string directly to the clipboard by simulating a button click with ClipboadJS. */
const copy = (s: string): void => {
  // save selection
  const sel = window.getSelection()
  const range = sel && sel.rangeCount > 0 ? sel?.getRangeAt(0) : null

  // copy from dummy element using ClipboardJS
  const dummyButton = document.createElement('button')
  const clipboard = new ClipboardJS(dummyButton, { text: () => s })
  dummyButton.click()
  clipboard.destroy()

  // restore selection
  if (range) {
    sel?.removeAllRanges()
    sel?.addRange(range)
  }
}

export default copy
