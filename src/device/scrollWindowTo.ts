import { isCapacitor } from '../browser'

/** The emScroll native message handler injected by DevServerViewController on iOS Capacitor. */
interface EmScrollMessageHandler {
  postMessage: (message: { top: number }) => void
}

/** Returns the native emScroll message handler if it is available (iOS Capacitor only). */
const getEmScrollHandler = (): EmScrollMessageHandler | undefined =>
  (
    window as unknown as {
      webkit?: { messageHandlers?: { emScroll?: EmScrollMessageHandler } }
    }
  ).webkit?.messageHandlers?.emScroll

/**
 * Scrolls the window to the given document top position.
 *
 * On iOS Capacitor the native WebView autoscrolls the focused element to the top of the viewport on
 * every cursor change, so DevServerViewController suppresses programmatic scrolls while the keyboard
 * is open (issue #4526). To let em's own scroll survive that suppression, route it through the
 * `emScroll` native message handler, which adopts the target as the held position. Everywhere else
 * (Safari, Android web, desktop, tests) fall back to window.scrollTo.
 */
const scrollWindowTo = (top: number, behavior: ScrollBehavior = 'auto') => {
  const handler = isCapacitor() ? getEmScrollHandler() : undefined
  if (handler) {
    handler.postMessage({ top })
  } else {
    window.scrollTo({ top, behavior })
  }
}

export default scrollWindowTo
