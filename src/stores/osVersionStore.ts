import { isSafari } from '../browser'
import ministore from './ministore'

/** The major version of the Apple OS that em runs on, or null if it is unknown, as on Android or in another browser. Safari reports it only as `Version/NN`, since its OS token is frozen at 18. The Capacitor app's WKWebView reports no `Version/`, so there initialize reads the iOS version instead, and until it answers this is null. */
const osVersionStore = ministore<number | null>(
  isSafari() ? Number(navigator.userAgent.match(/Version\/(\d+)/)?.[1]) || null : null,
)

export default osVersionStore
