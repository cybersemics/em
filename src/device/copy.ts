import { Clipboard } from '@capacitor/clipboard'
import { Capacitor } from '@capacitor/core'
import ClipboardJS from 'clipboard'
import { isSafari, isTouch } from '../browser'
import * as selection from './selection'

interface CopyOptions {
  /** Rich text/html representation written alongside the plain text. When provided, the clipboard is written deterministically (text/plain + text/html + text/em) rather than relying on the browser's native copy event. */
  html?: string
}

/** Copies text and html (plus the text/em source marker) to the clipboard using a focused, visually-hidden
 * contenteditable and a programmatic execCommand('copy'). The setData() calls write the exact text/plain,
 * text/html, and text/em marker. Used on every non-Safari browser: Chrome (and Chromium, including the
 * Puppeteer automation that the e2e suite relies on) honors setData() during a programmatic copy.
 */
const copyRichExecCommand = (text: string, html: string): void => {
  const selectionState = selection.save()

  /** Writes the plain text, html, and text/em marker onto the copy event. */
  const onCopy = (e: ClipboardEvent) => {
    e.preventDefault()
    e.clipboardData?.setData('text/plain', text)
    e.clipboardData?.setData('text/html', html)
    // Mark the source as 'em' so the paste handler preserves formatting and skips the browser's synthesized html.
    e.clipboardData?.setData('text/em', 'true')
  }

  // Render the html into a focused, visually-hidden contenteditable so the browser copies genuine rich content.
  const container = document.createElement('div')
  container.setAttribute('contenteditable', 'true')
  container.innerHTML = html
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '1px'
  container.style.height = '1px'
  container.style.opacity = '0'
  container.style.overflow = 'hidden'
  container.style.pointerEvents = 'none'
  container.style.whiteSpace = 'pre-wrap'
  container.setAttribute('aria-hidden', 'true')
  document.body.appendChild(container)
  container.focus()
  selection.selectNode(container)

  document.addEventListener('copy', onCopy, true)
  document.execCommand('copy')
  document.removeEventListener('copy', onCopy, true)

  if (container.parentNode) document.body.removeChild(container)
  selection.restore(selectionState)
}

/** Copies text and html to the clipboard on Safari/WebKit.
 *
 * Safari ignores setData() during a programmatic execCommand('copy') and sanitizes text/html written via the
 * async Clipboard API down to an empty document, so the rich path used on Chrome does not work here. However,
 * Copy Cursor runs on the Cmd+C keydown with permitDefault, so the browser fires its own genuine, user-
 * initiated copy event — and Safari *does* honor setData() in that event. The Editable's onCopy handler
 * (useOnCopy) handles it when an editable is focused, but with a multicursor the copy event targets <body>
 * (no editable is focused), so useOnCopy never runs and the browser serializes the empty collapsed selection
 * to an empty document — the root cause of #3993 on Safari.
 *
 * To handle the copy regardless of which element is focused, we register a capture-phase document listener
 * that intercepts the user-initiated copy event, preventDefault()s the empty serialization, and writes the
 * exact text/plain, text/html, and text/em marker — all honored by Safari because the event is user-initiated.
 *
 * Crucially, Safari dispatches the Cmd+C copy event on a later task than setTimeout(0), so the listener must
 * stay registered well beyond the current tick. It removes itself as soon as the copy event fires, and a
 * generous timeout removes it otherwise (e.g. the command was triggered from the command palette, which fires
 * no copy event) so it cannot affect an unrelated later copy. If copyRichSafari is called again before the
 * previous listener has fired or timed out, the previous listener and its timeout are cancelled first so that
 * only the latest text is written.
 */
// Tracks the pending Safari copy listener/timeout so a later copyRichSafari call can cancel it before registering a new one.
let pendingSafariCopy: { onCopy: (e: ClipboardEvent) => void; timeoutId: ReturnType<typeof setTimeout> } | null = null

/** Removes the pending Safari copy listener and clears its fallback timeout. Idempotent. */
const clearPendingSafariCopy = (): void => {
  if (!pendingSafariCopy) return
  clearTimeout(pendingSafariCopy.timeoutId)
  document.removeEventListener('copy', pendingSafariCopy.onCopy, true)
  pendingSafariCopy = null
}

/** Copies text and html to the clipboard on Safari/WebKit via a capture-phase document copy listener (see comment above). */
const copyRichSafari = (text: string, html: string): void => {
  // Cancel any pending listener/timeout from a previous invocation so only the latest copy is written.
  clearPendingSafariCopy()

  /** Writes the plain text, html, and text/em marker onto the user-initiated copy event. */
  const onCopy = (e: ClipboardEvent) => {
    clearPendingSafariCopy()
    e.preventDefault()
    e.clipboardData?.setData('text/plain', text)
    e.clipboardData?.setData('text/html', html)
    // Mark the source as 'em' so the paste handler preserves formatting and skips the browser's synthesized html.
    e.clipboardData?.setData('text/em', 'true')
  }

  // Capture phase so the listener runs even when the copy event targets <body> (multicursor has no focused editable).
  document.addEventListener('copy', onCopy, true)

  // Safari dispatches the Cmd+C copy event on a later task, so keep the listener alive for a generous window.
  // onCopy self-cancels on the first copy event; this timeout only clears the listener if no copy event ever
  // arrives (e.g. the command was triggered from the command palette) so it cannot affect an unrelated later copy.
  const timeoutId = setTimeout(clearPendingSafariCopy, 1000)
  pendingSafariCopy = { onCopy, timeoutId }
}

/** Copies text and html (plus the text/em source marker) to the clipboard for a rich (structured) copy.
 * Dispatches to a Safari-specific path because Safari does not honor setData() during a programmatic copy.
 */
const copyRich = (text: string, html: string): void => {
  if (isSafari()) {
    copyRichSafari(text, html)
  } else {
    copyRichExecCommand(text, html)
  }
}

/** Copies a string to the clipboard. When html is provided, also writes text/html and the text/em source marker so that structured content pastes correctly even on browsers that do not fire a native copy event for a collapsed selection. */
const copy = (text: string, { html }: CopyOptions = {}): void => {
  if (Capacitor.isNativePlatform()) {
    // save selection
    const selectionState = selection.save()
    Clipboard.write({
      string: text,
    })
    // restore selection
    selection.restore(selectionState)
  } else if (html != null && !(isSafari() && isTouch)) {
    // copyRich manages its own selection lifecycle, so it must not be wrapped in save/restore here.
    copyRich(text, html)
  } else {
    // Plain-text copy via a programmatic ClipboardJS execCommand('copy').
    //
    // This is also the path for mobile Safari (isSafari() && isTouch). There, the rich copy cannot run: the
    // copy is triggered by a Command Center tap rather than Cmd+C, so no native copy event fires, and Safari
    // does not honor setData() during a programmatic copy. The full multicursor selection is still copied as
    // indented plain text, which em reconstructs into the thought tree on paste (the pre-#3993 mobile behavior).
    //
    // save selection
    const selectionState = selection.save()
    // copy from dummy element using ClipboardJS
    const dummyButton = document.createElement('button')
    const clipboard = new ClipboardJS(dummyButton, { text: () => text })
    dummyButton.click()
    clipboard.destroy()
    // restore selection
    selection.restore(selectionState)
  }
}

export default copy
