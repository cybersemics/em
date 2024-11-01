/** Defines client/browser-specific variables that do not change over the course of a session. */
import { Capacitor } from '@capacitor/core'

export const isIOS = Capacitor.getPlatform() === 'ios'

/** Returns true if the user's device is touch screen. The use of matchMedia('pointer: coarse') did not work for Android webviews, so checking if it is Android Webview using capacitor. */
export const isTouch =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || Capacitor.getPlatform() === 'android')

/** Returns true if the navigator platform contains 'Linux armv71'. */
export const isAndroid = typeof navigator !== 'undefined' && navigator.platform === 'Linux armv7l'

/** Returns true if the navigator platform contains 'MacIntel'. */
export const isMac = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel'

/** Returns true if the navigator platform contains 'iPhone'. */
export const isiPhone = typeof navigator !== 'undefined' && navigator.platform === 'iPhone'

/** Returns true if the navigator vendor contains 'Apple'. */
export const isSafari = () => typeof navigator !== 'undefined' && navigator.vendor.includes('Apple')
