import { Clipboard } from '@capacitor/clipboard'
import { Capacitor } from '@capacitor/core'
import ClipboardJS from 'clipboard'
import * as selection from './selection'

interface CopyOptions {
  /** Rich text/html representation written alongside the plain text. When provided, the clipboard is written deterministically (text/plain + text/html + text/em) rather than relying on the browser's native copy event. */
  html?: string
}

/** Copies text, html, and the text/em source marker to the clipboard in a single synchronous copy event. ClipboardJS provides the selection and triggers execCommand('copy'); the listener enriches the event with the additional formats. Unlike relying on the native copy event of the focused editable, this fires reliably even when the browser does not emit a copy event for a collapsed contenteditable selection (e.g. Safari). */
const copyRich = (text: string, html: string): void => {
  /** Writes the plain text, html, and text/em marker onto the clipboard event. */
  const onCopy = (e: ClipboardEvent) => {
    e.preventDefault()
    e.clipboardData?.setData('text/plain', text)
    e.clipboardData?.setData('text/html', html)
    // Mark the source as 'em' so the paste handler preserves formatting and skips the browser's synthesized html.
    e.clipboardData?.setData('text/em', 'true')
  }

  document.addEventListener('copy', onCopy)
  const dummyButton = document.createElement('button')
  const clipboard = new ClipboardJS(dummyButton, { text: () => text })
  dummyButton.click()
  clipboard.destroy()
  document.removeEventListener('copy', onCopy)
}

/** Copies a string to the clipboard. When html is provided, also writes text/html and the text/em source marker so that structured content pastes correctly even on browsers that do not fire a native copy event for a collapsed selection. */
const copy = (text: string, { html }: CopyOptions = {}): void => {
  // save selection
  const selectionState = selection.save()

  if (Capacitor.isNativePlatform()) {
    Clipboard.write({
      string: text,
    })
  } else if (html != null) {
    copyRich(text, html)
  } else {
    // copy from dummy element using ClipboardJS
    const dummyButton = document.createElement('button')
    const clipboard = new ClipboardJS(dummyButton, { text: () => text })
    dummyButton.click()
    clipboard.destroy()
  }

  // restore selection
  selection.restore(selectionState)
}

export default copy
