import { isSafari } from '../browser'
import ministore from './ministore'

/** True on WebKit 27 or later, which can withhold a touch's touchend (#5660). Safari reports it only as `Version/27`, since its OS token is frozen at 18. The Capacitor app's WKWebView reports no `Version/`, so there initialize reads the iOS version instead, and until it answers this is false. */
const webKit27Store = ministore(isSafari() && Number(navigator.userAgent.match(/Version\/(\d+)/)?.[1] ?? 0) >= 27)

export default webKit27Store
