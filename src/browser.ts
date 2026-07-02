/* eslint-disable import/prefer-default-export */
/** Defines client/browser-specific variables that do not change over the course of a session. */
import { Capacitor } from '@capacitor/core'

export const isIOS = Capacitor.getPlatform() === 'ios'

/** Returns true if the user's device is touch screen. The use of matchMedia('pointer: coarse') did not work for Android webviews, so checking if it is Android Webview using capacitor. */
export const isTouch =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || Capacitor.getPlatform() === 'android')

/** Returns true on Android, whether running as a native Capacitor app or in an Android browser or
 * WebView. The old check tested navigator.platform === 'Linux armv7l' (32-bit ARM only), which is
 * false on modern 64-bit Android, so data-platform and every _android: condition silently broke. */
export const isAndroid =
  Capacitor.getPlatform() === 'android' || (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent))

/** Returns true if the navigator platform contains 'MacIntel'. */
export const isMac = typeof navigator !== 'undefined' && navigator.platform === 'MacIntel'

/** Returns true if the navigator platform contains 'iPhone'. */
export const isiPhone = typeof navigator !== 'undefined' && navigator.platform === 'iPhone'

/** Returns true if the navigator vendor contains 'Apple'. */
export const isSafari = () => typeof navigator !== 'undefined' && navigator.vendor.includes('Apple')

/** Returns true if the navigator user agent contains 'Android'. */
export const isAndroidWebView = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

/** Returns true if the application is running in Capacitor (on either iOS or Android). */
export const isCapacitor = () => Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android'
