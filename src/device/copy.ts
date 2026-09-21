import { Clipboard } from '@capacitor/clipboard'
import { Capacitor } from '@capacitor/core'
import ClipboardJS from 'clipboard'
import { isSafari, isTouch } from '../browser'
import * as selection from './selection'

interface CopyOptions {
  /** Rich text/html representation written alongside the plain text. When provided, the clipboard is written deterministically (text/plain + text/html, plus the text/em marker where the platform supports it) rather than relying on the browser's native copy event. */
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

/** Copies text and html to the clipboard on desktop Safari.
 *
 * Safari ignores setData() during a programmatic execCommand('copy'), so the rich path used on Chrome does not
 * work here. However, Copy Cursor runs on the Cmd+C keydown with permitDefault, so the browser fires its own
 * genuine, user-
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

/** Copies plain text to the clipboard, via the native plugin in the Capacitor app and a programmatic ClipboardJS execCommand('copy') elsewhere. */
const copyPlain = (text: string): void => {
  const selectionState = selection.save()
  if (Capacitor.isNativePlatform()) {
    Clipboard.write({ string: text })
  } else {
    const dummyButton = document.createElement('button')
    const clipboard = new ClipboardJS(dummyButton, { text: () => text })
    dummyButton.click()
    clipboard.destroy()
  }
  selection.restore(selectionState)
}

/** Copies text and html to the clipboard on mobile WebKit — mobile Safari and the iOS Capacitor app.
 *
 * Neither rich path above is available here. The copy is triggered by a Command Center tap rather than Cmd+C,
 * so no user-initiated copy event fires for copyRichSafari to intercept, and WebKit ignores setData() during
 * the programmatic execCommand('copy') that copyRichExecCommand depends on. The async Clipboard API does
 * work, measured on an iOS device: the html round-trips with underline, strikethrough and colors intact,
 * WebKit only prepending inline style normalization to the outer element.
 *
 * The two shells enforce user activation differently, and only one of them is strict. The Capacitor WebView
 * refuses a write issued after an await, while mobile Safari accepts one; both were measured with the same
 * build. A caller that does not know what to copy until an await resolves must therefore use copyDeferred.
 */
const copyRichAsyncClipboard = (text: string, html: string): void => {
  navigator.clipboard
    .write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    ])
    .catch(() => copyPlain(text))
}

/** Copies text and html (plus the text/em source marker where the platform supports it) to the clipboard for a
 * rich (structured) copy. Each branch exists because the mechanism below it is the only one that platform
 * honors; see the comment on each.
 */
const copyRich = (text: string, html: string): void => {
  if (isSafari() && isTouch) {
    copyRichAsyncClipboard(text, html)
  } else if (isSafari()) {
    copyRichSafari(text, html)
  } else {
    // Chromium, which includes the Android Capacitor WebView and the Puppeteer automation the e2e suite uses.
    copyRichExecCommand(text, html)
  }
}

/** Copies a string to the clipboard. When html is provided, also writes text/html so that structured content pastes correctly, including on the mobile platforms whose clipboard previously carried plain text alone. */
const copy = (text: string, { html }: CopyOptions = {}): void => {
  if (html != null) {
    copyRich(text, html)
  } else {
    copyPlain(text)
  }
}

/** Copies content that is not known yet, for a caller that must await before it can export what the user asked
 * for. The iOS Capacitor WebView refuses a clipboard write issued after that await, so the write is registered
 * now, in the same task as the gesture, and satisfied from `content` once it resolves (#3960). Every other
 * platform waits for the content and takes its usual path, none of them being gesture-bound.
 *
 * Mobile Safari accepts the undeferred write, and the iOS e2e suite runs Safari, so no test there covers this.
 * Removing the deferral leaves CI green and breaks copy formatting in the app.
 */
export const copyDeferred = (content: Promise<{ text: string; html: string }>): void => {
  if (isSafari() && isTouch) {
    navigator.clipboard
      .write([
        new ClipboardItem({
          'text/plain': content.then(({ text }) => new Blob([text], { type: 'text/plain' })),
          'text/html': content.then(({ html }) => new Blob([html], { type: 'text/html' })),
        }),
      ])
      .catch(async () => copyPlain((await content).text))
  } else {
    content.then(({ text, html }) => copyRich(text, html))
  }
}

export default copy
