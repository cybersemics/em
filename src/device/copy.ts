import * as selection from './selection'
import ClipboardJS from 'clipboard'

/** Copies a string directly to the clipboard by simulating a button click with ClipboadJS. */
const copy = (s: string): void => {
  // save selection
  const selectionState = selection.save()

  // copy from dummy element using ClipboardJS
  const dummyButton = document.createElement('button')
  const clipboard = new ClipboardJS(dummyButton, { text: () => s })
  dummyButton.click()
  clipboard.destroy()

  // restore selection
  selection.restore(selectionState)
}

export default copy
